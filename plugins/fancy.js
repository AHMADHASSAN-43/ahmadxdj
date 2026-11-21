import { cmd } from '../command.js';
import axios from 'axios';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);

// 🔑 JawadTech Fancy API
const API_URL = 'https://jawadtechyt.vercel.app/fancy';
const API_KEY = 'EXTRA';
const TIMEOUT = 20000;

async function fetchFancy(text) {
    const res = await axios.get(API_URL, {
        params: { text, key: API_KEY },
        timeout: TIMEOUT,
        headers: { 'User-Agent': 'Mozilla/5.0' },
        validateStatus: () => true
    });
    return res.data;
}

cmd({
    pattern: "fancy",
    alias: ["style", "font", "stylish"],
    desc: "Convert text into fancy/stylish fonts",
    category: "tools",
    react: "✨",
    filename: __filename
}, async (conn, mek, m, { from, q, reply, text }) => {
    try {
        const input = (q || text || '').trim();
        if (!input) {
            return reply("✨ *Fancy Text Generator*\n\n*Usage:* .fancy Your Text Here\n\n*Example:* .fancy Ahmad MD");
        }

        try { await conn.sendMessage(from, { react: { text: "⏳", key: mek.key } }); } catch (_) {}

        let data;
        try {
            data = await fetchFancy(input);
        } catch (err) {
            try { await conn.sendMessage(from, { react: { text: "❌", key: mek.key } }); } catch (_) {}
            return reply(`❌ API error: ${err?.message || err}`);
        }

        // Handle error / empty response
        if (!data || data.status === false) {
            try { await conn.sendMessage(from, { react: { text: "❌", key: mek.key } }); } catch (_) {}
            return reply(`❌ ${data?.error || data?.message || 'API returned an error.'}`);
        }

        // Flexible response parsing — support multiple possible key names
        let resultText =
            data.result ||
            data.response ||
            data.text ||
            data.output ||
            data.fancy ||
            data.data;

        // Some APIs return an array of styled variants
        if (Array.isArray(resultText)) {
            const list = resultText
                .map((v, i) => `${i + 1}. ${typeof v === 'string' ? v : (v.text || v.result || JSON.stringify(v))}`)
                .join('\n\n');
            try { await conn.sendMessage(from, { react: { text: "✅", key: mek.key } }); } catch (_) {}
            return reply(`✨ *Fancy Text Results*\n\n${list}\n\n💖 ᴘᴏᴡᴇʀᴇᴅ ʙʏ AHMAD-MD ⚡`);
        }

        // Object with many style keys (common for fancy-text APIs)
        if (resultText && typeof resultText === 'object' && !Array.isArray(resultText)) {
            const entries = Object.entries(resultText)
                .filter(([, v]) => typeof v === 'string' && v.trim());
            if (entries.length) {
                const list = entries.map(([k, v]) => `*${k}*\n${v}`).join('\n\n');
                try { await conn.sendMessage(from, { react: { text: "✅", key: mek.key } }); } catch (_) {}
                return reply(`✨ *Fancy Text Results*\n\n${list}\n\n💖 ᴘᴏᴡᴇʀᴇᴅ ʙʏ AHMAD-MD ⚡`);
            }
        }

        // Single string result
        if (typeof resultText === 'string' && resultText.trim()) {
            try { await conn.sendMessage(from, { react: { text: "✅", key: mek.key } }); } catch (_) {}
            return reply(`✨ *Fancy Text*\n\n${resultText}\n\n💖 ᴘᴏᴡᴇʀᴇᴅ ʙʏ AHMAD-MD ⚡`);
        }

        // Unknown shape — dump raw for debugging
        try { await conn.sendMessage(from, { react: { text: "❌", key: mek.key } }); } catch (_) {}
        return reply(`❌ Unexpected response format:\n\`\`\`\n${JSON.stringify(data, null, 2).slice(0, 1000)}\n\`\`\``);

    } catch (e) {
        console.error('Fancy Command Error:', e);
        try { await conn.sendMessage(from, { react: { text: "❌", key: mek.key } }); } catch (_) {}
        reply(`❌ Error: ${e?.message || e}`);
    }
});
