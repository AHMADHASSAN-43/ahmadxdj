// plugins/forward.js - ESM Version
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import { PassThrough } from 'stream';
import ffmpeg from 'fluent-ffmpeg';
import { cmd } from '../command.js';
import {
    generateWAMessageFromContent,
    encodeNewsletterMessage,
    isJidNewsletter,
    generateMessageIDV2,
    normalizeMessageContent
} from '@whiskeysockets/baileys';

const __filename = fileURLToPath(import.meta.url);

const encodeBase64EncodedStringForUpload = (b64) => 
    encodeURIComponent(b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/\=+$/, ''));

async function convertToVoiceNote(inputBuffer) {
    return new Promise((resolve, reject) => {
        const inp = new PassThrough(); inp.end(inputBuffer);
        const out = new PassThrough();
        const chunks = [];
        out.on('data', c => chunks.push(c));
        out.on('end', () => resolve(Buffer.concat(chunks)));
        out.on('error', reject);
        ffmpeg(inp)
            .audioCodec('libopus').audioChannels(1).audioFrequency(24000)
            .format('ogg').outputOptions(['-b:a 32k'])
            .on('error', reject).pipe(out, { end: true });
    });
}

function stripContextInfo(obj) {
    if (obj && typeof obj === 'object') {
        delete obj.contextInfo;
        Object.values(obj).forEach(stripContextInfo);
    }
}

async function resolveChannelLink(client, link) {
    const m = link.match(/whatsapp\.com\/channel\/([\w-]+)/i);
    if (!m) return null;
    try {
        const metadata = await client.newsletterMetadata("invite", m[1]);
        return metadata?.id || null;
    } catch { return null; }
}


async function uploadToNewsletter(client, buffer, mediaType) {
    const result = await client.query({
        tag: 'iq',
        attrs: { type: 'set', xmlns: 'w:m', to: 's.whatsapp.net' },
        content: [{ tag: 'media_conn', attrs: {} }]
    });
    
    const mediaConn = result.content.find(n => n.tag === 'media_conn');
    const auth = mediaConn.attrs.auth;
    const hostname = mediaConn.content.find(n => n.tag === 'host').attrs.hostname;


    const fileSha256 = crypto.createHash('sha256').update(buffer).digest();
    const fileEncSha256B64 = encodeBase64EncodedStringForUpload(fileSha256.toString('base64'));

    const mediaPathMap = {
        image: '/newsletter/newsletter-image',
        video: '/newsletter/newsletter-video',
        document: '/newsletter/newsletter-document',
        audio: '/newsletter/newsletter-ptt',
        sticker: '/newsletter/newsletter-image',
        'thumbnail-link': '/newsletter/newsletter-thumbnail-link'
    };
    
  
    const mediaPath = mediaPathMap[mediaType] || '/newsletter/newsletter-audio';
    const serverThumb = '&server_thumb_gen=1'; 
    const url = `https://${hostname}${mediaPath}/${fileEncSha256B64}?auth=${encodeURIComponent(auth)}&token=${fileEncSha256B64}${serverThumb}`;

    const res = await fetch(url, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/octet-stream', 
            'Origin': 'https://web.whatsapp.com' 
        },
        body: buffer
    });

    if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
    const json = await res.json();


    return {
        directPath: json.direct_path,
        fileSha256,
        fileLength: buffer.length,
        mimetype: mediaType === 'audio' ? 'audio/ogg; codecs=opus' : 'application/octet-stream',
        ptt: mediaType === 'audio' ? true : undefined
    };
}

