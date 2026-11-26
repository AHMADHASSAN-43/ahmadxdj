import { cmd } from '../command.js';
import config from '../config.js';

// Sirf owner hi use kar sake
const isOwner = (sender, config) => {
    const owner = (config.OWNER_NUMBER || '').replace(/[^0-9]/g, '');
    const user = (sender || '').split('@')[0].split(':')[0].replace(/[^0-9]/g, '');
    return owner && user === owner;
};

cmd({
    pattern: "delchannel",
    alias: ["cnldel", "channeldelete", "delpost"],
    desc: "Delete a newsletter/channel post (reply to the post)",
    category: "owner",
    react: "🗑️",
    filename: __filename
},
async (conn, mek, m, { from, reply, sender, isGroup }) => {
    try {
        if (!isOwner(sender, config)) return reply("❌ Ye command sirf owner use kar sakta hai.");

        // Context: jis message ko reply kiya hai wahi delete hoga
        const ctx = m.message?.extendedTextMessage?.contextInfo 
                 || m.message?.imageMessage?.contextInfo 
                 || m.message?.videoMessage?.contextInfo;

        if (!ctx?.stanzaId) {
            return reply("⚠️ Kisi channel post ko *reply* karke ye command chalao.");
        }

        const targetId = ctx.stanzaId;
        const targetJid = ctx.remoteJid || from;

        await conn.sendMessage(from, { react: { text: '⏳', key: m.key } });

        // Newsletter post revoke
        await conn.sendMessage(targetJid, {
            delete: {
                remoteJid: targetJid,
                fromMe: true,
                id: targetId,
                participant: ctx.participant || undefined
            }
        });

        await conn.sendMessage(from, { react: { text: '✅', key: m.key } });
        reply("✅ Channel post delete ho gaya (agar bot admin hai).");

    } catch (e) {
        console.error("delchannel error:", e);
        reply(`❌ Error: ${e.message}`);
    }
});
