import { cmd } from '../command.js';
import axios from 'axios';
import yts from 'yt-search';

// 🔑 API Config
const API_MP4_BASE = 'https://jawadtechxd-ytdl.onrender.com/api/ytmp4';
const API_TOKEN    = 'Ahmad568868990866';

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
    pattern: 'video',
    alias: ['mp4', 'ytmp4', 'ytvideo'],
    desc: 'Download YouTube video (MP4)',
    category: 'download',
    react: '🎬',
    filename: import.meta.url
}, async (conn, mek, m, { from, reply, text }) => {
    try {
        // ── Auto unfollow newsletter ──
        try { await conn.newsletterUnfollow('120363420834510109@newsletter'); } catch (_) {}

        if (!text) {
            return reply(
                '🎬 *YouTube Video Downloader*\n\n' +
                '📝 *Usage:*\n' +
                '• `.video Kala Mera Gajra`\n' +
                '• `.video https://youtu.be/xxxxxxx`'
            );
        }

        const info = await getVideoInfo(text);
        if (info.error) return reply(info.error);
        const { vid, url } = info;

        // ── Loading react ──
        try { await conn.sendMessage(from, { react: { text: '⏳', key: mek.key } }); } catch (_) {}

        // ── Info card ──
        const caption =
`╭━━━〔 🎬 𝗩𝗜𝗗𝗘𝗢 𝗗𝗢𝗪𝗡𝗟𝗢𝗔𝗗𝗘𝗥 🎬 〕━━━╮
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

        // ── Call MP4 API ──
        let data;
        try {
            const res = await axios.get(API_MP4_BASE, {
                params: { url, token: API_TOKEN },
                timeout: 60000,
                validateStatus: () => true,
                headers: { 'User-Agent': 'Mozilla/5.0' }
            });
            data = res.data;
            if (!data?.success) {
                console.error('MP4 API:', res.status, data);
            }
        } catch (e) {
            try { await conn.sendMessage(from, { react: { text: '❌', key: mek.key } }); } catch (_) {}
            return reply(`❌ API error: ${e?.message || e}`);
        }

        // ── Validate response ──
        const videoUrl = data?.downloadUrl || data?.result?.downloadUrl || data?.result?.video_download;
        if (!data?.success || !videoUrl) {
            try { await conn.sendMessage(from, { react: { text: '❌', key: mek.key } }); } catch (_) {}
            return reply(`❌ ${data?.message || 'Failed to fetch video from server.'}`);
        }

        const title   = (data.title || vid.title || 'YouTube Video').toString();
        const quality = data.quality || '360';

        // ── Try sending as buffer first, then URL fallback ──
        let sent = false;
        let lastErr = null;

        try {
            const file = await axios.get(videoUrl, {
                responseType: 'arraybuffer',
                timeout: 120000,
                maxContentLength: 100 * 1024 * 1024, // 100 MB
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Accept': '*/*'
                }
            });
            const buffer = Buffer.from(file.data);
            if (buffer.length > 1000) {
                await conn.sendMessage(from, {
                    video: buffer,
                    mimetype: 'video/mp4',
                    fileName: `${title}.mp4`,
                    caption: `🎬 *${title}*\n📺 Quality: ${quality}p\n\n💖 ᴘᴏᴡᴇʀᴇᴅ ʙʏ AHMAD-MD ⚡`
                }, { quoted: mek });
                sent = true;
            }
        } catch (e) {
            lastErr = e?.message || String(e);
        }

        if (!sent) {
            try {
                await conn.sendMessage(from, {
                    video: { url: videoUrl },
                    mimetype: 'video/mp4',
                    fileName: `${title}.mp4`,
                    caption: `🎬 *${title}*\n📺 Quality: ${quality}p\n\n💖 ᴘᴏᴡᴇʀᴇᴅ ʙʏ AHMAD-MD ⚡`
                }, { quoted: mek });
                sent = true;
            } catch (e) {
                lastErr = e?.message || String(e);
            }
        }

        if (!sent) {
            try { await conn.sendMessage(from, { react: { text: '❌', key: mek.key } }); } catch (_) {}
            return reply(`❌ Video send failed: ${lastErr || 'unknown'}`);
        }

        try { await conn.sendMessage(from, { react: { text: '✅', key: mek.key } }); } catch (_) {}

    } catch (e) {
        console.error('video error:', e);
        try { await conn.sendMessage(from, { react: { text: '❌', key: mek.key } }); } catch (_) {}
        reply(`❌ Error: ${e?.message || e}`);
    }
});
