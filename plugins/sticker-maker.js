
// ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴀʜᴍᴀᴅ ʜᴀssᴀɴ 

import { cmd } from '../command.js';
import { Sticker, StickerTypes } from "wa-sticker-formatter";
import config from '../config.js';
import * as StickerMaker from '../lib/sticker-maker.js';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);

// Mega Sticker Command
cmd(
    {
        pattern: 'sticker',
        alias: ['s', 'take', 'rename', 'stake', 'vsticker', 'gsticker', 'g2s', 'gs', 'v2s', 'vs'],
        desc: 'Create stickers from images, videos, GIFs with custom pack names',
        category: 'tools',
        react: "⚡",
        use: '<reply media> | <pack name>',
        filename: __filename,
    },
    async (conn, mek, m, { quoted, args, q, reply, from, userConfig }) => {
        if (!mek.quoted) return reply(`*Reply to any Image, Video, GIF, or Sticker*`);
        
        let mime = mek.quoted.mtype;
        
        // Determine pack name: use provided text or default from userConfig or global config
        // Get STICKER_NAME from userConfig if available, otherwise use config.STICKER_NAME
        const defaultPackName = userConfig?.STICKER_NAME || config.STICKER_NAME || "𝐀͢ͱ꧊ϻ͒͜𝛂͜𝛛🚩";
        let pack = q ? q : defaultPackName;
        
        try {
            let media, stickerBuffer;
            
            // Handle different media types
            if (mime === "imageMessage" || mime === "stickerMessage") {
                // For images and stickers - use wa-sticker-formatter directly
                media = await mek.quoted.download();
                
                let sticker = new Sticker(media, {
                    pack: pack, 
                    type: StickerTypes.FULL,
                    categories: ["🤩", "🎉"],
                    id: crypto.randomBytes(4).toString('hex'),
                    quality: 75,
                    background: 'transparent',
                });
                stickerBuffer = await sticker.toBuffer();
                
            } else if (mime === "videoMessage") {
                // For videos - convert to WebP first
                media = await mek.quoted.download();
                const webpBuffer = await StickerMaker.videoToWebp(media);
                
                let sticker = new Sticker(webpBuffer, {
                    pack: pack,
                    type: StickerTypes.FULL,
                    categories: ["🤩", "🎉"],
                    id: crypto.randomBytes(4).toString('hex'),
                    quality: 75,
                    background: 'transparent',
                });
                stickerBuffer = await sticker.toBuffer();
                
            } else {
                return reply("*Please reply to an image, video, GIF, or sticker*");
            }
            
            // Send the sticker
            return conn.sendMessage(mek.chat, { sticker: stickerBuffer }, { quoted: mek });
            
        } catch (error) {
            console.error("Sticker creation error:", error);
            return reply(`*Error creating sticker: ${error.message}*`);
        }
    }
);

// attp command with userConfig support
cmd({
    pattern: "attp",
    desc: "Convert text to a GIF sticker.",
    react: "✨",
    category: "tools", 
    use: ".attp HI",
    filename: __filename,
}, async (conn, mek, m, { args, reply, userConfig }) => {
    try {
        if (!args[0]) return reply("*Please provide text!*");

        const gifBuffer = await StickerMaker.fetchGif(`https://api-fix.onrender.com/api/maker/attp?text=${encodeURIComponent(args[0])}`);
        const stickerBuffer = await StickerMaker.gifToSticker(gifBuffer);

        await conn.sendMessage(m.chat, { sticker: stickerBuffer }, { quoted: mek });
    } catch (error) {
        console.error("ATTP error:", error);
        reply(`❌ ${error.message}`);
    }
});

import { cmd } from '../command.js';
import { spawn } from 'child_process';
import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);

function makeVideo(input, round) {
    return new Promise((resolve, reject) => {
        const id = crypto.randomBytes(4).toString('hex');
        const inPath = path.join(os.tmpdir(), `in_${id}.mp4`);
        const outPath = path.join(os.tmpdir(), `out_${id}.mp4`);
        fs.writeFileSync(inPath, input);
        const size = round ? 480 : 512;

        const ff = spawn('ffmpeg', [
            '-y', '-i', inPath, '-t', '10',
            '-vf', `crop='min(iw,ih)':'min(iw,ih)',scale=${size}:${size},fps=25,format=yuv420p`,
            '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '28',
            '-c:a', 'aac', '-b:a', '96k', '-ar', '44100', '-ac', '2',
            '-movflags', '+faststart', outPath
        ]);
        let err = '';
        ff.stderr.on('data', d => (err += d));
        ff.on('error', e => reject(new Error('ffmpeg install nahi hai: ' + e.message)));
        ff.on('close', code => {
            try {
                if (code !== 0) return reject(new Error(err.slice(-200)));
                resolve(fs.readFileSync(outPath));
            } finally {
                fs.rmSync(inPath, { force: true });
                fs.rmSync(outPath, { force: true });
            }
        });
    });
}

async function run(conn, mek, reply, round) {
    if (!mek.quoted || mek.quoted.mtype !== 'videoMessage')
        return reply('*Kisi Video par reply karo*');
    try {
        const media = await mek.quoted.download();
        const out = await makeVideo(media, round);
        return conn.sendMessage(
            mek.chat,
            round ? { video: out, ptv: true } : { video: out, mimetype: 'video/mp4' },
            { quoted: mek }
        );
    } catch (e) {
        console.error('vsound error:', e);
        return reply(`*Error: ${e.message}*`);
    }
}

cmd({
    pattern: 'vsound',
    alias: ['ssound'],
    desc: 'Square video with sound',
    category: 'tools',
    react: '🔊',
    filename: __filename,
}, async (conn, mek, m, { reply }) => run(conn, mek, reply, false));

cmd({
    pattern: 'ptv',
    desc: 'Round video note with sound',
    category: 'tools',
    react: '🔵',
    filename: __filename,
}, async (conn, mek, m, { reply }) => run(conn, mek, reply, true));
