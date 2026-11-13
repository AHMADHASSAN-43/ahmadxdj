import { cmd } from '../command.js';
import axios from 'axios';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);

const API_URL = 'https://adeel-xtech-api.onrender.com/api/gptv2';
const TIMEOUT = 15000;
const API_TOKEN = 'Ahmad568868990866';

// ===== SAARE AI NAMES (bina prefix support ke liye) =====
const ALL_AI = [
    "copilot", "chatgptelite", "talkai", "brain", "elite", "mscopilot",
    "elitegpt", "assistant", "smart", "genius", "proai", "elitecopilot",
    "ultra", "maxai", "nova", "zenith", "apex", "vertex", "pulse",
    "quantum", "neo", "omega", "gpt", "gpt4", "gpt4o", "chatgpt",
    "claude", "gemini", "kimi", "perplexity", "llama2", "llama3",
    "mistral", "mixtral", "falcon", "bloom", "orca", "vicuna", "alpaca",
    "phi2", "wizard", "codet5", "starlin", "deepseek", "deepseekcoder",
    "yi", "yi34b", "qwen", "command", "jurassic", "ai21", "solar",
    "lumin", "grokbeta", "bard", "redpajama", "dolly", "codex",
    "hugging", "openassist", "gptneo", "gptj", "bloomz", "flant5",
    "codegen", "starcoder", "gpt3", "chatgptplus", "gpt4turbo",
    "claudeinstant", "claude2", "palm2", "mathgpt", "grammar", "ai", "adeel"
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
// Bina prefix bhi kaam karega
// Example: "gemini what is AI?" / "gpt hello"
// NOTE: Prefix wale messages skip honge (cmd handler lega)
// ============================================================
cmd({
    'on': "body"
}, async (conn, mek, m, { body, reply, prefix, config }) => {
    try {
        if (!body) return;

        const text = body.trim();

        // Prefix wale messages skip karo (wo cmd handler handle karega)
        const usedPrefix = (config && config.PREFIX) ? config.PREFIX : '.';
        if (text.startsWith(usedPrefix) || text.startsWith('.') || 
            text.startsWith('!') || text.startsWith('#') || text.startsWith('/')) {
            return;
        }

        const lower = text.toLowerCase();

        // Check karo ke message kisi AI naam se start hota hai
        for (const aiName of ALL_AI) {
            // Case 1: "gemini hello" -> AI + question
            if (lower.startsWith(aiName + " ")) {
                const q = text.slice(aiName.length).trim();
                if (!q) return reply(`❌ *Usage:* ${aiName} Your question`);

                // Special prompts
                if (aiName === "mathgpt") {
                    return await askAI("Solve this math problem and explain clearly: " + q, reply, `❌ *Usage:* ${aiName} Your math problem`);
                }
                if (aiName === "grammar") {
                    return await askAI("Check grammar and spelling, then give corrected text: " + q, reply, `❌ *Usage:* ${aiName} Your text`);
                }
                if (aiName === "adeel") {
                    return await askAI("You are Adeel AI, a smart and helpful assistant. Answer clearly: " + q, reply, `❌ *Usage:* ${aiName} Your question`);
                }

                return await askAI(q, reply, `❌ *Usage:* ${aiName} Your question`);
            }

            // Case 2: sirf AI naam -> usage message
            if (lower === aiName) {
                return reply(`❌ *Usage:* ${aiName} Your question`);
            }
        }
    } catch (error) {
        console.error("AI no-prefix handler error:", error);
    }
});

// ============================================================
// ===== PREFIX COMMANDS =====
// Prefix ke saath (.gemini, .gpt etc.)
// ============================================================

// ---------- COPILOT / ELITE ----------
cmd({ pattern: "copilot", desc: "Chat with Microsoft Copilot AI", category: "ai", react: "✨", filename: __filename },
async (conn, mek, m, { q, reply }) => { await askAI(q, reply, "❌ *Usage:* .copilot Your question"); });

cmd({ pattern: "chatgptelite", desc: "Chat with ChatGPT Elite AI", category: "ai", react: "🧠", filename: __filename },
async (conn, mek, m, { q, reply }) => { await askAI(q, reply, "❌ *Usage:* .chatgptelite Your question"); });

cmd({ pattern: "talkai", desc: "Chat with Talk AI", category: "ai", react: "💬", filename: __filename },
async (conn, mek, m, { q, reply }) => { await askAI(q, reply, "❌ *Usage:* .talkai Your question"); });

cmd({ pattern: "brain", desc: "Chat with Brain AI", category: "ai", react: "🧠", filename: __filename },
async (conn, mek, m, { q, reply }) => { await askAI(q, reply, "❌ *Usage:* .brain Your question"); });

cmd({ pattern: "elite", desc: "Chat with Elite AI Assistant", category: "ai", react: "👑", filename: __filename },
async (conn, mek, m, { q, reply }) => { await askAI(q, reply, "❌ *Usage:* .elite Your question"); });

cmd({ pattern: "mscopilot", desc: "Chat with Microsoft Copilot", category: "ai", react: "💙", filename: __filename },
async (conn, mek, m, { q, reply }) => { await askAI(q, reply, "❌ *Usage:* .mscopilot Your question"); });

cmd({ pattern: "elitegpt", desc: "Chat with Elite ChatGPT", category: "ai", react: "🤖", filename: __filename },
async (conn, mek, m, { q, reply }) => { await askAI(q, reply, "❌ *Usage:* .elitegpt Your question"); });

cmd({ pattern: "assistant", desc: "Chat with AI Assistant", category: "ai", react: "🤵", filename: __filename },
async (conn, mek, m, { q, reply }) => { await askAI(q, reply, "❌ *Usage:* .assistant Your question"); });

cmd({ pattern: "smart", desc: "Chat with Smart AI", category: "ai", react: "🧠", filename: __filename },
async (conn, mek, m, { q, reply }) => { await askAI(q, reply, "❌ *Usage:* .smart Your question"); });

cmd({ pattern: "genius", desc: "Chat with Genius AI", category: "ai", react: "🌟", filename: __filename },
async (conn, mek, m, { q, reply }) => { await askAI(q, reply, "❌ *Usage:* .genius Your question"); });

cmd({ pattern: "proai", desc: "Chat with Pro AI", category: "ai", react: "⚡", filename: __filename },
async (conn, mek, m, { q, reply }) => { await askAI(q, reply, "❌ *Usage:* .proai Your question"); });

cmd({ pattern: "elitecopilot", desc: "Chat with Elite Copilot", category: "ai", react: "🎯", filename: __filename },
async (conn, mek, m, { q, reply }) => { await askAI(q, reply, "❌ *Usage:* .elitecopilot Your question"); });

cmd({ pattern: "ultra", desc: "Chat with Ultra AI", category: "ai", react: "🔥", filename: __filename },
async (conn, mek, m, { q, reply }) => { await askAI(q, reply, "❌ *Usage:* .ultra Your question"); });

cmd({ pattern: "maxai", desc: "Chat with Max AI", category: "ai", react: "💪", filename: __filename },
async (conn, mek, m, { q, reply }) => { await askAI(q, reply, "❌ *Usage:* .maxai Your question"); });

cmd({ pattern: "nova", desc: "Chat with Nova AI", category: "ai", react: "⭐", filename: __filename },
async (conn, mek, m, { q, reply }) => { await askAI(q, reply, "❌ *Usage:* .nova Your question"); });

cmd({ pattern: "zenith", desc: "Chat with Zenith AI", category: "ai", react: "✨", filename: __filename },
async (conn, mek, m, { q, reply }) => { await askAI(q, reply, "❌ *Usage:* .zenith Your question"); });

cmd({ pattern: "apex", desc: "Chat with Apex AI", category: "ai", react: "🏆", filename: __filename },
async (conn, mek, m, { q, reply }) => { await askAI(q, reply, "❌ *Usage:* .apex Your question"); });

cmd({ pattern: "vertex", desc: "Chat with Vertex AI", category: "ai", react: "🔷", filename: __filename },
async (conn, mek, m, { q, reply }) => { await askAI(q, reply, "❌ *Usage:* .vertex Your question"); });

cmd({ pattern: "pulse", desc: "Chat with Pulse AI", category: "ai", react: "💓", filename: __filename },
async (conn, mek, m, { q, reply }) => { await askAI(q, reply, "❌ *Usage:* .pulse Your question"); });

cmd({ pattern: "quantum", desc: "Chat with Quantum AI", category: "ai", react: "⚛️", filename: __filename },
async (conn, mek, m, { q, reply }) => { await askAI(q, reply, "❌ *Usage:* .quantum Your question"); });

cmd({ pattern: "neo", desc: "Chat with Neo AI", category: "ai", react: "💚", filename: __filename },
async (conn, mek, m, { q, reply }) => { await askAI(q, reply, "❌ *Usage:* .neo Your question"); });

cmd({ pattern: "omega", desc: "Chat with Omega AI", category: "ai", react: "🔱", filename: __filename },
async (conn, mek, m, { q, reply }) => { await askAI(q, reply, "❌ *Usage:* .omega Your question"); });

// ---------- GPT FAMILY ----------
cmd({ pattern: "gpt", desc: "Chat with GPT-3.5 AI", category: "ai", react: "🤖", filename: __filename },
async (conn, mek, m, { q, reply }) => { await askAI(q, reply, "❌ *Usage:* .gpt Your question"); });

cmd({ pattern: "gpt4", desc: "Chat with GPT-4 AI", category: "ai", react: "🤖", filename: __filename },
async (conn, mek, m, { q, reply }) => { await askAI(q, reply, "❌ *Usage:* .gpt4 Your question"); });

cmd({ pattern: "gpt4o", desc: "Chat with GPT-4o AI", category: "ai", react: "🤖", filename: __filename },
async (conn, mek, m, { q, reply }) => { await askAI(q, reply, "❌ *Usage:* .gpt4o Your question"); });

cmd({ pattern: "chatgpt", desc: "Chat with ChatGPT AI", category: "ai", react: "🤖", filename: __filename },
async (conn, mek, m, { q, reply }) => { await askAI(q, reply, "❌ *Usage:* .chatgpt Your question"); });

cmd({ pattern: "claude", desc: "Chat with Claude AI", category: "ai", react: "🤖", filename: __filename },
async (conn, mek, m, { q, reply }) => { await askAI(q, reply, "❌ *Usage:* .claude Your question"); });

cmd({ pattern: "gemini", desc: "Chat with Google Gemini AI", category: "ai", react: "🤖", filename: __filename },
async (conn, mek, m, { q, reply }) => { await askAI(q, reply, "❌ *Usage:* .gemini Your question"); });

cmd({ pattern: "kimi", desc: "Chat with Kimi AI", category: "ai", react: "🤖", filename: __filename },
async (conn, mek, m, { q, reply }) => { await askAI(q, reply, "❌ *Usage:* .kimi Your question"); });

cmd({ pattern: "perplexity", desc: "Chat with Perplexity AI", category: "ai", react: "🤖", filename: __filename },
async (conn, mek, m, { q, reply }) => { await askAI(q, reply, "❌ *Usage:* .perplexity Your question"); });

// ---------- LLAMA / MISTRAL ----------
cmd({ pattern: "llama2", desc: "Chat with Llama 2 AI", category: "ai", react: "🤖", filename: __filename },
async (conn, mek, m, { q, reply }) => { await askAI(q, reply, "❌ *Usage:* .llama2 Your question"); });

cmd({ pattern: "llama3", desc: "Chat with Llama 3 AI", category: "ai", react: "🤖", filename: __filename },
async (conn, mek, m, { q, reply }) => { await askAI(q, reply, "❌ *Usage:* .llama3 Your question"); });

cmd({ pattern: "mistral", desc: "Chat with Mistral AI", category: "ai", react: "🤖", filename: __filename },
async (conn, mek, m, { q, reply }) => { await askAI(q, reply, "❌ *Usage:* .mistral Your question"); });

cmd({ pattern: "mixtral", desc: "Chat with Mixtral AI", category: "ai", react: "🤖", filename: __filename },
async (conn, mek, m, { q, reply }) => { await askAI(q, reply, "❌ *Usage:* .mixtral Your question"); });

cmd({ pattern: "falcon", desc: "Chat with Falcon AI", category: "ai", react: "🤖", filename: __filename },
async (conn, mek, m, { q, reply }) => { await askAI(q, reply, "❌ *Usage:* .falcon Your question"); });

cmd({ pattern: "bloom", desc: "Chat with BLOOM AI", category: "ai", react: "🤖", filename: __filename },
async (conn, mek, m, { q, reply }) => { await askAI(q, reply, "❌ *Usage:* .bloom Your question"); });

cmd({ pattern: "orca", desc: "Chat with Orca AI", category: "ai", react: "🤖", filename: __filename },
async (conn, mek, m, { q, reply }) => { await askAI(q, reply, "❌ *Usage:* .orca Your question"); });

cmd({ pattern: "vicuna", desc: "Chat with Vicuna AI", category: "ai", react: "🤖", filename: __filename },
async (conn, mek, m, { q, reply }) => { await askAI(q, reply, "❌ *Usage:* .vicuna Your question"); });

cmd({ pattern: "alpaca", desc: "Chat with Alpaca AI", category: "ai", react: "🤖", filename: __filename },
async (conn, mek, m, { q, reply }) => { await askAI(q, reply, "❌ *Usage:* .alpaca Your question"); });

cmd({ pattern: "phi2", desc: "Chat with Phi-2 AI", category: "ai", react: "🤖", filename: __filename },
async (conn, mek, m, { q, reply }) => { await askAI(q, reply, "❌ *Usage:* .phi2 Your question"); });

cmd({ pattern: "wizard", desc: "Chat with Wizard AI", category: "ai", react: "🤖", filename: __filename },
async (conn, mek, m, { q, reply }) => { await askAI(q, reply, "❌ *Usage:* .wizard Your question"); });

cmd({ pattern: "codet5", desc: "Chat with CodeT5 AI", category: "ai", react: "🤖", filename: __filename },
async (conn, mek, m, { q, reply }) => { await askAI(q, reply, "❌ *Usage:* .codet5 Your question"); });

cmd({ pattern: "starlin", desc: "Chat with Starlin AI", category: "ai", react: "🤖", filename: __filename },
async (conn, mek, m, { q, reply }) => { await askAI(q, reply, "❌ *Usage:* .starlin Your question"); });

// ---------- DEEPSEEK ----------
cmd({ pattern: "deepseek", desc: "Chat with DeepSeek AI", category: "ai", react: "🤖", filename: __filename },
async (conn, mek, m, { q, reply }) => { await askAI(q, reply, "❌ *Usage:* .deepseek Your question"); });

cmd({ pattern: "deepseekcoder", desc: "Chat with DeepSeek Coder AI", category: "ai", react: "🤖", filename: __filename },
async (conn, mek, m, { q, reply }) => { await askAI(q, reply, "❌ *Usage:* .deepseekcoder Your question"); });

// ---------- YI / QWEN ----------
cmd({ pattern: "yi", desc: "Chat with Yi AI", category: "ai", react: "🤖", filename: __filename },
async (conn, mek, m, { q, reply }) => { await askAI(q, reply, "❌ *Usage:* .yi Your question"); });

cmd({ pattern: "yi34b", desc: "Chat with Yi-34B AI", category: "ai", react: "🤖", filename: __filename },
async (conn, mek, m, { q, reply }) => { await askAI(q, reply, "❌ *Usage:* .yi34b Your question"); });

cmd({ pattern: "qwen", desc: "Chat with Qwen AI", category: "ai", react: "🤖", filename: __filename },
async (conn, mek, m, { q, reply }) => { await askAI(q, reply, "❌ *Usage:* .qwen Your question"); });

// ---------- MISC MODELS ----------
cmd({ pattern: "command", desc: "Chat with Command AI", category: "ai", react: "🤖", filename: __filename },
async (conn, mek, m, { q, reply }) => { await askAI(q, reply, "❌ *Usage:* .command Your question"); });

cmd({ pattern: "jurassic", desc: "Chat with Jurassic AI", category: "ai", react: "🤖", filename: __filename },
async (conn, mek, m, { q, reply }) => { await askAI(q, reply, "❌ *Usage:* .jurassic Your question"); });

cmd({ pattern: "ai21", desc: "Chat with AI21 Labs AI", category: "ai", react: "🤖", filename: __filename },
async (conn, mek, m, { q, reply }) => { await askAI(q, reply, "❌ *Usage:* .ai21 Your question"); });

cmd({ pattern: "solar", desc: "Chat with Solar AI", category: "ai", react: "🤖", filename: __filename },
async (conn, mek, m, { q, reply }) => { await askAI(q, reply, "❌ *Usage:* .solar Your question"); });

cmd({ pattern: "lumin", desc: "Chat with Lumin AI", category: "ai", react: "🤖", filename: __filename },
async (conn, mek, m, { q, reply }) => { await askAI(q, reply, "❌ *Usage:* .lumin Your question"); });

cmd({ pattern: "grokbeta", desc: "Chat with Grok Beta AI", category: "ai", react: "🤖", filename: __filename },
async (conn, mek, m, { q, reply }) => { await askAI(q, reply, "❌ *Usage:* .grokbeta Your question"); });

cmd({ pattern: "bard", desc: "Chat with Google Bard AI", category: "ai", react: "🤖", filename: __filename },
async (conn, mek, m, { q, reply }) => { await askAI(q, reply, "❌ *Usage:* .bard Your question"); });

cmd({ pattern: "redpajama", desc: "Chat with RedPajama AI", category: "ai", react: "🤖", filename: __filename },
async (conn, mek, m, { q, reply }) => { await askAI(q, reply, "❌ *Usage:* .redpajama Your question"); });

cmd({ pattern: "dolly", desc: "Chat with Dolly AI", category: "ai", react: "🤖", filename: __filename },
async (conn, mek, m, { q, reply }) => { await askAI(q, reply, "❌ *Usage:* .dolly Your question"); });

cmd({ pattern: "codex", desc: "Chat with Codex AI", category: "ai", react: "🤖", filename: __filename },
async (conn, mek, m, { q, reply }) => { await askAI(q, reply, "❌ *Usage:* .codex Your question"); });

cmd({ pattern: "hugging", desc: "Chat with HuggingChat AI", category: "ai", react: "🤖", filename: __filename },
async (conn, mek, m, { q, reply }) => { await askAI(q, reply, "❌ *Usage:* .hugging Your question"); });

cmd({ pattern: "openassist", desc: "Chat with OpenAssistant AI", category: "ai", react: "🤖", filename: __filename },
async (conn, mek, m, { q, reply }) => { await askAI(q, reply, "❌ *Usage:* .openassist Your question"); });

cmd({ pattern: "gptneo", desc: "Chat with GPT-Neo AI", category: "ai", react: "🤖", filename: __filename },
async (conn, mek, m, { q, reply }) => { await askAI(q, reply, "❌ *Usage:* .gptneo Your question"); });

cmd({ pattern: "gptj", desc: "Chat with GPT-J AI", category: "ai", react: "🤖", filename: __filename },
async (conn, mek, m, { q, reply }) => { await askAI(q, reply, "❌ *Usage:* .gptj Your question"); });

cmd({ pattern: "bloomz", desc: "Chat with BLOOMZ AI", category: "ai", react: "🤖", filename: __filename },
async (conn, mek, m, { q, reply }) => { await askAI(q, reply, "❌ *Usage:* .bloomz Your question"); });

cmd({ pattern: "flant5", desc: "Chat with FLAN-T5 AI", category: "ai", react: "🤖", filename: __filename },
async (conn, mek, m, { q, reply }) => { await askAI(q, reply, "❌ *Usage:* .flant5 Your question"); });

cmd({ pattern: "codegen", desc: "Chat with CodeGen AI", category: "ai", react: "🤖", filename: __filename },
async (conn, mek, m, { q, reply }) => { await askAI(q, reply, "❌ *Usage:* .codegen Your question"); });

cmd({ pattern: "starcoder", desc: "Chat with StarCoder AI", category: "ai", react: "🤖", filename: __filename },
async (conn, mek, m, { q, reply }) => { await askAI(q, reply, "❌ *Usage:* .starcoder Your question"); });

cmd({ pattern: "gpt3", desc: "Chat with GPT-3 AI", category: "ai", react: "🤖", filename: __filename },
async (conn, mek, m, { q, reply }) => { await askAI(q, reply, "❌ *Usage:* .gpt3 Your question"); });

cmd({ pattern: "chatgptplus", desc: "Chat with ChatGPT Plus AI", category: "ai", react: "🤖", filename: __filename },
async (conn, mek, m, { q, reply }) => { await askAI(q, reply, "❌ *Usage:* .chatgptplus Your question"); });

cmd({ pattern: "gpt4turbo", desc: "Chat with GPT-4 Turbo AI", category: "ai", react: "🤖", filename: __filename },
async (conn, mek, m, { q, reply }) => { await askAI(q, reply, "❌ *Usage:* .gpt4turbo Your question"); });

cmd({ pattern: "claudeinstant", desc: "Chat with Claude Instant AI", category: "ai", react: "🤖", filename: __filename },
async (conn, mek, m, { q, reply }) => { await askAI(q, reply, "❌ *Usage:* .claudeinstant Your question"); });

cmd({ pattern: "claude2", desc: "Chat with Claude 2 AI", category: "ai", react: "🤖", filename: __filename },
async (conn, mek, m, { q, reply }) => { await askAI(q, reply, "❌ *Usage:* .claude2 Your question"); });

cmd({ pattern: "palm2", desc: "Chat with PaLM 2 AI", category: "ai", react: "🤖", filename: __filename },
async (conn, mek, m, { q, reply }) => { await askAI(q, reply, "❌ *Usage:* .palm2 Your question"); });

// ---------- SPECIAL ----------
cmd({ pattern: "mathgpt", desc: "Solve math problems with MathGPT", category: "ai", react: "🧮", filename: __filename },
async (conn, mek, m, { q, reply }) => {
    const prompt = q ? ("Solve this math problem and explain clearly: " + q) : q;
    await askAI(prompt, reply, "❌ *Usage:* .mathgpt Your math problem");
});

cmd({ pattern: "grammar", desc: "Check grammar and spelling", category: "ai", react: "📝", filename: __filename },
async (conn, mek, m, { q, reply }) => {
    const prompt = q ? ("Check grammar and spelling, then give corrected text: " + q) : q;
    await askAI(prompt, reply, "❌ *Usage:* .grammar Your text to check");
});

cmd({ pattern: "ai", desc: "Chat with AI", category: "ai", react: "🤖", filename: __filename },
async (conn, mek, m, { q, reply }) => { await askAI(q, reply, "❌ *Usage:* .ai Your question"); });

cmd({ pattern: "adeel", desc: "Chat with Adeel AI", category: "ai", react: "👑", filename: __filename },
async (conn, mek, m, { q, reply }) => {
    const prompt = q ? ("You are Adeel AI, a smart and helpful assistant. Answer clearly: " + q) : q;
    await askAI(prompt, reply, "❌ *Usage:* .adeel Your question");
});
