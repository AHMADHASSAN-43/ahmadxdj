import { fileURLToPath } from 'url';
import config from '../config.js';
import { cmd } from '../command.js';
import axios from 'axios';
import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import webp from 'node-webpmux';
import ffmpegPath from '@ffmpeg-installer/ffmpeg';
import ffmpeg from 'fluent-ffmpeg';
import { getBuffer } from "../lib/functions.js";
import { videoToWebp } from '../lib/video-utils.js';
import { Sticker, StickerTypes } from "wa-sticker-formatter";
import StickerMaker from '../lib/sticker-maker.js';
import {
    proto,
    prepareWAMessageMedia,
    downloadMediaMessage,
    normalizeMessageContent
} from '@whiskeysockets/baileys';

const __filename = fileURLToPath(import.meta.url);

// Telegram Bot Token
const BOT_TOKEN = '8717187428:AAHo9IgdtcQztOT572ixLJNSliFSulA_30M';

// 🔥 FIXED STICKER PACK NAME — SIRF AAP KA NAAM
const FIXED_PACK_NAME = '𝘼𝙃𝙈𝘼𝘿🫠❤️‍🩹';
const FIXED_AUTHOR = '';

// point fluent-ffmpeg at the bundled binary (works on Linux/macOS/Windows)
ffmpeg.setFfmpegPath(ffmpegPath.path);

