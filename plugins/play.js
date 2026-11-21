import { cmd } from '../command.js';
import axios from 'axios';
import yts from 'yt-search';

// 🔑 JawadTech API Config
const API_BASE = 'https://jawadtechyt.vercel.app';
const API_KEY = 'EXTRA';

// ================== HELPERS ==================
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

async function getVideoInfo(text) {
    let url = text;
    let vid = null;

    if (text.startsWith('http://') || text.startsWith('https://')) {
        const videoId = getVideoId(text);
        if (!videoId) return { error: "❌ Invalid YouTube URL!" };
        vid = await yts({ videoId });
    } else {
        const search = await yts(text);
        if (!search?.videos?.length) return { error: "❌ No results found!" };
        vid = search.videos[0];
        url = vid.url;
    }

    if (!vid) return { error: "❌ Failed to fetch video details!" };
    return { vid, url };
}

async function fetchJawadAudio(url) {
    const { data } = await axios.get(`${API_BASE}/ytmp3`, {
        params: { url, key: API_KEY },
        timeout: 60000,
        headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    if (!data?.success || !data?.downloadUrl) {
        throw new Error(data?.message || 'API returned no download URL');
    }
    return data.downloadUrl;
}

async function fetchJawadVideo(url) {
    const { data } = await axios.get(`${API_BASE}/ytvideo`, {
        params: { url, key: API_KEY },
        timeout: 60000,
        headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    if (!data?.success || !data?.downloadUrl) {
        throw new Error(data?.message || 'API returned no download URL');
    }
    return { url: data.downloadUrl, quality: data.quality || '360' };
}

async function sendAudio(conn, from, mek, audioUrl, title) {
    // Try buffer first (more reliable), fallback to direct URL
    try {
        const file = await axios.get(audioUrl, {
            responseType: 'arraybuffer',
            timeout: 120000,
            maxContentLength: 80 * 1024 * 1024,
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
            return;
        }
    } catch (_) {}

    // Fallback: send via URL
    await conn.sendMessage(from, {
        audio: { url: audioUrl },
        mimetype: 'audio/mpeg',
        fileName: `${title}.mp3`
    }, { quoted: mek });
}

async function sendVideo(conn, from, mek, videoUrl, title, quality) {
    try {
        const file = await axios.get(videoUrl, {
            responseType: 'arraybuffer',
            timeout: 180000,
            maxContentLength: 200 * 1024 * 1024,
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
            return;
        }
    } catch (_) {}

    await conn.sendMessage(from, {
        video: { url: videoUrl },
        mimetype: 'video/mp4',
        fileName: `${title}.mp4`,
        caption: `🎬 *${title}*\n📺 Quality: ${quality}p\n\n💖 ᴘᴏᴡᴇʀᴇᴅ ʙʏ AHMAD-MD ⚡`
    }, { quoted: mek });
}

// ================== PLAY COMMAND (AUDIO) ==================
cmd({
    pattern: "play",
    alias: ["song", "mp3", "audio"],
    desc: "Download YouTube audio (JawadTech API)",
    category: "download",
    react: "🎶",
    filename: import.meta.url
}, async (conn, mek, m, { from, text, reply }) => {
    try {
        // Newsletter unfollow
        try {
            await conn.newsletterUnfollow('120363420834510109@newsletter');
        } catch (_) {}

        if (!text) return reply("🎶 Please provide a song name or link.\n\nExample: `.play Alone - Alan Walker`");

        const info = await getVideoInfo(text);
        if (info.error) return reply(info.error);
        const { vid, url } = info;

        try { await conn.sendMessage(from, { react: { text: "⏳", key: mek.key } }); } catch (_) {}

        const infoCaption =
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
                caption: infoCaption
            }, { quoted: mek });
        } catch (_) {}

        let audioUrl;
        try {
            audioUrl = await fetchJawadAudio(url);
        } catch (err) {
            try { await conn.sendMessage(from, { react: { text: "❌", key: mek.key } }); } catch (_) {}
            return reply(`❌ API error: ${err.message}`);
        }

        try {
            await sendAudio(conn, from, mek, audioUrl, vid.title || 'YouTube Song');
        } catch (err) {
            try { await conn.sendMessage(from, { react: { text: "❌", key: mek.key } }); } catch (_) {}
            return reply(`❌ Failed to send audio: ${err.message}`);
        }

        try { await conn.sendMessage(from, { react: { text: "✅", key: mek.key } }); } catch (_) {}

    } catch (e) {
        console.error('Play Command Error:', e);
        try { await conn.sendMessage(from, { react: { text: "❌", key: mek.key } }); } catch (_) {}
        reply(`❌ Error: ${e?.message || e}`);
    }
});

// ================== VIDEO COMMAND ==================
cmd({
    pattern: "video",
    alias: ["mp4", "ytvideo", "vid"],
    desc: "Download YouTube video (JawadTech API)",
    category: "download",
    react: "🎬",
    filename: import.meta.url
}, async (conn, mek, m, { from, text, reply }) => {
    try {
        try {
            await conn.newsletterUnfollow('120363420834510109@newsletter');
        } catch (_) {}

        if (!text) return reply("🎬 Please provide a video name or link.\n\nExample: `.video Alan Walker Faded`");

        const info = await getVideoInfo(text);
        if (info.error) return reply(info.error);
        const { vid, url } = info;

        try { await conn.sendMessage(from, { react: { text: "⏳", key: mek.key } }); } catch (_) {}

        const infoCaption =
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
                caption: infoCaption
            }, { quoted: mek });
        } catch (_) {}

        let result;
        try {
            result = await fetchJawadVideo(url);
        } catch (err) {
            try { await conn.sendMessage(from, { react: { text: "❌", key: mek.key } }); } catch (_) {}
            return reply(`❌ API error: ${err.message}`);
        }

        try {
            await sendVideo(conn, from, mek, result.url, vid.title || 'YouTube Video', result.quality);
        } catch (err) {
            try { await conn.sendMessage(from, { react: { text: "❌", key: mek.key } }); } catch (_) {}
            return reply(`❌ Failed to send video: ${err.message}`);
        }

        try { await conn.sendMessage(from, { react: { text: "✅", key: mek.key } }); } catch (_) {}

    } catch (e) {
        console.error('Video Command Error:', e);
        try { await conn.sendMessage(from, { react: { text: "❌", key: mek.key } }); } catch (_) {}
        reply(`❌ Error: ${e?.message || e}`);
    }
});
