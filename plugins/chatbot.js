import axios from 'axios';
import {
    isChatbotEnabled,
    getHistory,
    addToHistory,
    clearChatHistory,
    clearAllHistory,
    isBotMessage,
    wrapConnSend,
    isDuplicate,
    isRefusal,
    isIgnorable,
    isMeetingTalk,
    isUnsafeReply,
    wantsDetail,
    greetingReply,
    trimReply,
    normalizeId
} from '../lib/chatbot.js';

const PERSONA = `Tum ek real Pakistani friend ho. WhatsApp pe normal insan ki tarah baat karo.

Rules:
- Normal baat me short reply do (1-2 lines)
- Sirf jab user sawal pooche tab thora detail do
- Latest message pe focus karo
- Topic change ho to purani baat mat lao
- Roman Urdu me natural baat karo
- Robotic mat bano
- Apne aap ko AI mat kaho
- Sirf jawab do, jawab ke end me apni taraf se sawal mat pooch, jaise "aur batao", "kya chal raha hai", "sab theek hai", "kaisa din raha"
- Baat ko khud aage mat barhao, user ke sawal ka jawab dekar ruk jao`;

const DEFLECTIONS = [
    'Yar abhi thora busy hoon, baad mein baat karte hain 🙂',
    'Chhod yar, is baat ko rehne de.',
    'Abhi is baare mein baat nahi kar sakta yar.'
];

const MAX_QUEUE = 5;
const QUEUE_GAP_MS = 1000;
const queues = new Map();

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function buildPrompt(history, userMsg) {
    let contextText = '';
    if (history.length > 0) {
        contextText = history.map(h => `${h.role === 'user' ? 'User' : 'Bot'}: ${h.content}`).join('\n') + '\n';
    }
    contextText += `User: ${userMsg}\nBot:`;
    return `${PERSONA}\n\nConversation:\n${contextText}`;
}

async function askAI(prompt, timeout) {
    try {
        const apiUrl = `https://adeel-xtech-api.vercel.app/api/gpt?q=${encodeURIComponent(prompt)}`;
        const { data } = await axios.get(apiUrl, {
            timeout,
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        const reply = data?.result || data?.response || '';
        return typeof reply === 'string' ? reply.trim() : '';
    } catch (e) {
        console.error('Chatbot API error:', e.message);
        return '';
    }
}

function clearQueues(chatKey) {
    for (const [key, q] of queues) {
        if (!chatKey || key === chatKey || key.startsWith(`${chatKey}_`)) q.items = [];
    }
}

async function runQueue(key) {
    const q = queues.get(key);
    if (!q || q.busy) return;
    q.busy = true;
    while (q.items.length > 0) {
        const job = q.items.shift();
        try {
            await job();
        } catch (e) {
            console.error('Chatbot queue error:', e.message);
        }
        if (q.items.length > 0) await sleep(QUEUE_GAP_MS);
    }
    q.busy = false;
    queues.delete(key);
}

function enqueue(key, job) {
    let q = queues.get(key);
    if (!q) {
        q = { busy: false, items: [] };
        queues.set(key, q);
    }
    if (q.items.length >= MAX_QUEUE) q.items.shift();
    q.items.push(job);
    runQueue(key);
}

async function processMessage(conn, mek, { from, userMsg, historyKey }) {
    let typing = false;
    try {
        await conn.sendPresenceUpdate('composing', from);
        typing = true;

        let aiReply = '';
        let fromAI = false;

        if (isMeetingTalk(userMsg)) {
            aiReply = pick(DEFLECTIONS);
        } else {
            const detail = wantsDetail(userMsg);

            let raw = await askAI(buildPrompt(getHistory(historyKey), userMsg), 35000);
            if (!raw || isRefusal(raw)) {
                raw = await askAI(buildPrompt([], userMsg), 20000);
            }

            if (!raw || isRefusal(raw)) {
                console.log('Chatbot bad reply:', raw);
                aiReply = greetingReply(userMsg) || '';
            } else {
                const text = detail ? trimReply(raw, 8, 900) : trimReply(raw);

                if (!text) {
                    aiReply = '';
                } else if (isUnsafeReply(text)) {
                    aiReply = pick(DEFLECTIONS);
                } else {
                    aiReply = text;
                    fromAI = true;
                }
            }
        }

        if (!aiReply) return;

        if (fromAI) {
            addToHistory(historyKey, 'user', userMsg);
            addToHistory(historyKey, 'bot', aiReply);
        }

        const sentMsg = await conn.sendMessage(from, { text: aiReply }, { quoted: mek });

        if (sentMsg?.key) {
            await conn.sendMessage(from, { react: { text: '🤖', key: sentMsg.key } });
        }
    } catch (e) {
        console.error('Chatbot handler error:', e.message);
    } finally {
        if (typing) {
            try { await conn.sendPresenceUpdate('paused', from); } catch (e) {}
        }
    }
}

async function handleChatbotMessage(conn, mek, m, { from, body, isCmd, userConfig }) {
    try {
        wrapConnSend(conn);

        const isGroup = typeof from === 'string' && from.endsWith('@g.us');
        const chatId = normalizeId(from);
        const myIds = [normalizeId(conn.user?.id), normalizeId(conn.user?.lid)].filter(Boolean);
        const isSelfChat = !isGroup && myIds.includes(chatId);

        if (isCmd) {
            if (/^\W{0,2}\s*chatbot\s+(on|off)\b/i.test((body || '').trim())) {
                if (isSelfChat) {
                    clearAllHistory();
                    clearQueues();
                } else {
                    clearChatHistory(from);
                    clearQueues(from);
                }
            }
            return false;
        }

        if (isBotMessage(mek?.key?.id)) return false;
        if (!isChatbotEnabled(userConfig, from)) return false;

        const senderId = normalizeId(mek?.key?.participant || mek?.key?.remoteJid || from);
        if (mek?.key?.fromMe || myIds.includes(senderId)) return false;

        const userMsg = (body || '').trim();
        if (!userMsg) return false;
        if (isDuplicate(mek?.key?.id)) return false;
        if (isIgnorable(userMsg)) return false;

        const historyKey = isGroup ? `${from}_${senderId}` : from;

        enqueue(historyKey, () => processMessage(conn, mek, { from, userMsg, historyKey }));
        return true;

    } catch (e) {
        console.error('Chatbot handler error:', e.message);
        return false;
    }
}

export { handleChatbotMessage };
export default { handleChatbotMessage };
