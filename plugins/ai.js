import { cmd } from '../command.js';
import axios from 'axios';

// 🔑 API Config
const API_BASE = 'https://api-ahmadxmd.vercel.app';
const API_KEY  = 'EXTRA';

// ─────────────────────────────────────────────
// HELPER — call any platform endpoint
// ─────────────────────────────────────────────
async function askAI(platform, q) {
    try {
        const apiUrl = `${API_BASE}/${platform}?q=${encodeURIComponent(q)}&key=${API_KEY}`;
        const res = await axios.get(apiUrl, { timeout: 30000 });
        if (res.data?.status && res.data?.result) return res.data.result;
        if (res.data?.result) return res.data.result;
        console.error(`⚠️ /${platform} bad response:`, res.data);
    } catch (e) {
        console.error(`⚠️ /${platform} failed:`, e.message);
    }
    return null;
}

// ─────────────────────────────────────────────
// FACTORY — build a command per AI
// ─────────────────────────────────────────────
function makeAICommand({ pattern, platform, alias = [], desc, react = '🤖' }) {
    cmd({
        pattern,
        alias,
        desc: desc || `${platform} AI chat`,
        category: 'ai',
        react,
        filename: import.meta.url
    }, async (conn, mek, m, { from, reply, text }) => {
        try {
            if (!text) {
                return reply(
                    `🤖 *${platform.toUpperCase()} AI*\n\n` +
                    `📝 *Usage:*\n` +
                    `• .${pattern} Hello, how are you?\n` +
                    `• .${pattern} Write a poem about the moon`
                );
            }

            try { await conn.sendMessage(from, { react: { text: '⏳', key: mek.key } }); } catch (_) {}

            const answer = await askAI(platform, text);
            if (!answer) {
                try { await conn.sendMessage(from, { react: { text: '❌', key: mek.key } }); } catch (_) {}
                return reply(`❌ ${platform} AI failed to respond. Try again later.`);
            }

            const out =
`╭━━━〔 🤖 ${platform.toUpperCase()} 𝗔𝗜 〕━━━╮
│
│ 💬 *Q:* ${text.slice(0, 200)}${text.length > 200 ? '...' : ''}
│
│ 🧠 *A:*
│ ${answer}
│
╰━━━━━━━━━━━━━━━━━━━━━━━╯

💖 ᴘᴏᴡᴇʀᴇᴅ ʙʏ AHMAD-MD ⚡`;

            try {
                await conn.sendMessage(from, { text: out }, { quoted: mek });
            } catch (_) {
                await reply(out);
            }

            try { await conn.sendMessage(from, { react: { text: '✅', key: mek.key } }); } catch (_) {}

        } catch (e) {
            console.error(`${pattern} error:`, e);
            try { await conn.sendMessage(from, { react: { text: '❌', key: mek.key } }); } catch (_) {}
            reply(`❌ Error: ${e?.message || e}`);
        }
    });
}

