// ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴀʜᴍᴀᴅ ʜᴀssᴀɴ
import { cmd } from "../command.js";
import { fileURLToPath } from "url";
import converter from "../lib/converter.js";

const __filename = fileURLToPath(import.meta.url);

// ====================================================
// 👇 APNE CHANNEL KI JID YAHAN LIKHEIN (example: 120363xxxxxxxxxx@newsletter)
// Agar nahi pata to `.chjid <channel link>` command se mil jayegi
// ====================================================
const MY_CHANNEL_JID = "PASTE_YOUR_CHANNEL_JID@newsletter";

const normalizeJid = (jid = "") => jid.split(":")[0];

// ---------- .tochannel : reply to audio/voice/video/image ----------
cmd({
    pattern: "tochannel",
    alias: ["toch", "chaudio", "sendch", "tch"],
    desc: "Reply to a voice/audio and send it to your channel",
    category: "owner",
    react: "📤",
    use: ".tochannel (reply to audio)  |  .tochannel <jid> (other channel)",
    filename: __filename
}, async (conn, mek, m, { from, q, reply, isCreator }) => {
    if (!isCreator) return reply("❌ Ye command sirf *owner* ke liye hai!");

    try {
        if (!m.quoted) {
            return reply("🍁 Kisi voice / audio ko reply karke `.tochannel` likhein.");
        }

        // Optional: custom jid pass kar sakte hain, warna MY_CHANNEL_JID use hogi
        const arg = (q || "").trim().split(/\s+/)[0] || "";
        const channelJid = arg.endsWith("@newsletter")
            ? normalizeJid(arg)
            : MY_CHANNEL_JID;

        if (!channelJid.endsWith("@newsletter") || channelJid.startsWith("PASTE_")) {
            return reply(
                "❌ Channel JID set nahi hai.\n\n" +
                "`plugins/ch-send.js` me `MY_CHANNEL_JID` me apni JID likhein,\n" +
                "ya `.chjid <channel link>` se JID nikalein."
            );
        }

        const quoted = m.quoted;
        const qData = quoted.msg || quoted;
        const mime = qData?.mimetype || "";

        await conn.sendMessage(from, { react: { text: "⏳", key: mek.key } });

        let content;

        if (mime.startsWith("audio/")) {
            let buffer = await quoted.download();

            // Channel me voice-note (ptt/ogg) support nahi hota ("update not supported" aata hai),
            // isliye mp3 ke ilawa sab kuch mp3 me convert karke normal audio bhejte hain.
            if (!mime.includes("mpeg") && !mime.includes("mp3")) {
                const ext = mime.includes("ogg") || mime.includes("opus") ? "ogg"
                          : mime.includes("mp4") || mime.includes("m4a") || mime.includes("aac") ? "m4a"
                          : "ogg";
                buffer = await converter.toAudio(buffer, ext);
            }

            content = {
                audio: buffer,
                mimetype: "audio/mpeg",
                ptt: false
            };
        } else if (mime.startsWith("video/")) {
            const buffer = await quoted.download();
            content = { video: buffer };
        } else if (mime.startsWith("image/")) {
            const buffer = await quoted.download();
            content = { image: buffer };
        } else {
            await conn.sendMessage(from, { react: { text: "❌", key: mek.key } });
            return reply("❌ Sirf audio / voice / video / image supported hai.");
        }

        const type = Object.keys(content)[0];
        console.log("[tochannel] jid:", channelJid, "| type:", type, "| src mime:", mime,
            "| size:", content[type]?.length, "| mimetype:", content.mimetype, "| ptt:", content.ptt);
        const sent = await conn.sendMessage(channelJid, content);
        console.log("[tochannel] sent:", JSON.stringify(sent?.message ? Object.keys(sent.message) : sent?.key));
        await conn.sendMessage(from, { react: { text: "✅", key: mek.key } });

    } catch (error) {
        console.error("tochannel error:", error);
        await conn.sendMessage(from, { react: { text: "❌", key: mek.key } });
        return reply(`❌ *Error:* ${error.message}`);
    }
});

// ---------- .chjid : channel link se JID nikalo ----------
cmd({
    pattern: "chjid",
    alias: ["channeljid", "getchjid"],
    desc: "Get channel JID from channel link",
    category: "owner",
    react: "🆔",
    use: ".chjid https://whatsapp.com/channel/XXXX",
    filename: __filename
}, async (conn, mek, m, { q, reply, isCreator }) => {
    if (!isCreator) return reply("❌ Ye command sirf *owner* ke liye hai!");

    try {
        const match = (q || "").match(/whatsapp\.com\/channel\/([A-Za-z0-9_-]+)/);
        if (!match) return reply("❌ Channel ka link dein.\nExample: `.chjid https://whatsapp.com/channel/XXXX`");

        const meta = await conn.newsletterMetadata("invite", match[1]);
        return reply(`📢 *${meta.name}*\n\n🆔 JID: \`${meta.id}\``);
    } catch (error) {
        console.error("chjid error:", error);
        return reply(`❌ *Error:* ${error.message}`);
    }
});
