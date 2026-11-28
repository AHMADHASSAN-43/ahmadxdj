const axios = require('axios');
const { cmd } = require('../command');
const config = require('../config');

cmd({
    pattern: "igdl",
    alias: ["instagram", "insta", "ig"],
    react: "📥",
    desc: "Download Instagram videos (Nexray + Aswin Sparky APIs)",
    category: "download",
    use: ".igdl <Instagram URL>",
    filename: __filename
}, async (conn, mek, m, { from, reply, args, q }) => {
    try {
        const url = q || m.quoted?.text;
        if (!url || !url.includes("instagram.com")) {
            return reply("❌ Please provide or reply to an Instagram link.");
        }

        await conn.sendMessage(from, { react: { text: '⏳', key: mek.key } });

        // ─── Engine 1: Nexray (primary) ─────────────────────────
        let items = [];
        try {
            const r1 = await axios.get(`https://api.nexray.eu.cc/downloader/v1/instagram?url=${encodeURIComponent(url)}`, { timeout: 25000 });
            if (r1.data?.status && Array.isArray(r1.data.result)) items = r1.data.result;
        } catch (e) {
            console.error('Nexray IG error:', e.message);
        }

        // ─── Engine 2: Aswin Sparky (fallback) ──────────────────
        if (items.length === 0) {
            try {
                const r2 = await axios.get(`https://api-aswin-sparky.koyeb.app/api/downloader/igdl?url=${encodeURIComponent(url)}`, { timeout: 25000 });
                if (r2.data?.status && Array.isArray(r2.data.data)) items = r2.data.data;
            } catch (e) {
                console.error('Aswin IG error:', e.message);
            }
        }

        // ─── Check success ──────────────────────────────────────
        if (items.length === 0) {
            await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
            return reply("❌ Failed to fetch media. Invalid link or private content.");
        }

        // ─── Filter for video items only ────────────────────────
        const videoItems = items.filter(item => item.type === 'video' && item.url);
        if (videoItems.length === 0) {
            await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
            return reply("❌ No video found in this post.");
        }

        // ─── Build stylish caption ──────────────────────────────
        const fields = [
            { icon: '🎬', label: '𝗧𝘆𝗽𝗲', value: 'Video' },
            { icon: '✅', label: '𝗦𝘁𝗮𝘁𝘂𝘀', value: `Downloaded ${videoItems.length} video(s)` }
        ];
        const caption = stylishMessage('📥 𝗜𝗻𝘀𝘁𝗮𝗴𝗿𝗮𝗺 𝗗𝗼𝘄𝗻𝗹𝗼𝗮𝗱𝗲𝗿', fields);

        // ─── Download and send each video ──────────────────────
        let successCount = 0;
        for (let i = 0; i < videoItems.length; i++) {
            const item = videoItems[i];
            const videoUrl = item.url;

            let finalCaption = caption;
            if (videoItems.length > 1) {
                finalCaption = caption + `\n\n📊 ${i+1}/${videoItems.length}`;
            }

            try {
                // ─── Download video as buffer ──────────────────
                const videoBuffer = await axios.get(videoUrl, {
                    responseType: 'arraybuffer',
                    timeout: 120000,
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                        'Referer': 'https://www.instagram.com/'
                    }
                }).then(res => Buffer.from(res.data));

                if (!videoBuffer || videoBuffer.length === 0) {
                    console.error(`Video ${i+1} buffer is empty`);
                    continue;
                }

                await conn.sendMessage(from, {
                    video: videoBuffer,
                    caption: finalCaption,
                    mimetype: "video/mp4"
                }, { quoted: mek });

                successCount++;
                await new Promise(resolve => setTimeout(resolve, 800));

            } catch (downloadErr) {
                console.error(`Error downloading video ${i+1}:`, downloadErr.message);
            }
        }

        if (successCount === 0) {
            await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
            return reply("❌ Could not download any video. Try again later.");
        }

        await conn.sendMessage(from, { react: { text: '✅', key: mek.key } });

    } catch (error) {
        console.error('Instagram Error:', error);
        await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
        reply(`❌ Download failed: ${error.message || "Please check the link or try again later."}`);
    }
});
