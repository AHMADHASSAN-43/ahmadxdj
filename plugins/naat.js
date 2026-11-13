import { cmd } from '../command.js';
import axios from 'axios';
import yts from 'yt-search';

cmd({
    pattern: "naat",
    alias: ["naats", "naatmp3", "islamicsong"],
    desc: "Download Naat audio from YouTube via Adeel-Xtech API",
    category: "download",
    react: "🕌",
    filename: import.meta.url
}, async (conn, mek, m, { from, q, reply }) => {
    try {
        const query = q ? q.trim() : "";

        if (!query) {
            return reply("❌ Please provide a Naat name or YouTube link!\n\nExample:\n.naat Ayub Islamic\n.naat https://youtu.be/xxxxx");
        }

        try {
            await conn.sendMessage(from, { react: { text: "⏳", key: mek.key } });
        } catch (_) {}

        let video;
        const isYT = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\//i.test(query);

        if (isYT) {
            let videoId = '';
            try {
                const urlObj = new URL(query);
                if (urlObj.hostname === 'youtu.be') {
                    videoId = urlObj.pathname.slice(1);
                } else {
                    videoId = urlObj.searchParams.get('v');
                }
            } catch {
                videoId = query.split('/').pop().split('?')[0];
            }

            if (!videoId) {
                try { await conn.sendMessage(from, { react: { text: "❌", key: mek.key } }); } catch (_) {}
                return reply("❌ Invalid YouTube link");
            }

            try {
                const search = await yts(videoId);
                if (search && search.videos && search.videos.length) {
                    video = search.videos[0];
                }
            } catch (e) {}

            if (!video) {
                try {
                    const search2 = await yts(`https://www.youtube.com/watch?v=${videoId}`);
                    if (search2 && search2.videos && search2.videos.length) {
                        video = search2.videos[0];
                    }
                } catch (e) {}
            }

            if (!video) {
                video = {
                    title: 'Unknown Naat',
                    url: `https://www.youtube.com/watch?v=${videoId}`,
                    thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
                    timestamp: 'N/A',
                    views: 0,
                    author: { name: 'Unknown' }
                };
            }
        } else {
            // Search with "naat" keyword automatically added
            const searchQuery = `${query} naat`;
            const search = await yts(searchQuery);
            if (!search.videos.length) {
                try { await conn.sendMessage(from, { react: { text: "❌", key: mek.key } }); } catch (_) {}
                return reply("❌ No Naat results found");
            }
            video = search.videos[0];
        }

        const infoCaption =
`🕌 *${video.title}*\n\n` +
`🎙️ *Naat Khwan:* ${video.author?.name || 'Unknown'}\n` +
`👁️ *Views:* ${(video.views || 0).toLocaleString()}\n` +
`⏳ *Duration:* ${video.timestamp || 'N/A'}\n\n` +
`> *ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴀʜᴍᴀᴅ ʜᴀssᴀɴ*`;

        try {
            await conn.sendMessage(from, {
                image: { url: video.thumbnail },
                caption: infoCaption
            }, { quoted: mek });
        } catch (_) {}

        let data;
        try {
            const apiRes = await axios.get('https://adeel-xtech-api.vercel.app/api/ytmp3', {
                params: { url: video.url },
                timeout: 45000,
                validateStatus: () => true
            });
            data = apiRes.data;
        } catch (apiErr) {
            try { await conn.sendMessage(from, { react: { text: "❌", key: mek.key } }); } catch (_) {}
            return reply(`❌ API error: ${apiErr?.message || apiErr}`);
        }

        if (!data?.status || !data?.result?.audio_download) {
            try { await conn.sendMessage(from, { react: { text: "❌", key: mek.key } }); } catch (_) {}
            return reply(`❌ ${data?.message || 'Failed to fetch Naat audio from server.'}`);
        }

        const res = data.result;
        const title = (res.title || video.title || 'Naat').toString();
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
            return reply(`❌ Naat audio send failed: ${lastSendError || 'unknown'}`);
        }

        try {
            await conn.sendMessage(from, { react: { text: "✅", key: mek.key } });
        } catch (_) {}

    } catch (e) {
        const msg = e?.message || e?.toString?.() || 'Unexpected error';
        console.error('Naat Command Error:', e);
        try { await conn.sendMessage(from, { react: { text: "❌", key: mek.key } }); } catch (_) {}
        reply(`❌ Error: ${msg}`);
    }
});
