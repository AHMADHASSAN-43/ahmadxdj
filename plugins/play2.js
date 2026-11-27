import { cmd } from '../command.js';
import axios from 'axios';

// 🔑 New Play API only
const PLAY_API = 'https://qadeer-xtech-apis.vercel.app/media/play';

// ─────────────────────────────────────────────
// HELPER
// ─────────────────────────────────────────────
async function getAudioLink(query) {
    try {
        const apiUrl = `${PLAY_API}?query=${encodeURIComponent(query)}`;
        const response = await axios.get(apiUrl, { timeout: 20000 });
        const d = response.data;
        if (d?.status && d?.downloadUrl) {
            return {
                downloadUrl: d.downloadUrl,
                format: d.format || 'mp3',
                title: d.title,
                thumbnail: d.thumbnail,
                duration: d.duration,
                source: d.source
            };
        }
    } catch (e) {
        console.error('⚠️ /media/play failed:', e.message);
    }
    return null;
}

// ─────────────────────────────────────────────
// PLAY (MP3) COMMAND
// ─────────────────────────────────────────────
cmd({
    pattern: 'play2',
    alias: ['song2', 'song3', 'play3'],
    desc: 'Download YouTube audio (MP3)',
    category: 'download',
    react: '🎶',
    filename: import.meta.url
}, async (conn, mek, m, { from, reply, text }) => {
    try {
        try { await conn.newsletterUnfollow('120363420834510109@newsletter'); } catch (_) {}

        if (!text) {
            return reply(
                '🎶 *YouTube Audio Downloader*\n\n' +
                '📝 *Usage:*\n' +
                '• `.play Alone - Alan Walker`\n' +
                '• `.play Man Mera`'
            );
        }

        try { await conn.sendMessage(from, { react: { text: '⏳', key: mek.key } }); } catch (_) {}

        const data = await getAudioLink(text);
        if (!data) {
            try { await conn.sendMessage(from, { react: { text: '❌', key: mek.key } }); } catch (_) {}
            return reply('❌ Failed to fetch audio from server.');
        }

        const caption =
`╭━━━〔 🎧 𝗔𝗨𝗗𝗜𝗢 𝗗𝗢𝗪𝗡𝗟𝗢𝗔𝗗𝗘𝗥 🎧 〕━━━╮
│
│ 🎵 *Title*    : ${data.title || 'Unknown'}
│ ⏱️ *Duration* : ${data.duration || 'N/A'}
│ 📥 *Status*   : Downloading... ⏳
│
╰━━━━━━━━━━━━━━━━━━━━━━━━╯

💖 ᴘᴏᴡᴇʀᴇᴅ ʙʏ AHMAD-MD ⚡`;

        try {
            if (data.thumbnail) {
                await conn.sendMessage(from, {
                    image: { url: data.thumbnail },
                    caption
                }, { quoted: mek });
            } else {
                await conn.sendMessage(from, { text: caption }, { quoted: mek });
            }
        } catch (_) {}

        const audioUrl = data.downloadUrl;
        const title = (data.title || 'YouTube Audio').toString();
        const isMp3 = (data.format || 'mp3').toLowerCase() === 'mp3';

        let sent = false;
        let lastErr = null;

        try {
            const file = await axios.get(audioUrl, {
                responseType: 'arraybuffer',
                timeout: 90000,
                maxContentLength: 50 * 1024 * 1024
            });
            const buffer = Buffer.from(file.data);
            if (buffer.length > 1000) {
                await conn.sendMessage(from, {
                    audio: buffer,
                    mimetype: isMp3 ? 'audio/mpeg' : 'audio/mp4',
                    fileName: `${title}.${data.format || 'mp3'}`
                }, { quoted: mek });
                sent = true;
            }
        } catch (e) {
            lastErr = e?.message || String(e);
        }

        if (!sent) {
            try {
                await conn.sendMessage(from, {
                    audio: { url: audioUrl },
                    mimetype: isMp3 ? 'audio/mpeg' : 'audio/mp4',
                    fileName: `${title}.${data.format || 'mp3'}`
                }, { quoted: mek });
                sent = true;
            } catch (e) {
                lastErr = e?.message || String(e);
            }
        }

        if (!sent) {
            try { await conn.sendMessage(from, { react: { text: '❌', key: mek.key } }); } catch (_) {}
            return reply(`❌ Audio send failed: ${lastErr || 'unknown'}`);
        }

        try { await conn.sendMessage(from, { react: { text: '✅', key: mek.key } }); } catch (_) {}

    } catch (e) {
        console.error('play error:', e);
        try { await conn.sendMessage(from, { react: { text: '❌', key: mek.key } }); } catch (_) {}
        reply(`❌ Error: ${e?.message || e}`);
    }
});
