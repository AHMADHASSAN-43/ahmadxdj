import { cmd } from '../command.js';
import axios from 'axios';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);

const API_URL = 'https://adeel-xtech-api.onrender.com/api/gptv2';
const TIMEOUT = 15000;
const API_TOKEN = 'Ahmad568868990866';

// ===== 20 PRO AI NAMES =====
const PRO_AI_LIST = [
    "deepseekpro", "geminipro", "chatgptpro", "grokpro", "claudepro",
    "llamapro", "mistralpro", "copro", "perplexitypro", "kimipro",
    "qwenpro", "yipro", "bardpro", "mixtralpro", "falconpro",
    "vicunapro", "orcapro", "wizardpro", "solarpro", "neopro"
];

async function askAI(q, reply, usage) {
    if (!q) return reply(usage);
    try {
        const res = await axios.get(API_URL, {
            params: { q },
            headers: { 'x-api-token': API_TOKEN },
            timeout: TIMEOUT
        });
        if (res.data && res.data.status && res.data.result) {
            return reply(String(res.data.result));
        }
        return reply('❌ API Error.');
    } catch (e) {
        if (e.code === 'ECONNABORTED' || e.message?.includes('timeout')) {
            return reply('❌ Request timeout.');
        }
        return reply('❌ Failed to connect to API.');
    }
}

// ============================================================
// ===== NO-PREFIX HANDLER (on: body) =====
// Ye bina prefix bhi kaam karega
// Example: "deepseekpro what is AI?" -> works without dot
// ============================================================
cmd({
    'on': "body"
}, async (conn, mek, m, { body, reply }) => {
    try {
        if (!body) return;

        const text = body.trim();
        const lower = text.toLowerCase();

        // Check karo ke message kisi pro-ai se start hota hai ya nahi
        for (const aiName of PRO_AI_LIST) {
            // Case 1: bina prefix -> "deepseekpro hello"
            if (lower.startsWith(aiName + " ")) {
                const q = text.slice(aiName.length).trim();
                if (!q) return reply(`❌ *Usage:* ${aiName} Your question`);
                return await askAI(q, reply, `❌ *Usage:* ${aiName} Your question`);
            }

            // Case 2: exact match bina question -> "deepseekpro"
            if (lower === aiName) {
                return reply(`❌ *Usage:* ${aiName} Your question`);
            }
        }
    } catch (error) {
        console.error("Pro AI no-prefix handler error:", error);
    }
});

// ============================================================
// ===== PREFIX COMMANDS (cmd pattern) =====
// Ye prefix ke saath kaam karega (e.g. .deepseekpro hi)
// ============================================================

cmd({
    pattern: "deepseekpro",
    desc: "Chat with DeepSeek Pro AI",
    category: "ai-pro",
    react: "🚀",
    filename: __filename
}, async (conn, mek, m, { q, reply }) => {
    await askAI(q, reply, "❌ *Usage:* .deepseekpro Your question");
});

cmd({
    pattern: "geminipro",
    desc: "Chat with Gemini Pro AI",
    category: "ai-pro",
    react: "💎",
    filename: __filename
}, async (conn, mek, m, { q, reply }) => {
    await askAI(q, reply, "❌ *Usage:* .geminipro Your question");
});

cmd({
    pattern: "chatgptpro",
    desc: "Chat with ChatGPT Pro AI",
    category: "ai-pro",
    react: "🧠",
    filename: __filename
}, async (conn, mek, m, { q, reply }) => {
    await askAI(q, reply, "❌ *Usage:* .chatgptpro Your question");
});

cmd({
    pattern: "grokpro",
    desc: "Chat with Grok Pro AI",
    category: "ai-pro",
    react: "⚡",
    filename: __filename
}, async (conn, mek, m, { q, reply }) => {
    await askAI(q, reply, "❌ *Usage:* .grokpro Your question");
});

cmd({
    pattern: "claudepro",
    desc: "Chat with Claude Pro AI",
    category: "ai-pro",
    react: "🎯",
    filename: __filename
}, async (conn, mek, m, { q, reply }) => {
    await askAI(q, reply, "❌ *Usage:* .claudepro Your question");
});

cmd({
    pattern: "llamapro",
    desc: "Chat with Llama Pro AI",
    category: "ai-pro",
    react: "🦙",
    filename: __filename
}, async (conn, mek, m, { q, reply }) => {
    await askAI(q, reply, "❌ *Usage:* .llamapro Your question");
});

