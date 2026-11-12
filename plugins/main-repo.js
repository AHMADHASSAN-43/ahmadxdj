// AHMAD Tech

import config from '../config.js';
import { cmd, commands } from '../command.js';
import os from "os";
import { runtime, sleep } from '../lib/functions.js';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

cmd({
    pattern: "repo",
    alias: ["sc", "script", "repository", "deploy"],
    desc: "Get AHMAD-MD deploy link and information",
    react: "📂",
    category: "main",
    filename: __filename,
},
async (conn, mek, m, { from, reply, userConfig }) => {
    try {
        const BOT_NAME = userConfig?.BOT_NAME || config.BOT_NAME || 'AHMAD-MD';
        const OWNER_NAME = userConfig?.OWNER_NAME || config.OWNER_NAME || 'AHMAD-TECH';
        
        const deployLink = 'https://ahmad-md.vercel.app';

        // --- REQUESTED STYLE ---
        const formattedInfo = `𝘼𝙃𝙈𝘼𝘿 𝙈𝘿🚩

━━━〔 ✦ ʀᴇᴘᴏ ✦ 〕━━━

│ ⚡ ᴏᴡɴᴇʀ : *${OWNER_NAME}*
│ ⚡ ᴠᴇʀsɪᴏɴ : *1.0.0 (Latest)*
│ ⚡ ᴇɴɢɪɴᴇ : *Node.js / Baileys*
│ ⚡ ʀᴜɴᴛɪᴍᴇ : *${runtime(process.uptime())}*
│ ⚡ ᴘᴀɪʀɪɴɢ : *${deployLink}*

───────────────

> *ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴀʜᴍᴀᴅ ʜᴀssᴀɴ*`;

        // Direct Catbox Image URL (Same as Help command structure)
        const imageToSend = { url: "https://files.catbox.moe/2maqd9.jpg" };

        await conn.sendMessage(from, {
            image: imageToSend,
            caption: formattedInfo,
            contextInfo: { 
                mentionedJid: [m.sender],
                forwardingScore: 999,
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: '120363426472060176@newsletter',
                    newsletterName: `${BOT_NAME} - OFFICIAL`,
                    serverMessageId: 143
                }
            }
        }, { quoted: mek });

    } catch (error) {
        console.error("Error in repo command:", error);
        reply("❌ Error: Script fetch nahi ho saki.");
    }
});
