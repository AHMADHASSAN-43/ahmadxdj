import { fileURLToPath } from 'url';
import { cmd } from '../command.js';

const __filename = fileURLToPath(import.meta.url);

// Menu wali image (ye chal rahi hai, isliye same use ki)
const IMAGE_URL = "https://files.catbox.moe/lojbeu.jpg";

cmd({
    pattern: "ping",
    alias: ["speed", "pong", "ping2"],
    category: "main",
    react: "⚡",
    filename: __filename
},
async (conn, mek, m, { from, reply }) => {
    try {
        console.log("PING: command started");

        // Response time (message aane se ab tak)
        const msgTime = mek?.messageTimestamp ? Number(mek.messageTimestamp) * 1000 : Date.now();
        const responseTime = Math.max(0, Date.now() - msgTime);

        const dec = `
ᴀʜᴍᴀᴅ-ᴍᴅ

━━━〔 ✦ ᴘɪɴɢ ✦ 〕━━━

│ ⚡ ʀᴇsᴘᴏɴsᴇ : *${responseTime} ms*

───────────────`;

        // Bilkul menu wali contextInfo
        const contextInfo = {
            mentionedJid: [m.sender],
            forwardingScore: 999,
            isForwarded: true,
            forwardedNewsletterMessageInfo: {
                newsletterJid: '120363426472060176@newsletter',
                newsletterName: "AHMADTech",
                serverMessageId: 143
            }
        };

        // Bilkul menu wali tarah: image + caption, fail ho to text
        try {
            await conn.sendMessage(from, {
                image: { url: IMAGE_URL },
                caption: dec,
                contextInfo
            }, { quoted: mek });
            console.log("PING: image sent");
        } catch (imgErr) {
            console.log("PING: image failed, sending text ->", imgErr.message);
            await conn.sendMessage(from, {
                text: dec,
                contextInfo
            }, { quoted: mek });
            console.log("PING: text sent");
        }

    } catch (e) {
        console.log("PING: error ->", e.message);
        reply(`Error: ${e.message}`);
    }
});
