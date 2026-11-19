import { cmd } from '../command.js';
import config from '../config.js';
import axios from 'axios';

// NOTE: Ye teen helpers kahin se import karne honge (jahan define hain)
// import { getUserConfigCached, stylishMessage, getBotFooter } from '../lib/helpers.js';

const VAJIRA_API = 'https://vajiraofc-apis.vercel.app/api/ytmp4';
const VIDEO_QUALITY = 360;
const DOC_THRESHOLD = 60 * 1024 * 1024; // send as document above this size

function extractVideoId(url) {
    return url.match(
        /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i
    )?.[1] || null;
}

function fmtDuration(sec) {
    const s = Number(sec);
    if (!s || Number.isNaN(s)) return null;
    const m = Math.floor(s / 60);
    const r = Math.round(s % 60);
    return `${m}:${String(r).padStart(2, '0')}`;
}

function cleanErr(msg) {
    return String(msg || 'Something went wrong');
}

// ─── Search: Nayan ytsearch (only) ─────────────────────────
async function searchYouTube(query) {
    const { data } = await axios.get(
        `https://nayan-video-downloader.vercel.app/ytsearch?q=${encodeURIComponent(query)}&limit=5`,
        { timeout: 20000 }
    );
    const r = Array.isArray(data?.results) ? data.results[0] : null;
    if (!data?.status || !r?.url) {
        throw new Error('No results found');
    }
    return {
        link: r.url,
        title: r.title,
        channel: r.author,
        imageUrl: r.thumbnail,
        duration: null
    };
}

// ─── Ask VajiraOfc for the 360p MP4 (returns result or throws) ────
async function getVajira(videoUrl) {
    let lastErr;
    for (let attempt = 1; attempt <= 2; attempt++) {
        try {
            const res = await axios.get(VAJIRA_API, {
                params: { url: videoUrl, quality: VIDEO_QUALITY, apikey: 'VajiraOfc' },
                timeout: 60000
            });
            const d = res.data;
            if (d?.success === true && d?.data?.download?.url) {
                return {
                    downloadUrl: d.data.download.url,
                    title: d.data.title,
                    channel: null,
                    durationSec: null,
                    quality: d.data.download.quality || `${VIDEO_QUALITY}p`,
                    sizeBytes: 0,
                    thumbnail: null
                };
            }
            throw new Error('API returned no download link');
        } catch (err) {
            lastErr = err;
            if (attempt < 2) await new Promise(r => setTimeout(r, 1500));
        }
    }
    throw lastErr;
}

async function pickVideo(videoUrl) {
    const media = await getVajira(videoUrl);
    return { media, asVideo: true };
}

async function fetchBufferWithRetry(url, { retries = 2, timeout = 120000 } = {}) {
    let lastErr;
    for (let attempt = 1; attempt <= retries + 1; attempt++) {
        try {
            const res = await axios.get(url, {
                responseType: 'arraybuffer',
                timeout,
                maxContentLength: Infinity,
                maxBodyLength: Infinity,
                headers: { 'User-Agent': 'Mozilla/5.0' }
            });
            const buffer = Buffer.from(res.data);
            if (buffer.length === 0) throw new Error('Empty response');
            return buffer;
        } catch (err) {
            lastErr = err;
            if (attempt <= retries) await new Promise(r => setTimeout(r, 1500 * attempt));
        }
    }
    throw new Error(
        `Failed to fetch stream after ${retries + 1} attempts: ${lastErr.message}`
    );
}

function isMp4(buffer) {
    return buffer && buffer.length >= 8 && buffer.toString('ascii', 4, 8) === 'ftyp';
}

cmd(
    {
        pattern: 'video',
        alias: ['ytv', 'ytmp4'],
        react: '📹',
        desc: 'Download YouTube video (360p)',
        category: 'download',
        filename: 'video.js' // ESM me __filename nahi hota, string dena hoga
    },
    async (conn, mek, m, { from, args, reply, botNumber }) => {
        const userConfig = await getUserConfigCached(botNumber);
        try {
            const q = args.join(' ');
            if (!q) {
                return reply('📹 *Usage:* .video <query/url>\nExample: .video Alan Walker faded');
            }

            await conn.sendMessage(from, { react: { text: '⏳', key: m.key } });

            const isYtUrl = /(youtube\.com|youtu\.be)/i.test(q);
            let videoUrl, searchInfo = null;

            if (isYtUrl) {
                const videoId = extractVideoId(q);
                if (!videoId) throw new Error('Invalid YouTube URL');
                videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
            } else {
                searchInfo = await searchYouTube(q);
                videoUrl = searchInfo.link;
            }

            const { media, asVideo } = await pickVideo(videoUrl);

            const videoBuffer = await fetchBufferWithRetry(media.downloadUrl);
            if (!isMp4(videoBuffer)) throw new Error('Downloaded file is not a valid MP4');

            const title = media.title || searchInfo?.title || 'Unknown';
            const channel = media.channel || searchInfo?.channel || 'Unknown';
            const duration = searchInfo?.duration || fmtDuration(media.durationSec) || 'N/A';
            const quality = media.quality || '720p';
            const videoId = extractVideoId(videoUrl);
            const thumbnail =
                media.thumbnail ||
                searchInfo?.imageUrl ||
                (videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : null);
            const sizeMB = (videoBuffer.length / 1024 / 1024).toFixed(2);

            const fields = [
                { icon: '🎬', label: 'Title', value: title },
                { icon: '👤', label: 'Channel', value: channel },
                { icon: '⏱️', label: 'Duration', value: duration },
                { icon: '📊', label: 'Quality', value: quality },
                { icon: '📦', label: 'Size', value: `${sizeMB} MB` }
            ];
            const caption = stylishMessage('📹 YouTube Video', fields);

            if (thumbnail) {
                await conn.sendMessage(
                    from,
                    { image: { url: thumbnail }, caption },
                    { quoted: mek }
                );
            } else {
                await reply(caption);
            }

            if (!asVideo || videoBuffer.length > DOC_THRESHOLD) {
                await conn.sendMessage(
                    from,
                    {
                        document: videoBuffer,
                        mimetype: 'video/mp4',
                        fileName: `${title}.mp4`,
                        caption: `🎬 *${title}* (${quality})\n\n${getBotFooter(userConfig)}`
                    },
                    { quoted: mek }
                );
            } else {
                await conn.sendMessage(
                    from,
                    {
                        video: videoBuffer,
                        mimetype: 'video/mp4',
                        caption: `🎬 *${title}* (${quality})\n\n${getBotFooter(userConfig)}`
                    },
                    { quoted: mek }
                );
            }

            await conn.sendMessage(from, { react: { text: '✅', key: m.key } });
        } catch (err) {
            console.error('VIDEO ERROR:', err);
            reply(`❌ Error: ${cleanErr(err.message)}`);
            await conn.sendMessage(from, { react: { text: '❌', key: m.key } });
        }
    }
);
