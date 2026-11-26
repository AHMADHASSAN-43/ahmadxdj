import { cmd } from "../command.js";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);

// Helper: channel JID nikalo (channel ke andar ho to m.chat, warna args se)
const getChannelJid = (m, args) => {
    if (m.chat && m.chat.endsWith('@newsletter')) return m.chat;
    const jid = args.find(a => a.endsWith('@newsletter'));
    return jid || null;
};

// ================== CHANNEL DELETE COMMAND ====================
cmd({
    pattern: "cdelete",
    alias: ["cdel", "cdlt"],
    desc: "Delete a post in your channel (reply to the post)",
    category: "channel",
    react: "🗑️",
    filename: __filename
}, async (conn, mek, m, {
    from,
    isCreator,
    args,
    reply
}) => {
    try {
        // Check if sender is creator
        if (!isCreator) return reply('❌ Only the bot creator can use this command!');

        // Check if message is quoted
        if (!m.quoted) return reply('❌ Please reply to the channel post you want to delete!\n\nUsage:\n.cdelete (inside channel)\n.cdelete 1203xxxx@newsletter (from anywhere)');

        // Channel JID
        const channelJid = getChannelJid(m, args);
        if (!channelJid) return reply('❌ Channel JID missing! Example:\n.cdelete 1203xxxxxxxx@newsletter');

        // Create the delete key
        const key = {
            remoteJid: channelJid,
            fromMe: true,
            id: m.quoted.id
        };

        // Delete the channel post
        await conn.sendMessage(channelJid, { delete: key });

        await reply('✅ Channel post deleted successfully!');

    } catch (err) {
        console.error(err);
        await reply('❌ Failed to delete channel post. Make sure the bot is owner/admin of the channel.');
    }
});

// ================== CHANNEL EDIT COMMAND ====================
cmd({
    pattern: "cedit",
    alias: ["cedt", "cedittext"],
    desc: "Edit a text post in your channel (reply to the post)",
    category: "channel",
    react: "✏️",
    filename: __filename
}, async (conn, mek, m, {
    from,
    isCreator,
    args,
    q,
    reply
}) => {
    try {
        // Check if sender is creator
        if (!isCreator) return reply('❌ Only the bot creator can use this command!');

        // Check if message is quoted
        if (!m.quoted) return reply('❌ Please reply to the channel post you want to edit!\n\nUsage:\n.cedit new text (inside channel)\n.cedit 1203xxxx@newsletter new text');

        // Channel JID
        const channelJid = getChannelJid(m, args);
        if (!channelJid) return reply('❌ Channel JID missing! Example:\n.cedit 1203xxxxxxxx@newsletter new text');

        // New text (JID hata ke baaki text)
        const newText = (q || '').replace(channelJid, '').trim();
        if (!newText) return reply('❌ Please provide the new text for the post!');

        // Create the edit key
        const key = {
            remoteJid: channelJid,
            fromMe: true,
            id: m.quoted.id
        };

        // Edit the channel post
        await conn.sendMessage(channelJid, { text: newText, edit: key });

        await reply('✅ Channel post edited successfully!');

    } catch (err) {
        console.error(err);
        await reply('❌ Failed to edit channel post. Make sure the bot is owner/admin of the channel and the post is a text post.');
    }
});
