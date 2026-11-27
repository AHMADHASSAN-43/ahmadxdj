import { cmd } from '../command.js';
import axios from 'axios';
import yts from 'yt-search';

// 🔑 API Config
const API_BASE = 'https://api-ahmadxmd.vercel.app';
const API_KEY  = 'EXTRA';

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
        url = `https://youtube.com/watch?v=${videoId}`;
    } else {
        const search = await yts(text);
        if (!search?.videos?.length) return { error: '❌ No results found!' };
        vid = search.videos[0];
        url = vid.url;
    }

    if (!vid) return { error: '❌ Failed to fetch details!' };
    return { vid, url };
}

async function getAudioLink(vidUrl) {
    try {
        const apiUrl = `${API_BASE}/ytmp3?url=${encodeURIComponent(vidUrl)}&key=${API_KEY}`;
        const response = await axios.get(apiUrl, { timeout: 20000 });
        if (response.data?.downloadUrl) return response.data;
    } catch (e) {
        console.error('⚠️ /ytmp3 failed:', e.message);
    }
    return null;
}

async function getVideoLink(vidUrl) {
    try {
        const apiUrl = `${API_BASE}/ytvideo?url=${encodeURIComponent(vidUrl)}&key=${API_KEY}`;
        const response = await axios.get(apiUrl, { timeout: 20000 });
        if (response.data?.downloadUrl) return response.data;
    } catch (e) {
        console.error('⚠️ /ytvideo failed:', e.message);
    }
    return null;
}

// ─────────────────────────────────────────────
// PLAY (MP3) COMMAND
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

        try { await conn.sendMessage(from, { react: { text: '⏳', key: mek.key } }); } catch (_) {}

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

        const data = await getAudioLink(url);
        if (!data) {
            try { await conn.sendMessage(from, { react: { text: '❌', key: mek.key } }); } catch (_) {}
            return reply('❌ Failed to fetch audio from server.');
        }

        const audioUrl = data.downloadUrl;
        const title = (vid.title || 'YouTube Audio').toString();
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

// ─────────────────────────────────────────────
// VIDEO (MP4) COMMAND
// ─────────────────────────────────────────────
cmd({
    pattern: 'video',
    alias: ['ytmp4', 'mp4', 'vid'],
    desc: 'Download YouTube video (MP4)',
    category: 'download',
    react: '🎬',
    filename: import.meta.url
}, async (conn, mek, m, { from, reply, text }) => {
    try {
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

        try { await conn.sendMessage(from, { react: { text: '⏳', key: mek.key } }); } catch (_) {}

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

        const data = await getVideoLink(url);
        if (!data) {
            try { await conn.sendMessage(from, { react: { text: '❌', key: mek.key } }); } catch (_) {}
            return reply('❌ Failed to fetch video from server.');
        }

        const videoUrl = data.downloadUrl;
        const title = (vid.title || 'YouTube Video').toString();
        const quality = data.quality || '360';

        let sent = false;
        let lastErr = null;

        try {
            const file = await axios.get(videoUrl, {
                responseType: 'arraybuffer',
                timeout: 120000,
                maxContentLength: 100 * 1024 * 1024
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
