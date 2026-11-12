import { fileURLToPath } from 'url';
import { cmd } from '../command.js';

const __filename = fileURLToPath(import.meta.url);

const IMAGE_URL = "https://files.catbox.moe/lojbeu.jpg";

cmd({
    pattern: "ping",
    alias: ["speed", "pong", "ping2"],
    use: '.ping',
    desc: "Check bot's response time.",
    category: "main",
    filename: __filename
},
async (conn, mek, m, { from }) => {
    const start = Date.now();
    const ms = Date.now() - start;

    // Test 1: bilkul simple text
    try {
        await conn.sendMessage(from, { text: `TEST 1 text ⚡ ${ms} ms` });
        console.log("PING: test1 sent");
    } catch (e) { console.log("PING: test1 failed ->", e.message); }

    // Test 2: image, bina contextInfo aur quoted
    try {
        await conn.sendMessage(from, { image: { url: IMAGE_URL }, caption: `TEST 2 image ⚡ ${ms} ms` });
        console.log("PING: test2 sent");
    } catch (e) { console.log("PING: test2 failed ->", e.message); }

    // Test 3: image + contextInfo (jaisa pehle tha)
    try {
        await conn.sendMessage(from, {
            image: { url: IMAGE_URL },
            caption: `TEST 3 image+context ⚡ ${ms} ms`,
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
        console.log("PING: test3 sent");
    } catch (e) { console.log("PING: test3 failed ->", e.message); }
});
