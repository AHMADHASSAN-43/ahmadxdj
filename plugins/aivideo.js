// aivideo-aiimage.js - ESM Version
// 𝘼𝙃𝙈𝘼𝘿 𝙃𝘼𝙎𝙎𝘼𝙉 𝘼𝙎𝙀 - AI VIDEO + AI IMAGE
// API: apni qadeer-xtech (https://qadeer-xtech-apis.vercel.app)

import { fileURLToPath } from 'url';
import { cmd } from '../command.js';
import axios from 'axios';

const __filename = fileURLToPath(import.meta.url);


// ==========================================
// QADEER XTECH API
// ==========================================

const QADEER_API = "https://qadeer-xtech-apis.vercel.app";

const qadeer = {

    // ======================================
    // AI VIDEO - CREATE TASK
    // ======================================

    createVideo: async (prompt) => {

        try {

            const res = await axios.get(
                `${QADEER_API}/ai/aivideo`,
                {
                    params: { prompt },
                    timeout: 60000
                }
            );

            if (res.data?.task_id) {

                return {
                    success: true,
                    task_id: res.data.task_id
                };

            }

            return {
                success: false,
                error: "No task_id returned"
            };

        } catch (err) {

            console.log(
                "AI VIDEO CREATE ERROR:",
                err.response?.data || err.message
            );

            return {
                success: false,
                error:
                    err.response?.data?.message ||
                    err.message
            };

        }

    },


    // ======================================
    // AI VIDEO - POLL STATUS
    // ======================================

    pollVideo: async (
        taskId,
        timeoutMs = 5 * 60 * 1000
    ) => {

        const startTime = Date.now();

        return new Promise((resolve) => {

            const loop = async () => {

                if (
                    Date.now() - startTime >=
                    timeoutMs
                ) {

                    return resolve({
                        success: false,
                        error:
                            "Timeout: Generation took too long"
                    });

                }

                try {

                    const res = await axios.get(
                        `${QADEER_API}/ai/aivideostatus`,
                        {
                            params: { task_id: taskId },
                            timeout: 30000
                        }
                    );

                    const status = res.data?.task_status;

                    if (status === "completed" && res.data?.video_url) {

                        return resolve({
                            success: true,
                            video_url: res.data.video_url
                        });

                    }

                    if (status === "failed") {

                        return resolve({
                            success: false,
                            error:
                                "Video generation failed, try a more detailed prompt"
                        });

                    }

                } catch (err) {

                    console.log(
                        "AI VIDEO STATUS ERROR:",
                        err.message
                    );

                }

                setTimeout(loop, 5000);

            };

            loop();

        });

    },


    // ======================================
    // AI IMAGE
    // ======================================

    createImage: async (prompt) => {

        try {

            const res = await axios.get(
                `${QADEER_API}/ai/aiimage`,
                {
                    params: { prompt },
                    responseType: "arraybuffer",
                    timeout: 60000
                }
            );

            return {
                success: true,
                buffer: Buffer.from(res.data)
            };

        } catch (err) {

            console.log(
                "AI IMAGE ERROR:",
                err.response?.data || err.message
            );

            return {
                success: false,
                error: err.message
            };

        }

    }

};


// ==========================================
// AI VIDEO COMMAND
// ==========================================

cmd({

    pattern: "aivideo",

    alias: [
        "genvideo"
    ],

    react: "🎬",

    desc: "Generate AI Video from prompt",

    category: "ai",

    filename: __filename

}, async (
    conn,
    mek,
    m,
    {
        from,
        reply,
        text
    }
) => {

    try {

        if (!text) {

            return reply(
                `❌ *Usage:*

.aivideo a majestic lion walking through golden savanna at sunset, cinematic lighting

*Tip:* detailed prompt likho, short prompt fail ho sakta hai.`
            );

        }


        // ==================================
        // MESSAGE 1
        // ==================================

        await reply(
            `🎬 *𝘼𝙄 𝙑𝙞𝙙𝙚𝙤*

⏳ *𝙋𝙧𝙤𝙘𝙚𝙨𝙨𝙞𝙣𝙜, 𝙥𝙡𝙚𝙖𝙨𝙚 𝙬𝙖𝙞𝙩...*`
        );


        // ==================================
        // CREATE TASK
        // ==================================

        const createResult =
            await qadeer.createVideo(text);


        if (
            !createResult.success ||
            !createResult.task_id
        ) {

            return reply(
                `❌ Error: ${
                    createResult.error ||
                    "Failed to start generation"
                }`
            );

        }


        // ==================================
        // WAIT FOR VIDEO
        // ==================================

        const pollResult =
            await qadeer.pollVideo(
                createResult.task_id
            );


        if (!pollResult.success) {

            return reply(
                `❌ Error: ${pollResult.error}`
            );

        }


        // ==================================
        // MESSAGE 2 - PLAYABLE VIDEO
        // ==================================

        await conn.sendMessage(
            from,
            {
                video: {
                    url: pollResult.video_url
                },

                caption:
                    `🎬 *𝘼𝙄 𝙑𝙞𝙙𝙚𝙤 𝙂𝙚𝙣𝙚𝙧𝙖𝙩𝙚𝙙*

📝 *𝙋𝙧𝙤𝙢𝙥𝙩:* ${text}

© *ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴀʜᴍᴀᴅ ʜᴀꜱꜱᴀɴ ᴀꜱᴇ*`,

                mimetype: "video/mp4"
            },
            {
                quoted: mek
            }
        );


    } catch (err) {

        console.error(
            "AI VIDEO ERROR:",
            err
        );

        return reply(
            `❌ Error: ${err.message}`
        );

    }

});


// ==========================================
// AI IMAGE COMMAND
// ==========================================

cmd({

    pattern: "aiimage",

    alias: [
        "genimage",
        "aigen",
        "aiimg"
    ],

    react: "🎨",

    desc: "Generate AI Image from prompt",

    category: "ai",

    filename: __filename

}, async (
    conn,
    mek,
    m,
    {
        from,
        reply,
        text
    }
) => {

    try {

        if (!text) {

            return reply(
                `❌ *Usage:*

.aiimage a cute orange cat sitting in a sunny garden, photorealistic`
            );

        }


        // ==================================
        // MESSAGE 1
        // ==================================

        await reply(
            `🎨 *𝘼𝙄 𝙄𝙢𝙖𝙜𝙚*

⏳ *𝙋𝙧𝙤𝙘𝙚𝙨𝙨𝙞𝙣𝙜, 𝙥𝙡𝙚𝙖𝙨𝙚 𝙬𝙖𝙞𝙩...*`
        );


        // ==================================
        // GENERATE IMAGE
        // ==================================

        const imageResult =
            await qadeer.createImage(text);


        if (!imageResult.success) {

            return reply(
                `❌ Error: ${imageResult.error}`
            );

        }


        // ==================================
        // MESSAGE 2 - IMAGE
        // ==================================

        await conn.sendMessage(
            from,
            {
                image: imageResult.buffer,

                caption:
                    `🎨 *𝘼𝙄 𝙄𝙢𝙖𝙜𝙚 𝙂𝙚𝙣𝙚𝙧𝙖𝙩𝙚𝙙*

📝 *𝙋𝙧𝙤𝙢𝙥𝙩:* ${text}

© *ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴀʜᴍᴀᴅ ʜᴀꜱꜱᴀɴ ᴀꜱᴇ*`
            },
            {
                quoted: mek
            }
        );


    } catch (err) {

        console.error(
            "AI IMAGE ERROR:",
            err
        );

        return reply(
            `❌ Error: ${err.message}`
        );

    }

});
