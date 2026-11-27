import axios from "axios";
import { cmd } from "../command.js";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);

// 🔑 TWO APIs — Qadeer (primary) + JawadTech (fallback)
const QADEER_API = 'https://qadeer-xtech-apis.vercel.app/download/tiktok/video';
const JAWAD_API  = 'https://jawad-tech.vercel.app/download/tiktok';
const TIMEOUT    = 60000;

// ============ GENERIC HELPERS (JawadTech — unchanged) ============
async function fetchTikTok(url) {
    const apiUrl = `${JAWAD_API}?url=${encodeURIComponent(url)}`;
    const { data } = await axios.get(apiUrl, {
        timeout: TIMEOUT,
        validateStatus: () => true,
        headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    return data;
}

function pickVideoUrl(data) {
    if (!data) return null;
    if (typeof data === 'string' && data.startsWith('http')) return data;

    const flatKeys = [
        'downloadUrl', 'videoUrl', 'video', 'url', 'play', 'hd', 'sd',
        'nowm', 'wm', 'noWatermark', 'watermark'
    ];
    for (const k of flatKeys) {
        if (typeof data[k] === 'string' && data[k].startsWith('http')) return data[k];
    }

    const nested = [data.result, data.data, data.video, data.videos];
    for (const obj of nested) {
        if (!obj) continue;
        if (typeof obj === 'string' && obj.startsWith('http')) return obj;

        for (const k of flatKeys) {
            if (typeof obj[k] === 'string' && obj[k].startsWith('http')) return obj[k];
        }

        const arr = obj.urls || obj.links || obj.downloads || (Array.isArray(obj) ? obj : null);
        if (Array.isArray(arr) && arr.length) {
            const first = arr.find(v => typeof v === 'string' && v.startsWith('http'))
                || arr.find(v => v && typeof v.url === 'string');
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

// ============ NEW: Qadeer API helper ============
async function fetchQadeer(url) {
    const { data } = await axios.get(QADEER_API, {
        params: { url },
        timeout: TIMEOUT,
        validateStatus: () => true,
        headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    return data;
}

// Normalize Qadeer response → same shape as pickMeta expects
function normalizeQadeer(data) {
    if (!data?.status || !data?.result) return null;
    const r = data.result;
    return {
        title: r.title || 'TikTok Video',
        author: r.author?.nickname || r.author?.username || 'Unknown',
        username: (r.author?.username || 'unknown').replace(/^@/, ''),
        region: 'Unknown',
        duration: r.duration || null,
        stats: r.stats || null,
        music: r.music_info
            ? { title: r.music_info.title, author: r.music_info.author }
            : null,
        published: null,
        _videoUrl: r.no_watermark || r.hd || r.watermark,
        _hdUrl: r.hd || r.no_watermark || r.watermark
    };
}

// ============ DUAL-FETCH: Qadeer first → JawadTech fallback ============
// Returns { meta, videoUrl, hdUrl, source }
async function fetchDual(url, preferHd = false) {
    // 1️⃣ Try Qadeer
    try {
        const q = await fetchQadeer(url);
        const norm = normalizeQadeer(q);
        if (norm) {
            const vurl = preferHd ? norm._hdUrl : norm._videoUrl;
            if (vurl) {
                console.log('✅ TikTok via Qadeer');
                return {
                    meta: norm,
                    videoUrl: vurl,
                    hdUrl: norm._hdUrl,
                    source: 'Qadeer'
                };
            }
        }
        console.log('⚠️ Qadeer returned no video URL — falling back to JawadTech');
    } catch (e) {
        console.log('⚠️ Qadeer failed:', e.message, '— falling back to JawadTech');
    }

    // 2️⃣ Fallback: JawadTech (original)
    const j = await fetchTikTok(url);
    if (j?.status === false) {
        throw new Error(j?.error || j?.message || 'Both APIs failed');
    }
    const vurl = pickVideoUrl(j);
    if (!vurl) throw new Error('Both APIs returned no video URL');

    console.log('✅ TikTok via JawadTech (fallback)');
    return {
        meta: pickMeta(j),
        videoUrl: vurl,
        hdUrl: vurl,
        source: 'JawadTech'
    };
}

// ============ SHARED SENDER (buffer → URL fallback) ============
async function sendVideo(conn, from, mek, videoUrl, username, caption) {
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
                fileName: `tiktok_${username}.mp4`,
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
}

// ============ MAIN TIKTOK COMMAND (dual API) ============
cmd({
    pattern: "tiktok",
    alias: ["tt", "ttdl"],
    desc: "Download TikTok video (Qadeer → JawadTech fallback)",
    category: "download",
    react: "🎵",
    filename: __filename
}, async (conn, mek, m, { from, q, reply }) => {
    try {
        if (!q) return await reply("🎯 Please provide a valid TikTok link!\n\nExample:\n.tt https://vm.tiktok.com/xxxx");

        await conn.sendMessage(from, { react: { text: '⏳', key: m.key } });

        let result;
        try {
            result = await fetchDual(q.trim(), false);
        } catch (err) {
            await conn.sendMessage(from, { react: { text: '❌', key: m.key } });
            return reply(`❌ API error: ${err?.message || err}`);
        }

        const { meta, videoUrl, source } = result;

        const caption =
`🎵 *${meta.title}*

👤 *Author:* ${meta.author}
📱 *Username:* @${meta.username}
🌍 *Region:* ${meta.region}
🕒 *Duration:* ${meta.duration ? meta.duration + 's' : 'N/A'}
🔗 *Source:* ${source}

> *ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴀʜᴍᴀᴅ ʜᴀssᴀɴ*`;

        await sendVideo(conn, from, mek, videoUrl, meta.username, caption);
        await conn.sendMessage(from, { react: { text: '✅', key: m.key } });

    } catch (e) {
        console.error("Error in .tiktok:", e);
        try { await conn.sendMessage(from, { react: { text: '❌', key: m.key } }); } catch (_) {}
        await reply(`❌ Error: ${e?.message || e}`);
    }
});

// ============ TIKTOK2 (dual API + HD prefer + detailed) ============
cmd({
    pattern: "tiktok2",
    alias: ["tt2", "ttdl2"],
    desc: "Download TikTok video HD with detailed info (dual API)",
    category: "download",
    react: "🎬",
    filename: __filename
}, async (conn, mek, m, { from, q, reply }) => {
    try {
        if (!q) return await reply("🎯 Please provide a valid TikTok link!\n\nExample:\n.tt2 https://vm.tiktok.com/xxxx");

        await conn.sendMessage(from, { react: { text: '⏳', key: m.key } });

        let result;
        try {
            result = await fetchDual(q.trim(), true); // prefer HD
        } catch (err) {
            await conn.sendMessage(from, { react: { text: '❌', key: m.key } });
            return reply(`❌ API error: ${err?.message || err}`);
        }

        const { meta, videoUrl, source } = result;
        const s = meta.stats || {};

        const caption =
`🎵 *${meta.title}*

👤 *Author:* ${meta.author}
📱 *Username:* @${meta.username}
🌍 *Region:* ${meta.region}
🕒 *Duration:* ${meta.duration ? meta.duration + 's' : 'N/A'}
🎵 *Music:* ${meta.music?.title || 'N/A'}
💿 *By:* ${meta.music?.author || 'N/A'}

${s.plays || s.views || s.likes || s.shares || s.comments ? `📊 *Stats:*
   • Plays     : ${(s.plays ?? s.views)?.toLocaleString?.() ?? (s.plays ?? s.views ?? '—')}
   • Likes     : ${s.likes?.toLocaleString?.() ?? (s.likes ?? '—')}
   • Shares    : ${s.shares?.toLocaleString?.() ?? (s.shares ?? '—')}
   • Comments  : ${s.comments?.toLocaleString?.() ?? (s.comments ?? '—')}
   • Downloads : ${s.downloads?.toLocaleString?.() ?? (s.downloads ?? '—')}
` : ''}
🔗 *Source:* ${source}

✨ *ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴀʜᴍᴀᴅ ʜᴀssᴀɴ*`;

        await sendVideo(conn, from, mek, videoUrl, meta.username, caption);
        await conn.sendMessage(from, { react: { text: '✅', key: m.key } });

    } catch (e) {
        console.error("Error in .tiktok2:", e);
        try { await conn.sendMessage(from, { react: { text: '❌', key: m.key } }); } catch (_) {}
        await reply(`❌ Error: ${e?.message || e}`);
    }
});

// ============ TIKTOK HD (tt3) — UNCHANGED (JawadTech only) ============
cmd({
    pattern: "tiktok3",
    alias: ["tt3", "ttdl3"],
    desc: "Download HD TikTok video (JawadTech only)",
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

        await sendVideo(conn, from, mek, videoUrl, meta.username, caption);
        await conn.sendMessage(from, { react: { text: '✅', key: m.key } });

    } catch (e) {
        console.error("Error in .tiktok3:", e);
        try { await conn.sendMessage(from, { react: { text: '❌', key: m.key } }); } catch (_) {}
        await reply(`❌ Error: ${e?.message || e}`);
    }
});
