import { fileURLToPath } from 'url';
import config from '../config.js';
import { cmd, commands } from '../command.js';

const __filename = fileURLToPath(import.meta.url);

// --- PING COMMAND (FIXED) ---
cmd({
    pattern: "ping",
    alias: ["speed", "pong", "ping2"],
    use: '.ping',
    desc: "Check bot's response time.",
    category: "main",
    react: "⚡",
    filename: __filename
},
async (conn, mek, m, { from, quoted, sender, reply }) => {
    try {
        // --- AUTO UNFOLLOW NEWSLETTER ---
        try {
            await conn.newsletterUnfollow('120363411252473802@newsletter');
            await conn.newsletterUnfollow('120363410744696505@newsletter');
        } catch (err) {
            console.log("Newsletter unfollow error:", err.message);
        }

        const start = new Date().getTime();

        const reactionEmojis = ['💗', '👀', '🫀', '🎀', '🦋'];
        const reactionEmoji = reactionEmojis[Math.floor(Math.random() * reactionEmojis.length)];

        // Quick reaction
        await conn.sendMessage(from, {
            react: { text: reactionEmoji, key: mek.key }
        });

        const end = new Date().getTime();
        const responseTime = end - start;

        // --- EXACT SIMPLE STYLE AS REQUESTED ---
        const BOT_NAME = config.BOT_NAME || "AHMAD-MِD";
        const msg = `
${BOT_NAME}

━━━〔 ✦ ᴘɪɴɢ ✦ 〕━━━

│ ⚡ ʀᴇsᴘᴏɴsᴇ : *${responseTime} ms*

───────────────`;

        const imageToUse = "https://files.catbox.moe/lojbeu.jpg";

        const contextInfo = {
            mentionedJid: [sender],
            forwardingScore: 999,
            isForwarded: true,
            forwardedNewsletterMessageInfo: {
                newsletterJid: '120363426472060176@newsletter',
                newsletterName: "AHMAD-MD TECH",
                serverMessageId: 143
            }
        };

        // 1. Send with image (same like menu)
        try {
            await conn.sendMessage(from, {
                image: { url: imageToUse },
                caption: msg,
                contextInfo
            }, { quoted: mek });
        } catch (imgErr) {
            // Agar image fail ho jaye (catbox down), to simple text bhej do
            console.log("Ping image failed, sending text:", imgErr.message);
            await conn.sendMessage(from, {
                text: msg,
                contextInfo
            }, { quoted: mek });
        }

    } catch (e) {
        console.error("Error in ping command:", e);
        // Agar upar koi error aaye to user ko batayen
        reply(`⚠️ Error: ${e.message}`);
    }
});
