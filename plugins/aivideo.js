// aivideo.js - ESM Version
// 𝘼𝙃𝙈𝘼𝘿 - AI VIDEO + GPT

import { fileURLToPath } from 'url';
import { cmd } from '../command.js';
import axios from 'axios';
import FormData from 'form-data';
import {
    downloadContentFromMessage
} from '@whiskeysockets/baileys';

const __filename = fileURLToPath(import.meta.url);


// ==========================================
// QADEER XTECH AI VIDEO API
// ==========================================

const freevideo = {

    api: {
        base: "https://qadeer-xtech-apis.vercel.app",

        endpoint: {
            generate: "/ai/aivideo",

            request: (id) =>
                `/ai/aivideostatus?task_id=${id}`
        }
    },

    headers: {
        "user-agent": "Mozilla/5.0 (Linux; Android 10)",
        "accept": "*/*"
    },


    // ======================================
    // GENERATE VIDEO
    // ======================================

    generate: async ({ prompt, imageBuffer = null } = {}) => {

        try {

            const res = await axios.get(
                `${freevideo.api.base}${freevideo.api.endpoint.generate}?prompt=${encodeURIComponent(prompt || "animate this image")}`,
                {
                    headers: freevideo.headers,
                    timeout: 60000
                }
            );

            if (!res.data?.task_id) {

                return {
                    success: false,
                    error:
                        res.data?.message ||
                        "No task_id received"
                };

            }

            return {
                success: true,
                request_id: res.data.task_id
            };

        } catch (err) {

            console.log(
                "AI VIDEO GENERATE ERROR:",
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
    // CHECK VIDEO STATUS
    // ======================================

    poll: async (
        requestId,
        timeoutMs = 10 * 60 * 1000
    ) => {

        const url =
            `${freevideo.api.base}` +
            `${freevideo.api.endpoint.request(requestId)}`;

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
                        url,
                        {
                            headers:
                                freevideo.headers,

                            timeout: 30000
                        }
                    );

                    const data = res.data || {};

                    // Completed → video ready
                    if (
                        data.task_status === "completed" &&
                        (data.video_url || data.videoUrl)
                    ) {

                        return resolve({
                            success: true,
                            data: {
                                ...data,
                                video_url:
                                    data.video_url ||
                                    data.videoUrl
                            }
                        });

                    }

                    // Failed
                    if (data.task_status === "failed") {

                        return resolve({
                            success: false,
                            error:
                                data.message ||
                                "Generation failed"
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

    }

};


// ==========================================
// AI VIDEO COMMAND
// ==========================================

cmd({

    pattern: "aivideo",

    alias: [
        "genvideo",
        "freevideo"
    ],

    react: "🎬",

    desc: "Generate AI Video from prompt or image",

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

        // ==================================
        // GET QUOTED MESSAGE
        // ==================================

        const q = m.quoted ? m.quoted : m;

        const mime =
            (q.msg || q).mimetype || "";


        // ==================================
        // CHECK INPUT
        // ==================================

        if (
            !text &&
            !mime.includes("image")
        ) {

            return reply(
                `❌ *Usage:*

.aivideo a cat walking in rain

OR

Reply to an image with:
.aivideo`
            );

        }


        // ==================================
        // DOWNLOAD IMAGE
        // ==================================

        let imageBuffer = null;

        if (mime.includes("image")) {

            const messageType =
                mime.split("/")[0];

            const stream =
                await downloadContentFromMessage(
                    q.msg || q,
                    messageType
                );

            const chunks = [];

            for await (const chunk of stream) {

                chunks.push(chunk);

            }

            imageBuffer =
                Buffer.concat(chunks);

        }


        // ==================================
        // PROMPT
        // ==================================

        const prompt =
            text ||
            "animate this image";


        // ==================================
        // MESSAGE 1
        // ==================================

        await reply(
            `🎬 *𝘼𝙄 𝙑𝙞𝙙𝙚𝙤*

⏳ *𝙋𝙧𝙤𝙘𝙚𝙨𝙨𝙞𝙣𝙜, 𝙥𝙡𝙚𝙖𝙨𝙚 𝙬𝙖𝙞𝙩...*`
        );


        // ==================================
        // GENERATE
        // ==================================

        const generateResult =
            await freevideo.generate({
                prompt,
                imageBuffer
            });


        if (
            !generateResult.success ||
            !generateResult.request_id
        ) {

            return reply(
                `❌ Error: ${
                    generateResult.error ||
                    "Failed to get task ID"
                }`
            );

        }


        // ==================================
        // WAIT FOR VIDEO
        // ==================================

        const pollResult =
            await freevideo.poll(
                generateResult.request_id
            );


        if (!pollResult.success) {

            return reply(
                `❌ Error: ${pollResult.error}`
            );

        }


        // ==================================
        // VIDEO URL
        // ==================================

        const videoUrl =
            pollResult.data?.video_url;


        if (!videoUrl) {

            return reply(
                "❌ Video URL not found!"
            );

        }


        // ==================================
        // MESSAGE 2 - PLAYABLE VIDEO
        // ==================================

        await conn.sendMessage(
            from,
            {
                video: {
                    url: videoUrl
                },

                caption:
                    `🎬 *𝘼𝙄 𝙑𝙞𝙙𝙚𝙤 𝙂𝙚𝙣𝙚𝙧𝙖𝙩𝙚𝙙*

📝 *𝙋𝙧𝙤𝙢𝙥𝙩:* ${prompt}

© *ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴀʜᴍᴀᴅ ʜᴀssᴀɴ*`,

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
// GPT AI COMMAND
// ==========================================

cmd({

    pattern: "gpt",

    alias: [
        "gptai"
    ],

    react: "🤖",

    desc: "Chat with GPT AI",

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
                "🤖 Please provide a question."
            );

        }


        // ==================================
        // SAME LANGUAGE INSTRUCTION
        // ==================================

        const languagePrompt = `
You are a helpful AI assistant.

IMPORTANT LANGUAGE RULE:
Reply in exactly the same language that the user used in their question.

Examples:
- Urdu question → Urdu answer
- Pashto question → Pashto answer
- Hindi question → Hindi answer
- Punjabi question → Punjabi answer
- English question → English answer
- Arabic question → Arabic answer
- Persian question → Persian answer
- Bengali question → Bengali answer
- Any other language → Reply in that same language.

Do NOT automatically translate the user's question.
Do NOT switch to English.
Do NOT mention this language instruction.
Just answer naturally in the user's language.

USER QUESTION:
${text}
`;


        // ==================================
        // GPT API
        // ==================================

        const response =
            await axios.get(
                `https://api.yupra.my.id/api/ai/gpt5?text=${encodeURIComponent(languagePrompt)}`,
                {
                    timeout: 60000
                }
            );


        const result =
            response.data?.result ||
            response.data?.answer ||
            response.data?.response;


        if (!result) {

            return reply(
                "❌ AI response not found."
            );

        }


        // ==================================
        // SEND GPT RESPONSE
        // ==================================

        await reply(result);


    } catch (err) {

        console.error(
            "GPT ERROR:",
            err
        );

        return reply(
            "⚠️ AI is not responding. Please try again later."
        );

    }

});