// ==================== TSTICKER COMMAND ====================
cmd({
    pattern: "tsticker",
    alias: ["tg", "tgs", "tgstick", "telegramsticker"],
    react: "🛡️",
    desc: "Download Telegram sticker pack",
    category: "download",
    use: ".tstick <telegram_sticker_url>",
    filename: __filename
}, async (conn, mek, m, { from, q, reply, isCreator }) => {
    try {
        if (!isCreator) {
            return await reply("📛 This is an owner command.");
        }
        if (!q) return await reply("❌ Please provide a Telegram sticker pack URL!\nExample: .tstick https://t.me/addstickers/packname");
        if (!q.includes('t.me/addstickers/') && !q.includes('telegram.me/addstickers/')) {
            return await reply("❌ Please provide a valid Telegram sticker pack URL!\nIt should look like: https://t.me/addstickers/packname");
        }
        await conn.sendMessage(from, { react: { text: '⏳', key: mek.key } });
        await reply("📦 Downloading sticker pack... Please wait!");
        let packName = q.replace("https://t.me/addstickers/", "").replace("http://t.me/addstickers/", "").replace("https://telegram.me/addstickers/", "").replace("http://telegram.me/addstickers/", "");
        packName = packName.split('?')[0].split(' ')[0].trim();
        if (!packName) {
            return await reply("❌ Invalid sticker pack URL!");
        }
        const apiURL = `https://api.telegram.org/bot${BOT_TOKEN}/getStickerSet?name=${encodeURIComponent(packName)}`;
        const response = await axios.get(apiURL, {
            timeout: 30000,
            headers: { "Accept": "application/json", "User-Agent": "Mozilla/5.0" }
        });
        const stickerSet = response.data;
        if (!stickerSet.ok || !stickerSet.result) {
            return await reply("❌ Sticker pack not found or invalid!");
        }
        const stickers = [];
        for (const sticker of stickerSet.result.stickers) {
            try {
                const fileResponse = await axios.get(
                    `https://api.telegram.org/bot${BOT_TOKEN}/getFile?file_id=${sticker.file_id}`
                );
                if (fileResponse.data.ok && fileResponse.data.result.file_path) {
                    const filePath = fileResponse.data.result.file_path;
                    const imageUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${filePath}`;
                    stickers.push({
                        emoji: sticker.emoji || "❓",
                        is_animated: sticker.is_animated || false,
                        is_video: sticker.is_video || false,
                        image_url: imageUrl,
                        file_id: sticker.file_id
                    });
                }
            } catch (fileError) {
                console.error(`Error processing sticker ${sticker.file_id}:`, fileError.message);
                continue;
            }
        }
        if (stickers.length === 0) {
            return await reply("❌ No stickers found or could not process stickers!");
        }
        const stickerData = {
            name: stickerSet.result.name,
            title: stickerSet.result.title,
            sticker_type: stickerSet.result.sticker_type,
            is_animated: stickerSet.result.is_animated || false,
            is_video: stickerSet.result.is_video || false,
            stickers: stickers
        };
        await reply(`📦 *Sticker Pack Info*\n\n` +
                   `*Name:* ${stickerData.name || 'N/A'}\n` +
                   `*Title:* ${stickerData.title || 'N/A'}\n` +
                   `*Type:* ${stickerData.sticker_type || 'regular'}\n` +
                   `*Stickers:* ${stickers.length}\n\n` +
                   `⏳ Processing stickers...`);
        let sentCount = 0;
        let failedCount = 0;
        const totalStickers = stickers.length;
        // 🔥 FIX: Sirf aap ka naam
        let pack = FIXED_PACK_NAME;
        for (const [index, sticker] of stickers.entries()) {
            try {
                const stickerUrl = sticker.image_url;
                const fileExtension = stickerUrl.split('.').pop().toLowerCase();
                if (fileExtension === 'webp') {
                    await conn.sendMessage(from, {
                        sticker: { url: stickerUrl }
                    }, { quoted: mek });
                } else if (fileExtension === 'tgs' || fileExtension === 'webm') {
                    try {
                        const videoBuffer = await getBuffer(stickerUrl);
                        const webpBuffer = await videoToWebp(videoBuffer);
                        let stickerObj = new Sticker(webpBuffer, {
                            pack: pack,
                            author: FIXED_AUTHOR,
                            type: StickerTypes.FULL,
                            categories: ["🤩", "🎉"],
                            id: "12345",
                            quality: 75,
                            background: 'transparent',
                        });
                        const buffer = await stickerObj.toBuffer();
                        await conn.sendMessage(from, {
                            sticker: buffer
                        }, { quoted: mek });
                    } catch (convertError) {
                        console.error(`[TSTICK] Conversion failed for sticker ${index + 1}:`, convertError.message);
                        await conn.sendMessage(from, {
                            document: { url: stickerUrl },
                            fileName: `sticker_${index + 1}.${fileExtension}`,
                            mimetype: 'application/octet-stream'
                        }, { quoted: mek });
                    }
                } else {
                    try {
                        await conn.sendMessage(from, {
                            image: { url: stickerUrl }
                        }, { quoted: mek });
                    } catch (imageError) {
                        await conn.sendMessage(from, {
                            document: { url: stickerUrl },
                            fileName: `sticker_${index + 1}.${fileExtension}`,
                            mimetype: 'application/octet-stream'
                        }, { quoted: mek });
                    }
                }
                sentCount++;
                await new Promise(resolve => setTimeout(resolve, 1500));
            } catch (stickerError) {
                console.error(`[TSTICK] Error sending sticker ${index + 1}:`, stickerError.message);
                failedCount++;
            }
        }
        await conn.sendMessage(from, { react: { text: '✅', key: mek.key } });
        const resultMessage = `✅ Sticker pack download completed!\n\n` +
                             `*Pack:* ${stickerData.name || 'Unknown'}\n` +
                             `*Success:* ${sentCount}/${totalStickers}\n` +
                             `*Failed:* ${failedCount}\n` +
                             (failedCount > 0 ? `\nNote: Some animated stickers may have failed to convert.` : '');
        await reply(resultMessage);
    } catch (error) {
        console.error('[TSTICK] Command Error:', error?.message || error);
        await reply("❌ Download failed: " + (error?.message || 'Unknown error'));
    }
});

// ==================== STICKER COMMAND ====================
cmd({
    pattern: 'sticker',
    alias: ['s', 'take', 'stake', 'vsticker', 'gsticker', 'g2s', 'gs', 'v2s', 'vs'],
    desc: 'Create stickers from images, videos, GIFs with custom pack names',
    category: 'tools',
    react: "⚡",
    use: '<reply media> | <pack name>',
    filename: __filename,
}, async (conn, mek, m, { quoted, args, q, reply, from }) => {
    if (!mek.quoted) return reply(`*Reply to any Image, Video, GIF, or Sticker*`);
    let mime = mek.quoted.mtype;
    // 🔥 FIX: Sirf aap ka naam — user input ignore
    let pack = FIXED_PACK_NAME;
    try {
        let media, stickerBuffer;
        if (mime === "imageMessage" || mime === "stickerMessage") {
            media = await mek.quoted.download();
            let sticker = new Sticker(media, {
                pack: pack,
                author: FIXED_AUTHOR,
                type: StickerTypes.FULL,
                categories: ["🤩", "🎉"],
                id: crypto.randomBytes(4).toString('hex'),
                quality: 75,
                background: 'transparent',
            });
            stickerBuffer = await sticker.toBuffer();
        } else if (mime === "videoMessage") {
            media = await mek.quoted.download();
            const webpBuffer = await StickerMaker.videoToWebp(media);
            let sticker = new Sticker(webpBuffer, {
                pack: pack,
                author: FIXED_AUTHOR,
                type: StickerTypes.FULL,
                categories: ["🤩", "🎉"],
                id: crypto.randomBytes(4).toString('hex'),
                quality: 75,
                background: 'transparent',
            });
            stickerBuffer = await sticker.toBuffer();
        } else {
            return reply("*Please reply to an image, video, GIF, or sticker*");
        }
        return conn.sendMessage(mek.chat, { sticker: stickerBuffer }, { quoted: mek });
    } catch (error) {
        console.error("Sticker creation error:", error);
        return reply(`*Error creating sticker: ${error.message}*`);
    }
});

// ==================== ATTP COMMAND ====================
cmd({
    pattern: "attp",
    desc: "Convert text to a GIF sticker.",
    react: "✨",
    category: "tools",
    use: ".attp HI",
    filename: __filename,
}, async (conn, mek, m, { args, reply }) => {
    try {
        if (!args[0]) return reply("*Please provide text!*");
        const gifBuffer = await StickerMaker.fetchGif(`https://api-fix.onrender.com/api/maker/attp?text=${encodeURIComponent(args[0])}`);
        // 🔥 FIX: Sirf aap ka naam
        const stickerBuffer = await StickerMaker.gifToSticker(gifBuffer, FIXED_PACK_NAME);
        await conn.sendMessage(m.chat, { sticker: stickerBuffer }, { quoted: mek });
    } catch (error) {
        console.error("ATTP error:", error);
        reply(`❌ ${error.message}`);
    }
});

// ==================== AUDIO STICKER HELPERS ====================
const MAX_SEC = 25;
const SESSION_SEC = 40;
const SESSION_DIR = path.join(process.cwd(), 'storage', 'audiosticker');

const sessionPath = (key) =>
    path.join(SESSION_DIR, key.replace(/[^a-zA-Z0-9_-]/g, '_') + '.json');

async function getSession(key) {
    try {
        const raw = await fs.readFile(sessionPath(key), 'utf-8');
        const s = JSON.parse(raw);
        if (Date.now() - s.createdAt > SESSION_SEC * 1000) {
            await delSession(key);
            return null;
        }
        return s;
    } catch {
        return null;
    }
}

async function setSession(key, data) {
    await fs.mkdir(SESSION_DIR, { recursive: true });
    await fs.writeFile(sessionPath(key), JSON.stringify({ ...data, createdAt: Date.now() }));
}

async function delSession(key) {
    const sp = sessionPath(key);
    try {
        const s = JSON.parse(await fs.readFile(sp, 'utf-8'));
        if (s?.stickerPath) await fs.unlink(s.stickerPath).catch(() => {});
    } catch {}
    await fs.unlink(sp).catch(() => {});
}

async function cleanStorage() {
    try {
        const files = await fs.readdir(SESSION_DIR).catch(() => []);
        if (!files.length) return;
        await Promise.all(files.map(f => fs.unlink(path.join(SESSION_DIR, f)).catch(() => {})));
    } catch {}
}

function ff(buffer, inExt, outExt, options = {}) {
    const id = crypto.randomBytes(6).toString('hex');
    const inFile = path.join(os.tmpdir(), `as_${id}.${inExt}`);
    const outFile = path.join(os.tmpdir(), `as_${id}_out.${outExt}`);

    return new Promise(async (resolve, reject) => {
        try {
            await fs.writeFile(inFile, buffer);
            let stderr = '';
            const command = ffmpeg(inFile);

            if (options.videoFilters) command.videoFilters(options.videoFilters);
            if (options.audioFilters) command.audioFilters(options.audioFilters);
            if (options.duration) command.duration(options.duration);
            if (options.outputOptions) command.outputOptions(options.outputOptions);

            command
                .on('stderr', line => { stderr += line + '\n'; })
                .on('error', async (err) => {
                    await fs.unlink(inFile).catch(() => {});
                    await fs.unlink(outFile).catch(() => {});
                    reject(new Error(`ffmpeg: ${err.message.split('\n')[0]}`));
                })
                .on('end', async () => {
                    try {
                        const data = await fs.readFile(outFile);
                        resolve({ data, stderr });
                    } catch (e) {
                        reject(e);
                    } finally {
                        await fs.unlink(inFile).catch(() => {});
                        await fs.unlink(outFile).catch(() => {});
                    }
                })
                .save(outFile);
        } catch (e) {
            reject(e);
        }
    });
}

const KINDS = { stickerMessage: 'sticker', imageMessage: 'image', videoMessage: 'video', audioMessage: 'audio' };

function pick(content, download) {
    if (!content) return null;
    for (const [type, kind] of Object.entries(KINDS)) {
        const body = content[type];
        if (body) return { kind, seconds: Number(body.seconds || 0), animated: Boolean(body.isAnimated), download };
    }
    return null;
}

function getMedia(sock, msg) {
    const dl = (m) => downloadMediaMessage(m, 'buffer', {}, {
        logger: sock.logger || console,
        reuploadRequest: sock.updateMediaMessage
    });
    const content = normalizeMessageContent(msg.message);
    const own = pick(content, () => dl(msg));
    const info = Object.values(content || {})
        .map(v => v && typeof v === 'object' && v.contextInfo)
        .find(c => c && c.quotedMessage);
    const quoted = info?.quotedMessage
        ? pick(normalizeMessageContent(info.quotedMessage), () =>
            dl({ key: { remoteJid: msg.key.remoteJid, id: info.stanzaId, participant: info.participant }, message: info.quotedMessage }))
        : null;
    return own || quoted;
}

const SCALE = 'scale=512:512:force_original_aspect_ratio=decrease,format=rgba,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=#00000000,setsar=1';

async function videoToWebpAudio(buffer) {
    let out;
    for (const [fps, q] of [[10, 50], [8, 36], [6, 24], [5, 16]]) {
        out = (await ff(buffer, 'mp4', 'webp', {
            duration: MAX_SEC,
            videoFilters: `fps=${fps},${SCALE}`,
            outputOptions: [
                '-c:v libwebp',
                '-lossless 0',
                '-compression_level 6',
                `-q:v ${q}`,
                '-loop 0',
                '-preset picture',
                '-an'
            ]
        })).data;
        if (out.length <= 880 * 1024) break;
    }
    if (out.length > 1024 * 1024) throw new Error('Video is too long or too detailed for a sticker.');
    return out;
}

async function imageToWebpAudio(buffer) {
    return (await ff(buffer, 'jpg', 'webp', {
        videoFilters: SCALE,
        outputOptions: [
            '-c:v libwebp',
            '-lossless 0',
            '-q:v 80',
            '-an'
        ]
    })).data;
}

async function toStickerAudio(buffer, kind, pack, author) {
    let data = buffer;
    if (kind === 'video') data = await videoToWebpAudio(buffer);
    else if (kind === 'image') data = await imageToWebpAudio(buffer);

    const json = {
        'sticker-pack-id': 'com.jawad.audiosticker',
        'sticker-pack-name': pack,
        'sticker-pack-publisher': author,
        emojis: ['🎬']
    };
    const head = Buffer.from([0x49, 0x49, 0x2a, 0x00, 0x08, 0x00, 0x00, 0x00, 0x01, 0x00, 0x41, 0x57, 0x07, 0x00, 0x00, 0x00, 0x00, 0x00, 0x16, 0x00, 0x00, 0x00]);
    const body = Buffer.from(JSON.stringify(json), 'utf-8');
    const exif = Buffer.concat([head, body]);
    exif.writeUIntLE(body.length, 14, 4);

    const img = new webp.Image();
    await img.load(data);
    img.exif = exif;
    return await img.save(null);
}

async function toAudioMessage(sock, buffer, ext, fallbackSec = 0) {
    const { data, stderr } = await ff(buffer, ext, 'ogg', {
        duration: MAX_SEC,
        audioFilters: 'aresample=48000:async=1:first_pts=0',
        outputOptions: [
            '-vn',
            '-map 0:a:0',
            '-c:a libopus',
            '-b:a 48k',
            '-vbr on',
            '-compression_level 10',
            '-ac 1',
            '-ar 48000',
            '-application audio',
            '-avoid_negative_ts make_zero',
            '-f ogg'
        ]
    });
    if (data.length < 200) throw new Error('Audio is empty or too short.');

    const times = [...stderr.matchAll(/time=(\d+):(\d+):(\d+(?:\.\d+)?)/g)].pop();
    const real = times ? +times[1] * 3600 + +times[2] * 60 + +times[3] : 0;

    const { audioMessage } = await prepareWAMessageMedia(
        { audio: data, mimetype: 'audio/ogg; codecs=opus', ptt: true },
        { upload: sock.waUploadToServer }
    );
    audioMessage.seconds = Math.max(1, Math.min(MAX_SEC, Math.round(real || fallbackSec || 5)));
    audioMessage.ptt = true;
    audioMessage.mimetype = 'audio/ogg; codecs=opus';
    if (!audioMessage.waveform?.length) {
        audioMessage.waveform = Buffer.from(Array.from({ length: 64 }, (_, i) => 18 + (data[(i * 19 + 7) % data.length] % 76)));
    }
    return audioMessage;
}

async function sendAudioSticker(sock, chat, sticker, animated, audioMsg) {
    patchProto(proto);
    const prepared = await prepareWAMessageMedia({ sticker, isAnimated: animated }, { upload: sock.waUploadToServer });
    prepared.stickerMessage.isAnimated = Boolean(animated);
    prepared.stickerMessage.audioMessage = audioMsg;

    await sock.relayMessage(chat, {
        __proto__: prepared,
        audioStickerMessage: { message: prepared },
        messageContextInfo: { messageSecret: crypto.randomBytes(32) }
    }, {});
}

function patchProto(proto) {
    const M = proto?.Message;
    if (!M || M.__audiostickerPatched) return;

    if (M.StickerMessage) {
        const encode = M.StickerMessage.encode;
        M.StickerMessage.encode = function (message, writer) {
            const audio = message?.audioMessage;
            if (audio) delete message.audioMessage;
            const w = encode.call(this, message, writer);
            if (audio && M.AudioMessage) {
                message.audioMessage = audio;
                M.AudioMessage.encode(audio, w.uint32(210).fork()).ldelim();
            }
            return w;
        };

        const fromObject = M.StickerMessage.fromObject;
        if (typeof fromObject === 'function') {
            M.StickerMessage.fromObject = function (object) {
                const msg = fromObject.call(this, object);
                if (object?.audioMessage) {
                    msg.audioMessage = M.AudioMessage?.fromObject
                        ? M.AudioMessage.fromObject(object.audioMessage)
                        : object.audioMessage;
                }
                return msg;
            };
        }
    }

    const encode = M.encode;
    M.encode = function (message, writer) {
        const asm = message?.audioStickerMessage;
        if (asm) { delete message.stickerMessage; delete message.audioStickerMessage; }
        let w;
        try { w = encode.call(this, message, writer); }
        finally { if (asm) message.audioStickerMessage = asm; }
        if (asm && M.FutureProofMessage) M.FutureProofMessage.encode(asm, w.uint32(1074).fork()).ldelim();
        return w;
    };

    const fromObject = M.fromObject;
    if (typeof fromObject === 'function') {
        M.fromObject = function (object) {
            const msg = fromObject.call(this, object);
            if (object?.audioStickerMessage) {
                const inner = object.audioStickerMessage.message || object.audioStickerMessage;
                if (inner?.stickerMessage && object.audioStickerMessage.message?.stickerMessage?.audioMessage) {
                    inner.stickerMessage.audioMessage = object.audioStickerMessage.message.stickerMessage.audioMessage;
                }
                msg.audioStickerMessage = { message: inner };
                delete msg.stickerMessage;
                if (inner) Object.setPrototypeOf(msg, inner);
            }
            return msg;
        };
    }

    M.__audiostickerPatched = true;
}

// ==================== AUDIOSTICKER COMMAND ====================
cmd({
    pattern: "audiosticker",
    alias: ["as"],
    react: "🎬",
    desc: "Create audio stickers from video/image + audio",
    category: "tools",
    use: "<reply media> | pack name",
    filename: __filename
}, async (conn, mek, m, { from, sender, reply, text, userConfig }) => {
    const key = `${from}:${sender || from}`;
    const arg = (text || '').trim();
    const cmdText = (config.PREFIX || '.') + 'audiosticker';

    const react = (emoji) => {
        try {
            const p = conn.sendMessage(from, { react: { text: emoji, key: mek.key } });
            if (p && typeof p.catch === 'function') p.catch(() => {});
        } catch {}
    };
    const safeReply = (msg) => {
        try {
            const p = reply(msg);
            if (p && typeof p.catch === 'function') p.catch(() => {});
            return p;
        } catch {}
    };

    try {
        const media = getMedia(conn, mek);
        const session = await getSession(key);

        const content = normalizeMessageContent(mek.message);
        const ownAudio = content?.audioMessage
            ? {
                seconds: Number(content.audioMessage.seconds || 0),
                download: () => downloadMediaMessage(mek, 'buffer', {}, {
                    logger: conn.logger || console,
                    reuploadRequest: conn.updateMediaMessage
                })
            }
            : null;

        const quotedInfo = Object.values(content || {})
            .map(v => v && typeof v === 'object' && v.contextInfo)
            .find(c => c && c.quotedMessage);

        let quotedSticker = null;
        if (quotedInfo?.quotedMessage) {
            const q = normalizeMessageContent(quotedInfo.quotedMessage);
            if (q?.stickerMessage) {
                quotedSticker = {
                    animated: Boolean(q.stickerMessage.isAnimated),
                    download: () => downloadMediaMessage(
                        { key: { remoteJid: from, id: quotedInfo.stanzaId, participant: quotedInfo.participant }, message: quotedInfo.quotedMessage },
                        'buffer', {},
                        { logger: conn.logger || console, reuploadRequest: conn.updateMediaMessage }
                    )
                };
            }
        }

        if (ownAudio && quotedSticker) {
            await react('⏳');
            try {
                const stickerBuf = await quotedSticker.download();
                const audioMsg = await toAudioMessage(conn, await ownAudio.download(), 'ogg', ownAudio.seconds);
                await sendAudioSticker(conn, from, stickerBuf, quotedSticker.animated, audioMsg);
                await react('✅');
            } catch (e) {
                await react('❌');
                safeReply(`❌ ғᴀɪʟᴇᴅ:\n${String(e.message).slice(0, 200)}`);
            }
            return;
        }

        if (session && (media?.kind === 'audio' || media?.kind === 'video')) {
            await react('⏳');
            try {
                const stickerBuffer = await fs.readFile(session.stickerPath);
                const audio = await toAudioMessage(conn, await media.download(), media.kind === 'video' ? 'mp4' : 'ogg', media.seconds);
                await sendAudioSticker(conn, from, stickerBuffer, session.animated, audio);
                await react('✅');
            } catch (e) {
                await react('❌');
                safeReply(`❌ ғᴀɪʟᴇᴅ:\n${String(e.message).slice(0, 200)}`);
            } finally {
                await delSession(key);
                await cleanStorage();
            }
            return;
        }

        if (!media) {
            return safeReply(
                `🎬 ᴀᴜᴅɪᴏ sᴛɪᴄᴋᴇʀ\n\n` +
                `🎬 sᴇɴᴅ / ʀᴇᴘʟʏ ᴀ ᴠɪᴅᴇᴏ ᴡɪᴛʜ ${cmdText}\n` +
                `↳ ᴄʀᴇᴀᴛᴇs ᴛʜᴇ ᴀᴜᴅɪᴏ sᴛɪᴄᴋᴇʀ ɪɴsᴛᴀɴᴛʟʏ\n` +
                `🖼️ sᴇɴᴅ / ʀᴇᴘʟʏ ᴀ ᴘʜᴏᴛᴏ ᴏʀ sᴛɪᴄᴋᴇʀ ᴡɪᴛʜ ${cmdText}\n` +
                `↳ ᴛʜᴇɴ ʀᴇᴘʟʏ ᴡɪᴛʜ ᴀᴜᴅɪᴏ / ᴠɴ (ᴍᴀx ${SESSION_SEC} sᴇᴄs)\n` +
                `🩹 ʀᴇᴘʟʏ ᴀ sᴛɪᴄᴋᴇʀ + ᴀᴛᴛᴀᴄʜ ᴀᴜᴅɪᴏ ᴡɪᴛʜ ${cmdText}\n` +
                `↳ ᴀᴅᴅs sᴏᴜɴᴅ ᴛᴏ ᴀɴ ᴇxɪsᴛɪɴɢ sᴛɪᴄᴋᴇʀ\n` +
                `⚙️ ᴘᴀᴄᴋ ɴᴀᴍᴇ: ${FIXED_PACK_NAME}`
            );
        }

        if (media.kind === 'audio') {
            return safeReply(`🖼️ sᴇɴᴅ ᴀ ᴘʜᴏᴛᴏ / sᴛɪᴄᴋᴇʀ ғɪʀsᴛ ᴡɪᴛʜ ${cmdText},\nᴛʜᴇɴ ʀᴇᴘʟʏ ᴡɪᴛʜ ᴛʜᴇ ᴀᴜᴅɪᴏ.`);
        }

        await react('⏳');

        // 🔥 FIX: Sirf aap ka naam
        let pack = FIXED_PACK_NAME;
        const author = FIXED_AUTHOR;

        const buffer = await media.download();
        const sticker = await toStickerAudio(buffer, media.kind, pack, author);
        const animated = media.kind === 'video' || (media.kind === 'sticker' && media.animated);

        if (media.kind === 'video') {
            try {
                const audio = await toAudioMessage(conn, buffer, 'mp4', media.seconds);
                await sendAudioSticker(conn, from, sticker, true, audio);
                await react('✅');
                await cleanStorage();
                return;
            } catch (e) {
                console.error('[audiosticker] video audio failed, session fallback:', String(e.message).slice(0, 120));
            }
        }

        await delSession(key);
        await fs.mkdir(SESSION_DIR, { recursive: true });
        const stickerPath = path.join(SESSION_DIR, `sticker_${crypto.randomBytes(6).toString('hex')}.webp`);
        await fs.writeFile(stickerPath, sticker);
        await setSession(key, { stickerPath, animated });

        await react('🖼️');
        return safeReply(
            `✅ sᴛɪᴄᴋᴇʀ sᴇssɪᴏɴ ᴀᴄᴛɪᴠᴇ\n\n` +
            `⏱️ ᴛɪᴍᴇ: ${SESSION_SEC} sᴇᴄs\n` +
            `🎙️ ɴᴏᴡ ʀᴇᴘʟʏ ᴡɪᴛʜ ᴀ ᴠᴏɪᴄᴇ ɴᴏᴛᴇ / ᴀᴜᴅɪᴏ / ᴠɪᴅᴇᴏ ᴜsɪɴɢ ${cmdText}`
        );

    } catch (e) {
        console.error('[audiosticker] Error:', e.message);
        await react('❌');
        await cleanStorage().catch(() => {});
        safeReply(`❌ ғᴀɪʟᴇᴅ:\n${String(e.message || e).split('\n')[0].slice(0, 200)}`);
    }
});
