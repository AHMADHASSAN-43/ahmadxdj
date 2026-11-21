import { cmd } from '../command.js';
import axios from 'axios';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);

// 🔑 JawadTech GPT2 API
const API_URL = 'https://jawadtechyt.vercel.app/gpt2';
const API_KEY = 'EXTRA';
const TIMEOUT = 30000;

// ===== 20 PRO AI NAMES =====
const PRO_AI_LIST = [
    "deepseekpro", "geminipro", "chatgptpro", "grokpro", "claudepro",
    "llamapro", "mistralpro", "copro", "perplexitypro", "kimipro",
    "qwenpro", "yipro", "bardpro", "mixtralpro", "falconpro",
    "vicunapro", "orcapro", "wizardpro", "solarpro", "neopro"
];

// ================== CORE AI CALL ==================
async function askAI(q, reply, usage) {
    if (!q || !q.trim()) return reply(usage);

    try {
        const res = await axios.get(API_URL, {
            params: { q: q.trim(), key: API_KEY },
            timeout: TIMEOUT,
            headers: { 'User-Agent': 'Mozilla/5.0' },
            validateStatus: () => true
        });

        const data = res.data;

        if (data && data.status === true) {
            const answer =
                data.response ||
                data.answer ||
                data.message ||
                data.result ||
                data.data;
            if (answer) return reply(String(answer));
            return reply('❌ API returned empty response.');
        }

        const errMsg = data?.error || data?.message || 'API returned status: false';
        return reply(`❌ ${errMsg}`);
    } catch (e) {
        if (e.code === 'ECONNABORTED' || e.message?.includes('timeout')) {
            return reply('❌ Request timeout. Try again.');
        }
        console.error('Pro AI API Error:', e?.message || e);
        return reply(`❌ Failed to connect to AI API: ${e?.message || 'unknown'}`);
    }
}

// ============================================================
// ===== NO-PREFIX HANDLER (on: body) =====
// Example: "deepseekpro what is AI?" -> works without dot
// ============================================================
cmd({
    'on': "body"
}, async (conn, mek, m, { body, reply, config }) => {
    try {
        if (!body) return;

        const text = body.trim();

        // Skip prefixed messages (cmd handler will pick them up)
        const usedPrefix = (config && config.PREFIX) ? config.PREFIX : '.';
        if (text.startsWith(usedPrefix) || text.startsWith('.') ||
            text.startsWith('!') || text.startsWith('#') || text.startsWith('/')) {
            return;
        }

        const lower = text.toLowerCase();

        for (const aiName of PRO_AI_LIST) {
            // Case 1: "deepseekpro hello" -> AI + question
            if (lower.startsWith(aiName + " ")) {
                const q = text.slice(aiName.length).trim();
                if (!q) return reply(`❌ *Usage:* ${aiName} Your question`);
                return await askAI(q, reply, `❌ *Usage:* ${aiName} Your question`);
            }

            // Case 2: exact match -> "deepseekpro"
            if (lower === aiName) {
                return reply(`❌ *Usage:* ${aiName} Your question`);
            }
        }
    } catch (error) {
        console.error("Pro AI no-prefix handler error:", error);
    }
});

// ============================================================
// ===== PREFIX COMMANDS =====
// ============================================================

cmd({ pattern: "deepseekpro", desc: "Chat with DeepSeek Pro AI", category: "ai-pro", react: "🚀", filename: __filename },
async (conn, mek, m, { q, reply }) => { await askAI(q, reply, "❌ *Usage:* .deepseekpro Your question"); });

cmd({ pattern: "geminipro", desc: "Chat with Gemini Pro AI", category: "ai-pro", react: "💎", filename: __filename },
async (conn, mek, m, { q, reply }) => { await askAI(q, reply, "❌ *Usage:* .geminipro Your question"); });

cmd({ pattern: "chatgptpro", desc: "Chat with ChatGPT Pro AI", category: "ai-pro", react: "🧠", filename: __filename },
async (conn, mek, m, { q, reply }) => { await askAI(q, reply, "❌ *Usage:* .chatgptpro Your question"); });

cmd({ pattern: "grokpro", desc: "Chat with Grok Pro AI", category: "ai-pro", react: "⚡", filename: __filename },
async (conn, mek, m, { q, reply }) => { await askAI(q, reply, "❌ *Usage:* .grokpro Your question"); });

