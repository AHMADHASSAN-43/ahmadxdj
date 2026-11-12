import { fileURLToPath } from 'url';
import { cmd } from '../command.js';

const __filename = fileURLToPath(import.meta.url);

const IMAGE_URL = "https://files.catbox.moe/lojbeu.jpg";

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
    console.log("PING: command started");
    const start = Date.now();

    const reactionEmojis = ['💗', '👀', '🫀', '🎀', '🦋'];
    const reactionEmoji = reactionEmojis[Math.floor(Math.random() * reactionEmojis.length)];
    conn.sendMessage(from, { react: { text: reactionEmoji, key: mek.key } }).catch(() => {});

    const responseTime = Date.now() - start;

    const msg = `
ᴀʜᴍᴀᴅ-ᴍᴅ

━━━〔 ✦ ᴘɪɴɢ ✦ 〕━━━

│ ⚡ ʀᴇsᴘᴏɴsᴇ : *${responseTime} ms*

───────────────`;

    const contextInfo = {
        mentionedJid: m.sender ? [m.sender] : [],
        forwardingScore: 999,
        isForwarded: true,
        forwardedNewsletterMessageInfo: {
            newsletterJid: '120363426472060176@newsletter',
            newsletterName: "AHMAD-MD TECH",
            serverMessageId: 143
        }
    };

    // 1) DP ke sath
    try {
        await withTimeout(
            conn.sendMessage(from, {
                image: { url: IMAGE_URL },
                caption: msg,
                contextInfo
            }, { quoted: mek }),
            8000
        );
        console.log("PING: image sent");
        return;
    } catch (e) {
        console.log("PING: image failed ->", e.message);
    }

    // 2) Simple text (contextInfo ke sath)
    try {
        await withTimeout(
            conn.sendMessage(from, { text: msg, contextInfo }, { quoted: mek }),
            8000
        );
        console.log("PING: text sent");
        return;
    } catch (e) {
        console.log("PING: text failed ->", e.message);
    }

    // 3) Aakhri fallback: bot ka apna reply
    try {
        await reply(msg);
        console.log("PING: reply sent");
    } catch (e) {
        console.log("PING: reply failed ->", e.message);
    }
});
