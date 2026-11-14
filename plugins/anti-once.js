// plugins/viewonce.js - ESM Version (Official Baileys compatible, fixed)
import { fileURLToPath } from 'url';
import { cmd } from '../command.js';
import config from '../config.js';
import {
    downloadContentFromMessage,
    normalizeMessageContent
} from '@whiskeysockets/baileys';

const __filename = fileURLToPath(import.meta.url);

// Different bot versions handler ko alag order mein args dete hain:
//   (client, message, m, ctx)  ya  (client, message, match, store, ctx)
// Ye wrapper dono ko handle karta hai.
function parseArgs(message, args) {
    const isObj = a => a && typeof a === 'object' && !Array.isArray(a);
    const ctx = [...args].reverse().find(a => isObj(a) && ('isCreator' in a || 'from' in a)) || {};
    const m = args.find(a => isObj(a) && a !== ctx) || message;
    return {
        m,
        ctx: {
            ...ctx,
            from: ctx.from || message?.key?.remoteJid || message?.chat,
            body: ctx.body ?? message?.body ?? m?.body ?? ''
        }
    };
}
function cmdX(opts, fn) {
    return cmd(opts, async (client, message, ...args) => {
        const { m, ctx } = parseArgs(message, args);
        return fn(client, message, m, ctx);
    });
}

// Keywords (only these exact words trigger the auto-retrieve)
const positiveKeywords = ["nice", "good", "cute", "🌝", "🥵", "💋", "👍", "🌚", "wow", "😩", "super"];

const MEDIA = {
    imageMessage: 'image',
    videoMessage: 'video',
    audioMessage: 'audio'
};
const VO_KEYS = ['viewOnceMessage', 'viewOnceMessageV2', 'viewOnceMessageV2Extension'];

// =====================================================================
//  VIEW-ONCE CACHE
//  WhatsApp reply (quoted) mein view-once ka media URL/directPath hata deta hai.
//  Isliye "No valid media URL or directPath" error aata tha.
//  Fix: view-once message jab bot ko milta hai usi waqt download karke cache kar lo.
// =====================================================================
const cache = new Map();           // messageId -> { type, buffer, caption, mimetype, ptt }
const MAX_CACHE = 50;
const MAX_SIZE = 50 * 1024 * 1024; // 50MB per item
const attached = new WeakSet();
const stats = { upserts: 0, hook: 0, vo: 0, saved: 0, noPath: 0, lastErr: '' };
function dbg(id) {
    return `id=${id || '-'} | cache=${cache.size} | upserts=${stats.upserts} hook=${stats.hook} ` +
           `voSeen=${stats.vo} saved=${stats.saved} noPath=${stats.noPath} err=${stats.lastErr || '-'}`;
}

async function dl(media, kind) {
    const stream = await downloadContentFromMessage(media, kind);
    const chunks = [];
    for await (const c of stream) chunks.push(c);
    const buf = Buffer.concat(chunks);
    if (!buf.length) throw new Error('Empty media');
    return buf;
}

// Message se media nikalo (view once wrapper ya viewOnce flag dono handle)
function extractMedia(message) {
    if (!message) return null;
    const wrapped =
        VO_KEYS.some(k => message[k]) ||
        VO_KEYS.some(k => message.ephemeralMessage?.message?.[k]);
    const content = normalizeMessageContent(message) || message;
    const type = Object.keys(content).find(k => MEDIA[k]);
    if (!type) return null;
    const media = content[type];
    return { type, media, isVO: wrapped || !!media.viewOnce };
}

async function cacheViewOnce(msg) {
    try {
        const id = msg?.key?.id;
        if (!id || !msg.message || cache.has(id)) return;
        const ex = extractMedia(msg.message);
        if (!ex || !ex.isVO) return;
        stats.vo++;
        if (!ex.media.directPath && !ex.media.url) { stats.noPath++; return; }
        const buffer = await dl(ex.media, MEDIA[ex.type]);
        if (buffer.length > MAX_SIZE) return;
        cache.set(id, {
            type: ex.type,
            buffer,
            caption: ex.media.caption || '',
            mimetype: ex.media.mimetype,
            ptt: !!ex.media.ptt
        });
        stats.saved++;
        while (cache.size > MAX_CACHE) cache.delete(cache.keys().next().value);
    } catch (e) {
        stats.lastErr = String(e.message).slice(0, 60);
        console.error('[VV cache]', e.message);
    }
}

