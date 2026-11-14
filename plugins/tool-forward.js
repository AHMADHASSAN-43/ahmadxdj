// AHMAD MD - Forward command (Official Baileys compatible)

import { cmd } from "../command.js";
import {
  downloadContentFromMessage,
  normalizeMessageContent
} from '@whiskeysockets/baileys';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);

const MEDIA_TYPES = {
  audioMessage: 'audio',
  imageMessage: 'image',
  videoMessage: 'video',
  ptvMessage: 'video',
  documentMessage: 'document',
  stickerMessage: 'sticker'
};

// ---------- Helpers ----------

// Reply wala message nikalo (official Baileys + custom serializer dono ke liye)
function getQuotedContent(message) {
  let q =
    message.quoted?.message ||
    message.msg?.contextInfo?.quotedMessage ||
    null;

  if (!q && message.message) {
    const m = normalizeMessageContent(message.message) || message.message;
    const type = Object.keys(m).find(k => k !== 'messageContextInfo');
    q = m[type]?.contextInfo?.quotedMessage || null;
  }
  if (!q) return null;
  return normalizeMessageContent(q) || q;
}

async function downloadMedia(qMsg, type) {
  const stream = await downloadContentFromMessage(qMsg, type);
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  return Buffer.concat(chunks);
}

// Kisi bhi audio ko ogg/opus voice note mein convert karo
async function toVoiceNote(buffer) {
  const id = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const inFile = path.join(os.tmpdir(), `fwd_in_${id}`);
  const outFile = path.join(os.tmpdir(), `fwd_out_${id}.ogg`);
  try {
    await fs.writeFile(inFile, buffer);
    await new Promise((resolve, reject) => {
      const ff = spawn('ffmpeg', [
        '-y', '-i', inFile,
        '-vn',
        '-c:a', 'libopus',
        '-b:a', '48k',
        '-ar', '48000',
        '-ac', '1',
        '-application', 'voip',
        '-f', 'ogg',
        outFile
      ]);
      let err = '';
      ff.stderr.on('data', d => (err += d.toString()));
      ff.on('error', reject);
      ff.on('close', code =>
        code === 0 ? resolve() : reject(new Error('ffmpeg failed: ' + err.slice(-150)))
      );
    });
    return await fs.readFile(outFile);
  } finally {
    fs.unlink(inFile).catch(() => {});
    fs.unlink(outFile).catch(() => {});
  }
}

// ---------- Command ----------

