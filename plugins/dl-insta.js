import axios from "axios";
import { cmd } from '../command.js';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);

// Bot name config
const BOT_NAME = "AHMAD HASSAN";

// 🔑 Qadeer XTech API (only)
const IG_API = 'https://qadeer-xtech-apis.vercel.app/download/instagram/video';

// Helper: fetch Instagram media via Qadeer API
async function fetchFromQadeer(igUrl) {
    try {
        const { data, status } = await axios.get(IG_API, {
            params: { url: igUrl },
            timeout: 30000,
            headers: { 'User-Agent': 'Mozilla/5.0' },
            validateStatus: () => true
        });

        // API returned error status
        if (status >= 400 || data?.status === false) {
            console.error('Qadeer API error:', data?.error || data?.message || `HTTP ${status}`);
            return { error: data?.error || data?.message || `API error (HTTP ${status})` };
        }

        // Valid media
        if (data?.status && (data?.video || data?.alternatives?.length)) {
            return {
                video: data.video || null,
                thumbnail: data.thumbnail || null,
                alternatives: data.alternatives || []
            };
        }

        return { error: 'No media found in response' };
    } catch (e) {
        console.error('Qadeer fetch exception:', e.message);
        return { error: e.message };
    }
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

        const result = await fetchFromQadeer(url);

        if (result?.error) {
            await conn.sendMessage(from, { react: { text: '❌', key: m.key } });
            return reply(`❌ Failed to fetch media.\n\n⚠️ API Error: ${result.error}\n\n💡 Try again later or use a different link.`);
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

        const result = await fetchFromQadeer(igUrl);

        if (result?.error) {
            await conn.sendMessage(from, { react: { text: '❌', key: m.key } });
            return reply(`❌ Unable to fetch video.\n\n⚠️ API Error: ${result.error}`);
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

        const result = await fetchFromQadeer(url);

        if (result?.error) {
            await conn.sendMessage(from, { react: { text: '❌', key: m.key } });
            return reply(`❌ Failed to fetch media.\n\n⚠️ API Error: ${result.error}`);
        }

        // Primary media
        const sent = await sendIGMedia(conn, from, mek, result,
            `╭━━❀ 📸 *ɪɴsᴛᴀɢʀᴀᴍ ᴅᴏᴡɴʟᴏᴀᴅᴇʀ* ❀━━╮\n┃\n` +
            `┃ 📹 ᴛʏᴘᴇ ➜ ${result.video ? 'video' : 'image'}\n` +
            `┃ 🔗 sᴏᴜʀᴄᴇ ➜ Qadeer XTech\n┃\n` +
            `╰━━━━━━━━━━━━━━━━━━━━━╯\n\n` +
            `💖 ᴇɴᴊᴏʏ ʏᴏᴜʀ ᴍᴇᴅɪᴀ!\n\n> *ᴘᴏᴡᴇʀᴇᴅ ʙʏ ${BOT_NAME}*`
        );

        // Alternatives (future multi-media support)
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