cmd({ pattern: "claudepro", desc: "Chat with Claude Pro AI", category: "ai-pro", react: "🎯", filename: __filename },
async (conn, mek, m, { q, reply }) => { await askAI(q, reply, "❌ *Usage:* .claudepro Your question"); });

cmd({ pattern: "llamapro", desc: "Chat with Llama Pro AI", category: "ai-pro", react: "🦙", filename: __filename },
async (conn, mek, m, { q, reply }) => { await askAI(q, reply, "❌ *Usage:* .llamapro Your question"); });

cmd({ pattern: "mistralpro", desc: "Chat with Mistral Pro AI", category: "ai-pro", react: "🌪️", filename: __filename },
async (conn, mek, m, { q, reply }) => { await askAI(q, reply, "❌ *Usage:* .mistralpro Your question"); });

cmd({ pattern: "copro", desc: "Chat with Copilot Pro AI", category: "ai-pro", react: "💙", filename: __filename },
async (conn, mek, m, { q, reply }) => { await askAI(q, reply, "❌ *Usage:* .copro Your question"); });

cmd({ pattern: "perplexitypro", desc: "Chat with Perplexity Pro AI", category: "ai-pro", react: "🔍", filename: __filename },
async (conn, mek, m, { q, reply }) => { await askAI(q, reply, "❌ *Usage:* .perplexitypro Your question"); });

cmd({ pattern: "kimipro", desc: "Chat with Kimi Pro AI", category: "ai-pro", react: "🌙", filename: __filename },
async (conn, mek, m, { q, reply }) => { await askAI(q, reply, "❌ *Usage:* .kimipro Your question"); });

cmd({ pattern: "qwenpro", desc: "Chat with Qwen Pro AI", category: "ai-pro", react: "🔥", filename: __filename },
async (conn, mek, m, { q, reply }) => { await askAI(q, reply, "❌ *Usage:* .qwenpro Your question"); });

cmd({ pattern: "yipro", desc: "Chat with Yi Pro AI", category: "ai-pro", react: "🌟", filename: __filename },
async (conn, mek, m, { q, reply }) => { await askAI(q, reply, "❌ *Usage:* .yipro Your question"); });

cmd({ pattern: "bardpro", desc: "Chat with Bard Pro AI", category: "ai-pro", react: "🎭", filename: __filename },
async (conn, mek, m, { q, reply }) => { await askAI(q, reply, "❌ *Usage:* .bardpro Your question"); });

cmd({ pattern: "mixtralpro", desc: "Chat with Mixtral Pro AI", category: "ai-pro", react: "🌀", filename: __filename },
async (conn, mek, m, { q, reply }) => { await askAI(q, reply, "❌ *Usage:* .mixtralpro Your question"); });

cmd({ pattern: "falconpro", desc: "Chat with Falcon Pro AI", category: "ai-pro", react: "🦅", filename: __filename },
async (conn, mek, m, { q, reply }) => { await askAI(q, reply, "❌ *Usage:* .falconpro Your question"); });

cmd({ pattern: "vicunapro", desc: "Chat with Vicuna Pro AI", category: "ai-pro", react: "🦌", filename: __filename },
async (conn, mek, m, { q, reply }) => { await askAI(q, reply, "❌ *Usage:* .vicunapro Your question"); });

cmd({ pattern: "orcapro", desc: "Chat with Orca Pro AI", category: "ai-pro", react: "🐋", filename: __filename },
async (conn, mek, m, { q, reply }) => { await askAI(q, reply, "❌ *Usage:* .orcapro Your question"); });

cmd({ pattern: "wizardpro", desc: "Chat with Wizard Pro AI", category: "ai-pro", react: "🧙", filename: __filename },
async (conn, mek, m, { q, reply }) => { await askAI(q, reply, "❌ *Usage:* .wizardpro Your question"); });

cmd({ pattern: "solarpro", desc: "Chat with Solar Pro AI", category: "ai-pro", react: "☀️", filename: __filename },
async (conn, mek, m, { q, reply }) => { await askAI(q, reply, "❌ *Usage:* .solarpro Your question"); });

cmd({ pattern: "neopro", desc: "Chat with Neo Pro AI", category: "ai-pro", react: "💚", filename: __filename },
async (conn, mek, m, { q, reply }) => { await askAI(q, reply, "❌ *Usage:* .neopro Your question"); });
