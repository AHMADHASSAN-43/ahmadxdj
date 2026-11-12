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
        const BOT_NAME = userConfig?.BOT_NAME || config.BOT_NAME || 'AHMAD-MِD';
        const OWNER_NAME = userConfig?.OWNER_NAME || config.OWNER_NAME || 'AHMAD-TECH';

        const deployLink = 'https://ahmad-md.vercel.app';

        // --- EXACT SIMPLE STYLE LIKE PING / ALIVE ---
        const msg = `
${BOT_NAME}

━━━〔 ✦ ᴀʜᴍᴀᴅ-ᴍِᴅ ʀᴇᴘᴏ ✦ 〕━━━

│ 👤 ᴏᴡɴᴇʀ : *${OWNER_NAME}*
│ 📦 ᴠᴇʀsɪᴏɴ : *20.0*
│ 🛠️ ᴇɴɢɪɴᴇ : *ɴᴏᴅᴇ.ᴊs / ʙᴀɪʟᴇʏs*
│ ⏳ ʀᴜɴᴛɪᴍᴇ : *${runtime(process.uptime())}*

━━━〔 ✦ ᴅᴇᴘʟᴏʏ ʟɪɴᴋ ✦ 〕━━━

│ 🔗 *${deployLink}*

───────────────

> *ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴀʜᴍᴀᴅ ʜᴀssᴀɴ*`;

        const imageToUse = "https://files.catbox.moe/yx2kn6.jpg";

        const contextInfo = {
            mentionedJid: [m.sender],
            forwardingScore: 999,
            isForwarded: true,
            forwardedNewsletterMessageInfo: {
                newsletterJid: '120363426472060176@newsletter',
                newsletterName: `${BOT_NAME} - OFFICIAL`,
                serverMessageId: 143
            }
        };

        // 1. Send with image (same like ping/alive)
        try {
            await conn.sendMessage(from, {
                image: { url: imageToUse },
                caption: msg,
                contextInfo
            }, { quoted: mek });
        } catch (imgErr) {
            console.log("Repo image failed, sending text:", imgErr.message);
            // Fallback: simple text (same style) if catbox down
            await conn.sendMessage(from, {
                text: msg,
                contextInfo
            }, { quoted: mek });
        }

    } catch (error) {
        console.error("Error in repo command:", error);
        reply("❌ Error: Script fetch nahi ho saki.");
    }
});