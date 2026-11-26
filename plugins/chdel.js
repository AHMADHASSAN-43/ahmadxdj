import { cmd } from "../command.js";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// Channel ki posts fetch karo (alag Baileys versions ke liye dono tareeqe)
const fetchPosts = async (conn, jid, count = 100) => {
    try {
        return await conn.newsletterFetchMessages(jid, count);
    } catch {
        return await conn.newsletterFetchMessages('jid', jid, count);
    }
};

// ================== CHANNEL DELETE ALL COMMAND ====================
cmd({
    pattern: "cdeleteall",
    alias: ["cdelall", "cclear"],
    desc: "Delete ALL posts of your channel",
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

        // Channel JID (channel ke andar ho to m.chat, warna args se)
        const channelJid = (m.chat && m.chat.endsWith('@newsletter'))
            ? m.chat
            : args.find(a => a.endsWith('@newsletter'));

        if (!channelJid) return reply('❌ Channel JID missing!\n\nUsage:\n.cdeleteall 1203xxxx@newsletter confirm');

        // Safety confirmation
        if (!args.includes('confirm')) {
            return reply(`⚠️ This will delete ALL posts of the channel!\n\nTo continue send:\n.cdeleteall ${channelJid} confirm`);
        }

        await reply('⏳ Deleting all channel posts, please wait...');

        let deleted = 0;
        let failed = 0;
        const seen = new Set();

        // Max 20 rounds x 100 posts
        for (let round = 0; round < 20; round++) {
            const posts = await fetchPosts(conn, channelJid, 100);
            if (!posts || posts.length === 0) break;

            let progress = false;

            for (const post of posts) {
                const id = post.server_id || post.id || post.key?.id;
                if (!id || seen.has(id)) continue;
                seen.add(id);
                progress = true;

                try {
                    const key = {
                        remoteJid: channelJid,
                        fromMe: true,
                        id: id
                    };
                    await conn.sendMessage(channelJid, { delete: key });
                    deleted++;
                } catch (e) {
                    failed++;
                    console.error('Delete failed for', id, e?.message);
                }

                // Rate limit se bachne ke liye delay
                await sleep(1500);
            }

            // Agar koi nayi post nahi mili to ruk jao
            if (!progress) break;
        }

        await reply(`✅ Done!\n\n🗑️ Deleted: ${deleted}\n❌ Failed: ${failed}`);

    } catch (err) {
        console.error(err);
        await reply('❌ Failed to delete channel posts. Make sure the bot is owner/admin of the channel.');
    }
});
