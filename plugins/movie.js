import axios from 'axios';
import { cmd } from '../command.js';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);

// Bot name config
const BOT_NAME = "AHMAD HASSAN";

// 🔑 Qadeer XTech Movie API
const MOVIE_API = 'https://qadeer-xtech-apis.vercel.app/download/movie';

// ============================================================
// COMMAND: .movie (search & download)
// ============================================================
cmd({
    pattern: "movie",
    alias: ["film", "moviedl"],
    react: "🎬",
    desc: "Search & download movies (Qadeer API)",
    category: "download",
    use: ".movie <movie name>",
    filename: __filename
}, async (conn, mek, m, { from, reply, q, args }) => {
    try {
        const query = q || args.join(' ') || m.quoted?.text;
        if (!query) {
            return reply(
                '🎬 *Movie Downloader*\n\n' +
                '📝 *Usage:*\n' +
                '• .movie Pathaan\n' +
                '• .movie Jawan\n' +
                '• .movie Animal 2\n\n' +
                '💡 Tip: Better results ke liye exact naam likhein.'
            );
        }

        await conn.sendMessage(from, { react: { text: '🔍', key: m.key } });

        // Call Qadeer Movie API
        const { data } = await axios.get(MOVIE_API, {
            params: { q: query.trim(), index: 1 },
            timeout: 60000,
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });

        if (!data?.status || !data?.downloadUrl) {
            console.error('Movie API response:', JSON.stringify(data, null, 2));
            await conn.sendMessage(from, { react: { text: '❌', key: m.key } });
            return reply(`❌ Movie not found: *${query}*\n\n💡 Try a different name.`);
        }

        // Send thumbnail + info
        await conn.sendMessage(from, {
            image: { url: data.imageUrl },
            caption:
`╭━━━〔 🎬 𝗠𝗢𝗩𝗜𝗘 𝗙𝗢𝗨𝗡𝗗 〕━━━╮
│
│ 🎥 *Title*  : ${data.title || 'N/A'}
│ 📁 *File*   : ${data.fileName || 'N/A'}
│ 💾 *Size*   : ${data.size || 'N/A'}
│ 🎞️ *Quality*: ${data.title?.includes('720p') ? '720p' : data.title?.includes('1080p') ? '1080p' : 'N/A'}
│ 📥 *Status* : Downloading... ⏳
│
╰━━━━━━━━━━━━━━━━━━━━━━╯

💖 ᴘᴏᴡᴇʀᴇᴅ ʙʏ ${BOT_NAME}`
        }, { quoted: mek });

        // Send video/document
        await conn.sendMessage(from, {
            document: { url: data.downloadUrl },
            mimetype: 'video/mp4',
            fileName: data.fileName || `${query}.mp4`,
            caption:
`🎬 *${data.title || query}*\n\n` +
                `💾 *Size* : ${data.size || 'N/A'}\n` +
                `📥 *Format* : MP4/MKV\n\n` +
                `> *ᴘᴏᴡᴇʀᴇᴅ ʙʏ ${BOT_NAME}*`
        }, { quoted: mek });

        await conn.sendMessage(from, { react: { text: '✅', key: m.key } });

    } catch (error) {
        console.error('Movie Error:', error?.response?.data || error.message);
        await conn.sendMessage(from, { react: { text: '❌', key: m.key } });
        reply('❌ Movie download failed! Please try again later.');
    }
});
