import { fileURLToPath } from 'url';
import { cmd } from '../command.js';

const __filename = fileURLToPath(import.meta.url);

const IMAGE_URL = "https://files.catbox.moe/lojbeu.jpg";

// Image ke liye time limit, warna text bhej do
const withTimeout = (promise, ms) =>
    Promise.race([
        promise,
        new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), ms))
    ]);

cmd({
    pattern: "ping",
    alias: ["speed", "pong", "ping2"],
    use: '.ping',
    desc: "Check bot's response time.",
    category: "main",
    react: "⚡",
    filename: __filename
},
async (conn, mek, m, { from, reply }) => {
    try {
        const start = Date.now();

        const reactionEmojis = ['💗', '👀', '🫀', '🎀', '🦋'];
        const reactionEmoji = reactionEmojis[Math.floor(Math.random() * reactionEmojis.length)];
        conn.sendMessage(from, { react: { text: reactionEmoji, key: mek.key } }).catch(() => {});

        const responseTime = Date.now() - start;

        const BOT_NAME = "ᴀʜᴍᴀᴅ-ᴍᴅ";
        const msg = `
${BOT_NAME}

━━━〔 ✦ ᴘɪɴɢ ✦ 〕━━━

│ ⚡ ʀᴇsᴘᴏɴsᴇ : *${responseTime} ms*

───────────────`;

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

        // Newsletter unfollow peeche chalta hai
        (async () => {
            try {
                await conn.newsletterUnfollow('120363411252473802@newsletter');
                await conn.newsletterUnfollow('120363410744696505@newsletter');
            } catch (err) {
                console.log("Newsletter unfollow error:", err.message);
            }
        })();

        // Pehle DP ke sath, catbox down ho to simple text
        try {
            await withTimeout(
                conn.sendMessage(from, {
                    image: { url: IMAGE_URL },
                    caption: msg,
                    contextInfo
                }, { quoted: mek }),
                8000
            );
        } catch (e) {
            console.log("Ping image failed, sending text:", e.message);
            await conn.sendMessage(from, { text: msg, contextInfo }, { quoted: mek });
        }

    } catch (e) {
        console.error("Error in ping command:", e);
        reply(`⚠️ Error: ${e.message}`);
    }
});
