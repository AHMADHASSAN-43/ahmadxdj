import { cmd, commands } from '../command.js';
import os from "os";
import fs from 'fs';
import path from 'path';
import config from '../config.js';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

cmd({
    pattern: "alive",
    desc: "Check uptime and system status",
    category: "main",
    react: "🚀",
    filename: __filename
},
async (conn, mek, m, { from, quoted, sender, reply }) => {
    try {
        // ⏳ Initial React
        await conn.sendMessage(from, { react: { text: '⏳', key: m.key } });

        const formatUptime = (seconds) => {
            const days = Math.floor(seconds / (3600 * 24));
            const hours = Math.floor((seconds % (3600 * 24)) / 3600);
            const minutes = Math.floor((seconds % 3600) / 60);
            const secs = Math.floor(seconds % 60);
            return `${days}d ${hours}h ${minutes}m ${secs}s`;
        };

        const uptime = formatUptime(process.uptime());
        const RAM = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);
        const platform = os.platform();

        // Ping jaisa simple style
        const status = `
ᴀʜᴍᴀᴅ-ᴍِᴅ

━━━〔 ✦ ᴀʟɪᴠᴇ ✦ 〕━━━

│ 🤖 sᴛᴀᴛᴜs : *ᴏɴʟɪɴᴇ & ᴀᴄᴛɪᴠᴇ*
│ ⏱️ ᴜᴘᴛɪᴍᴇ : *${uptime}*
│ 📟 ʀᴀᴍ ᴜsᴀɢᴇ : *${RAM} ᴍʙ*
│ 💻 ᴘʟᴀᴛғᴏʀᴍ : *${platform}*

───────────────

> *ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴀʜᴍᴀᴅ ʜᴀssᴀɴ*`;

        const contextInfo = {
            mentionedJid: [m.sender],
            forwardingScore: 999,
            isForwarded: true,
            forwardedNewsletterMessageInfo: {
                newsletterJid: '120363426472060176@newsletter',
                newsletterName: "AHMAD-MD TECH",
                serverMessageId: 143
            }
        };

        // Pehle lib/menu.jpg (local pic), na mile to catbox wali menu pic
        let imageToSend = { url: "https://files.catbox.moe/2maqd9.jpg" };
        try {
            const localMenu = path.join(__dirname, '../lib/menu.jpg');
            if (fs.existsSync(localMenu)) {
                const buf = fs.readFileSync(localMenu);
                if (buf.length > 1000) imageToSend = buf;
            }
        } catch (e) {
            console.log("Local menu pic read error:", e.message);
        }

        // Image ke saath bhejo, fail ho (catbox down) to simple text
        try {
            await Promise.race([
                conn.sendMessage(from, {
                    image: imageToSend,
                    caption: status,
                    contextInfo
                }, { quoted: mek }),
                new Promise((_, rej) => setTimeout(() => rej(new Error("image timeout")), 8000))
            ]);
        } catch (imgErr) {
            console.log("Alive image failed, sending text:", imgErr.message);
            await conn.sendMessage(from, { text: status, contextInfo }, { quoted: mek });
        }

        // ✅ Success React
        await conn.sendMessage(from, { react: { text: '🟢', key: m.key } });

    } catch (e) {
        console.error("Error in alive command:", e);
        await conn.sendMessage(from, { react: { text: '❌', key: m.key } });
        reply(`❌ System Error: ${e.message}`);
    }
});
