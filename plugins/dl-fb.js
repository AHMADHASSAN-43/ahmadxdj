import axios from "axios";
import { cmd } from "../command.js";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);

// 🔑 TWO APIs — Qadeer (primary) + JawadTech (fallback)
const QADEER_FB_API = 'https://qadeer-xtech-apis.vercel.app/download/facebook/video';
const JAWAD_FB_API  = 'https://jawad-tech.vercel.app/downloader';

// ─────────────────────────────────────────────
// Helper: fetch via Qadeer (primary)
// ─────────────────────────────────────────────
async function fetchFromQadeer(fbUrl) {
    const { data } = await axios.get(QADEER_FB_API, {
        params: { url: fbUrl },
        timeout: 30000,
        headers: { 'User-Agent': 'Mozilla/5.0' }
    });

    if (data?.status && data?.videos) {
        // Prefer HD, fallback SD
        const videoUrl = data.videos.hd || data.videos.sd;
        if (videoUrl) {
            return {
                url: videoUrl,
                quality: data.videos.hd ? 'HD' : 'SD',
                title: data.title || 'Facebook Video',
                thumbnail: data.thumbnail || null,
                source: 'Qadeer XTech'
            };
        }
    }
    return null;
}

// ─────────────────────────────────────────────
// Helper: fetch via JawadTech (fallback)
// ─────────────────────────────────────────────
async function fetchFromJawad(fbUrl) {
    const apiUrl = `${JAWAD_FB_API}?url=${encodeURIComponent(fbUrl)}`;
    const { data } = await axios.get(apiUrl, { timeout: 30000 });

    if (!data?.status || !Array.isArray(data?.result)) return null;

    const hd = data.result.find(v => v.quality === "HD");
    const sd = data.result.find(v => v.quality === "SD");
    const video = hd || sd;
    if (!video) return null;

    return {
        url: video.url,
        quality: video.quality,
        title: 'Facebook Video',
        thumbnail: null,
        source: 'JawadTech'
    };
}

// ─────────────────────────────────────────────
// Helper: dual-fetch (Qadeer → JawadTech fallback)
// ─────────────────────────────────────────────
async function fetchFBVideo(fbUrl) {
    // 1️⃣ Try Qadeer
    try {
        const q = await fetchFromQadeer(fbUrl);
        if (q) {
            console.log('✅ FB via Qadeer');
            return q;
        }
        console.log('⚠️ Qadeer returned no video — falling back to JawadTech');
    } catch (e) {
        console.log('⚠️ Qadeer failed:', e.message, '— falling back to JawadTech');
    }

    // 2️⃣ Fallback: JawadTech
    try {
        const j = await fetchFromJawad(fbUrl);
        if (j) {
            console.log('✅ FB via JawadTech (fallback)');
            return j;
        }
    } catch (e) {
        console.log('⚠️ JawadTech also failed:', e.message);
    }

    return null;
}

// ============================================================
// COMMAND: .fb (Facebook downloader)
// ============================================================
cmd({
    pattern: "fb",
    alias: ["facebook", "fbdl"],
    react: '📥',
    desc: "Download videos from Facebook (dual API)",
    category: "download",
    use: ".fb <Facebook video URL>",
    filename: __filename
}, async (conn, mek, m, { from, reply, q, args }) => {
    try {
        const fbUrl = q || args[0] || m.quoted?.text;
        if (!fbUrl || !fbUrl.includes("facebook.com")) {
            return reply('❌ Please provide a valid Facebook video URL.\n\nExample:\n.fb https://facebook.com/...');
        }

        await conn.sendMessage(from, { react: { text: '⏳', key: m.key } });

        const video = await fetchFBVideo(fbUrl);

        if (!video) {
            await conn.sendMessage(from, { react: { text: '❌', key: m.key } });
            return reply('❌ Unable to fetch the video from both APIs. Please check the URL and try again.');
        }

        await reply('Downloading video... Please wait 📥');

        await conn.sendMessage(from, {
            video: { url: video.url },
            caption: `🎥 *Facebook Video Downloader*\n\n` +
                `📹 *Quality* : ${video.quality}\n` +
                `🔗 *Source*  : ${video.source}\n\n` +
                `> ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴀʜᴍᴀᴅ ʜᴀssᴀɴ`
        }, { quoted: mek });

        await conn.sendMessage(from, { react: { text: '✅', key: m.key } });

    } catch (error) {
        console.error('FB Error:', error);
        reply('❌ Failed to download the video. Please try again later.');
        await conn.sendMessage(from, { react: { text: '❌', key: m.key } });
    }
});
