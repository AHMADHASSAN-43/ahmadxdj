import axios from "axios";
import { cmd } from '../command.js';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);

// Bot name config
const BOT_NAME = "AHMAD HASSAN";

// 🔑 NEW API (Qadeer XTech)
const IG_API = 'https://qadeer-xtech-apis.vercel.app/download/instagram/video';

// Helper: fetch Instagram media via Qadeer API
async function fetchFromQadeer(igUrl) {
    const { data } = await axios.get(IG_API, {
        params: { url: igUrl },
        timeout: 30000,
        headers: { 'User-Agent': 'Mozilla/5.0' }
    });

    if (data?.status && (data?.video || data?.alternatives?.length)) {
        return {
            video: data.video || null,
            thumbnail: data.thumbnail || null,
            alternatives: data.alternatives || []
        };
    }
    return null;
}

// Helper: send media (video or thumbnail fallback)
async function sendIGMedia(conn, from, mek, result, caption) {
    if (result.video) {
        await conn.sendMessage(from, {
            video: { url: result.video },
            caption
        }, { quoted: mek });
        return true;
    }
    if (result.thumbnail) {
        await conn.sendMessage(from, {
            image: { url: result.thumbnail },
            caption
        }, { quoted: mek });
        return true;
    }
    return false;
}

// ============================================================
// COMMAND 1: igdl (main)
// ============================================================
cmd({
    pattern: "igdl",
    alias: ["instagram", "insta", "ig"],
    react: "⬇️",
    desc: "Download Instagram videos/reels",
    category: "download",
    use: ".igdl <Instagram URL>",
    filename: __filename
}, async (conn, mek, m, { from, reply, q }) => {
    try {
        const url = q || m.quoted?.text;
        if (!url || !url.includes("instagram.com")) {
            return reply("❌ Please provide/reply to an Instagram link");
        }

        await conn.sendMessage(from, { react: { text: '⏳', key: m.key } });

        const result = await fetchFromQadeer(url).catch(e => {
            console.error('Qadeer API failed:', e.message);
            return null;
        });

        if (!result) {
            await conn.sendMessage(from, { react: { text: '❌', key: m.key } });
            return reply("❌ Failed to fetch media. Invalid link or private content.");
        }

        const sent = await sendIGMedia(conn, from, mek, result,
            `╭━━❀ 📸 *ɪɴsᴛᴀɢʀᴀᴍ ᴅᴏᴡɴʟᴏᴀᴅᴇʀ* ❀━━╮\n┃\n` +
            `┃ 💎 ǫᴜᴀʟɪᴛʏ ➜ ʜᴅ\n┃\n` +
            `╰━━━━━━━━━━━━━━━━━━━━━╯\n\n` +
            `💖 ᴇɴᴊᴏʏ ʏᴏᴜʀ ᴍᴇᴅɪᴀ!\n\n> *ᴘᴏᴡᴇʀᴇᴅ ʙʏ ${BOT_NAME}*`
        );

        if (!sent) {
            await conn.sendMessage(from, { react: { text: '❌', key: m.key } });
            return reply("❌ No playable media found.");
        }

        await conn.sendMessage(from, { react: { text: '✅', key: m.key } });

    } catch (error) {
        console.error('IGDL Error:', error);
        await conn.sendMessage(from, { react: { text: '❌', key: m.key } });
        reply("❌ Download failed. Try again later.");
    }
});


