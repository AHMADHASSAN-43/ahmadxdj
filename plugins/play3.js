import { fileURLToPath } from 'url';
import { cmd } from '../command.js';
import axios from 'axios';

const __filename = fileURLToPath(import.meta.url);

// ✅ NEW SEARCH API (Qadeer XTech)
const SEARCH_API = 'https://qadeer-xtech-apis.vercel.app/search/youtube';

// ⚠️ REPLACE THIS with your new download API endpoint
const DOWNLOAD_API = 'https://YOUR-NEW-DOWNLOAD-API-HERE';

function getVideoId(url) {
    const match = url.match(
        /(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/
    );
    return match ? match[1] : null;
}

cmd({
    pattern: 'play3',
    alias: ['song3', 'audio3', 'mp3'],
    desc: 'Download YouTube audio (play3)',
    category: 'download',
    react: '🎧',
    filename: __filename
}, async (conn, mek, m, { from, text, reply }) => {
    try {
        if (!text) {
            return reply('❌ Please provide song name\nExample: .play3 Shape of You');
        }

        let url = text.trim();
        let vid = null;

        if (url.startsWith('http://') || url.startsWith('https://')) {
            if (!url.includes('youtube.com') && !url.includes('youtu.be')) {
                return reply('❌ Please provide a valid YouTube URL!');
            }

            const videoId = getVideoId(url);
            if (!videoId) return reply('❌ Invalid YouTube URL!');

            // Get info via search API using videoId
            const res = await axios.get(SEARCH_API, {
                params: { query: videoId },
                timeout: 30000
            });

            const results = res.data?.results || [];
            vid = results.find(v => v.videoId === videoId) || results[0];

            if (!vid) return reply('❌ No results found!');
            url = vid.url;
        } else {
            // ✅ Search via Qadeer API
            const res = await axios.get(SEARCH_API, {
                params: { query: text.trim() },
                timeout: 30000
            });

            const results = res.data?.results || [];
            if (!results.length) return reply('❌ No song found!');

            vid = results[0];
            url = vid.url;
        }

        await conn.sendMessage(from, {
            image: { url: vid.thumbnail },
            caption: `╭━━━〔 🎧 𝗔𝗨𝗗𝗜𝗢 𝗗𝗢𝗪𝗡𝗟𝗢𝗔𝗗𝗘𝗥 🎧 〕━━━╮
│
│ 🎵 *Title*    : ${vid.title}
│ ⏱️ *Duration* : ${vid.duration}
│ 👀 *Views*    : ${Number(vid.views).toLocaleString()}
│ 📺 *Channel*  : ${vid.author || 'Unknown'}
│ 📥 *Status*   : Downloading... ⏳
│
╰━━━━━━━━━━━━━━━━━━━━━━━━╯

💖 ᴘᴏᴡᴇʀᴇᴅ ʙʏ AHMED 💖`
        }, { quoted: mek });

        // ⚠️ DOWNLOAD API — replace endpoint + response parsing
        const response = await axios.get(DOWNLOAD_API, {
            params: { url },
            timeout: 60000,
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });

        const data = response.data;
        const audioUrl = data?.download?.downloadUrl || data?.result?.downloadUrl || data?.url;

        if (!audioUrl) {
            console.error('DOWNLOAD API RESPONSE:', JSON.stringify(data, null, 2));
            return reply('❌ API did not return a valid audio link.');
        }

        await conn.sendMessage(from, {
            audio: { url: audioUrl },
            mimetype: 'audio/mpeg',
            fileName: `${vid.title}.mp3`,
            ptt: false
        }, { quoted: mek });

        await conn.sendMessage(from, { react: { text: '✅', key: m.key } });

    } catch (err) {
        console.error('❌ PLAY3 ERROR:', err.response?.data || err.message);
        await reply('❌ Song download failed! Please try again later.');
        await conn.sendMessage(from, { react: { text: '❌', key: m.key } });
    }
});
