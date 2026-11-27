import axios from "axios";
import { cmd } from '../command.js';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);

// Bot name config
const BOT_NAME = "AHMAD HASSAN";

// Helper: fetch Instagram media via JerryCoder API
async function fetchFromJerry(igUrl) {
    const apiUrl = `https://jerrycoder.oggyapi.workers.dev/down/insta?url=${encodeURIComponent(igUrl)}`;
    const { data } = await axios.get(apiUrl, { timeout: 20000 });

    if (data?.status === 'success' && data?.data?.url) {
        return {
            url: data.data.url,
            type: data.data.type || 'video',
            author: data.data.author || 'Unknown',
            title: data.data.title || 'Instagram Media'
        };
    }
    return null;
}

// Helper: fetch via backup API (aswin-sparky)
async function fetchFromSparky(igUrl) {
    const apiUrl = `https://api-aswin-sparky.koyeb.app/api/downloader/igdl?url=${encodeURIComponent(igUrl)}`;
    const response = await axios.get(apiUrl, { timeout: 20000 });

    if (response.data?.status && response.data.data?.length) {
        return response.data.data; // array of { type, url }
    }
    return null;
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
}, async (conn, mek, m, { from, reply, args, q }) => {
    try {
        const url = q || m.quoted?.text;
        if (!url || !url.includes("instagram.com")) {
            return reply("❌ Please provide/reply to an Instagram link");
        }

        await conn.sendMessage(from, { react: { text: '⏳', key: m.key } });

        let success = false;

        // Try new JerryCoder API first
        try {
            const result = await fetchFromJerry(url);
            if (result) {
                await conn.sendMessage(from, {
                    [result.type === 'video' ? 'video' : 'image']: { url: result.url },
                    caption: `╭━━❀ 📸 *ɪɴsᴛᴀɢʀᴀᴍ ᴅᴏᴡɴʟᴏᴀᴅᴇʀ* ❀━━╮\n┃\n` +
                        `┃ 💎 ǫᴜᴀʟɪᴛʏ ➜ ʜᴅ\n┃\n╰━━━━━━━━━━━━━━━━━━━━━╯\n\n` +
                        `💖 ᴇɴᴊᴏʏ ʏᴏᴜʀ ᴍᴇᴅɪᴀ!\n\n> *ᴘᴏᴡᴇʀᴇᴅ ʙʏ ${BOT_NAME}*`
                }, { quoted: mek });
                success = true;
            }
        } catch (e) {
            console.error('Jerry API failed:', e.message);
        }

        // Fallback to Sparky API
        if (!success) {
            try {
                const items = await fetchFromSparky(url);
                if (items && items.length) {
                    for (const item of items) {
                        await conn.sendMessage(from, {
                            [item.type === 'video' ? 'video' : 'image']: { url: item.url },
                            caption: `╭━━❀ 📸 *ɪɴsᴛᴀɢʀᴀᴍ ᴅᴏᴡɴʟᴏᴀᴅᴇʀ* ❀━━╮\n┃\n` +
                                `┃ 💎 ǫᴜᴀʟɪᴛʏ ➜ ʜᴅ\n┃\n╰━━━━━━━━━━━━━━━━━━━━━╯\n\n` +
                                `💖 ᴇɴᴊᴏʏ ʏᴏᴜʀ ᴍᴇᴅɪᴀ!\n\n> *ᴘᴏᴡᴇʀᴇᴅ ʙʏ ${BOT_NAME}*`
                        }, { quoted: mek });
                    }
                    success = true;
                }
            } catch (e) {
                console.error('Sparky API failed:', e.message);
            }
        }

        if (!success) {
            await conn.sendMessage(from, { react: { text: '❌', key: m.key } });
            return reply("❌ Failed to fetch media. Invalid link or private content.");
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
}, async (conn, mek, m, { from, reply, args }) => {
    try {
        const igUrl = args[0] || m.quoted?.text;
        if (!igUrl || !igUrl.includes("instagram.com")) {
            return reply('❌ Please provide a valid Instagram URL.\n\nExample:\n.igdl2 https://instagram.com/reel/...');
        }

        await conn.sendMessage(from, { react: { text: '⏳', key: m.key } });

        let success = false;

        // Try JerryCoder API
        try {
            const result = await fetchFromJerry(igUrl);
            if (result) {
                await reply('Downloading Instagram video... Please wait 📥');

                await conn.sendMessage(from, {
                    [result.type === 'video' ? 'video' : 'image']: { url: result.url },
                    caption: `╭━━❀ 📸 *ɪɴsᴛᴀɢʀᴀᴍ ᴍᴇᴅɪᴀ* ❀━━╮\n┃\n` +
                        `┃ 👤 ᴀᴜᴛʜᴏʀ ➜ ${result.author}\n` +
                        `┃ 📝 ᴛɪᴛʟᴇ ➜ ${result.title?.slice(0, 100) || 'N/A'}\n` +
                        `┃ 📹 ᴛʏᴘᴇ ➜ ${result.type}\n┃\n` +
                        `╰━━━━━━━━━━━━━━━━━━━━━╯\n\n` +
                        `💖 ᴇɴᴊᴏʏ ʏᴏᴜʀ ᴍᴇᴅɪᴀ! 🌸\n\n> *ᴘᴏᴡᴇʀᴇᴅ ʙʏ ${BOT_NAME}*`
                }, { quoted: mek });
                success = true;
            }
        } catch (e) {
            console.error('Jerry API failed:', e.message);
        }

        // Fallback: Sparky API
        if (!success) {
            try {
                const items = await fetchFromSparky(igUrl);
                if (items && items.length) {
                    for (const item of items) {
                        await conn.sendMessage(from, {
                            [item.type === 'video' ? 'video' : 'image']: { url: item.url },
                            caption: `╭━━❀ 📸 *ɪɴsᴛᴀɢʀᴀᴍ ᴍᴇᴅɪᴀ* ❀━━╮\n┃\n` +
                                `┃ 📹 ᴛʏᴘᴇ ➜ ${item.type}\n┃\n` +
                                `╰━━━━━━━━━━━━━━━━━━━━━╯\n\n` +
                                `💖 ᴇɴᴊᴏʏ ʏᴏᴜʀ ᴍᴇᴅɪᴀ! 🌸\n\n> *ᴘᴏᴡᴇʀᴇᴅ ʙʏ ${BOT_NAME}*`
                        }, { quoted: mek });
                    }
                    success = true;
                }
            } catch (e) {
                console.error('Sparky API failed:', e.message);
            }
        }

        if (!success) {
            await conn.sendMessage(from, { react: { text: '❌', key: m.key } });
            return reply('❌ Unable to fetch the video. Please check the URL and try again.');
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
}, async (conn, mek, m, { from, reply, args, q }) => {
    try {
        const url = q || m.quoted?.text;
        if (!url || !url.includes("instagram.com")) {
            return reply("❌ Please provide/reply to a valid Instagram link");
        }

        await conn.sendMessage(from, { react: { text: '⏳', key: m.key } });

        let success = false;

        // Try JerryCoder API first
        try {
            const result = await fetchFromJerry(url);
            if (result) {
                await conn.sendMessage(from, {
                    [result.type === 'video' ? 'video' : 'image']: { url: result.url },
                    caption: `╭━━❀ 📸 *ɪɴsᴛᴀɢʀᴀᴍ ᴅᴏᴡɴʟᴏᴀᴅᴇʀ* ❀━━╮\n┃\n` +
                        `┃ 📹 ᴛʏᴘᴇ ➜ ${result.type}\n` +
                        `┃ 👤 ᴀᴜᴛʜᴏʀ ➜ ${result.author}\n┃\n` +
                        `╰━━━━━━━━━━━━━━━━━━━━━╯\n\n` +
                        `💖 ᴇɴᴊᴏʏ ʏᴏᴜʀ ᴍᴇᴅɪᴀ!\n\n> *ᴘᴏᴡᴇʀᴇᴅ ʙʏ ${BOT_NAME}*`
                }, { quoted: mek });
                success = true;
            }
        } catch (e) {
            console.error('Jerry API failed:', e.message);
        }

        // Fallback: try old jawad-tech API
        if (!success) {
            try {
                const apiUrl = `https://jawad-tech.vercel.app/igdl?url=${encodeURIComponent(url)}`;
                const response = await axios.get(apiUrl, { timeout: 20000 });

                if (response.data?.status && response.data.result?.length) {
                    const mediaData = response.data.result;

                    for (const item of mediaData) {
                        const isVideo = item.contentType?.includes('video') || item.format === 'mp4';

                        if (isVideo) {
                            await conn.sendMessage(from, {
                                video: { url: item.url },
                                caption: `╭━━❀ 📸 *ɪɴsᴛᴀɢʀᴀᴍ ᴅᴏᴡɴʟᴏᴀᴅᴇʀ* ❀━━╮\n┃\n` +
                                    `┃ 📹 ᴛʏᴘᴇ ➜ ᴠɪᴅᴇᴏ\n` +
                                    `┃ 💾 sɪᴢᴇ ➜ ${(item.size / 1024 / 1024).toFixed(2)} MB\n` +
                                    `┃ 🎞️ ꜰᴏʀᴍᴀᴛ ➜ ${item.format}\n┃\n` +
                                    `╰━━━━━━━━━━━━━━━━━━━━━╯\n\n` +
                                    `💖 ᴇɴᴊᴏʏ ʏᴏᴜʀ ᴍᴇᴅɪᴀ!\n\n> *ᴘᴏᴡᴇʀᴇᴅ ʙʏ ${BOT_NAME}*`
                            }, { quoted: mek });
                        } else {
                            await conn.sendMessage(from, {
                                image: { url: item.url },
                                caption: `╭━━❀ 📸 *ɪɴsᴛᴀɢʀᴀᴍ ᴅᴏᴡɴʟᴏᴀᴅᴇʀ* ❀━━╮\n┃\n` +
                                    `┃ 🖼️ ᴛʏᴘᴇ ➜ ɪᴍᴀɢᴇ\n` +
                                    `┃ 💾 sɪᴢᴇ ➜ ${(item.size / 1024).toFixed(2)} KB\n` +
                                    `┃ 🎨 ꜰᴏʀᴍᴀᴛ ➜ ${item.format}\n┃\n` +
                                    `╰━━━━━━━━━━━━━━━━━━━━━╯\n\n` +
                                    `💖 ᴇɴᴊᴏʏ ʏᴏᴜʀ ᴍᴇᴅɪᴀ!\n\n> *ᴘᴏᴡᴇʀᴇᴅ ʙʏ ${BOT_NAME}*`
                            }, { quoted: mek });
                        }

                        await new Promise(r => setTimeout(r, 1000));
                    }
                    success = true;
                }
            } catch (e) {
                console.error('Jawad API failed:', e.message);
            }
        }

        if (!success) {
            await conn.sendMessage(from, { react: { text: '❌', key: m.key } });
            return reply("❌ Failed to fetch media. Invalid link or private content.");
        }

        await conn.sendMessage(from, { react: { text: '✅', key: m.key } });

    } catch (error) {
        console.error('IGDL3 Error:', error);
        await conn.sendMessage(from, { react: { text: '❌', key: m.key } });
        reply("❌ Download failed. Please check the link and try again.");
    }
});