// Best: ise main connection file mein socket banate hi ek baar call kar do.
// Nahi kiya to bhi ye plugin pehle message par khud attach kar leta hai.
export function registerViewOnceCache(client) {
    if (!client?.ev?.on || attached.has(client)) return;
    attached.add(client);
    client.ev.on('messages.upsert', ({ messages }) => {
        stats.upserts += (messages || []).length;
        for (const msg of messages || []) cacheViewOnce(msg);
    });
}

// =====================================================================
//  FETCH QUOTED VIEW-ONCE (multi-method)
// =====================================================================
function getQuotedInfo(message, m) {
    const q = m?.quoted || message?.quoted || null;
    let ctx = null;
    const raw = message?.message && (normalizeMessageContent(message.message) || message.message);
    if (raw) {
        const t = Object.keys(raw).find(k => k !== 'messageContextInfo');
        ctx = raw[t]?.contextInfo || null;
    }
    if (!ctx) ctx = message?.msg?.contextInfo || null;
    return {
        q,
        id: ctx?.stanzaId || q?.id || q?.key?.id || null,
        quotedMessage: ctx?.quotedMessage || q?.message || null
    };
}

async function getQuotedMedia(client, message, m, from, requireVO) {
    const { q, id, quotedMessage } = getQuotedInfo(message, m);
    if (!q && !quotedMessage) return { error: 'noquote' };
    console.log('[VV] quoted id:', id, '| cached:', !!(id && cache.has(id)), '| cacheSize:', cache.size,
        '| hasPath:', !!(extractMedia(quotedMessage)?.media?.directPath));

    // 1) Cache (sabse reliable)
    if (id && cache.has(id)) return cache.get(id);

    // 2) Quoted message se direct download
    const ex = extractMedia(quotedMessage);
    const isVO = !!(ex?.isVO || q?.viewOnce);
    if (requireVO && !isVO) return { error: 'notvo' };

    if (ex && (ex.media.directPath || ex.media.url)) {
        try {
            const buffer = await dl(ex.media, MEDIA[ex.type]);
            return {
                type: ex.type, buffer,
                caption: ex.media.caption || '',
                mimetype: ex.media.mimetype,
                ptt: !!ex.media.ptt
            };
        } catch (e) { console.error('[VV] quoted download:', e.message); }
    }

    // 3) Serializer ka download()
    try {
        if (typeof q?.download === 'function') {
            const buffer = await q.download();
            if (Buffer.isBuffer(buffer) && buffer.length && MEDIA[q.mtype]) {
                return {
                    type: q.mtype, buffer,
                    caption: q.text || '',
                    mimetype: q.mimetype,
                    ptt: !!q.ptt
                };
            }
        }
    } catch (e) { console.error('[VV] serializer download:', e.message); }

    // 4) Store se original message
    try {
        const chat = message?.key?.remoteJid || from;
        const stored = id
            ? (await client.store?.loadMessage?.(chat, id)) || (await client.loadMessage?.(chat, id))
            : null;
        const sx = extractMedia(stored?.message);
        if (sx) {
            const buffer = await dl(sx.media, MEDIA[sx.type]);
            return {
                type: sx.type, buffer,
                caption: sx.media.caption || '',
                mimetype: sx.media.mimetype,
                ptt: !!sx.media.ptt
            };
        }
    } catch (e) { console.error('[VV] store:', e.message); }

    return { error: 'unavailable', id };
}

function buildContent(r, DESCRIPTION) {
    const cap = r.caption
        ? (DESCRIPTION ? `${r.caption}\n\n> ${DESCRIPTION}` : r.caption)
        : (DESCRIPTION ? `> ${DESCRIPTION}` : '');
    switch (r.type) {
        case 'imageMessage':
            return { image: r.buffer, caption: cap, mimetype: r.mimetype || 'image/jpeg' };
        case 'videoMessage':
            return { video: r.buffer, caption: cap, mimetype: r.mimetype || 'video/mp4' };
        case 'audioMessage':
            return { audio: r.buffer, mimetype: r.mimetype || 'audio/mp4', ptt: !!r.ptt };
        default:
            return null;
    }
}

const ERR_TEXT = {
    noquote: "*🍁 Please reply to a view once message!*",
    notvo: "*❌ Please reply to a view once message!*",
    unavailable:
        "❌ Media nahi mil saka.\n" +
        "Ye view once bot ke online hote huye receive nahi hua (ya WhatsApp se hat chuka hai). " +
        "Naye view once par ye kaam karega."
};