// ============================================================
// COMMAND 2: igdl2 (with metadata)
// ============================================================
cmd({
    pattern: "igdl2",
    alias: ["instagram2", "ig2", "instadl2"],
    react: '📥',
    desc: "Download videos from Instagram (with metadata)",
    category: "download",
    use: ".igdl2 <Instagram video URL>",
    filename: __filename
}, async (conn, mek, m, { from, reply, q, args }) => {
    try {
        const igUrl = q || args[0] || m.quoted?.text;
        if (!igUrl || !igUrl.includes("instagram.com")) {
            return reply('❌ Please provide a valid Instagram URL.\n\nExample:\n.igdl2 https://instagram.com/reel/...');
        }

        await conn.sendMessage(from, { react: { text: '⏳', key: m.key } });

        const result = await fetchFromQadeer(igUrl).catch(e => {
            console.error('Qadeer API failed:', e.message);
            return null;
        });

        if (!result) {
            await conn.sendMessage(from, { react: { text: '❌', key: m.key } });
            return reply('❌ Unable to fetch the video. Please check the URL and try again.');
        }

        await reply('Downloading Instagram media... Please wait 📥');

        const sent = await sendIGMedia(conn, from, mek, result,
            `╭━━❀ 📸 *ɪɴsᴛᴀɢʀᴀᴍ ᴍᴇᴅɪᴀ* ❀━━╮\n┃\n` +
            `┃ 📹 ᴛʏᴘᴇ ➜ ${result.video ? 'video' : 'image'}\n` +
            `┃ 🔗 sᴏᴜʀᴄᴇ ➜ Qadeer XTech\n` +
            `┃ 💎 ǫᴜᴀʟɪᴛʏ ➜ ʜᴅ\n┃\n` +
            `╰━━━━━━━━━━━━━━━━━━━━━╯\n\n` +
            `💖 ᴇɴᴊᴏʏ ʏᴏᴜʀ ᴍᴇᴅɪᴀ! 🌸\n\n> *ᴘᴏᴡᴇʀᴇᴅ ʙʏ ${BOT_NAME}*`
        );

        if (!sent) {
            await conn.sendMessage(from, { react: { text: '❌', key: m.key } });
            return reply('❌ No playable media found.');
        }

        await conn.sendMessage(from, { react: { text: '✅', key: m.key } });

    } catch (error) {
        console.error('IGDL2 Error:', error);
        reply('❌ Failed to download. Please try again later.');
        await conn.sendMessage(from, { react: { text: '❌', key: m.key } });
    }
});


// ============================================================
// COMMAND 3: igdl3 (posts, reels, stories)
// ============================================================
cmd({
    pattern: "igdl3",
    alias: ["instagram3", "insta3", "ig3"],
    react: "⬇️",
    desc: "Download Instagram posts, reels, and stories",
    category: "download",
    use: ".igdl3 <Instagram URL>",
    filename: __filename
}, async (conn, mek, m, { from, reply, q }) => {
    try {
        const url = q || m.quoted?.text;
        if (!url || !url.includes("instagram.com")) {
            return reply("❌ Please provide/reply to a valid Instagram link");
        }

        await conn.sendMessage(from, { react: { text: '⏳', key: m.key } });

        const result = await fetchFromQadeer(url).catch(e => {
            console.error('Qadeer API failed:', e.message);
            return null;
        });

        if (!result) {
            await conn.sendMessage(from, { react: { text: '❌', key: m.key } });
            return reply("❌ Failed to fetch media. Invalid link or private content.");
        }

        // Primary media
        const sent = await sendIGMedia(conn, from, mek, result,
            `╭━━❀ 📸 *ɪɴsᴛᴀɢʀᴀᴍ ᴅᴏᴡɴʟᴏᴀᴅᴇʀ* ❀━━╮\n┃\n` +
            `┃ 📹 ᴛʏᴘᴇ ➜ ${result.video ? 'video' : 'image'}\n` +
            `┃ 🔗 sᴏᴜʀᴄᴇ ➜ Qadeer XTech\n┃\n` +
            `╰━━━━━━━━━━━━━━━━━━━━━╯\n\n` +
            `💖 ᴇɴᴊᴏʏ ʏᴏᴜʀ ᴍᴇᴅɪᴀ!\n\n> *ᴘᴏᴡᴇʀᴇᴅ ʙʏ ${BOT_NAME}*`
        );

        // Alternatives (agar future mein multi-media aaye)
        if (result.alternatives?.length) {
            for (const alt of result.alternatives) {
                const altUrl = typeof alt === 'string' ? alt : alt?.url;
                if (!altUrl) continue;
                try {
                    await conn.sendMessage(from, {
                        video: { url: altUrl },
                        caption: `📸 *ᴀʟᴛᴇʀɴᴀᴛɪᴠᴇ ᴍᴇᴅɪᴀ*\n\n> *ᴘᴏᴡᴇʀᴇᴅ ʙʏ ${BOT_NAME}*`
                    }, { quoted: mek });
                    await new Promise(r => setTimeout(r, 1000));
                } catch (_) {}
            }
        }

        if (!sent && !result.alternatives?.length) {
            await conn.sendMessage(from, { react: { text: '❌', key: m.key } });
            return reply("❌ No playable media found.");
        }

        await conn.sendMessage(from, { react: { text: '✅', key: m.key } });

    } catch (error) {
        console.error('IGDL3 Error:', error);
        await conn.sendMessage(from, { react: { text: '❌', key: m.key } });
        reply("❌ Download failed. Please check the link and try again.");
    }
});
