const { cmd } = require("../command");
const axios = require('axios');
const FormData = require('form-data');
const { sendButtons } = require('gifted-btns');

const IMGBB_API_KEY = process.env.IMGBB_API_KEY || '8db492efc937a635b90680a9a860dc85';
const IMGBB_API_URL = 'https://api.imgbb.com/1/upload';
const FOOTER = `> *ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴀʜᴍᴀᴅ ʜᴀssᴀɴ*`;

const MTYPE_MIME = {
  imageMessage: 'image/jpeg',
  videoMessage: 'video/mp4',
  audioMessage: 'audio/mp4',
  stickerMessage: 'image/webp',
  documentMessage: 'application/octet-stream'
};

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function readMedia(m) {
  const quotedMsg = m.quoted ? m.quoted : m;
  const mimeType = quotedMsg.mimetype ||
    (quotedMsg.msg && quotedMsg.msg.mimetype) ||
    (quotedMsg.message && quotedMsg.message[quotedMsg.mtype] && quotedMsg.message[quotedMsg.mtype].mimetype) ||
    (quotedMsg.message && Object.values(quotedMsg.message)[0] && Object.values(quotedMsg.message)[0].mimetype) ||
    MTYPE_MIME[quotedMsg.mtype] ||
    '';
  return { quotedMsg, mimeType };
}

function extFromMime(mimeType) {
  if (mimeType.includes('image/jpeg')) return '.jpg';
  if (mimeType.includes('image/png')) return '.png';
  if (mimeType.includes('image/webp')) return '.webp';
  if (mimeType.includes('video')) return '.mp4';
  if (mimeType.includes('audio/mpeg')) return '.mp3';
  if (mimeType.includes('audio/mp4')) return '.m4a';
  if (mimeType.includes('audio/x-m4a')) return '.m4a';
  if (mimeType.includes('audio/ogg')) return '.opus';
  if (mimeType.includes('audio/opus')) return '.opus';
  if (mimeType.includes('audio')) return '.audio';
  if (mimeType.includes('application/zip')) return '.zip';
  if (mimeType.includes('application/pdf')) return '.pdf';
  if (mimeType.includes('text/')) return '.txt';
  return '.bin';
}

function labelFromMime(mimeType) {
  if (mimeType.includes('image')) return 'Image';
  if (mimeType.includes('video')) return 'Video';
  if (mimeType.includes('audio/ogg')) return 'Voice Note';
  if (mimeType.includes('audio')) return 'Audio';
  if (mimeType.includes('application/zip')) return 'Archive';
  return 'File';
}

async function sendResult(conn, from, reply, caption, url) {
  try {
    await sendButtons(conn, from, {
      title: '',
      text: caption,
      buttons: [
        {
          name: 'cta_copy',
          buttonParamsJson: JSON.stringify({
            display_text: '📋 Copy Url',
            copy_code: url
          })
        },
        {
          name: 'cta_url',
          buttonParamsJson: JSON.stringify({
            display_text: '🌐 Open Link',
            url
          })
        }
      ]
    });
  } catch (e) {
    console.error('sendButtons failed:', e.message);
    await reply(caption);
  }
}

cmd({
  pattern: "tourl",
  alias: ["imgtourl", "imgurl", "url", "geturl", "upload"],
  react: '🖇',
  desc: "Convert media to Catbox URL via Adeel-Xtech API",
  category: "utility",
  use: ".tourl [reply to media]",
  filename: __filename
}, async (conn, mek, m, { from, reply, quoted, body, isCmd, command, args }) => {
  try {
    const { quotedMsg, mimeType } = readMedia(m);

    if (!mimeType) {
      throw "Please reply to an image, video, audio, or other supported file";
    }

    const mediaBuffer = await quotedMsg.download();
    if (!mediaBuffer || mediaBuffer.length === 0) {
      throw "Failed to download media";
    }

    const fileName = `file${extFromMime(mimeType)}`;

    const form = new FormData();
    form.append('file', mediaBuffer, fileName);

    const apiResponse = await axios.post('https://adeel-xtech-api.vercel.app/api/imgtourl', form, {
      headers: {
        ...form.getHeaders(),
        'User-Agent': 'Mozilla/5.0'
      },
      timeout: 60000,
      maxBodyLength: Infinity,
      maxContentLength: Infinity
    });

    if (!apiResponse.data || apiResponse.data.status !== true || !apiResponse.data.result || !apiResponse.data.result.url) {
      throw "Failed to upload to Adeel-Xtech API";
    }

    const mediaUrl = apiResponse.data.result.url.trim();

    const caption =
      `*${labelFromMime(mimeType)} Uploaded Successfully*\n\n` +
      `*Size:* ${formatBytes(mediaBuffer.length)}\n` +
      `*URL:* ${mediaUrl}\n\n` +
      FOOTER;

    await sendResult(conn, from, reply, caption, mediaUrl);

  } catch (error) {
    console.error(error);
    await reply(`❌ Error: ${error.message || error}`);
  }
});

