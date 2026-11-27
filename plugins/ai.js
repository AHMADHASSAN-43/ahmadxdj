import { cmd } from '../command.js';
import axios from 'axios';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);

// ============================================================
// ===== API CONFIGURATION (2 APIs with fallback) =====
// ============================================================
const API_1 = 'https://api-ahmadxmd.vercel.app/gpt';
const API_1_KEY = 'EXTRA';

const API_2 = 'https://jawadtechyt.vercel.app/gpt2';
const API_2_KEY = 'EXTRA';

const TIMEOUT = 30000;

// ===== 50 FAMOUS AI NAMES (Standard + Pro mixed) =====
const ALL_AI = [
    // ---- Top Famous AI (25) ----
    "gpt", "gpt4", "gpt4o", "chatgpt", "chatgptplus",
    "gemini", "claude", "claude2", "copilot", "mscopilot",
    "deepseek", "deepseekcoder", "grokbeta", "bard", "palm2",
    "llama2", "llama3", "mistral", "mixtral", "perplexity",
    "kimi", "qwen", "yi", "falcon", "ahmed",

    // ---- Pro AI (25) ----
    "chatgptpro", "geminipro", "claudepro", "grokpro", "copilotpro",
    "deepseekpro", "llamapro", "mistralpro", "perplexitypro", "kimipro",
    "qwenpro", "yipro", "bardpro", "falconpro", "wizardpro",
    "chatgptelite", "elitegpt", "elitecopilot", "elite", "proai",
    "brain", "smart", "genius", "ultra", "nova"
];

