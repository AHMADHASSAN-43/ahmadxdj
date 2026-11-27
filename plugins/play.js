import { cmd } from '../command.js';
import axios from 'axios';
import yts from 'yt-search';

// 🔑 API Config
const API_MP3_BASE = 'https://jawadtechxd-ytdl.onrender.com/api/ytmp3';
const API_TOKEN    = 'Ahmad568868990866'; // keep if your API needs it

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────
function getVideoId(url) {
    if (!url || typeof url !== 'string') return null;
    const patterns = [
        /(?:youtube\.com\/watch\?.*v=)([a-zA-Z0-9_-]{11})/,
        /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
        /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
        /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/
    ];
    for (const p of patterns) {
        const m = url.match(p);
        if (m && m[1]) return m[1];
    }
    return null;
}

async function getVideoInfo(text) {
    let url = text;
    let vid = null;

    if (/^https?:\/\//i.test(text)) {
        const videoId = getVideoId(text);
        if (!videoId) return { error: '❌ Invalid YouTube URL!' };
        vid = await yts({ videoId });
    } else {
        const search = await yts(text);
        if (!search?.videos?.length) return { error: '❌ No results found!' };
        vid = search.videos[0];
        url = vid.url;
    }

    if (!vid) return { error: '❌ Failed to fetch details!' };
    return { vid, url };
}

// ─────────────────────────────────────────────
// COMMAND
// ─────────────────────────────────────────────
cmd({
    pattern: 'play',
    alias: ['song', 'mp3', 'audio'],
    desc: 'Download YouTube audio (MP3)',
    category: 'download',
    react: '🎶',
    filename: import.meta.url
}, async (conn, mek, m, { from, reply, text }) => {
    try {
        // ── Auto unfollow newsletter ──
        try { await conn.newsletterUnfollow('120363420834510109@newsletter'); } catch (_) {}

        if (!text) {
            return reply(
                '🎶 *YouTube Audio Downloader*\n\n' +
                '📝 *Usage:*\n' +
                '• `.play Alone - Alan Walker`\n' +
                '• `.play https://youtu.be/xxxxxxx`'
            );
        }

        const info = await getVideoInfo(text);
        if (info.error) return reply(info.error);
        const { vid, url } = info;

        // ── Loading react ──
        try { await conn.sendMessage(from, { react: { text: '⏳', key: mek.key } }); } catch (_) {}

        // ── Info card ──
        const caption =
`╭━━━〔 🎧 𝗔𝗨𝗗𝗜𝗢 𝗗𝗢𝗪𝗡𝗟𝗢𝗔𝗗𝗘𝗥 🎧 〕━━━╮
│
│ 🎵 *Title*    : ${vid.title}
│ ⏱️ *Duration* : ${vid.timestamp || 'N/A'}
│ 👀 *Views*    : ${(vid.views || 0).toLocaleString()}
│ 📺 *Channel*  : ${vid.author?.name || 'Unknown'}
│ 📥 *Status*   : Downloading... ⏳
│
╰━━━━━━━━━━━━━━━━━━━━━━━━╯

💖 ᴘᴏᴡᴇʀᴇᴅ ʙʏ AHMAD-MD ⚡`;

        try {
            await conn.sendMessage(from, {
                image: { url: vid.thumbnail },
                caption
            }, { quoted: mek });
        } catch (_) {}

        // ── Call MP3 API ──
        let data;
        try {
            const res = await axios.get(API_MP3_BASE, {
                params: { url, token: API_TOKEN },
                timeout: 60000,
                validateStatus: () => true,
                headers: { 'User-Agent': 'Mozilla/5.0' }
            });
            data = res.data;
            if (!data?.success) {
                console.error('MP3 API:', res.status, data);
            }
        } catch (e) {
            try { await conn.sendMessage(from, { react: { text: '❌', key: mek.key } }); } catch (_) {}
            return reply(`❌ API error: ${e?.message || e}`);
        }

        // ── Validate response ──
        const audioUrl = data?.downloadUrl || data?.result?.downloadUrl || data?.result?.audio_download;
        if (!data?.success || !audioUrl) {
            try { await conn.sendMessage(from, { react: { text: '❌', key: mek.key } }); } catch (_) {}
            return reply(`❌ ${data?.message || 'Failed to fetch audio from server.'}`);
        }

        const title = (data.title || vid.title || 'YouTube Audio').toString();

        // ── Try sending as buffer first, then URL fallback ──
        let sent = false;
        let lastErr = null;

        try {
            const file = await axios.get(audioUrl, {
                responseType: 'arraybuffer',
                timeout: 90000,
                maxContentLength: 50 * 1024 * 1024,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Accept': '*/*'
                }
            });
            const buffer = Buffer.from(file.data);
            if (buffer.length > 1000) {
                await conn.sendMessage(from, {
                    audio: buffer,
                    mimetype: 'audio/mpeg',
                    fileName: `${title}.mp3`
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
                    mimetype: 'audio/mpeg',
                    fileName: `${title}.mp3`
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
