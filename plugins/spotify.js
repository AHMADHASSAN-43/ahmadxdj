import { cmd } from '../command.js';
import axios from 'axios';

// 🔑 NEW SPOTIFY API (Qadeer XTech)
const SPOTIFY_API = 'https://qadeer-xtech-apis.vercel.app/media/spotify';

// ─────────────────────────────────────────────
// 🎧 SPOTIFY DOWNLOAD COMMAND
// ─────────────────────────────────────────────
cmd({
    pattern: 'spotify',
    alias: ['sp', 'spot', 'spotifydl'],
    desc: 'Download song from Spotify (mp3)',
    category: 'download',
    react: '🎧',
    filename: import.meta.url
}, async (conn, mek, m, { from, reply, text }) => {
    try {
        if (!text) {
            return reply(
                '❌ Please provide song name\nExample: .spotify Awara'
            );
        }

        try { await conn.sendMessage(from, { react: { text: '⏳', key: mek.key } }); } catch (_) {}

        // Call Spotify API
        const res = await axios.get(SPOTIFY_API, {
            params: { query: text.trim() },
            timeout: 60000,
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });

        const data = res.data;

        // Validate response
        if (!data?.status || !data?.downloadUrl) {
            console.error('SPOTIFY API RESPONSE:', JSON.stringify(data, null, 2));
            try { await conn.sendMessage(from, { react: { text: '❌', key: mek.key } }); } catch (_) {}
            return reply('❌ Song not found or API failed. Try another name.');
        }

        // Send thumbnail + info
        await conn.sendMessage(from, {
            image: { url: data.thumbnail },
            caption: `╭━━━〔 🎧 𝗦𝗣𝗢𝗧𝗜𝗙𝗬 𝗗𝗢𝗪𝗡𝗟𝗢𝗔𝗗𝗘𝗥 🎧 〕━━━╮
│
│ 🎵 *Title*    : ${data.title}
│ ⏱️ *Duration* : ${data.duration}
│ 🎤 *Artist*   : ${data.artist || 'Unknown'}
│ 🎼 *Format*   : ${data.format?.toUpperCase() || 'MP3'}
│ 📥 *Status*   : Downloading... ⏳
│
╰━━━━━━━━━━━━━━━━━━━━━━━━╯

💖 ᴘᴏᴡᴇʀᴇᴅ ʙʏ AHMED 💖`
        }, { quoted: mek });

        // Send audio
        await conn.sendMessage(from, {
            audio: { url: data.downloadUrl },
            mimetype: 'audio/mpeg',
            fileName: `${data.title}.mp3`,
            ptt: false
        }, { quoted: mek });

        try { await conn.sendMessage(from, { react: { text: '✅', key: mek.key } }); } catch (_) {}

    } catch (err) {
        console.error('❌ SPOTIFY ERROR:', err.response?.data || err.message);
        try { await conn.sendMessage(from, { react: { text: '❌', key: mek.key } }); } catch (_) {}
        await reply('❌ Song download failed! Please try again later.');
    }
});
