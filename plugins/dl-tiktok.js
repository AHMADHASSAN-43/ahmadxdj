import axios from "axios";
import { cmd } from "../command.js";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);

// 🔑 JawadTech TikTok API (new)
const API_BASE = 'https://jawad-tech.vercel.app/download/tiktok';
const TIMEOUT = 60000;

// ============ HELPERS ============
async function fetchTikTok(url) {
    const apiUrl = `${API_BASE}?url=${encodeURIComponent(url)}`;
    const { data } = await axios.get(apiUrl, {
        timeout: TIMEOUT,
        validateStatus: () => true,
        headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    return data;
}

function pickVideoUrl(data) {
    if (!data) return null;

    // If response itself is a string URL
    if (typeof data === 'string' && data.startsWith('http')) return data;

    // Flat string keys
    const flatKeys = [
        'downloadUrl', 'videoUrl', 'video', 'url', 'play', 'hd', 'sd',
        'nowm', 'wm', 'noWatermark', 'watermark'
    ];
    for (const k of flatKeys) {
        if (typeof data[k] === 'string' && data[k].startsWith('http')) return data[k];
    }

    // Nested result / data / video objects
    const nested = [data.result, data.data, data.video, data.videos];
    for (const obj of nested) {
        if (!obj) continue;
        if (typeof obj === 'string' && obj.startsWith('http')) return obj;

        for (const k of flatKeys) {
            if (typeof obj[k] === 'string' && obj[k].startsWith('http')) return obj[k];
        }

        // Arrays of { url, quality } or plain string
        const arr = obj.urls || obj.links || obj.downloads || (Array.isArray(obj) ? obj : null);
        if (Array.isArray(arr) && arr.length) {
            const first = arr.find(v =>
                typeof v === 'string' && v.startsWith('http')
            ) || arr.find(v => v && typeof v.url === 'string');
            if (typeof first === 'string') return first;
            if (first?.url) return first.url;
        }
    }
    return null;
}

function pickMeta(data) {
    const m =
        data?.metadata ||
        data?.result?.metadata ||
        data?.data?.metadata ||
        data?.info ||
        data?.result?.info ||
        {};
    return {
        title: m.title || data?.title || 'TikTok Video',
        author:
            m.author?.nickname ||
            (typeof m.author === 'string' ? m.author : null) ||
            m.author?.name ||
            m.author ||
            data?.author ||
            'Unknown',
        username:
            (m.author?.username || m.username || data?.username || 'unknown')
                .toString()
                .replace(/^@/, ''),
        region: m.region || data?.region || 'Unknown',
        duration: m.duration || data?.duration || null,
        stats: m.stats || m.statistics || data?.stats || null,
        music: m.music || data?.music || null,
        published: m.published || m.create_time || data?.published || null
    };
}

function resolveAudioOrVideo(data, kind = 'video') {
    const url = pickVideoUrl(data);
    if (!url) return null;
    return url;
}

// ============ MAIN TIKTOK COMMAND ============
cmd({
    pattern: "tiktok",
    alias: ["tt", "ttdl"],
    desc: "Download TikTok video (JawadTech API)",
    category: "download",
    react: "🎵",
    filename: __filename
}, async (conn, mek, m, { from, q, reply }) => {
    try {
        if (!q) return await reply("🎯 Please provide a valid TikTok link!\n\nExample:\n.tt https://vm.tiktok.com/xxxx");

        await conn.sendMessage(from, { react: { text: '⏳', key: m.key } });

        let data;
        try {
            data = await fetchTikTok(q.trim());
        } catch (err) {
            await conn.sendMessage(from, { react: { text: '❌', key: m.key } });
            return reply(`❌ API error: ${err?.message || err}`);
        }

        if (data?.status === false) {
            await conn.sendMessage(from, { react: { text: '❌', key: m.key } });
            return reply(`❌ ${data?.error || data?.message || 'API returned error'}`);
        }

        const videoUrl = resolveAudioOrVideo(data, 'video');
        if (!videoUrl) {
            await conn.sendMessage(from, { react: { text: '❌', key: m.key } });
            return reply(`❌ No video URL in API response.\n\n\`\`\`\n${JSON.stringify(data, null, 2).slice(0, 800)}\n\`\`\``);
        }

        const meta = pickMeta(data);

        const caption =
`🎵 *${meta.title}*

👤 *Author:* ${meta.author}
📱 *Username:* @${meta.username}
🌍 *Region:* ${meta.region}

> *ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴀʜᴍᴀᴅ ʜᴀssᴀɴ*`;

        // Try buffer first, fallback to URL stream
        let sent = false;
        try {
            const file = await axios.get(videoUrl, {
                responseType: 'arraybuffer',
                timeout: 120000,
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
                    fileName: `tiktok_${meta.username}.mp4`,
                    caption
                }, { quoted: mek });
                sent = true;
            }
        } catch (_) {}

        if (!sent) {
            await conn.sendMessage(from, {
                video: { url: videoUrl },
                mimetype: 'video/mp4',
                caption
            }, { quoted: mek });
            sent = true;
        }

        await conn.sendMessage(from, { react: { text: '✅', key: m.key } });

    } catch (e) {
        console.error("Error in .tiktok:", e);
        try { await conn.sendMessage(from, { react: { text: '❌', key: m.key } }); } catch (_) {}
        await reply(`❌ Error: ${e?.message || e}`);
    }
});

// ============ TIKTOK DETAILS (tt2) ============
cmd({
    pattern: "tiktok2",
    alias: ["tt2", "ttdl2"],
    desc: "Download TikTok video with detailed info",
    category: "download",
    react: "🎬",
    filename: __filename
}, async (conn, mek, m, { from, q, reply }) => {
    try {
        if (!q) return await reply("🎯 Please provide a valid TikTok link!\n\nExample:\n.tt2 https://vm.tiktok.com/xxxx");

        await conn.sendMessage(from, { react: { text: '⏳', key: m.key } });

        let data;
        try {
            data = await fetchTikTok(q.trim());
        } catch (err) {
            await conn.sendMessage(from, { react: { text: '❌', key: m.key } });
            return reply(`❌ API error: ${err?.message || err}`);
        }

        if (data?.status === false) {
            await conn.sendMessage(from, { react: { text: '❌', key: m.key } });
            return reply(`❌ ${data?.error || data?.message || 'API returned error'}`);
        }

        const videoUrl = pickVideoUrl(data);
        if (!videoUrl) {
            await conn.sendMessage(from, { react: { text: '❌', key: m.key } });
            return reply(`❌ No video URL in API response.`);
        }

        const meta = pickMeta(data);
        const s = meta.stats || {};

        const caption =
`🎵 *${meta.title}*

👤 *Author:* ${meta.author}
📱 *Username:* @${meta.username}
🌍 *Region:* ${meta.region}
🕒 *Duration:* ${meta.duration ? meta.duration + 's' : 'N/A'}

${s.views || s.likes || s.shares || s.comments ? `📊 *Stats:*
   • Views: ${s.views ?? '—'}
   • Likes: ${s.likes ?? '—'}
   • Shares: ${s.shares ?? '—'}
   • Comments: ${s.comments ?? '—'}
` : ''}
✨ *ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴀʜᴍᴀᴅ ʜᴀssᴀɴ*`;

        let sent = false;
        try {
            const file = await axios.get(videoUrl, {
                responseType: 'arraybuffer',
                timeout: 120000,
                maxContentLength: 200 * 1024 * 1024,
                headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': '*/*' }
            });
            const buffer = Buffer.from(file.data);
            if (buffer.length > 1000) {
                await conn.sendMessage(from, {
                    video: buffer,
                    mimetype: 'video/mp4',
                    fileName: `tiktok_${meta.username}.mp4`,
                    caption
                }, { quoted: mek });
                sent = true;
            }
        } catch (_) {}

        if (!sent) {
            await conn.sendMessage(from, {
                video: { url: videoUrl },
                mimetype: 'video/mp4',
                caption
            }, { quoted: mek });
        }

        await conn.sendMessage(from, { react: { text: '✅', key: m.key } });

    } catch (e) {
        console.error("Error in .tiktok2:", e);
        try { await conn.sendMessage(from, { react: { text: '❌', key: m.key } }); } catch (_) {}
        await reply(`❌ Error: ${e?.message || e}`);
    }
});

// ============ TIKTOK HD (tt3) ============
cmd({
    pattern: "tiktok3",
    alias: ["tt3", "ttdl3"],
    desc: "Download HD TikTok video",
    category: "download",
    react: "🎬",
    filename: __filename
}, async (conn, mek, m, { from, q, reply }) => {
    try {
        if (!q) return await reply("🎯 Please provide a valid TikTok link!\n\nExample:\n.tt3 https://vm.tiktok.com/xxxx");

        await conn.sendMessage(from, { react: { text: '⏳', key: m.key } });

        let data;
        try {
            data = await fetchTikTok(q.trim());
        } catch (err) {
            await conn.sendMessage(from, { react: { text: '❌', key: m.key } });
            return reply(`❌ API error: ${err?.message || err}`);
        }

        if (data?.status === false) {
            await conn.sendMessage(from, { react: { text: '❌', key: m.key } });
            return reply(`❌ ${data?.error || data?.message || 'API returned error'}`);
        }

        const videoUrl = pickVideoUrl(data);
        if (!videoUrl) {
            await conn.sendMessage(from, { react: { text: '❌', key: m.key } });
            return reply(`❌ No video URL in API response.`);
        }

        const meta = pickMeta(data);
        const s = meta.stats || {};

        const caption = `
🎬 *${meta.title}*

👤 *Author:* ${meta.author}
📱 *Username:* @${meta.username}
🎵 *Music:* ${meta.music?.title || 'N/A'}
💿 *By:* ${meta.music?.author || 'N/A'}

📊 *Stats:*
   • Views: ${s.views ?? '—'}
   • Likes: ${s.likes ?? '—'}
   • Shares: ${s.shares ?? '—'}
   • Comments: ${s.comments ?? '—'}
   • Downloads: ${s.downloads ?? '—'}

🌍 *Region:* ${meta.region}
🕒 *Duration:* ${meta.duration ? meta.duration + 's' : 'N/A'}
📅 *Published:* ${meta.published || 'N/A'}

✨ *ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴀʜᴍᴀᴅ ʜᴀssᴀɴ*
        `.trim();

        let sent = false;
        try {
            const file = await axios.get(videoUrl, {
                responseType: 'arraybuffer',
                timeout: 120000,
                maxContentLength: 200 * 1024 * 1024,
                headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': '*/*' }
            });
            const buffer = Buffer.from(file.data);
            if (buffer.length > 1000) {
                await conn.sendMessage(from, {
                    video: buffer,
                    mimetype: 'video/mp4',
                    fileName: `tiktok_${meta.username}.mp4`,
                    caption
                }, { quoted: mek });
                sent = true;
            }
        } catch (_) {}

        if (!sent) {
            await conn.sendMessage(from, {
                video: { url: videoUrl },
                mimetype: 'video/mp4',
                caption
            }, { quoted: mek });
        }

        await conn.sendMessage(from, { react: { text: '✅', key: m.key } });

    } catch (e) {
        console.error("Error in .tiktok3:", e);
        try { await conn.sendMessage(from, { react: { text: '❌', key: m.key } }); } catch (_) {}
        await reply(`❌ Error: ${e?.message || e}`);
    }
});
