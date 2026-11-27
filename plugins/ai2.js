import { cmd } from '../command.js';
import axios from 'axios';

// 🔑 NEW API Config (Qadeer XTech)
const API_BASE = 'https://qadeer-xtech-apis.vercel.app/api/qadeerai/ai';

// ─────────────────────────────────────────────
// HELPER — call Qadeer AI endpoint
// ─────────────────────────────────────────────
async function askAI(prompt) {
    try {
        const apiUrl = `${API_BASE}/chatgpt?prompt=${encodeURIComponent(prompt)}`;
        const res = await axios.get(apiUrl, { timeout: 30000 });

        if (res.data?.status && res.data?.result) return res.data.result;
        if (res.data?.result) return res.data.result;

        console.error('⚠️ AI bad response:', res.data);
    } catch (e) {
        console.error('⚠️ AI failed:', e.message);
    }
    return null;
}

// ─────────────────────────────────────────────
// 🤖 NEW AI COMMAND
// ─────────────────────────────────────────────
cmd({
    pattern: 'ai',
    alias: ['chatgpt', 'gpt', 'ask'],
    desc: 'Chat with AI (Qadeer XTech GPT)',
    category: 'ai',
    react: '🤖',
    filename: import.meta.url
}, async (conn, mek, m, { from, reply, text }) => {
    try {
        if (!text) {
            return reply(
                `🤖 *AI CHAT*\n\n` +
                `📝 *Usage:*\n` +
                `• .ai Hello, how are you?\n` +
                `• .ai Write a poem about the moon`
            );
        }

        try { await conn.sendMessage(from, { react: { text: '⏳', key: mek.key } }); } catch (_) {}

        const answer = await askAI(text);

        if (!answer) {
            try { await conn.sendMessage(from, { react: { text: '❌', key: mek.key } }); } catch (_) {}
            return reply('❌ AI failed to respond. Try again later.');
        }

        const out =
`╭━━━〔 🤖 𝗔𝗜 𝗖𝗛𝗔𝗧 〕━━━╮
│
│ 💬 *Q:* ${text.slice(0, 200)}${text.length > 200 ? '...' : ''}
│
│ 🧠 *A:*
│ ${answer}
│
╰━━━━━━━━━━━━━━━━━━━━━╯

💖 ᴘᴏᴡᴇʀᴇᴅ ʙʏ AHMAD-MD ⚡`;

        try {
            await conn.sendMessage(from, { text: out }, { quoted: mek });
        } catch (_) {
            await reply(out);
        }

        try { await conn.sendMessage(from, { react: { text: '✅', key: mek.key } }); } catch (_) {}

    } catch (e) {
        console.error('ai error:', e);
        try { await conn.sendMessage(from, { react: { text: '❌', key: mek.key } }); } catch (_) {}
        reply(`❌ Error: ${e?.message || e}`);
    }
});
