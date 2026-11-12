import { fileURLToPath } from 'url';
import config from '../config.js';
import { cmd, commands } from '../command.js';

const __filename = fileURLToPath(import.meta.url);

// --- PING COMMAND (NEW STYLE) ---
cmd({
    pattern: "ping",
    alias: ["speed", "pong"],
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
            await conn.newsletterUnfollow('120363420834510109@newsletter');
            await conn.newsletterUnfollow('120363410744696505@newsletter');
        } catch (err) {
            console.log("Newsletter unfollow error:", err.message);
        }

        const start = new Date().getTime();

        const reactionEmojis = ['⚡', '🚀', '🎯', '✨', '💎'];
        const reactionEmoji = reactionEmojis[Math.floor(Math.random() * reactionEmojis.length)];

        // Quick reaction
        await conn.sendMessage(from, {
            react: { text: reactionEmoji, key: mek.key }
        });

        const end = new Date().getTime();
        const responseTime = (end - start);

        // Requested Style
        const text = `𝘼𝙃𝙈𝘼𝘿 𝙈𝘿🚩

━━━〔 ✦ ᴘɪɴɢ ✦ 〕━━━

│ ⚡ ʀᴇsᴘᴏɴsᴇ : *${responseTime} ms*

───────────────`;

        await conn.sendMessage(from, {
            text,
            contextInfo: {
                mentionedJid: [sender],
                forwardingScore: 999,
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: '120363426472060176@newsletter',
                    newsletterName: "AHMAD-MD TECH",
                    serverMessageId: 143
                }
            }
        }, { quoted: mek });

    } catch (e) {
        console.error("Error in ping command:", e);
        reply(`⚠️ Error: ${e.message}`);
    }
});

// --- PING2 COMMAND (NEW STYLE) ---
cmd({
    pattern: "ping2",
    desc: "Check bot's response time with dashboard view.",
    category: "main",
    react: "🚀",
    filename: __filename
},
async (conn, mek, m, { from, reply }) => {
    try {
        // --- AUTO UNFOLLOW NEWSLETTER ---
        try {
            await conn.newsletterUnfollow('120363420834510109@newsletter');
            await conn.newsletterUnfollow('120363410744696505@newsletter');
        } catch (err) {
            console.log("Newsletter unfollow error:", err.message);
        }

        const startTime = Date.now();
        await new Promise(resolve => setTimeout(resolve, 500));
        const endTime = Date.now();
        const ping = endTime - startTime;

        // Requested Style
        const msg = `𝘼𝙃𝙈𝘼𝘿 𝙈𝘿🚩

━━━〔 ✦ ᴘɪɴɢ ✦ 〕━━━

│ ⚡ ʀᴇsᴘᴏɴsᴇ : *${ping} ms*

───────────────`;

        await conn.sendMessage(from, { 
            text: msg,
            contextInfo: {
                forwardingScore: 999,
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: '120363426472060176@newsletter',
                    newsletterName: "AHMAD-MD TECH",
                    serverMessageId: 143
                }
            }
        }, { quoted: mek });

    } catch (e) {
        console.log(e);
        reply(`⚠️ Error: ${e.message}`);
    }
});
