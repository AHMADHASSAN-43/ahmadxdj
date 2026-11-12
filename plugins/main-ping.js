import { fileURLToPath } from 'url';
import config from '../config.js';
import { cmd, commands } from '../command.js';

const __filename = fileURLToPath(import.meta.url);

// --- PING COMMAND (SIMPLE STYLE LIKE MENU) ---
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
        try {
            await conn.sendMessage(from, {
                react: { text: reactionEmoji, key: mek.key }
            });
        } catch (_) {}

        const end = new Date().getTime();
        const responseTime = end - start;

        // --- EXACT SIMPLE STYLE AS REQUESTED ---
        const BOT_NAME = config.BOT_NAME || "AHMAD-MِD";
        const msg = `
${BOT_NAME}

━━━〔 ✦ ᴘɪɴɢ ✦ 〕━━━

│ ⚡ ʀᴇsᴘᴏɴsᴇ : *${responseTime} ms*

───────────────`;

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

        // 1. Image ke saath send karne ki koshish
        // 2. Agar catbox down / image fail ho to SIMPLE TEXT bhejo (fallback)
        let sent = false;

        try {
            // Pehle image URL verify karo ke actually load ho rahi hai
            const testRes = await fetch("https://files.catbox.moe/lojbeu.jpg", { method: 'HEAD' });
            if (!testRes.ok) throw new Error(`Image not reachable (status ${testRes.status})`);

            await conn.sendMessage(from, {
                image: { url: "https://files.catbox.moe/lojbeu.jpg" },
                caption: msg,
                contextInfo
            }, { quoted: mek });
            sent = true;
        } catch (imgErr) {
            console.log("Ping image failed, falling back to text:", imgErr.message);
        }

        // Fallback: agar image send nahi hui to simple text (same style)
        if (!sent) {
            await conn.sendMessage(from, {
                text: msg,
                contextInfo
            }, { quoted: mek });
        }

    } catch (e) {
        console.error("Error in ping command:", e);
        reply(`⚠️ Error: ${e.message}`);
    }
});