// Common runner
async function run(client, message, m, { from, target, requireVO, DESCRIPTION, silent }) {
    const r = await getQuotedMedia(client, message, m, from, requireVO);
    if (r.error) {
        if (silent) return;
        return await client.sendMessage(from, {
            text: ERR_TEXT[r.error] + (r.error === 'unavailable' ? '\n\n🛠 ' + dbg(r.id) : '')
        }, { quoted: message });
    }
    const content = buildContent(r, DESCRIPTION);
    if (!content) {
        if (silent) return;
        return await client.sendMessage(from, {
            text: "❌ Only image, video, and audio messages are supported"
        }, { quoted: message });
    }
    await client.sendMessage(target, content, { quoted: message });
}

const getDesc = (userConfig) => userConfig?.DESCRIPTION || config.DESCRIPTION || "";

// =====================================================================
//  KEYWORD HANDLER (owner only, no prefix)
// =====================================================================
cmdX({
    'on': "body"
}, async (client, message, m, { from, body, isCreator, userConfig }) => {
    try {
        registerViewOnceCache(client); // har message par cache attach (sirf pehli baar kaam karta hai)
        try {
            const raw = message.fakeObj || (message.message ? { key: message.key, message: message.message } : null);
            if (raw) { stats.hook++; await cacheViewOnce(raw); }
        } catch (e) { stats.lastErr = String(e.message).slice(0, 60); }

        if (!isCreator) return;
        const messageText = (body || '').trim().toLowerCase();
        if (!positiveKeywords.includes(messageText)) return;

        await run(client, message, m, {
            from,
            target: message.sender,
            requireVO: true,
            DESCRIPTION: getDesc(userConfig),
            silent: true
        });
    } catch (error) {
        console.error("View Once Keyword Error:", error);
    }
});

// =====================================================================
//  .vv3  (owner only, sirf view once, same chat)
// =====================================================================
cmdX({
    pattern: "vv3",
    react: '🐳',
    desc: "Retrieve view once messages (Owner Only)",
    category: "owner",
    filename: __filename
}, async (client, message, m, { from, isCreator, userConfig }) => {
    try {
        registerViewOnceCache(client);
        if (!isCreator) return;
        await run(client, message, m, {
            from, target: from, requireVO: true, DESCRIPTION: getDesc(userConfig)
        });
    } catch (error) {
        console.error("vv3 Error:", error);
        await client.sendMessage(from, {
            text: "❌ Error retrieving view once message:\n" + error.message
        }, { quoted: message });
    }
});

// =====================================================================
//  .vv  (owner only, same chat)
// =====================================================================
cmdX({
    pattern: "vv",
    alias: ["viewonce", 'retrive'],
    react: '🐳',
    desc: "Owner Only - retrieve quoted message back to user",
    category: "owner",
    filename: __filename
}, async (client, message, m, { from, isCreator, userConfig }) => {
    try {
        registerViewOnceCache(client);
        if (!isCreator) {
            return await client.sendMessage(from, {
                text: "*📛 This is an owner command.*"
            }, { quoted: message });
        }
        await run(client, message, m, {
            from, target: from, requireVO: false, DESCRIPTION: getDesc(userConfig)
        });
    } catch (error) {
        console.error("[VV v3] vv error STACK:", error.stack || error);
        await client.sendMessage(from, {
            text: "❌ [v3] Error fetching vv message:\n" + error.message
        }, { quoted: message });
    }
});

// =====================================================================
//  .vv2  (owner only, DM mein bhejta hai)
// =====================================================================
cmdX({
    pattern: "vv2",
    alias: ["wah", "ohh", "oho", "🙂", "😂", "❤️", "💋", "🥵", "🌚", "😒", "nice", "ok"],
    desc: "Owner Only - retrieve quoted message back to user",
    category: "owner",
    filename: __filename
}, async (client, message, m, { from, isCreator, userConfig }) => {
    try {
        registerViewOnceCache(client);
        if (!isCreator) return;
        await run(client, message, m, {
            from, target: message.sender, requireVO: false, DESCRIPTION: getDesc(userConfig)
        });
    } catch (error) {
        console.error("[VV v3] vv2 error STACK:", error.stack || error);
        await client.sendMessage(from, {
            text: "❌ [v3] Error fetching vv message:\n" + error.message
        }, { quoted: message });
    }
});

// =====================================================================
//  .vvtest  (check karne ke liye ki ye file sach mein load hui ya nahi)
// =====================================================================
console.log('[VV] viewonce.js v3 LOADED');
cmdX({
    pattern: "vvtest",
    desc: "Check viewonce plugin is loaded (Owner Only)",
    category: "owner",
    filename: __filename
}, async (client, message, m, { from, isCreator }) => {
    registerViewOnceCache(client);
    if (!isCreator) return;
    await client.sendMessage(from, {
        text: `✅ viewonce v3 loaded\n🛠 ${dbg()}`
    }, { quoted: message });
});