cmd({
  pattern: "tourl2",
  alias: ["imgtourl2", "imgurl2", "url2", "geturl2", "upload2", "imgbb2"],
  react: '🖼️',
  desc: "Convert image/URL to ImgBB URL",
  category: "utility",
  use: ".tourl2 [reply to image] or .tourl2 <image url>",
  filename: __filename
}, async (conn, mek, m, { from, reply, quoted, body, isCmd, command, args, q }) => {
  try {
    const query = String(q || (Array.isArray(args) ? args.join(' ') : '') || '').trim();
    const urlMatch = query.match(/(https?:\/\/[^\s]+)/i);
    const { quotedMsg, mimeType } = readMedia(m);

    let imageBuffer = null;
    let imageUrl = null;

    if (mimeType) {
      if (!(mimeType.includes('image') || mimeType.includes('sticker'))) {
        throw "imgbb only supports images/stickers. Please reply to an image or sticker.";
      }
      imageBuffer = await quotedMsg.download();
      if (!imageBuffer || imageBuffer.length === 0) {
        throw "Failed to download media";
      }
    } else if (urlMatch) {
      imageUrl = urlMatch[0];
    } else {
      throw "Please reply to an image/sticker or provide an image URL\n\n*Use:* .tourl2 [reply] or .tourl2 <url>";
    }

    const formData = new FormData();
    formData.append('key', IMGBB_API_KEY);
    formData.append('image', imageBuffer ? imageBuffer.toString('base64') : imageUrl);
    formData.append('name', `upload_${Date.now()}`);

    const response = await axios.post(IMGBB_API_URL, formData, {
      headers: formData.getHeaders(),
      timeout: 60000,
      maxBodyLength: Infinity,
      maxContentLength: Infinity
    });

    if (!response.data || !response.data.success) {
      throw response.data?.error?.message || "Upload failed";
    }

    const result = response.data.data;
    const resultUrl = result.url || result.display_url || result.image?.url;

    if (!resultUrl) {
      throw "No image URL in response";
    }

    const caption =
      `*Image Uploaded Successfully*\n\n` +
      `*Size:* ${formatBytes(result.size || 0)}\n` +
      `*URL:* ${resultUrl}\n\n` +
      FOOTER;

    await sendResult(conn, from, reply, caption, resultUrl);

  } catch (error) {
    console.error(error);
    await reply(`❌ Error: ${error.message || error}`);
  }
});

cmd({
  pattern: "tourl3",
  alias: ["imgtourl3", "imgurl3", "url3", "geturl3", "upload3", "quax3"],
  react: '🖇',
  desc: "Convert media to Qu.ax URL",
  category: "utility",
  use: ".tourl3 [reply to media]",
  filename: __filename
}, async (conn, mek, m, { from, reply, quoted, body, isCmd, command, args }) => {
  try {
    const { quotedMsg, mimeType } = readMedia(m);

    if (!mimeType) {
      throw "Please reply to an image, video, audio, or other supported file";
    }

    const mediaBuffer = await quotedMsg.download();
    if (!mediaBuffer || mediaBuffer.length === 0) {
      throw "Failed to download media";
    }

    const fileName = `file${extFromMime(mimeType)}`;

    const quaxForm = new FormData();
    quaxForm.append('files[]', mediaBuffer, fileName);

    const quaxResponse = await axios.post('https://qu.ax/upload.php', quaxForm, {
      headers: {
        Origin: 'https://qu.ax',
        Referer: 'https://qu.ax/',
        ...quaxForm.getHeaders(),
        'User-Agent': 'Mozilla/5.0'
      },
      timeout: 60000,
      maxBodyLength: Infinity,
      maxContentLength: Infinity
    });

    if (!quaxResponse.data || !quaxResponse.data.files || !quaxResponse.data.files[0] || !quaxResponse.data.files[0].url) {
      throw "Failed to upload to Qu.ax";
    }

    const mediaUrl = quaxResponse.data.files[0].url.trim();

    if (!mediaUrl || mediaUrl.toLowerCase().includes('error')) {
      throw "Qu.ax upload failed";
    }

    const caption =
      `*${labelFromMime(mimeType)} Uploaded Successfully*\n\n` +
      `*Size:* ${formatBytes(mediaBuffer.length)}\n` +
      `*URL:* ${mediaUrl}\n\n` +
      FOOTER;

    await sendResult(conn, from, reply, caption, mediaUrl);

  } catch (error) {
    console.error(error);
    await reply(`❌ Error: ${error.message || error}`);
  }
});