// ─────────────────────────────────────────────
// 🧠 70+ AI COMMANDS — FAMOUS MODELS
// ─────────────────────────────────────────────
const AI_LIST = [
    // ── OpenAI Family ──
    { pattern: 'gpt',        platform: 'gpt',        alias: ['chatgpt', 'ai', 'openai'],        desc: 'Chat with ChatGPT (OpenAI)',           react: '💬' },
    { pattern: 'gpt4',       platform: 'gpt4',       alias: ['gpt-4', 'chatgpt4'],              desc: 'Chat with GPT-4',                     react: '🧠' },
    { pattern: 'gpt4o',      platform: 'gpt4o',      alias: ['gpt-4o', 'omni'],                 desc: 'Chat with GPT-4o (Omni)',             react: '⚡' },
    { pattern: 'gpt3',       platform: 'gpt3',       alias: ['gpt-3'],                          desc: 'Chat with GPT-3',                     react: '💭' },
    { pattern: 'dalle',      platform: 'dalle',      alias: ['dall-e', 'dalle3'],               desc: 'Generate images with DALL·E',         react: '🎨' },

    // ── DeepSeek ──
    { pattern: 'deepseek',   platform: 'deepseek',   alias: ['ds', 'deep'],                     desc: 'Chat with DeepSeek AI',               react: '🧠' },
    { pattern: 'deepseekr1', platform: 'deepseekr1', alias: ['r1', 'dsr1'],                     desc: 'Chat with DeepSeek R1 (reasoning)',   react: '🔬' },
    { pattern: 'deepseekv3', platform: 'deepseekv3', alias: ['dsv3'],                           desc: 'Chat with DeepSeek V3',               react: '🛠️' },

    // ── Google Family ──
    { pattern: 'gemini',     platform: 'gemini',     alias: ['bard', 'google', 'googleai'],     desc: 'Chat with Google Gemini',             react: '✨' },
    { pattern: 'geminipro',  platform: 'geminipro',  alias: ['gemini-pro', 'gpro'],             desc: 'Chat with Gemini Pro',                react: '🌟' },
    { pattern: 'gemma',      platform: 'gemma',      alias: ['google-gemma'],                   desc: 'Chat with Google Gemma',              react: '💎' },
    { pattern: 'palm',       platform: 'palm',       alias: ['palm2'],                          desc: 'Chat with Google PaLM 2',             react: '🌴' },

    // ── Anthropic ──
    { pattern: 'claude',     platform: 'claude',     alias: ['anthropic'],                      desc: 'Chat with Claude AI',                 react: '🎭' },
    { pattern: 'claude3',    platform: 'claude3',    alias: ['claude-3', 'opus'],               desc: 'Chat with Claude 3 Opus',             react: '🎪' },
    { pattern: 'sonnet',     platform: 'sonnet',     alias: ['claude-sonnet'],                  desc: 'Chat with Claude Sonnet',             react: '🎼' },
    { pattern: 'haiku',      platform: 'haiku',      alias: ['claude-haiku'],                   desc: 'Chat with Claude Haiku',              react: '🍃' },

    // ── Meta ──
    { pattern: 'llama',      platform: 'llama',      alias: ['meta', 'metaai'],                 desc: 'Chat with Llama AI',                  react: '🦙' },
    { pattern: 'llama2',     platform: 'llama2',     alias: ['llama-2'],                        desc: 'Chat with Llama 2',                   react: '🦙' },
    { pattern: 'llama3',     platform: 'llama3',     alias: ['llama-3'],                        desc: 'Chat with Llama 3',                   react: '🦙' },
    { pattern: 'llama31',    platform: 'llama31',    alias: ['llama-3.1'],                      desc: 'Chat with Llama 3.1',                 react: '🦙' },
    { pattern: 'code llama', platform: 'codellama',  alias: ['codellama'],                      desc: 'Chat with Code Llama',                react: '💻' },

    // ── xAI ──
    { pattern: 'grok',       platform: 'grok',       alias: ['xai', 'grokai'],                  desc: 'Chat with Grok AI (xAI)',             react: '🚀' },
    { pattern: 'grok2',      platform: 'grok2',      alias: ['grok-2'],                         desc: 'Chat with Grok 2',                    react: '🌌' },

    // ── Mistral ──
    { pattern: 'mistral',    platform: 'mistral',    desc: 'Chat with Mistral AI',                                                     react: '🌪️' },
    { pattern: 'mixtral',    platform: 'mixtral',    alias: ['mixtral8x7b'],                    desc: 'Chat with Mixtral 8x7B',              react: '🌀' },
    { pattern: 'codestral',  platform: 'codestral',  alias: ['mistral-code'],                   desc: 'Chat with Codestral (code AI)',       react: '⌨️' },

    // ── Microsoft ──
    { pattern: 'copilot',    platform: 'copilot',    alias: ['bing', 'bingai', 'mscopilot'],    desc: 'Chat with Microsoft Copilot',         react: '🧭' },
    { pattern: 'phi',        platform: 'phi',        alias: ['phi3', 'microsoft-phi'],          desc: 'Chat with Microsoft Phi-3',           react: '🔷' },

    // ── Perplexity ──
    { pattern: 'perplexity', platform: 'perplexity', alias: ['pplx', 'ppl'],                    desc: 'Chat with Perplexity AI (web search)',react: '🔍' },
    { pattern: 'sonar',      platform: 'sonar',      alias: ['pplx-sonar'],                     desc: 'Chat with Perplexity Sonar',          react: '📡' },

    // ── Alibaba ──
    { pattern: 'qwen',       platform: 'qwen',       alias: ['alibaba', 'tongyi'],              desc: 'Chat with Qwen AI (Alibaba)',         react: '🐉' },
    { pattern: 'qwen2',      platform: 'qwen2',      alias: ['qwen-2'],                         desc: 'Chat with Qwen 2',                    react: '🐲' },

    // ── Blackbox / Search AI ──
    { pattern: 'blackbox',   platform: 'blackbox',   alias: ['bb'],                             desc: 'Chat with Blackbox AI',               react: '⬛' },
    { pattern: 'you',        platform: 'you',        alias: ['youai', 'you-com'],               desc: 'Chat with You.com AI',                react: '🟣' },
    { pattern: 'phind',      platform: 'phind',      alias: ['phindai'],                        desc: 'Chat with Phind (dev AI)',            react: '🔧' },

    // ── Cohere ──
    { pattern: 'cohere',     platform: 'cohere',     alias: ['command-r'],                      desc: 'Chat with Cohere AI',                 react: '🧩' },
    { pattern: 'commandr',   platform: 'commandr',   alias: ['command-r-plus'],                 desc: 'Chat with Command R+',                react: '📦' },

    // ── AI21 ──
    { pattern: 'jamba',      platform: 'jamba',      alias: ['ai21'],                           desc: 'Chat with AI21 Jamba',                react: '🎷' },

    // ── Open Source / HuggingFace ──
    { pattern: 'huggingface',platform: 'huggingface',alias: ['hf', 'hugging'],                  desc: 'Chat with HuggingFace AI',            react: '🤗' },
    { pattern: 'falcon',     platform: 'falcon',     alias: ['tii'],                            desc: 'Chat with Falcon AI (TII)',           react: '🦅' },
    { pattern: 'vicuna',     platform: 'vicuna',     desc: 'Chat with Vicuna AI',                                                              react: '🐎' },
    { pattern: 'alpaca',     platform: 'alpaca',     desc: 'Chat with Alpaca AI',                                                              react: '🦌' },
    { pattern: 'wizardlm',   platform: 'wizardlm',   alias: ['wizard'],                         desc: 'Chat with WizardLM',                  react: '🧙' },
    { pattern: 'openchat',   platform: 'openchat',   desc: 'Chat with OpenChat AI',                                                            react: '💌' },
    { pattern: 'zephyr',     platform: 'zephyr',     desc: 'Chat with Zephyr AI',                                                              react: '🌬️' },
    { pattern: 'dolphin',    platform: 'dolphin',    alias: ['dolphin-mixtral'],                desc: 'Chat with Dolphin AI',                react: '🐬' },
    { pattern: 'nous',       platform: 'nous',       alias: ['hermes'],                         desc: 'Chat with Nous Hermes',               react: '🏛️' },
    { pattern: 'openhermes', platform: 'openhermes', alias: ['hermes2'],                        desc: 'Chat with OpenHermes',                react: '🪽' },
    { pattern: 'orca',       platform: 'orca',       alias: ['orca2'],                          desc: 'Chat with Orca AI',                   react: '🐋' },
    { pattern: 'starling',   platform: 'starling',   desc: 'Chat with Starling AI',                                                            react: '⭐' },
    { pattern: 'yi',         platform: 'yi',         alias: ['yi-34b'],                         desc: 'Chat with Yi AI (01.AI)',             react: '🀄' },

    // ── China AI ──
    { pattern: 'ernie',      platform: 'ernie',      alias: ['wenxin', 'baidu'],                desc: 'Chat with ERNIE Bot (Baidu)',         react: '🐼' },
    { pattern: 'glm',        platform: 'glm',        alias: ['chatglm', 'zhipu'],               desc: 'Chat with ChatGLM (Zhipu)',           react: '🀄' },
    { pattern: 'kimi',       platform: 'kimi',       alias: ['moonshot'],                       desc: 'Chat with Kimi AI (Moonshot)',        react: '🌙' },
    { pattern: 'doubao',     platform: 'doubao',     alias: ['bytedance'],                      desc: 'Chat with Doubao (ByteDance)',        react: '🥟' },
    { pattern: 'minimax',    platform: 'minimax',    desc: 'Chat with MiniMax AI',                                                            react: '📐' },
    { pattern: 'baichuan',   platform: 'baichuan',   desc: 'Chat with Baichuan AI',                                                           react: '🏔️' },
    { pattern: 'sense',      platform: 'sense',      alias: ['sensetime'],                      desc: 'Chat with SenseTime AI',              react: '🎯' },
    { pattern: 'hunyuan',    platform: 'hunyuan',    alias: ['tencent'],                        desc: 'Chat with Hunyuan (Tencent)',         react: '🐧' },

    // ── Dev / Code AI ──
    { pattern: 'coder',      platform: 'coder',      alias: ['codeai'],                         desc: 'Chat with Code AI',                   react: '👨‍💻' },
    { pattern: 'starcoder',  platform: 'starcoder',  alias: ['star'],                           desc: 'Chat with StarCoder',                 react: '✨' },
    { pattern: 'devine',     platform: 'devine',     alias: ['devin'],                          desc: 'Chat with Devin AI (coding)',         react: '🛠️' },

    // ── Image / Vision AI ──
    { pattern: 'midjourney', platform: 'midjourney', alias: ['mj'],                             desc: 'Generate images with Midjourney',     react: '🖼️' },
    { pattern: 'flux',       platform: 'flux',       desc: 'Generate images with FLUX',                                                       react: '🌊' },
    { pattern: 'sd',         platform: 'sd',         alias: ['stablediffusion'],                desc: 'Generate images with Stable Diffusion',react: '🖌️' },
    { pattern: 'leonardo',   platform: 'leonardo',   alias: ['leo-ai'],                         desc: 'Generate images with Leonardo AI',    react: '🎨' },

    // ── Voice / Audio AI ──
    { pattern: 'eleven',     platform: 'elevenlabs', alias: ['elevenlabs'],                     desc: 'ElevenLabs voice AI',                 react: '🔊' },
    { pattern: 'suno',       platform: 'suno',       alias: ['suno-ai'],                        desc: 'Generate music with Suno AI',         react: '🎵' },
    { pattern: 'udio',       platform: 'udio',       desc: 'Generate music with Udio',                                                        react: '🎶' },

    // ── Misc / Aggregators ──
    { pattern: 'poe',        platform: 'poe',        alias: ['poeai'],                          desc: 'Chat with Poe AI',                    react: '📮' },
    { pattern: 'character',  platform: 'character',  alias: ['charai'],                         desc: 'Chat with Character.AI',              react: '👤' },
    { pattern: 'jailbreak',  platform: 'jailbreak',  alias: ['jb', 'uncensored'],               desc: 'Chat with uncensored AI',             react: '🔓' },
    { pattern: 'nano',       platform: 'nano',       alias: ['nano-ai'],                        desc: 'Chat with Nano AI',                   react: '🔬' },
    { pattern: 'arena',      platform: 'arena',      alias: ['lmarena'],                        desc: 'Chat with LMSYS Arena',               react: '⚔️' },

    // ── Default general chat ──
    { pattern: 'chat',       platform: 'gpt',        alias: ['ask'],                            desc: 'General AI chat (defaults to GPT)',   react: '💬' },
    { pattern: 'aichat',     platform: 'gpt',        alias: ['askai'],                          desc: 'Ask any AI anything',                 react: '🤖' },
];

