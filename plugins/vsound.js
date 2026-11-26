import { spawn } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

function videoWithSound(input, { round = false, maxSec = 10 } = {}) {
    return new Promise((resolve, reject) => {
        const id = crypto.randomBytes(4).toString('hex');
        const inPath = path.join(os.tmpdir(), `vs_in_${id}.mp4`);
        const outPath = path.join(os.tmpdir(), `vs_out_${id}.mp4`);
        fs.writeFileSync(inPath, input);

        const size = round ? 480 : 512;
        const args = [
            '-y', '-i', inPath,
            '-t', String(maxSec),
            '-vf', `crop='min(iw,ih)':'min(iw,ih)',scale=${size}:${size},fps=25,format=yuv420p`,
            '-c:v', 'libx264', '-profile:v', 'baseline', '-preset', 'veryfast', '-crf', '28',
            '-c:a', 'aac', '-b:a', '96k', '-ar', '44100', '-ac', '2',
            '-movflags', '+faststart',
            outPath
        ];

        const ff = spawn('ffmpeg', args);
        let err = '';
        ff.stderr.on('data', d => (err += d));
        ff.on('error', reject);
        ff.on('close', code => {
            try {
                if (code !== 0) return reject(new Error('ffmpeg failed: ' + err.slice(-200)));
                resolve(fs.readFileSync(outPath));
            } finally {
                fs.rmSync(inPath, { force: true });
                fs.rmSync(outPath, { force: true });
            }
        });
    });
}

cmd(
    {
        pattern: 'vsound',
        alias: ['ssound', 'soundsticker', 'vsticker2', 'ptv'],
        desc: 'Make a sticker-style square video WITH sound (use .ptv for round video note)',
        category: 'tools',
        react: '🔊',
        use: '<reply video>',
        filename: __filename,
    },
    async (conn, mek, m, { reply, command }) => {
        if (!mek.quoted || mek.quoted.mtype !== 'videoMessage')
            return reply('*Kisi Video / GIF par reply karo*');

        try {
            const media = await mek.quoted.download();
            const round = command === 'ptv';
            const out = await videoWithSound(media, { round });

            return conn.sendMessage(
                mek.chat,
                round
                    ? { video: out, ptv: true }
                    : { video: out, mimetype: 'video/mp4', gifPlayback: false },
                { quoted: mek }
            );
        } catch (e) {
            console.error('vsound error:', e);
            return reply(`*Error: ${e.message}*`);
        }
    }
);
