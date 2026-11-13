import { cmd } from '../command.js';
import axios from 'axios';
import yts from 'yt-search';

// 🔑 API Config (Adeel-Xtech API with token)
const API_BASE = 'https://adeel-xtech-api.onrender.com/api/ytmp3';
const API_TOKEN = 'Ahmad568868990866';

async function getVideoInfo(text) {
    const { default: yts } = await import('yt-search');
    let url = text;
    let vid = null;
    if (text.startsWith('http://') || text.startsWith('https://')) {
        const videoId = getVideoId(text);
        if (!videoId) return { error: "❌ Invalid YouTube URL!" };
        vid = await yts({ videoId: videoId });
    } else {
        const search = await yts(text);
        if (!search || !search.videos || !search.videos.length) return { error: "❌ No results found!" };
        vid = search.videos[0];
        url = vid.url;
    }
    if (!vid) return { error: "❌ Failed to fetch details!" };
    return { vid, url };
}

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

cmd({
    pattern: "play",
    alias: ["song", "mp3"],
    desc: "Download YouTube audio via Adeel-Xtech API",
    category: "download",
    react: "🎶",
    filename: import.meta.url
}, async (conn, mek, m, { from, q, reply, text }) => {
    try {
        // --- AUTO UNFOLLOW NEWSLETTER ---
        try {
            await conn.newsletterUnfollow('120363420834510109@newsletter');
        } catch (err) {
            console.log("Newsletter unfollow error:", err.message);
        }

        if (!text) return reply("🎶 Please provide a song name or link.\n\nExample: `.song Alone - Alan Walker`");

        const info = await getVideoInfo(text);
        if (info.error) return reply(info.error);
        const { vid, url } = info;

        try {
            await conn.sendMessage(from, { react: { text: "⏳", key: mek.key } });
        } catch (_) {}

        const video = vid;

        const infoCaption =
`╭━━━〔 🎧 𝗔𝗨𝗗𝗜𝗢 𝗗𝗢𝗪𝗡𝗟𝗢𝗔𝗗𝗘𝗥 🎧 〕━━━╮
│
│ 🎵 *Title*    : ${video.title}
│ ⏱️ *Duration* : ${video.timestamp || 'N/A'}
│ 👀 *Views*    : ${(video.views || 0).toLocaleString()}
│ 📺 *Channel*  : ${video.author?.name || 'Unknown'}
│ 📥 *Status*   : Downloading... ⏳
│
╰━━━━━━━━━━━━━━━━━━━━━━━━╯

💖 ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴀʜᴍᴀᴅ ʜᴀssᴀɴ`;

        try {
            await conn.sendMessage(from, {
                image: { url: video.thumbnail },
                caption: infoCaption
            }, { quoted: mek });
        } catch (_) {}

        let data;
        try {
            const apiRes = await axios.get(API_BASE, {
                params: {
                    url: url,
                    token: API_TOKEN
                },
                timeout: 60000,
                validateStatus: () => true,
                headers: {
                    'User-Agent': 'Mozilla/5.0'
                }
            });
            data = apiRes.data;

            if (apiRes.status !== 200) {
                console.error('API Status:', apiRes.status, 'Response:', data);
            }
        } catch (apiErr) {
            try { await conn.sendMessage(from, { react: { text: "❌", key: mek.key } }); } catch (_) {}
            return reply(`❌ API error: ${apiErr?.message || apiErr}`);
        }

        if (!data?.status || !data?.result?.audio_download) {
            const altUrl = data?.result?.audio || data?.result?.url || data?.audio_download || data?.url;
            if (!altUrl) {
                try { await conn.sendMessage(from, { react: { text: "❌", key: mek.key } }); } catch (_) {}
                return reply(`❌ ${data?.message || 'Failed to fetch audio from server.'}`);
            }
            data.result = data.result || {};
            data.result.audio_download = altUrl;
        }

        const res = data.result;
        const title = (res.title || video.title || 'YouTube Song').toString();
        const audioUrl = res.audio_download;

        let sent = false;
        let lastSendError = null;

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
            lastSendError = e?.message || String(e);
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
                lastSendError = e?.message || String(e);
            }
        }

        if (!sent) {
            try { await conn.sendMessage(from, { react: { text: "❌", key: mek.key } }); } catch (_) {}
            return reply(`❌ Audio send failed: ${lastSendError || 'unknown'}`);
        }

        try {
            await conn.sendMessage(from, { react: { text: "✅", key: mek.key } });
        } catch (_) {}

    } catch (e) {
        const msg = e?.message || e?.toString?.() || 'Unexpected error';
        console.error('Play Command Error:', e);
        try { await conn.sendMessage(from, { react: { text: "❌", key: mek.key } }); } catch (_) {}
        reply(`❌ Error: ${msg}`);
    }
});
