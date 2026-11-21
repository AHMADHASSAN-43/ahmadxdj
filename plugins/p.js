import { cmd } from '../command.js';
import axios from 'axios';
import yts from 'yt-search';

// 🔑 Apni API (Vercel)
const API_BASE = 'https://play-eight-phi.vercel.app';

function getVideoId(url) {
    if (!url || typeof url !== 'string') return null;
    const patterns = [
        /(?:youtube\.com\/watch\?.*v=)([a-zA-Z0-9_-]{11})/,
        /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
        /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
        /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/
    ];
    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match && match[1]) return match[1];
    }
    return null;
}

// Naam ho to API /api/play se, link ho to yt-search + /api/audio se
async function getSongInfo(text) {
    if (text.startsWith('http://') || text.startsWith('https://')) {
        const videoId = getVideoId(text);
        if (!videoId) return { error: "❌ Invalid YouTube URL!" };
        const vid = await yts({ videoId });
        if (!vid) return { error: "❌ Failed to fetch details!" };
        return {
            title: vid.title,
            author: vid.author?.name,
            duration: vid.timestamp,
            views: vid.views,
            thumbnail: vid.thumbnail,
            url: text,
            audio: `${API_BASE}/api/audio?url=${encodeURIComponent(text)}`
        };
    }

    const res = await axios.get(`${API_BASE}/api/play`, {
        params: { q: text },
        timeout: 30000,
        validateStatus: () => true
    });
    if (!res.data?.status || !res.data?.result) {
        return { error: `❌ ${res.data?.message || 'No results found!'}` };
    }
    return res.data.result;
}

cmd({
    pattern: "play5",
    alias: ["song5", "mp35"],
    desc: "Download YouTube audio via my own API",
    category: "download",
    react: "🎶",
    filename: import.meta.url
}, async (conn, mek, m, { from, q, reply, text }) => {
    try {
        if (!text) return reply("🎶 Please provide a song name or link.\n\nExample: `.song Alone - Alan Walker`");

        try { await conn.sendMessage(from, { react: { text: "⏳", key: mek.key } }); } catch (_) {}

        let song;
        try {
            song = await getSongInfo(text);
        } catch (apiErr) {
            try { await conn.sendMessage(from, { react: { text: "❌", key: mek.key } }); } catch (_) {}
            return reply(`❌ API error: ${apiErr?.message || apiErr}`);
        }
        if (song.error) {
            try { await conn.sendMessage(from, { react: { text: "❌", key: mek.key } }); } catch (_) {}
            return reply(song.error);
        }

        const title = (song.title || 'YouTube Song').toString();
        const audioUrl = song.audio;

        const infoCaption =
`╭━━━〔 🎧 𝗔𝗨𝗗𝗜𝗢 𝗗𝗢𝗪𝗡𝗟𝗢𝗔𝗗𝗘𝗥 🎧 〕━━━╮
│
│ 🎵 *Title*    : ${title}
│ ⏱️ *Duration* : ${song.duration || 'N/A'}
│ 👀 *Views*    : ${(song.views || 0).toLocaleString()}
│ 📺 *Channel*  : ${song.author || 'Unknown'}
│ 📥 *Status*   : Downloading... ⏳
│
╰━━━━━━━━━━━━━━━━━━━━━━━━╯

💖 ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴀʜᴍᴀᴅ ʜᴀssᴀɴ`;

        try {
            await conn.sendMessage(from, {
                image: { url: song.thumbnail },
                caption: infoCaption
            }, { quoted: mek });
        } catch (_) {}

        let sent = false;
        let lastSendError = null;

        // 1) Buffer bana kar bhejo
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
                    mimetype: 'audio/mpeg',
                    fileName: `${title}.mp3`
                }, { quoted: mek });
                sent = true;
            }
        } catch (e) {
            lastSendError = e?.message || String(e);
        }

        // 2) Fallback: direct URL
        if (!sent) {
            try {
                await conn.sendMessage(from, {
                    audio: { url: audioUrl },
                    mimetype: 'audio/mpeg',
                    fileName: `${title}.mp3`
                }, { quoted: mek });
                sent = true;
            } catch (e) {
                lastSendError = e?.message || String(e);
            }
        }

        if (!sent) {
            try { await conn.sendMessage(from, { react: { text: "❌", key: mek.key } }); } catch (_) {}
            return reply(`❌ Audio send failed: ${lastSendError || 'unknown'}`);
        }

        try { await conn.sendMessage(from, { react: { text: "✅", key: mek.key } }); } catch (_) {}

    } catch (e) {
        const msg = e?.message || e?.toString?.() || 'Unexpected error';
        console.error('Play Command Error:', e);
        try { await conn.sendMessage(from, { react: { text: "❌", key: mek.key } }); } catch (_) {}
        reply(`❌ Error: ${msg}`);
    }
});
