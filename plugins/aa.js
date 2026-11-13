import { fileURLToPath } from 'url';
import config from '../config.js';
import { cmd } from '../command.js';
import axios from 'axios';
import AdmZip from 'adm-zip';
import { getBuffer } from "../lib/functions.js";
import { videoToWebp } from '../lib/video-utils.js';
import { Sticker, StickerTypes } from "wa-sticker-formatter";

const __filename = fileURLToPath(import.meta.url);

const BOT_TOKEN =
    config.TELEGRAM_BOT_TOKEN ||
    process.env.TELEGRAM_BOT_TOKEN ||
    '9072785206:AAFrdbvhn6Sr5wZWXAP_bHUO7Wwhgp4BM5U';

const PACK_NAME = "𝘼𝙃𝙈𝘼𝘿🚩";
const BATCH_SIZE = 5;

async function convertSticker(s) {
    const ext = s.file_path.split('.').pop().toLowerCase();
    const buf = await getBuffer(s.image_url);
    if (!buf || !buf.length) throw new Error('Empty buffer');

    // Static webp
    if (ext === 'webp' && !s.is_animated && !s.is_video) {
        return { buffer: buf, ext: 'webp' };
    }

    // Video (webm) sticker -> webp
    if (ext === 'webm' || s.is_video) {
        const webp = await videoToWebp(buf);
        if (!webp || !webp.length) throw new Error('Empty WebP');
        const out = await new Sticker(webp, {
            pack: PACK_NAME,
            type: StickerTypes.FULL,
            quality: 75,
            background: 'transparent',
        }).toBuffer();
        return { buffer: out, ext: 'webp' };
    }

    // .tgs etc: as-is
    return { buffer: buf, ext };
}

cmd({
    pattern: "testicker",
    alias: ["tegs", "teg", "tegs", "tegstick", "tlegramsticker"],
    react: "🛡️",
    desc: "Download Telegram sticker pack (single ZIP)",
    category: "download",
    use: ".tsticker <telegram_sticker_url>",
    filename: __filename
}, async (conn, mek, m, { from, q, reply, isCreator }) => {
    try {
        if (!isCreator) return await reply("📛 This is an owner command.");
        if (!q) return await reply("❌ Sticker pack URL do!\nExample: .tsticker https://t.me/addstickers/packname");

        if (!q.includes('t.me/addstickers/') && !q.includes('telegram.me/addstickers/')) {
            return await reply("❌ Valid Telegram sticker pack URL do!");
        }

        await conn.sendMessage(from, { react: { text: '⏳', key: mek.key } });
        await reply("📦 Downloading sticker pack... Please wait!");

        const packName = q.trim()
            .replace(/^https?:\/\/(t|telegram)\.me\/addstickers\//, "")
            .split('?')[0].trim();
        if (!packName) return await reply("❌ Invalid sticker pack URL!");

        const { data } = await axios.get(
            `https://api.telegram.org/bot${BOT_TOKEN}/getStickerSet?name=${encodeURIComponent(packName)}`,
            { timeout: 30000 }
        );

        if (!data?.ok) return await reply(`❌ Failed: ${data?.description || 'Invalid response'}`);

        const stickerSet = data.result;
        if (!stickerSet?.stickers?.length) return await reply("❌ Pack me koi sticker nahi mila!");

        // File paths (batch me, tez)
        const stickers = [];
        for (let i = 0; i < stickerSet.stickers.length; i += 10) {
            const chunk = stickerSet.stickers.slice(i, i + 10);
            const res = await Promise.allSettled(chunk.map(st =>
                axios.get(`https://api.telegram.org/bot${BOT_TOKEN}/getFile?file_id=${st.file_id}`)
                    .then(r => ({ st, r }))
            ));
            for (const x of res) {
                if (x.status !== 'fulfilled') continue;
                const { st, r } = x.value;
                if (r.data?.ok && r.data.result?.file_path) {
                    const fp = r.data.result.file_path;
                    stickers.push({
                        is_animated: st.is_animated || false,
                        is_video: st.is_video || false,
                        file_path: fp,
                        image_url: `https://api.telegram.org/file/bot${BOT_TOKEN}/${fp}`
                    });
                }
            }
        }

        if (!stickers.length) return await reply("❌ Koi sticker process nahi ho saka!");

        await reply(
            `📦 *Sticker Pack Info*\n\n` +
            `*Title:* ${stickerSet.title || 'N/A'}\n` +
            `*Stickers:* ${stickers.length}\n\n` +
            `⏳ ZIP bana raha hoon...`
        );

        const zip = new AdmZip();
        let success = 0, failed = 0;

        for (let i = 0; i < stickers.length; i += BATCH_SIZE) {
            const batch = stickers.slice(i, i + BATCH_SIZE);
            const results = await Promise.allSettled(batch.map(convertSticker));
            results.forEach((r, j) => {
                const num = String(i + j + 1).padStart(3, '0');
                if (r.status === 'fulfilled') {
                    zip.addFile(`sticker_${num}.${r.value.ext}`, r.value.buffer);
                    success++;
                } else {
                    console.error(`[TSTICK] ${num} failed:`, r.reason?.message);
                    failed++;
                }
            });
        }

        if (success === 0) return await reply("❌ Koi sticker convert nahi ho saka!");

        const safeName = (stickerSet.title || stickerSet.name || 'stickers').replace(/[^\w\-]+/g, '_');

        await conn.sendMessage(from, {
            document: zip.toBuffer(),
            fileName: `${safeName}.zip`,
            mimetype: 'application/zip',
            caption: `✅ *${stickerSet.title || stickerSet.name}*\n📦 ${success}/${stickers.length} stickers` +
                     (failed ? `\n⚠️ ${failed} failed` : '')
        }, { quoted: mek });

        await conn.sendMessage(from, { react: { text: '✅', key: mek.key } });

    } catch (error) {
        console.error('[TSTICK] Error:', error?.message || error);
        let msg = "❌ Download failed: ";
        if (error.response?.status === 404) msg += "Sticker pack nahi mila, URL check karo.";
        else if (error.response?.status === 401) msg += "Bot token galat hai.";
        else if (error.code === 'ECONNABORTED') msg += "Timeout, dobara try karo.";
        else msg += error?.message || 'Unknown error';
        await reply(msg);
    }
});
