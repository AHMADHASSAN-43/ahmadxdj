import { fileURLToPath } from 'url';
import config from '../config.js';
import { cmd } from '../command.js';

const __filename = fileURLToPath(import.meta.url);

// Sender ki DP lao, na mile to bot ki DP, wo bhi na mile to null
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
    pattern: "ping",
    alias: ["speed", "pong", "ping2"],
    use: '.ping',
    desc: "Check bot's response time.",
    category: "main",
    react: "⚡",
    filename: __filename
},
async (conn, mek, m, { from, sender, reply }) => {
    try {
        const start = Date.now();

        const reactionEmojis = ['💗', '👀', '🫀', '🎀', '🦋'];
        const reactionEmoji = reactionEmojis[Math.floor(Math.random() * reactionEmojis.length)];
        await conn.sendMessage(from, { react: { text: reactionEmoji, key: mek.key } });

        const responseTime = Date.now() - start;

        const BOT_NAME = config.BOT_NAME || "AHMAD-MD";
        const msg = `${BOT_NAME}

━━━〔 ✦ ᴘɪɴɢ ✦ 〕━━━

│ ⚡ ʀᴇsᴘᴏɴsᴇ : *${responseTime} ms*

───────────────`;

        const dp = (await getDP(conn, sender || m.sender)) || "https://files.catbox.moe/lojbeu.jpg";

        // Simple normal message (no channel/forward card) + DP
        try {
            await conn.sendMessage(from, { image: { url: dp }, caption: msg }, { quoted: mek });
        } catch (imgErr) {
            console.log("Ping image failed, sending text:", imgErr.message);
            await conn.sendMessage(from, { text: msg }, { quoted: mek });
        }
    } catch (e) {
        console.error("Error in ping command:", e);
        reply(`⚠️ Error: ${e.message}`);
    }
});
