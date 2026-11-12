import { fileURLToPath } from 'url';
import { cmd } from '../command.js';

const __filename = fileURLToPath(import.meta.url);

const IMAGE_URL = "https://files.catbox.moe/lojbeu.jpg";

// Settings (masla aaye to inhe change karke test karo)
const USE_IMAGE = true;        // false = sirf text bheje
const USE_NEWSLETTER = false;  // true = forwarded newsletter contextInfo add hoga

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

    // Real response time (message aane se ab tak)
    const msgTime = mek?.messageTimestamp ? Number(mek.messageTimestamp) * 1000 : Date.now();
    const responseTime = Math.max(0, Date.now() - msgTime);

    // Reaction (fail ho to command na ruke)
    const reactionEmojis = ['💗', '👀', '🫀', '🎀', '🦋'];
    const reactionEmoji = reactionEmojis[Math.floor(Math.random() * reactionEmojis.length)];
    try {
        await conn.sendMessage(from, { react: { text: reactionEmoji, key: mek.key } });
    } catch (e) {
        console.log("PING: react failed ->", e.message);
    }

    const msg = `
ᴀʜᴍᴀᴅ-ᴍᴅ

━━━〔 ✦ ᴘɪɴɢ ✦ 〕━━━

│ ⚡ ʀᴇsᴘᴏɴsᴇ : *${responseTime} ms*

───────────────`;

    const options = { quoted: mek };

    const extra = {};
    if (USE_NEWSLETTER) {
        extra.contextInfo = {
            forwardingScore: 999,
            isForwarded: true,
            forwardedNewsletterMessageInfo: {
                newsletterJid: '120363426472060176@newsletter',
                newsletterName: "AHMAD-MD TECH",
                serverMessageId: 143
            }
        };
    }

    // 1) Image + caption
    if (USE_IMAGE) {
        try {
            await withTimeout(
                conn.sendMessage(from, { image: { url: IMAGE_URL }, caption: msg, ...extra }, options),
                10000
            );
            console.log("PING: image sent");
            return;
        } catch (e) {
            console.log("PING: image failed ->", e.message);
        }
    }

    // 2) Simple text (bina contextInfo ke, sab se safe)
    try {
        await withTimeout(
            conn.sendMessage(from, { text: msg }, options),
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