cmd({
    pattern: "mistralpro",
    desc: "Chat with Mistral Pro AI",
    category: "ai-pro",
    react: "🌪️",
    filename: __filename
}, async (conn, mek, m, { q, reply }) => {
    await askAI(q, reply, "❌ *Usage:* .mistralpro Your question");
});

cmd({
    pattern: "copro",
    desc: "Chat with Copilot Pro AI",
    category: "ai-pro",
    react: "💙",
    filename: __filename
}, async (conn, mek, m, { q, reply }) => {
    await askAI(q, reply, "❌ *Usage:* .copro Your question");
});

cmd({
    pattern: "perplexitypro",
    desc: "Chat with Perplexity Pro AI",
    category: "ai-pro",
    react: "🔍",
    filename: __filename
}, async (conn, mek, m, { q, reply }) => {
    await askAI(q, reply, "❌ *Usage:* .perplexitypro Your question");
});

cmd({
    pattern: "kimipro",
    desc: "Chat with Kimi Pro AI",
    category: "ai-pro",
    react: "🌙",
    filename: __filename
}, async (conn, mek, m, { q, reply }) => {
    await askAI(q, reply, "❌ *Usage:* .kimipro Your question");
});

cmd({
    pattern: "qwenpro",
    desc: "Chat with Qwen Pro AI",
    category: "ai-pro",
    react: "🔥",
    filename: __filename
}, async (conn, mek, m, { q, reply }) => {
    await askAI(q, reply, "❌ *Usage:* .qwenpro Your question");
});

cmd({
    pattern: "yipro",
    desc: "Chat with Yi Pro AI",
    category: "ai-pro",
    react: "🌟",
    filename: __filename
}, async (conn, mek, m, { q, reply }) => {
    await askAI(q, reply, "❌ *Usage:* .yipro Your question");
});

cmd({
    pattern: "bardpro",
    desc: "Chat with Bard Pro AI",
    category: "ai-pro",
    react: "🎭",
    filename: __filename
}, async (conn, mek, m, { q, reply }) => {
    await askAI(q, reply, "❌ *Usage:* .bardpro Your question");
});

cmd({
    pattern: "mixtralpro",
    desc: "Chat with Mixtral Pro AI",
    category: "ai-pro",
    react: "🌀",
    filename: __filename
}, async (conn, mek, m, { q, reply }) => {
    await askAI(q, reply, "❌ *Usage:* .mixtralpro Your question");
});

cmd({
    pattern: "falconpro",
    desc: "Chat with Falcon Pro AI",
    category: "ai-pro",
    react: "🦅",
    filename: __filename
}, async (conn, mek, m, { q, reply }) => {
    await askAI(q, reply, "❌ *Usage:* .falconpro Your question");
});

cmd({
    pattern: "vicunapro",
    desc: "Chat with Vicuna Pro AI",
    category: "ai-pro",
    react: "🦌",
    filename: __filename
}, async (conn, mek, m, { q, reply }) => {
    await askAI(q, reply, "❌ *Usage:* .vicunapro Your question");
});

cmd({
    pattern: "orcapro",
    desc: "Chat with Orca Pro AI",
    category: "ai-pro",
    react: "🐋",
    filename: __filename
}, async (conn, mek, m, { q, reply }) => {
    await askAI(q, reply, "❌ *Usage:* .orcapro Your question");
});

cmd({
    pattern: "wizardpro",
    desc: "Chat with Wizard Pro AI",
    category: "ai-pro",
    react: "🧙",
    filename: __filename
}, async (conn, mek, m, { q, reply }) => {
    await askAI(q, reply, "❌ *Usage:* .wizardpro Your question");
});

cmd({
    pattern: "solarpro",
    desc: "Chat with Solar Pro AI",
    category: "ai-pro",
    react: "☀️",
    filename: __filename
}, async (conn, mek, m, { q, reply }) => {
    await askAI(q, reply, "❌ *Usage:* .solarpro Your question");
});

cmd({
    pattern: "neopro",
    desc: "Chat with Neo Pro AI",
    category: "ai-pro",
    react: "💚",
    filename: __filename
}, async (conn, mek, m, { q, reply }) => {
    await askAI(q, reply, "❌ *Usage:* .neopro Your question");
});