// Register all commands
AI_LIST.forEach(makeAICommand);

// ─────────────────────────────────────────────
// 📋 LIST COMMAND — show all AIs
// ─────────────────────────────────────────────
cmd({
    pattern: 'ailist',
    alias: ['ais', 'models', 'aihelp'],
    desc: 'List all available AI commands',
    category: 'ai',
    react: '📋',
    filename: import.meta.url
}, async (conn, mek, m, { from, reply }) => {
    const grouped = AI_LIST.reduce((acc, ai) => {
        (acc[ai.pattern] = acc[ai.pattern] || ai).desc = ai.desc;
        return acc;
    }, {});

    const lines = AI_LIST.map(ai => `• .${ai.pattern} — ${ai.desc}`).join('\n');

    const out =
`╭━━━〔 🤖 𝗔𝗜 𝗖𝗢𝗠𝗠𝗔𝗡𝗗𝗦 (${AI_LIST.length}+) 〕━━━╮
│
${lines.split('\n').join('\n│ ')}
│
╰━━━━━━━━━━━━━━━━━━━━━━━╯

💖 ᴘᴏᴡᴇʀᴇᴅ ʙʏ AHMAD-MD ⚡`;

    try {
        await conn.sendMessage(from, { text: out }, { quoted: mek });
    } catch (_) {
        await reply(out);
    }
});
