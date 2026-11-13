import config from '../config.js';
import { cmd, commands } from '../command.js';
import path from 'path';
import os from "os";
import fs from 'fs';
import { spawn } from 'child_process';
import { runtime } from '../lib/functions.js';
import axios from 'axios';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);

// Song URLs - yahan naye songs add karte raho
const songs = {
    1: "https://files.catbox.moe/cs1158.opus",  // Haya Song 1 (default)
    2: "https://files.catbox.moe/tda6ds.mp3",   // Haya Song 2
    3: "https://files.catbox.moe/aaz9sm.mp3",   // Haya Song 3
    4: "https://files.catbox.moe/co1nob.mp3",   // Haya Song 4
    5: "https://files.catbox.moe/0neky1.mp3",   // Haya Song 5
    6: "https://files.catbox.moe/y26pp6.m4a",   // Haya Song 6
    7: "https://files.catbox.moe/96l81l.m4a",   // Haya Song 7
    8: "https://files.catbox.moe/8wcrm2.m4a",   // Haya Song 8
    9: "https://files.catbox.moe/g2wjid.mp3",   // Haya Song 9
    10: "https://files.catbox.moe/2i5kzw.mp3",  // Haya Song 10  <-- NEW
    // 11: "https://...",  // future songs yahan add karo
};

// --- VOICE NOTE SUPPORT ---
const voiceCache = {}; // { songNum: { buffer, mimetype, ptt } } - ek baar banao, phir foran

// ffmpeg dhoondo: FFMPEG_PATH, system ffmpeg, phir npm packages (ffmpeg-static / @ffmpeg-installer/ffmpeg)
const findFfmpegPaths = async () => {
    const list = [];
    if (process.env.FFMPEG_PATH) list.push(process.env.FFMPEG_PATH);
    list.push('ffmpeg');
    for (const pkg of ['ffmpeg-static', '@ffmpeg-installer/ffmpeg']) {
        try {
            const mod = await import(pkg);
            const p = mod.default?.path || mod.default || mod.path;
            if (typeof p === 'string') list.push(p);
        } catch (e) {}
    }
    return list;
};

const runFfmpeg = (bin, inputBuffer) => new Promise((resolve) => {
    try {
        const ff = spawn(bin, [
            '-i', 'pipe:0',
            '-vn',
            '-c:a', 'libopus',
            '-b:a', '64k',
            '-ar', '48000',
            '-ac', '1',
            '-application', 'voip',
            '-f', 'ogg',
            'pipe:1'
        ]);
        const chunks = [];
        let failed = false;
        ff.stdout.on('data', (d) => chunks.push(d));
        ff.stderr.on('data', () => {});
        ff.on('error', () => { failed = true; resolve(null); });
        ff.on('close', (code) => {
            if (failed) return;
            const out = Buffer.concat(chunks);
            // sahi ogg file "OggS" se shuru hoti hai
            const ok = code === 0 && out.length > 1000 && out.slice(0, 4).toString() === 'OggS';
            resolve(ok ? out : null);
        });
        ff.stdin.on('error', () => {});
        ff.stdin.end(inputBuffer);
    } catch (e) {
        resolve(null);
    }
});

const toOpus = async (inputBuffer) => {
    for (const bin of await findFfmpegPaths()) {
        const out = await runFfmpeg(bin, inputBuffer);
        if (out) return out;
    }
    return null;
};

// URL ke extension se sahi mimetype chuno (ffmpeg na ho to fallback ke liye)
const getFallbackMime = (url) => {
    const ext = path.extname(url.split('?')[0]).toLowerCase();
    if (ext === '.m4a' || ext === '.mp4') return 'audio/mp4';
    if (ext === '.ogg' || ext === '.opus') return 'audio/ogg; codecs=opus';
    if (ext === '.wav') return 'audio/wav';
    return 'audio/mpeg';
};

const getVoiceNote = async (songNum, url) => {
    if (voiceCache[songNum]) return voiceCache[songNum];

    const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 30000 });
    const original = Buffer.from(res.data);

    let result;
    const opus = await toOpus(original);
    if (opus) {
        result = { buffer: opus, mimetype: 'audio/ogg; codecs=opus', ptt: true };
    } else if (original.slice(0, 4).toString() === 'OggS') {
        // file pehle se ogg/opus hai (jaise .opus song): seedha voice note
        result = { buffer: original, mimetype: 'audio/ogg; codecs=opus', ptt: true };
    } else {
        // ffmpeg nahi mila: mp3/m4a ko voice note banane se WhatsApp error deta hai,
        // isliye normal audio ki tarah bhejo (extension ke hisaab se sahi mimetype ke saath)
        console.log("ffmpeg not found - install it: npm i ffmpeg-static  (tab voice note ban jayega)");
        result = { buffer: original, mimetype: getFallbackMime(url), ptt: false };
    }
    voiceCache[songNum] = result;
    return result;
};

// Base patterns
const basePatterns = ["hayasong", "haya", "hsong"];

// Sab patterns generate karo: base, base1, base2, ... baseN
const patternLoop = [];
basePatterns.forEach((base) => {
    patternLoop.push(base);           // "hayasong"
    Object.keys(songs).forEach((num) => {
        patternLoop.push(`${base}${num}`);  // "hayasong1", "hayasong2", ... "hayasong10"
    });
});

patternLoop.forEach((ptrn) => {
    cmd({
        pattern: ptrn,
        category: "haya song",
        react: "⚡",
        filename: __filename
    },
    async (conn, mek, m, { from, reply }) => {
        try {
            // Pattern se song number nikaalo
            // Example: "hayasong10" -> "10" | "hayasong" -> default 1
            let songNum = null;

            for (const base of basePatterns) {
                if (ptrn === base) {
                    songNum = 1; // default song
                    break;
                }
                if (ptrn.startsWith(base)) {
                    const suffix = ptrn.slice(base.length);
                    if (/^\d+$/.test(suffix)) {
                        songNum = parseInt(suffix);
                        break;
                    }
                }
            }

            const audioUrl = songs[songNum];

            if (!audioUrl) {
                return reply(`❌ Song ${songNum} nahi mila. Available: ${Object.keys(songs).join(", ")}`);
            }

            // Audio ko VOICE NOTE (ptt) ki surat mein bhejo
            const voice = await getVoiceNote(songNum, audioUrl);
            await conn.sendMessage(from, {
                audio: voice.buffer,
                mimetype: voice.mimetype,
                ptt: voice.ptt
            }); // quoted hata diya: command ka reply/quote nahi dikhega, sirf asli voice note

        } catch (e) {
            reply(`Error: ${e.message}`);
        }
    });
});