// ============================================================
// ===== SMART CORE AI CALL (tries API 1 -> then API 2) =====
// ============================================================
async function askAI(q, reply, usage) {
    if (!q || !q.trim()) return reply(usage);
    const query = q.trim();

    // ---- Try API 1 first (AhmadXMD) ----
    try {
        const res = await axios.get(API_1, {
            params: { q: query, key: API_1_KEY },
            timeout: TIMEOUT,
            headers: { 'User-Agent': 'Mozilla/5.0' },
            validateStatus: () => true
        });
        const data = res.data;
        if (data && data.status === true && data.result) {
            return reply(String(data.result));
        }
    } catch (e) {
        // silently fall through to API 2
    }

    // ---- Fallback API 2 (JawadTech) ----
    try {
        const res = await axios.get(API_2, {
            params: { q: query, key: API_2_KEY },
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
        }
        const errMsg = data?.error || data?.message || 'API returned status: false';
        return reply(`❌ ${errMsg}`);
    } catch (e) {
        if (e.code === 'ECONNABORTED' || e.message?.includes('timeout')) {
            return reply('❌ Request timeout. Try again.');
        }
        console.error('AI API Error:', e?.message || e);
        return reply(`❌ Failed to connect to AI API: ${e?.message || 'unknown'}`);
    }
}

// ============================================================
// ===== NO-PREFIX HANDLER (on: body) =====
// Example: "gpt hello" / "chatgptpro what is AI?"
// ============================================================
cmd({
    'on': "body"
}, async (conn, mek, m, { body, reply, config }) => {
    try {
        if (!body) return;

        const text = body.trim();

        // Skip prefixed messages
        const usedPrefix = (config && config.PREFIX) ? config.PREFIX : '.';
        if (text.startsWith(usedPrefix) || text.startsWith('.') ||
            text.startsWith('!') || text.startsWith('#') || text.startsWith('/')) {
            return;
        }

        const lower = text.toLowerCase();

        for (const aiName of ALL_AI) {
            // Case 1: "gemini hello" -> AI + question
            if (lower.startsWith(aiName + " ")) {
                const q = text.slice(aiName.length).trim();
                if (!q) return reply(`❌ *Usage:* ${aiName} Your question`);
                return await askAI(q, reply, `❌ *Usage:* ${aiName} Your question`);
            }

            // Case 2: exact match -> usage message
            if (lower === aiName) {
                return reply(`❌ *Usage:* ${aiName} Your question`);
            }
        }
    } catch (error) {
        console.error("AI no-prefix handler error:", error);
    }
});

// ============================================================
// ===== PREFIX COMMANDS (50 TOTAL) =====
// ============================================================

// ---------- TOP FAMOUS AI (25) ----------

cmd({ pattern: "gpt", desc: "Chat with GPT-3.5 AI", category: "ai", react: "🤖", filename: __filename },
async (conn, mek, m, { q, reply }) => { await askAI(q, reply, "❌ *Usage:* .gpt Your question"); });

cmd({ pattern: "gpt4", desc: "Chat with GPT-4 AI", category: "ai", react: "🤖", filename: __filename },
async (conn, mek, m, { q, reply }) => { await askAI(q, reply, "❌ *Usage:* .gpt4 Your question"); });

cmd({ pattern: "gpt4o", desc: "Chat with GPT-4o AI", category: "ai", react: "🤖", filename: __filename },
async (conn, mek, m, { q, reply }) => { await askAI(q, reply, "❌ *Usage:* .gpt4o Your question"); });

cmd({ pattern: "chatgpt", desc: "Chat with ChatGPT AI", category: "ai", react: "🤖", filename: __filename },
async (conn, mek, m, { q, reply }) => { await askAI(q, reply, "❌ *Usage:* .chatgpt Your question"); });

cmd({ pattern: "chatgptplus", desc: "Chat with ChatGPT Plus AI", category: "ai", react: "🤖", filename: __filename },
async (conn, mek, m, { q, reply }) => { await askAI(q, reply, "❌ *Usage:* .chatgptplus Your question"); });

cmd({ pattern: "gemini", desc: "Chat with Google Gemini AI", category: "ai", react: "💎", filename: __filename },
async (conn, mek, m, { q, reply }) => { await askAI(q, reply, "❌ *Usage:* .gemini Your question"); });

cmd({ pattern: "claude", desc: "Chat with Claude AI", category: "ai", react: "🎯", filename: __filename },
async (conn, mek, m, { q, reply }) => { await askAI(q, reply, "❌ *Usage:* .claude Your question"); });

cmd({ pattern: "claude2", desc: "Chat with Claude 2 AI", category: "ai", react: "🎯", filename: __filename },
async (conn, mek, m, { q, reply }) => { await askAI(q, reply, "❌ *Usage:* .claude2 Your question"); });

cmd({ pattern: "copilot", desc: "Chat with Microsoft Copilot AI", category: "ai", react: "✨", filename: __filename },
async (conn, mek, m, { q, reply }) => { await askAI(q, reply, "❌ *Usage:* .copilot Your question"); });

cmd({ pattern: "mscopilot", desc: "Chat with Microsoft Copilot", category: "ai", react: "💙", filename: __filename },
async (conn, mek, m, { q, reply }) => { await askAI(q, reply, "❌ *Usage:* .mscopilot Your question"); });

cmd({ pattern: "deepseek", desc: "Chat with DeepSeek AI", category: "ai", react: "🚀", filename: __filename },
async (conn, mek, m, { q, reply }) => { await askAI(q, reply, "❌ *Usage:* .deepseek Your question"); });

cmd({ pattern: "deepseekcoder", desc: "Chat with DeepSeek Coder AI", category: "ai", react: "💻", filename: __filename },
async (conn, mek, m, { q, reply }) => { await askAI(q, reply, "❌ *Usage:* .deepseekcoder Your question"); });

cmd({ pattern: "grokbeta", desc: "Chat with Grok Beta AI", category: "ai", react: "⚡", filename: __filename },
async (conn, mek, m, { q, reply }) => { await askAI(q, reply, "❌ *Usage:* .grokbeta Your question"); });

cmd({ pattern: "bard", desc: "Chat with Google Bard AI", category: "ai", react: "🎭", filename: __filename },
async (conn, mek, m, { q, reply }) => { await askAI(q, reply, "❌ *Usage:* .bard Your question"); });

cmd({ pattern: "palm2", desc: "Chat with PaLM 2 AI", category: "ai", react: "🌴", filename: __filename },
async (conn, mek, m, { q, reply }) => { await askAI(q, reply, "❌ *Usage:* .palm2 Your question"); });

cmd({ pattern: "llama2", desc: "Chat with Llama 2 AI", category: "ai", react: "🦙", filename: __filename },
async (conn, mek, m, { q, reply }) => { await askAI(q, reply, "❌ *Usage:* .llama2 Your question"); });

cmd({ pattern: "llama3", desc: "Chat with Llama 3 AI", category: "ai", react: "🦙", filename: __filename },
async (conn, mek, m, { q, reply }) => { await askAI(q, reply, "❌ *Usage:* .llama3 Your question"); });

cmd({ pattern: "mistral", desc: "Chat with Mistral AI", category: "ai", react: "🌪️", filename: __filename },
async (conn, mek, m, { q, reply }) => { await askAI(q, reply, "❌ *Usage:* .mistral Your question"); });

cmd({ pattern: "mixtral", desc: "Chat with Mixtral AI", category: "ai", react: "🌀", filename: __filename },
async (conn, mek, m, { q, reply }) => { await askAI(q, reply, "❌ *Usage:* .mixtral Your question"); });

cmd({ pattern: "perplexity", desc: "Chat with Perplexity AI", category: "ai", react: "🔍", filename: __filename },
async (conn, mek, m, { q, reply }) => { await askAI(q, reply, "❌ *Usage:* .perplexity Your question"); });

cmd({ pattern: "kimi", desc: "Chat with Kimi AI", category: "ai", react: "🌙", filename: __filename },
async (conn, mek, m, { q, reply }) => { await askAI(q, reply, "❌ *Usage:* .kimi Your question"); });

cmd({ pattern: "qwen", desc: "Chat with Qwen AI", category: "ai", react: "🔥", filename: __filename },
async (conn, mek, m, { q, reply }) => { await askAI(q, reply, "❌ *Usage:* .qwen Your question"); });

cmd({ pattern: "yi", desc: "Chat with Yi AI", category: "ai", react: "🌟", filename: __filename },
async (conn, mek, m, { q, reply }) => { await askAI(q, reply, "❌ *Usage:* .yi Your question"); });

cmd({ pattern: "falcon", desc: "Chat with Falcon AI", category: "ai", react: "🦅", filename: __filename },
async (conn, mek, m, { q, reply }) => { await askAI(q, reply, "❌ *Usage:* .falcon Your question"); });

cmd({ pattern: "wizard", desc: "Chat with Wizard AI", category: "ai", react: "🧙", filename: __filename },
async (conn, mek, m, { q, reply }) => { await askAI(q, reply, "❌ *Usage:* .wizard Your question"); });

// ---------- PRO AI (25) ----------

cmd({ pattern: "chatgptpro", desc: "Chat with ChatGPT Pro AI", category: "ai-pro", react: "🧠", filename: __filename },
async (conn, mek, m, { q, reply }) => { await askAI(q, reply, "❌ *Usage:* .chatgptpro Your question"); });

cmd({ pattern: "geminipro", desc: "Chat with Gemini Pro AI", category: "ai-pro", react: "💎", filename: __filename },
async (conn, mek, m, { q, reply }) => { await askAI(q, reply, "❌ *Usage:* .geminipro Your question"); });

cmd({ pattern: "claudepro", desc: "Chat with Claude Pro AI", category: "ai-pro", react: "🎯", filename: __filename },
async (conn, mek, m, { q, reply }) => { await askAI(q, reply, "❌ *Usage:* .claudepro Your question"); });

cmd({ pattern: "grokpro", desc: "Chat with Grok Pro AI", category: "ai-pro", react: "⚡", filename: __filename },
async (conn, mek, m, { q, reply }) => { await askAI(q, reply, "❌ *Usage:* .grokpro Your question"); });

cmd({ pattern: "copilotpro", desc: "Chat with Copilot Pro AI", category: "ai-pro", react: "💙", filename: __filename },
async (conn, mek, m, { q, reply }) => { await askAI(q, reply, "❌ *Usage:* .copilotpro Your question"); });

cmd({ pattern: "deepseekpro", desc: "Chat with DeepSeek Pro AI", category: "ai-pro", react: "🚀", filename: __filename },
async (conn, mek, m, { q, reply }) => { await askAI(q, reply, "❌ *Usage:* .deepseekpro Your question"); });

cmd({ pattern: "llamapro", desc: "Chat with Llama Pro AI", category: "ai-pro", react: "🦙", filename: __filename },
async (conn, mek, m, { q, reply }) => { await askAI(q, reply, "❌ *Usage:* .llamapro Your question"); });

cmd({ pattern: "mistralpro", desc: "Chat with Mistral Pro AI", category: "ai-pro", react: "🌪️", filename: __filename },
async (conn, mek, m, { q, reply }) => { await askAI(q, reply, "❌ *Usage:* .mistralpro Your question"); });

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

cmd({ pattern: "falconpro", desc: "Chat with Falcon Pro AI", category: "ai-pro", react: "🦅", filename: __filename },
async (conn, mek, m, { q, reply }) => { await askAI(q, reply, "❌ *Usage:* .falconpro Your question"); });

cmd({ pattern: "wizardpro", desc: "Chat with Wizard Pro AI", category: "ai-pro", react: "🧙", filename: __filename },
async (conn, mek, m, { q, reply }) => { await askAI(q, reply, "❌ *Usage:* .wizardpro Your question"); });

cmd({ pattern: "chatgptelite", desc: "Chat with ChatGPT Elite AI", category: "ai-pro", react: "👑", filename: __filename },
async (conn, mek, m, { q, reply }) => { await askAI(q, reply, "❌ *Usage:* .chatgptelite Your question"); });

cmd({ pattern: "elitegpt", desc: "Chat with Elite ChatGPT", category: "ai-pro", react: "👑", filename: __filename },
async (conn, mek, m, { q, reply }) => { await askAI(q, reply, "❌ *Usage:* .elitegpt Your question"); });

cmd({ pattern: "elitecopilot", desc: "Chat with Elite Copilot", category: "ai-pro", react: "🎯", filename: __filename },
async (conn, mek, m, { q, reply }) => { await askAI(q, reply, "❌ *Usage:* .elitecopilot Your question"); });

cmd({ pattern: "elite", desc: "Chat with Elite AI Assistant", category: "ai-pro", react: "👑", filename: __filename },
async (conn, mek, m, { q, reply }) => { await askAI(q, reply, "❌ *Usage:* .elite Your question"); });

cmd({ pattern: "proai", desc: "Chat with Pro AI", category: "ai-pro", react: "⚡", filename: __filename },
async (conn, mek, m, { q, reply }) => { await askAI(q, reply, "❌ *Usage:* .proai Your question"); });

cmd({ pattern: "brain", desc: "Chat with Brain AI", category: "ai-pro", react: "🧠", filename: __filename },
async (conn, mek, m, { q, reply }) => { await askAI(q, reply, "❌ *Usage:* .brain Your question"); });

cmd({ pattern: "smart", desc: "Chat with Smart AI", category: "ai-pro", react: "🧠", filename: __filename },
async (conn, mek, m, { q, reply }) => { await askAI(q, reply, "❌ *Usage:* .smart Your question"); });

cmd({ pattern: "genius", desc: "Chat with Genius AI", category: "ai-pro", react: "🌟", filename: __filename },
async (conn, mek, m, { q, reply }) => { await askAI(q, reply, "❌ *Usage:* .genius Your question"); });

cmd({ pattern: "ultra", desc: "Chat with Ultra AI", category: "ai-pro", react: "🔥", filename: __filename },
async (conn, mek, m, { q, reply }) => { await askAI(q, reply, "❌ *Usage:* .ultra Your question"); });

cmd({ pattern: "nova", desc: "Chat with Nova AI", category: "ai-pro", react: "⭐", filename: __filename },
async (conn, mek, m, { q, reply }) => { await askAI(q, reply, "❌ *Usage:* .nova Your question"); });
