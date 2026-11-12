// AHMAD Tech
import config from '../config.js';
import { cmd } from '../command.js';
import { runtime } from '../lib/functions.js';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);

const getDP = async (conn, jid) => {
    const botJid = conn.user?.id ? conn.user.id.split(':')[0].split('@')[0] + '@s.whatsapp.net' : null;
    for (const j of [jid, botJid]) {
        if (!j) continue;
        try {
            const url = await conn.profilePictureUrl(j, 'image');
            if (url) return url;
        } catch (e) {}
    }
    return null;
};

cmd({
    pattern: "repo",
    alias: ["sc", "script", "repository", "deploy"],
    desc: "Get AHMAD-MD deploy link and information",
    react: "📂",
    category: "main",
    filename: __filename,
},
async (conn, mek, m, { from, sender, reply, userConfig }) => {
    try {
        const BOT_NAME = userConfig?.BOT_NAME || config.BOT_NAME || 'AHMAD-MD';
        const OWNER_NAME = userConfig?.OWNER_NAME || config.OWNER_NAME || 'AHMAD-TECH';
        const deployLink = 'https://ahmad-md.vercel.app';

        const msg = `${BOT_NAME}

━━━〔 ✦ ᴀʜᴍᴀᴅ-ᴍᴅ ʀᴇᴘᴏ ✦ 〕━━━

│ 👤 ᴏᴡɴᴇʀ : *${OWNER_NAME}*
│ 📦 ᴠᴇʀsɪᴏɴ : *20.0*
│ 🛠️ ᴇɴɢɪɴᴇ : *ɴᴏᴅᴇ.ᴊs / ʙᴀɪʟᴇʏs*
│ ⏳ ʀᴜɴᴛɪᴍᴇ : *${runtime(process.uptime())}*

━━━〔 ✦ ᴅᴇᴘʟᴏʏ ʟɪɴᴋ ✦ 〕━━━

│ 🔗 *${deployLink}*

───────────────

> *ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴀʜᴍᴀᴅ ʜᴀssᴀɴ*`;

        const dp = (await getDP(conn, sender || m.sender)) || "https://files.catbox.moe/yx2kn6.jpg";

        try {
            await conn.sendMessage(from, { image: { url: dp }, caption: msg }, { quoted: mek });
        } catch (imgErr) {
            console.log("Repo image failed, sending text:", imgErr.message);
            await conn.sendMessage(from, { text: msg }, { quoted: mek });
        }
    } catch (error) {
        console.error("Error in repo command:", error);
        reply("❌ Error: Script fetch nahi ho saki.");
    }
});