cmd({
    pattern: "forward",
    alias: ["frd", "fwd"],
    desc: "Forward messages to groups/channels",
    category: "owner",
    filename: __filename
}, async (client, message, match, { isCreator, reply, from }) => {
    try {
        if (!isCreator) return await reply("*📛 Owner Only Command*");
        if (!message.quoted) return await reply("*🍁 Please reply to a message to forward*");

        let jidInput = "";
        if (typeof match === "string") jidInput = match.trim();
        else if (Array.isArray(match)) jidInput = match.join(" ").trim();
        else if (match && typeof match === "object") jidInput = match.text || "";
        
        if (!jidInput) {
            return await reply(
                "*🍁 Usage:* `.forward jid1,jid2,...`\n" +
                "*Example:* `.forward 120363411055156472@g.us`\n" +
                "*Example (channel):* `.forward https://whatsapp.com/channel/xxxxxxxxx`\n" +
                "Reply to a message first!"
            );
        }

        const rawJids = jidInput.split(',').map(jid => jid.trim()).filter(jid => jid);
        const validJids = [];
        
        for (const jid of rawJids) {
            if (/whatsapp\.com\/channel\//i.test(jid)) {
                const chId = await resolveChannelLink(client, jid);
                if (chId) validJids.push(chId);
            } else if (jid.includes('@')) {
                if (jid.endsWith('@g.us') || jid.endsWith('@s.whatsapp.net') || jid.endsWith('@newsletter')) {
                    const numbers = jid.match(/\d+/g);
                    if (numbers && numbers.length > 0) {
                        if (jid.endsWith('@g.us')) validJids.push(`${numbers.join('')}@g.us`);
                        else if (jid.endsWith('@s.whatsapp.net')) validJids.push(`${numbers.join('')}@s.whatsapp.net`);
                        else if (jid.endsWith('@newsletter')) validJids.push(`${numbers.join('')}@newsletter`);
                    }
                }
            } else if (/^\d+$/.test(jid)) {
                validJids.push(`${jid}@g.us`);
            }
        }

        const uniqueJids = [...new Set(validJids)].slice(0, 50);
        if (uniqueJids.length === 0) return await reply("❌ No valid JIDs found");

        await reply(`🔄 Forwarding to ${uniqueJids.length} chats...`);

        let successCount = 0;
        const failedJids = [];

        const quotedContent = message.msg?.contextInfo?.quotedMessage;
        if (!quotedContent) return await reply("❌ Could not extract quoted message content");

        const messageContent = { ...quotedContent };
        const qType = Object.keys(quotedContent).find(k => k !== 'messageContextInfo') || '';
        const qMsg = quotedContent[qType] || {};

        let mediaBuffer = null;
        let voiceBuf = null;
        
        const needsMedia = ['audioMessage', 'imageMessage', 'videoMessage', 'documentMessage', 'stickerMessage'].includes(qType);
        if (needsMedia) {
            try {
                mediaBuffer = await message.quoted.download();
                if (qType === 'audioMessage' && mediaBuffer) {
                    voiceBuf = await convertToVoiceNote(mediaBuffer);
                }
            } catch (e) {}
        }

        for (const [index, jid] of uniqueJids.entries()) {
            try {
                if (isJidNewsletter(jid)) {
                    const cleanContent = JSON.parse(JSON.stringify(messageContent));
                    stripContextInfo(cleanContent);
                    let finalContent = cleanContent;

                    if (mediaBuffer) {
                        let mediaType = 'document';
                        if (qType === 'imageMessage') mediaType = 'image';
                        else if (qType === 'videoMessage') mediaType = 'video';
                        else if (qType === 'audioMessage') mediaType = 'audio';
                        else if (qType === 'stickerMessage') mediaType = 'sticker';

                        const uploadBuf = qType === 'audioMessage' ? voiceBuf : mediaBuffer;
                        const uploaded = await uploadToNewsletter(client, uploadBuf, mediaType);

                        if (qType === 'audioMessage') {
                            finalContent = {
                                audioMessage: {
                                    directPath: uploaded.directPath,
                                    fileSha256: uploaded.fileSha256,
                                    fileLength: uploaded.fileLength,
                                    mimetype: 'audio/ogg; codecs=opus',
                                    ptt: true,
                                    seconds: qMsg.seconds
                                }
                            };
                        } else {
                            finalContent[qType] = {
                                ...qMsg,
                                directPath: uploaded.directPath,
                                fileSha256: uploaded.fileSha256,
                                fileLength: uploaded.fileLength,
                                url: undefined,
                                mediaKey: undefined,
                                fileEncSha256: undefined,
                                mediaKeyTimestamp: undefined
                            };
                        }
                        stripContextInfo(finalContent);
                    }

                    const bytes = encodeNewsletterMessage(finalContent);
                    const inner = normalizeMessageContent(finalContent);
                    
                    let stanzaType = 'text';
                    let extraAttrs = {};

                    if (inner?.audioMessage) { stanzaType = 'media'; extraAttrs['mediatype'] = 'ptt'; }
                    else if (inner?.imageMessage) { stanzaType = 'media'; extraAttrs['mediatype'] = 'image'; }
                    else if (inner?.videoMessage) { stanzaType = 'media'; extraAttrs['mediatype'] = 'video'; }
                    else if (inner?.documentMessage) { stanzaType = 'media'; extraAttrs['mediatype'] = 'document'; }
                    else if (inner?.stickerMessage) { stanzaType = 'media'; extraAttrs['mediatype'] = 'sticker'; }
                    else if (inner?.pollCreationMessage) stanzaType = 'poll';
                    else if (inner?.eventMessage) stanzaType = 'event';

                    const stanza = {
                        tag: 'message',
                        attrs: { 
                            id: generateMessageIDV2(client.user.id), 
                            to: jid, 
                            type: stanzaType 
                        },
                        content: [{ 
                            tag: 'plaintext', 
                            attrs: extraAttrs, 
                            content: bytes 
                        }]
                    };

                    const response = await client.query(stanza);
                    if (response?.attrs?.error) throw new Error(`WhatsApp Error ${response.attrs.error}`);

                } else {
                    const forwardData = generateWAMessageFromContent(
                        jid,
                        messageContent,
                        { userJid: client.user.id }
                    );

                    await client.relayMessage(jid, forwardData.message, {
                        messageId: forwardData.key.id
                    });
                }

                successCount++;
                
                if ((index + 1) % 5 === 0 && uniqueJids.length > 5) {
                    await reply(`📤 Sent to ${index + 1}/${uniqueJids.length} chats...`);
                }
                
                if (index < uniqueJids.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
                
            } catch (error) {
                failedJids.push({
                    jid: jid.includes('@g.us') ? jid.replace('@g.us', '') : 
                         jid.includes('@s.whatsapp.net') ? jid.replace('@s.whatsapp.net', '') :
                         jid.replace('@newsletter', ''),
                    error: error.message.substring(0, 30)
                });
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }

        let report = `✅ *Forward Complete*\n\n` +
                     `📤 Success: ${successCount}/${uniqueJids.length}\n`;
        
        const contentType = Object.keys(quotedContent)[0] || 'unknown';
        report += `📦 Content Type: ${contentType.replace('Message', '')}\n`;
        
        const groupCount = uniqueJids.filter(jid => jid.endsWith('@g.us')).length;
        const personalCount = uniqueJids.filter(jid => jid.endsWith('@s.whatsapp.net')).length;
        const newsletterCount = uniqueJids.filter(jid => jid.endsWith('@newsletter')).length;
        report += `👥 Groups: ${groupCount}\n`;
        report += `👤 Personal: ${personalCount}\n`;
        report += `📰 Newsletters: ${newsletterCount}\n`;
        
        if (failedJids.length > 0) {
            report += `\n❌ Failed (${failedJids.length}):\n`;
            failedJids.slice(0, 3).forEach(f => {
                report += `• ${f.jid}: ${f.error}\n`;
            });
            if (failedJids.length > 3) report += `... +${failedJids.length - 3} more`;
        }
        
        if (rawJids.length > uniqueJids.length) {
            report += `\n⚠️ Removed ${rawJids.length - uniqueJids.length} invalid/duplicate JIDs`;
        }

        await reply(report);

    } catch (error) {
        await reply(`💢 Error: ${error.message.substring(0, 100)}`);
    }
});
