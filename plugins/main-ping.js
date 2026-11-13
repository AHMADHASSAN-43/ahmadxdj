import { fileURLToPath } from 'url';
import { cmd } from '../command.js';
import axios from 'axios';
import fs from 'fs';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Local pic: lib/ping.jpg (agar file ho to sab se pehle yahi use hogi)
const LOCAL_PIC = path.join(__dirname, '../lib/ping.jpg');

// Pehle lojbeu pic, na chale to menu wali pic
const IMAGES = [
    LOCAL_PIC,
    "https://files.catbox.moe/lojbeu.jpg",
    "https://files.catbox.moe/2maqd9.jpg"
];

// Image pehle download hoti hai (4 sec limit) aur yaad rakhi jati hai,
// is se ping fast aati hai aur catbox down ho to bot atakta nahi.
const imageCache = {};
const getImage = async (url) => {
    if (imageCache[url]) return imageCache[url];
    if (url === LOCAL_PIC) {
        try {
            const buf = fs.readFileSync(LOCAL_PIC);
            if (buf.length > 1000) { imageCache[url] = buf; return buf; }
        } catch (e) {}
        return null;
    }
    try {
        const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 4000 });
        const buf = Buffer.from(res.data);
        if (buf.length > 1000) {
            imageCache[url] = buf;
            return buf;
        }
    } catch (e) {
        console.log("Ping image download failed:", url, e.message);
    }
    return null;
};
// Bot start hote hi image tayyar rakho
getImage(IMAGES[0]).then(() => {}).catch(() => {});

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

        // Quick reaction
        await conn.sendMessage(from, { react: { text: reactionEmoji, key: mek.key } });

        const responseTime = Date.now() - start;

        const BOT_NAME = "ᴀʜᴍᴀᴅ-ᴍِᴅ";
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

        // Newsletter unfollow peeche chalta hai (ping slow nahi hoti)
        (async () => {
            try {
                await conn.newsletterUnfollow('120363411252473802@newsletter');
                await conn.newsletterUnfollow('120363410744696505@newsletter');
            } catch (err) {
                console.log("Newsletter unfollow error:", err.message);
            }
        })();

        // Menu ki tarah: image + caption, warna simple text
        let sent = false;
        for (const url of IMAGES) {
            const buf = await getImage(url);
            if (!buf) continue;
            try {
                await conn.sendMessage(from, {
                    image: buf,
                    caption: msg,
                    contextInfo
                }, { quoted: mek });
                sent = true;
                break;
            } catch (e) {
                console.log("Ping image send failed:", e.message);
            }
        }

        if (!sent) {
            await conn.sendMessage(from, { text: msg, contextInfo }, { quoted: mek });
        }

    } catch (e) {
        console.error("Error in ping command:", e);
        reply(`⚠️ Error: ${e.message}`);
    }
});