cmd({
  pattern: "forward",
  alias: ["frd", "fwd"],
  desc: "Forward messages to groups/channels (voice, photo, video supported)",
  category: "owner",
  filename: __filename
}, async (client, message, match, { isCreator, reply }) => {
  try {
    if (!isCreator) return await reply("*📛 Owner Only Command*");

    const quotedContent = getQuotedContent(message);
    if (!quotedContent) return await reply("*🍁 Please reply to a message to forward*");

    // Match input
    let jidInput = "";
    if (typeof match === "string") jidInput = match.trim();
    else if (Array.isArray(match)) jidInput = match.join(" ").trim();
    else if (match && typeof match === "object") jidInput = match.text || "";

    if (!jidInput) {
      return await reply(
        "*🍁 Usage:* `.forward jid1,jid2,...`\n" +
        "*Example:* `.forward 120363408512260657@g.us`\n" +
        "*Channel:* `.forward 120363408512260657@newsletter`\n" +
        "*Multiple:* `.forward 1203...@g.us,1203...@newsletter`\n" +
        "Reply to a message first!"
      );
    }

    // Process JIDs
    const rawJids = jidInput.split(',').map(j => j.trim()).filter(Boolean);
    const validJids = rawJids
      .map(jid => {
        if (jid.includes('@')) {
          const numbers = jid.match(/\d+/g);
          if (!numbers) return null;
          const num = numbers.join('');
          if (jid.endsWith('@g.us')) return `${num}@g.us`;
          if (jid.endsWith('@s.whatsapp.net')) return `${num}@s.whatsapp.net`;
          if (jid.endsWith('@newsletter')) return `${num}@newsletter`;
          return null;
        }
        if (/^\d+$/.test(jid)) return `${jid}@g.us`;
        return null;
      })
      .filter(Boolean)
      .slice(0, 50);

    if (validJids.length === 0) return await reply("❌ No valid JIDs found");

    const uniqueJids = [...new Set(validJids)];
    await reply(`🔄 Forwarding to ${uniqueJids.length} chats...`);

    // Content type
    const qType = Object.keys(quotedContent).find(k => k !== 'messageContextInfo') || '';
    const qMsg = quotedContent[qType] || {};
    const hasNewsletter = uniqueJids.some(j => j.endsWith('@newsletter'));

    // Media sirf ek baar download hoga (sirf newsletter ya fallback ke liye)
    let mediaBuffer = null;     // original
    let voiceBuffer = null;     // converted ogg/opus (audio ke liye)
    let convertNote = '';

    const mediaKind = MEDIA_TYPES[qType];

    const ensureMedia = async () => {
      if (mediaBuffer || !mediaKind) return mediaBuffer;
      try {
        mediaBuffer = await downloadMedia(qMsg, mediaKind);
      } catch (e) {
        console.error('[FWD] downloadContentFromMessage failed:', e.message);
        // custom serializer fallback
        try {
          if (typeof message.quoted?.download === 'function') {
            mediaBuffer = await message.quoted.download();
          }
        } catch (e2) {
          console.error('[FWD] quoted.download failed:', e2.message);
        }
      }
      if (!Buffer.isBuffer(mediaBuffer) || mediaBuffer.length === 0) mediaBuffer = null;
      return mediaBuffer;
    };

    if (hasNewsletter && mediaKind) {
      await ensureMedia();
      if (mediaBuffer && qType === 'audioMessage') {
        try {
          voiceBuffer = await toVoiceNote(mediaBuffer);
          convertNote = ' (converted to voice)';
        } catch (e) {
          console.error('[FWD] voice convert failed:', e.message);
          convertNote = ' (ffmpeg missing/failed, original audio)';
        }
      }
    }

    // Newsletter payload
    const buildPayload = () => {
      if (qType === 'conversation') return { text: quotedContent.conversation };
      if (qType === 'extendedTextMessage') return { text: qMsg.text || '' };
      if (!mediaBuffer) return null;

      switch (qType) {
        case 'audioMessage':
          if (voiceBuffer) {
            return { audio: voiceBuffer, ptt: true, mimetype: 'audio/ogg; codecs=opus' };
          }
          return { audio: mediaBuffer, ptt: !!qMsg.ptt, mimetype: qMsg.mimetype || 'audio/mpeg' };
        case 'imageMessage':
          return { image: mediaBuffer, caption: qMsg.caption || '' };
        case 'videoMessage':
        case 'ptvMessage':
          return {
            video: mediaBuffer,
            caption: qMsg.caption || '',
            mimetype: qMsg.mimetype || 'video/mp4',
            gifPlayback: !!qMsg.gifPlayback
          };
        case 'documentMessage':
          return {
            document: mediaBuffer,
            mimetype: qMsg.mimetype || 'application/octet-stream',
            fileName: qMsg.fileName || 'file',
            caption: qMsg.caption || ''
          };
        case 'stickerMessage':
          return { sticker: mediaBuffer };
        default:
          return null;
      }
    };

    // Fallback payload for groups/personal agar native forward fail ho
    const sendAsNew = async (jid) => {
      await ensureMedia();
      const payload = buildPayload();
      if (!payload) throw new Error('Unsupported type');
      return await client.sendMessage(jid, payload);
    };

    // Forward loop
    let successCount = 0;
    const failedJids = [];

    for (const [index, jid] of uniqueJids.entries()) {
      try {
        if (jid.endsWith('@newsletter')) {
          const sent = await sendAsNew(jid);
          if (!sent) throw new Error('sendMessage returned nothing');
        } else {
          try {
            // Official Baileys native forward
            await client.sendMessage(jid, {
              forward: {
                key: message.quoted?.key || { remoteJid: message.key?.remoteJid, fromMe: false, id: 'FWD' },
                message: quotedContent
              },
              force: true
            });
          } catch (fwdErr) {
            console.error('[FWD] native forward failed, retrying as new:', fwdErr.message);
            await sendAsNew(jid);
          }
        }

        successCount++;

        if ((index + 1) % 5 === 0 && uniqueJids.length > 5) {
          await reply(`📤 Sent to ${index + 1}/${uniqueJids.length} chats...`);
        }
        if (index < uniqueJids.length - 1) {
          await new Promise(r => setTimeout(r, 1000));
        }
      } catch (error) {
        console.error(`Forward error to ${jid}:`, error.message);
        failedJids.push({
          jid: jid.replace(/@(g\.us|s\.whatsapp\.net|newsletter)$/, ''),
          error: error.message.substring(0, 30)
        });
        await new Promise(r => setTimeout(r, 2000));
      }
    }

    // Report
    const groupCount = uniqueJids.filter(j => j.endsWith('@g.us')).length;
    const personalCount = uniqueJids.filter(j => j.endsWith('@s.whatsapp.net')).length;
    const newsletterCount = uniqueJids.filter(j => j.endsWith('@newsletter')).length;

    let report =
      `✅ *Forward Complete*\n\n` +
      `📤 Success: ${successCount}/${uniqueJids.length}\n` +
      `📦 Content Type: ${(qType || 'unknown').replace('Message', '')}${convertNote}\n` +
      `👥 Groups: ${groupCount}\n` +
      `👤 Personal: ${personalCount}\n` +
      `📰 Newsletters: ${newsletterCount}\n`;

    if (failedJids.length > 0) {
      report += `\n❌ Failed (${failedJids.length}):\n`;
      failedJids.slice(0, 3).forEach(f => (report += `• ${f.jid}: ${f.error}\n`));
      if (failedJids.length > 3) report += `... +${failedJids.length - 3} more`;
    }

    if (rawJids.length > uniqueJids.length) {
      report += `\n⚠️ Removed ${rawJids.length - uniqueJids.length} invalid/duplicate JIDs`;
    }

    await reply(report);
  } catch (error) {
    console.error("Forward Error:", error);
    await reply(`💢 Error: ${error.message.substring(0, 100)}`);
  }
});
