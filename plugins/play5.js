import { cmd } from '../command.js';
import axios from 'axios';
import yts from 'yt-search';

// 🔑 Apni API (pehli koshish). Na chale to command khud download kar leti hai.
const API_BASE = 'https://play-eight-phi.vercel.app';
const MAX_SIZE = 50 * 1024 * 1024;

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

// Gaane ki info (naam ya link dono)
async function getSongInfo(text) {
    let vid;
    if (/^https?:\/\//i.test(text)) {
        const id = getVideoId(text);
        if (!id) return { error: "❌ Invalid YouTube URL!" };
        vid = await yts({ videoId: id });
    } else {
        const s = await yts(text);
        vid = s?.videos?.[0];
    }
    if (!vid) return { error: "❌ No results found!" };
    return {
        title: vid.title,
        author: vid.author?.name,
        duration: vid.timestamp,
        views: vid.views,
        thumbnail: vid.thumbnail,
        url: vid.url
    };
}

// Tareeqa 1: apni API se audio buffer
async function downloadViaApi(url) {
    const res = await axios.get(`${API_BASE}/api/audio`, {
        params: { url },
        responseType: 'arraybuffer',
        timeout: 60000,
        maxContentLength: MAX_SIZE
    });
    const buf = Buffer.from(res.data);
    if (buf.length < 10000) throw new Error('API returned empty audio');
    return buf;
}

// Tareeqa 2: Adeel-Xtech API (koi package install nahi chahiye)
async function downloadViaAdeel(url) {
    const api = await axios.get('https://adeel-xtech-api.onrender.com/api/ytmp3', {
        params: { url, token: 'public-Adeel-md-api' },
        timeout: 60000,
        validateStatus: () => true,
        headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    const d = api.data;
    const link = d?.result?.audio_download || d?.result?.audio || d?.result?.url || d?.audio_download || d?.url;
    if (!link) throw new Error(d?.message || `Adeel API status ${api.status}`);
    const file = await axios.get(link, {
        responseType: 'arraybuffer',
        timeout: 90000,
        maxContentLength: MAX_SIZE,
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', 'Accept': '*/*' }
    });
    const buf = Buffer.from(file.data);
    if (buf.length < 10000) throw new Error('Adeel API returned empty audio');
    return buf;
}

// Tareeqa 3: bot ke andar hi seedha download (npm i @distube/ytdl-core)
async function downloadDirect(url) {
    const mod = await import('@distube/ytdl-core');
    const ytdl = mod.default || mod;
    return await new Promise((resolve, reject) => {
        const chunks = [];
        let size = 0;
        const stream = ytdl(url, { filter: 'audioonly', quality: 'highestaudio', highWaterMark: 1 << 25 });
        const timer = setTimeout(() => { stream.destroy(); reject(new Error('Download timeout')); }, 120000);
        stream.on('data', (c) => {
            size += c.length;
            if (size > MAX_SIZE) { stream.destroy(); clearTimeout(timer); return reject(new Error('File too large')); }
            chunks.push(c);
        });
        stream.on('end', () => { clearTimeout(timer); resolve(Buffer.concat(chunks)); });
        stream.on('error', (e) => { clearTimeout(timer); reject(e); });
    });
}

cmd({
    pattern: "play",
    alias: ["song", "mp3"],
    desc: "Download YouTube audio",
    category: "download",
    react: "🎶",
    filename: import.meta.url
}, async (conn, mek, m, { from, q, reply, text }) => {
    const react = async (emoji) => {
        try { await conn.sendMessage(from, { react: { text: emoji, key: mek.key } }); } catch (_) {}
    };
    try {
        const query = (text || q || '').trim();
        if (!query) return reply("🎶 Please provide a song name or link.\n\nExample: `.song Alone - Alan Walker`");

        await react("⏳");

        let song;
        try {
            song = await getSongInfo(query);
        } catch (e) {
            console.error('Play search error:', e);
            await react("❌");
            return reply(`❌ Search error: ${e?.message || e}`);
        }
        if (song.error) { await react("❌"); return reply(song.error); }

        const title = (song.title || 'YouTube Song').toString();

        const caption =
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
            await conn.sendMessage(from, { image: { url: song.thumbnail }, caption }, { quoted: mek });
        } catch (_) {}

        // Audio download: pehle API, phir direct
        let buffer = null;
        const errors = [];

        try {
            buffer = await downloadViaApi(song.url);
        } catch (e) {
            errors.push(`API: ${e?.message || e}`);
            console.error('Play API download failed:', e?.message || e);
        }

        if (!buffer) {
            try {
                buffer = await downloadViaAdeel(song.url);
            } catch (e) {
                errors.push(`Adeel: ${e?.message || e}`);
                console.error('Play Adeel download failed:', e?.message || e);
            }
        }

        if (!buffer) {
            try {
                buffer = await downloadDirect(song.url);
            } catch (e) {
                errors.push(`Direct: ${e?.message || e}`);
                console.error('Play direct download failed:', e?.message || e);
            }
        }

        if (!buffer || buffer.length < 10000) {
            await react("❌");
            return reply(`❌ Audio download failed.\n\n${errors.join('\n')}`);
        }

        try {
            await conn.sendMessage(from, {
                audio: buffer,
                mimetype: 'audio/mpeg',
                fileName: `${title}.mp3`
            }, { quoted: mek });
        } catch (e) {
            console.error('Play send error:', e);
            await react("❌");
            return reply(`❌ Audio send failed: ${e?.message || e}`);
        }

        await react("✅");

    } catch (e) {
        console.error('Play Command Error:', e);
        await react("❌");
        reply(`❌ Error: ${e?.message || e}`);
    }
});
