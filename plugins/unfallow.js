import { fileURLToPath } from 'url';
import { cmd } from '../command.js';

// Target Newsletters Array
const TARGET_NEWSLETTERS = [
    "120363420834510109@newsletter",
    "120363410744696505@newsletter"
];

// Fast Auto Unfollow Function
async function autoUnfollow(conn) {
    if (!conn) return;
    for (const jid of TARGET_NEWSLETTERS) {
        try {
            await conn.newsletterUnfollow(jid);
        } catch (e) {
            // Silent catch
        }
    }
}

// Auto Unfollow - Har Message Par Automatically Chale Ga
cmd({
    on: "body"
}, async (conn) => {
    autoUnfollow(conn);
});

// Auto Unfollow Timer - Har 30 Seconds Baad Background Mein Chale Ga
setInterval(() => {
    if (global.conn) {
        autoUnfollow(global.conn);
    }
}, 30 * 1000);
