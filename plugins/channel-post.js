import { cmd } from '../command.js';
import config from '../config.js';

// Owner check
const isOwner = (sender, config) => {
    const owner = (config.OWNER_NUMBER || '').replace(/[^0-9]/g, '');
    const user = (sender || '').split('@')[0].split(':')[0].replace(/[^0-9]/g, '');
    return owner && user === owner;
};

// Channel/newsletter JID detect karo
const isNewsletter = (jid) => (jid || '').endsWith('@newsletter');

cmd({
    pattern: "delchannel",
    alias: ["cnldel", "channeldelete", "delpost", "delch"],
    desc: "Delete a newsletter/channel post (reply to the post)",
    category: "owner",
    react: "🗑️",
    filename: __filename
},
async (conn, mek, m, { from, reply, sender }) => {
    try {
        if (!isOwner(sender, config)) return reply("❌ Sirf owner use kar sakta hai.");

        // Reply context nikaalo (kisi bhi message type se)
        const msg = m.message || {};
        const ctx =
            msg.extendedTextMessage?.contextInfo ||
            msg.imageMessage?.contextInfo ||
            msg.videoMessage?.contextInfo ||
            msg.stickerMessage?.contextInfo ||
            msg.documentMessage?.contextInfo ||
            msg.audioMessage?.contextInfo;

        if (!ctx?.stanzaId) {
            return reply("⚠️ Kisi *channel post* ko reply karke `.delchannel` chalao.");
        }

        const targetId = ctx.stanzaId;
        // Newsletter JID: reply ka remoteJid ya quoted participant
        const targetJid = ctx.remoteJid || from;

        if (!isNewsletter(targetJid)) {
            return reply("⚠️ Ye newsletter/channel post nahi hai. Sirf channel post delete ho sakti hai.");
        }

        await conn.sendMessage(from, { react: { text: '⏳', key: m.key } });

        // ✅ Newsletter revoke = protocolMessage ke through
        await conn.relayMessage(
            targetJid,
            {
                protocolMessage: {
                    key: {
                        remoteJid: targetJid,
                        fromMe: true,
                        id: targetId
                    },
                    type: 0, // REVOKE
                    deleteMessage: {
                        messageKey: {
                            remoteJid: targetJid,
                            fromMe: true,
                            id: targetId
                        }
                    }
                }
            },
            {}
        );

        await conn.sendMessage(from, { react: { text: '✅', key: m.key } });
        reply("✅ Channel post delete ho gaya.");

    } catch (e) {
        console.error("delchannel error:", e);
        reply(`❌ Error: ${e.message}`);
    }
});
