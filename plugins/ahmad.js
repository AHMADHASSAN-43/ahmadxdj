// plugins/ahmad.js - ESM Version
import { fileURLToPath } from 'url';
import { cmd, commands } from '../command.js';
import config from '../config.js';
import axios from 'axios';

const __filename = fileURLToPath(import.meta.url);

// Keyword that triggers AHMAD (all case variations supported)
const AHMADTriggers = ["ahmad"];

// Save keywords - EXACT match only (like viewonce plugin)
const SAVE_KEYWORDS = ["save", "status", "send", "vv"];

// Nexray AI API endpoint
const API_BASE = "https://api.nexray.eu.cc/ai/gpt-3.5-turbo?text=";

// System prompt - defines AI's role and behavior
const SYSTEM_PROMPT = `You are AHMAD, a helpful and friendly AI assistant on WhatsApp. 

Rules you MUST follow:
- Keep responses short, natural and conversational (1-3 sentences max unless asked for details)
- NEVER repeat or echo the user's question back
- NEVER say "you asked" or "your question was"
- Just answer directly like a human friend would
- Use emojis occasionally to feel natural but don't overdo it
- Be helpful, warm, and casual in tone
- If asked something inappropriate, politely decline

LANGUAGE RULES (VERY IMPORTANT):
- If the user messages in Roman Urdu/Hindi (like "kasa ho", "kya kr rahe ho"), reply in Roman Urdu/Hindi
- If the user messages in English, reply in English
- Match the user's language naturally

Example:
User: "kasa ho"
You: "Sab badhiya! Tum sunao, kya haal hai? 😊"

User: "what is AI"
You: "AI is basically machines that can think and learn like humans. Pretty cool stuff! 🤖"`;

// ==================== SETTINGS COMMAND MAP ====================
const SETTINGS_MAP = {
    'autoreact': { cmd: 'autoreact', type: 'toggle' },
    'react': { cmd: 'autoreact', type: 'toggle' },
    'reacts': { cmd: 'autoreact', type: 'toggle' },
    'reaction': { cmd: 'autoreact', type: 'toggle' },
    'autoreacts': { cmd: 'autoreact', type: 'toggle' },
    'antilink': { cmd: 'antilink', type: 'multi' },
    'link': { cmd: 'antilink', type: 'multi' },
    'linkblock': { cmd: 'antilink', type: 'multi' },
    'antistatus': { cmd: 'antistatus', type: 'multi' },
    'antistatusmention': { cmd: 'antistatus', type: 'multi' },
    'antidelete': { cmd: 'antidelete', type: 'toggle' },
    'antidel': { cmd: 'antidelete', type: 'toggle' },
    'anticall': { cmd: 'anticall', type: 'toggle' },
    'callblock': { cmd: 'anticall', type: 'toggle' },
    'welcome': { cmd: 'welcome', type: 'toggle' },
    'goodbye': { cmd: 'goodbye', type: 'toggle' },
    'autoread': { cmd: 'autoread', type: 'toggle' },
    'autoview': { cmd: 'statusview', type: 'toggle' },
    'statusview': { cmd: 'statusview', type: 'toggle' },
    'viewstatus': { cmd: 'statusview', type: 'toggle' },
    'autotyping': { cmd: 'autotyping', type: 'toggle' },
    'typing': { cmd: 'autotyping', type: 'toggle' },
    'recording': { cmd: 'recording', type: 'toggle' },
    'autorecording': { cmd: 'recording', type: 'toggle' },
    'online': { cmd: 'online', type: 'toggle' },
    'alwaysonline': { cmd: 'online', type: 'toggle' },
    'mentionreply': { cmd: 'mentionreply', type: 'toggle' },
    'statuslike': { cmd: 'statuslike', type: 'toggle' },
    'statusreact': { cmd: 'statuslike', type: 'toggle' },
    'mode': { cmd: 'mode', type: 'mode' },
    'prefix': { cmd: 'prefix', type: 'value' },
    'botname': { cmd: 'botname', type: 'value' },
    'ownername': { cmd: 'ownername', type: 'value' },
    'description': { cmd: 'description', type: 'value' },
    'settings': { cmd: 'settings', type: 'menu' },
    'setting': { cmd: 'settings', type: 'menu' },
};

const ON_KEYWORDS = ['on', 'enable', 'true', 'start'];
const OFF_KEYWORDS = ['off', 'disable', 'false', 'band', 'of', 'stop'];

function detectSettingsIntent(text) {
    const lower = text.toLowerCase().trim();
    
    for (const [keyword, config] of Object.entries(SETTINGS_MAP)) {
        const regex = new RegExp(`\\b${keyword}\\b`, 'i');
        if (regex.test(lower)) {
            let value = null;
            
            if (config.type === 'mode') {
                if (lower.includes('public')) value = 'public';
                else if (lower.includes('private')) value = 'private';
                else if (lower.includes('inbox')) value = 'inbox';
            }
            else if (config.type === 'multi') {
                if (/\bwarn\b/i.test(lower)) value = 'warn';
                else if (/\bdelete\b/i.test(lower)) value = 'delete';
                else if (OFF_KEYWORDS.some(k => lower.includes(k))) value = 'off';
                else if (ON_KEYWORDS.some(k => lower.includes(k))) value = 'on';
            }
            else if (config.type === 'toggle') {
                if (OFF_KEYWORDS.some(k => lower.includes(k))) value = 'off';
                else if (ON_KEYWORDS.some(k => lower.includes(k))) value = 'on';
            }
            else if (config.type === 'value') {
                const parts = text.split(new RegExp(keyword, 'i'));
                if (parts.length > 1) {
                    value = parts[1].trim();
                }
            }
            
            return {
                command: config.cmd,
                value: value,
                keyword: keyword,
                type: config.type
            };
        }
    }
    
    return null;
}

// ==================== STATUS / VIEW-ONCE SAVE HANDLER ====================
async function handleSave(client, message, body, userConfig, isCreator) {
    try {
        const DESCRIPTION = userConfig?.DESCRIPTION || config.DESCRIPTION || "";
        const messageText = body.trim().toLowerCase();
        
        // Strip common filler words after keyword (kr, kro, karo, do, please, etc.)
        const cleanedText = messageText
            .replace(/\b(kr|kro|karo|kardo|krdo|do|de|dena|please|plz|pls)\b/gi, '')
            .replace(/\s+/g, ' ')
            .trim();
        
        // Check if message contains a save keyword (exact OR cleaned)
        const hasKeyword = SAVE_KEYWORDS.includes(messageText) || 
                           SAVE_KEYWORDS.includes(cleanedText);
        
        if (!hasKeyword) return false;
        
        // Case 1: Status save - EVERYONE can use
        if (message.quoted?.chat === 'status@broadcast') {
            const buffer = await message.quoted.download();
            const mtype = message.quoted.mtype;
            const originalCaption = message.quoted.text || '';
            const options = { quoted: message };

            let messageContent = {};
            switch (mtype) {
                case "imageMessage":
                    messageContent = {
                        image: buffer,
                        caption: originalCaption ? `${originalCaption}\n\n> ${DESCRIPTION}` : `> ${DESCRIPTION}`,
                        mimetype: message.quoted.mimetype || "image/jpeg"
                    };
                    break;
                case "videoMessage":
                    messageContent = {
                        video: buffer,
                        caption: originalCaption ? `${originalCaption}\n\n> ${DESCRIPTION}` : `> ${DESCRIPTION}`,
                        mimetype: message.quoted.mimetype || "video/mp4"
                    };
                    break;
                case "audioMessage":
                    messageContent = {
                        audio: buffer,
                        mimetype: "audio/mp4",
                        ptt: message.quoted.ptt || false
                    };
                    break;
                default:
                    return false;
            }

            await client.sendMessage(message.sender, messageContent, options);
            return true;
        }
        
        // Case 2: View-once save - ONLY isCreator (silent restriction)
        if (message.quoted?.viewOnce) {
            if (!isCreator) {
                return false;
            }
            
            const buffer = await message.quoted.download();
            const mtype = message.quoted.mtype;
            const originalCaption = message.quoted.text || '';
            const options = { quoted: message };

            let messageContent = {};
            switch (mtype) {
                case "imageMessage":
                    messageContent = {
                        image: buffer,
                        caption: originalCaption ? `${originalCaption}\n\n> ${DESCRIPTION}` : `> ${DESCRIPTION}`,
                        mimetype: message.quoted.mimetype || "image/jpeg"
                    };
                    break;
                case "videoMessage":
                    messageContent = {
                        video: buffer,
                        caption: originalCaption ? `${originalCaption}\n\n> ${DESCRIPTION}` : `> ${DESCRIPTION}`,
                        mimetype: message.quoted.mimetype || "video/mp4"
                    };
                    break;
                case "audioMessage":
                    messageContent = {
                        audio: buffer,
                        mimetype: "audio/mp4",
                        ptt: message.quoted.ptt || false
                    };
                    break;
                default:
                    return false;
            }

            await client.sendMessage(message.sender, messageContent, options);
            return true;
        }
        
        return false;
    } catch (error) {
        console.error("Save Error:", error);
        return false;
    }
}

cmd({
    'on': "body"
}, async (client, message, m, {
    from,
    body,
    isCreator,
    reply,
    sender,
    userConfig,
    isGroup,
    args,
    q,
    text,
    senderNumber,
    botNumber,
    botNumber2,
    isMe,
    isRealOwner,
    groupName,
    participants,
    groupAdmins,
    isBotAdmins,
    isAdmins,
    pushname,
    sanitizedNumber,
    updateUserConfig
}) => {
    try {
        const originalBody = body.trim();
        
        // ===== CHECK FOR "AHMAD" TRIGGER =====
        let cleanMsg = null;
        let matchedTrigger = null;
        let matchedText = null;
        
        for (const trigger of AHMADTriggers) {
            const triggerRegex = new RegExp(`^${trigger}(?:\\s|$)`, 'i');
            
            if (triggerRegex.test(originalBody)) {
                matchedTrigger = trigger;
                cleanMsg = originalBody.replace(new RegExp(`^${trigger}\\s*`, 'i'), '').trim();
                matchedText = originalBody.match(new RegExp(`^${trigger}`, 'i'))[0];
                break;
            }
        }
        
        if (!matchedTrigger) {
            return;
        }
        
        const PREFIX = userConfig?.PREFIX || config.PREFIX || ".";
        
        // Helper functions
        const sendQuoted = async (text) => {
            return await client.sendMessage(from, { text }, { quoted: message });
        };
        
        const reactToMessage = async (emoji, msgKey) => {
            try {
                await client.sendMessage(from, {
                    react: { text: emoji, key: msgKey || message.key }
                });
            } catch (e) {}
        };
        
        const executeCommand = async (commandName, cmdArgs) => {
            const foundCmd = commands.find(c => {
                const patterns = Array.isArray(c.pattern) ? c.pattern : [c.pattern];
                const aliases = Array.isArray(c.alias) ? c.alias : (c.alias ? [c.alias] : []);
                const allNames = [...patterns, ...aliases].filter(Boolean);
                return allNames.some(n => n.toLowerCase() === commandName.toLowerCase());
            });
            
            if (!foundCmd) return false;
            
            const context = {
                from,
                reply: (teks) => client.sendMessage(from, { text: teks }, { quoted: message }),
                sender,
                senderNumber,
                userConfig,
                isCreator,
                isGroup,
                isMe,
                isRealOwner,
                botNumber,
                botNumber2,
                args: cmdArgs,
                q: cmdArgs.join(' '),
                text: cmdArgs.join(' '),
                isCmd: true,
                command: commandName,
                groupName,
                participants,
                groupAdmins,
                isBotAdmins,
                isAdmins,
                pushname,
                sanitizedNumber,
                updateUserConfig,
                react: async (emoji) => {
                    try {
                        await client.sendMessage(from, {
                            react: { text: emoji, key: message.key }
                        });
                    } catch (e) {}
                },
                prefix: PREFIX
            };
            
            try {
                await foundCmd.function(client, message, m, context);
                return true;
            } catch (err) {
                console.error(`Command ${commandName} error:`, err);
                return false;
            }
        };
        
        // If just "AHMAD" with no command, show intro
        if (!cleanMsg) {
            const introText = `🤖 *AHMAD:* Hey! I'm AHMAD - Your Assistant!

*About Me:*
• 🤖 Smart command processor
• 💡 Here to help you 24/7
• 🎯 Fast & accurate responses

📋 *Try these commands:*
• ${matchedText} menu - Show all commands
• ${matchedText} play <song> - Play music
• ${matchedText} ping - Check response
• ${matchedText} status - Bot status

💡 *Save Status:*
Reply to any status with "save" → sent to DM!

💡 *Just type "${matchedText} <command>" to use me!*`;

            await sendQuoted(introText);
            await reactToMessage('🤖');
            
            return;
        }

        // ==================== STEP 1: CHECK FOR SAVE KEYWORDS ====================
        // This MUST be before settings detection
        // Because "Ahmad save kr" or "Ahmad status save kr" should save, not go to settings/AI
        const saveHandled = await handleSave(client, message, cleanMsg, userConfig, isCreator);
        if (saveHandled) {
            return; // Silent - no response in chat
        }

        // ==================== STEP 2: CHECK FOR SETTINGS ====================
        const settingsIntent = detectSettingsIntent(cleanMsg);
        
        if (settingsIntent) {
            const { command, value, type } = settingsIntent;
            
            const okMsg = await sendQuoted(`🤖 *AHMAD:* Ok boss! Processing "${command}"...`);
            if (okMsg?.key) {
                await reactToMessage('🤖', okMsg.key);
            }
            
            let cmdArgs = [];
            
            if (type === 'menu') {
                cmdArgs = [];
            } else if (value !== null && value !== undefined) {
                cmdArgs = [value];
            } else {
                cmdArgs = [];
            }
            
            console.log(`🎯 Settings intent detected: ${command} ${cmdArgs.join(' ')}`);
            
            const executed = await executeCommand(command, cmdArgs);
            
            if (!executed) {
                console.log(`⚠️ Settings command "${command}" not found, falling back to AI`);
            } else {
                return;
            }
        }

        // ==================== STEP 3: SMART COMMAND DETECTION ====================
        const lowerCleanMsg = cleanMsg.toLowerCase();
        const words = lowerCleanMsg.split(/\s+/);
        let foundCommand = null;
        let foundArgs = [];
        let commandPattern = null;
        
        // FIRST PASS: Check first word
        for (const cmd of commands) {
            const patterns = Array.isArray(cmd.pattern) ? cmd.pattern : [cmd.pattern];
            const aliases = Array.isArray(cmd.alias) ? cmd.alias : (cmd.alias ? [cmd.alias] : []);
            const allNames = [...patterns, ...aliases].filter(Boolean);
            
            for (const name of allNames) {
                if (words[0] === name.toLowerCase()) {
                    foundCommand = cmd;
                    commandPattern = name;
                    foundArgs = words.slice(1);
                    break;
                }
            }
            if (foundCommand) break;
        }
        
        // SECOND PASS: Check anywhere in text
        if (!foundCommand) {
            for (const cmd of commands) {
                const patterns = Array.isArray(cmd.pattern) ? cmd.pattern : [cmd.pattern];
                const aliases = Array.isArray(cmd.alias) ? cmd.alias : (cmd.alias ? [cmd.alias] : []);
                const allNames = [...patterns, ...aliases].filter(Boolean);
                
                for (const name of allNames) {
                    const nameLower = name.toLowerCase();
                    if (nameLower.length < 2) continue;
                    
                    const regex = new RegExp(`\\b${nameLower}\\b`, 'i');
                    if (regex.test(lowerCleanMsg)) {
                        foundCommand = cmd;
                        commandPattern = name;
                        
                        const parts = cleanMsg.split(new RegExp(name, 'i'));
                        foundArgs = parts.length > 1 ? parts[1].trim().split(/\s+/) : [];
                        break;
                    }
                }
                if (foundCommand) break;
            }
        }
        
        // Execute found command
        if (foundCommand && commandPattern) {
            const okMsg = await sendQuoted(`🤖 *AHMAD:* Ok boss! Processing "${commandPattern}"...`);
            if (okMsg?.key) {
                await reactToMessage('🤖', okMsg.key);
            }
            
            const context = {
                from,
                reply: (teks) => client.sendMessage(from, { text: teks }, { quoted: message }),
                sender,
                senderNumber,
                userConfig,
                isCreator,
                isGroup,
                isMe,
                isRealOwner,
                botNumber,
                botNumber2,
                args: foundArgs,
                q: foundArgs.join(' '),
                text: foundArgs.join(' '),
                isCmd: true,
                command: commandPattern,
                groupName,
                participants,
                groupAdmins,
                isBotAdmins,
                isAdmins,
                pushname,
                sanitizedNumber,
                updateUserConfig,
                react: async (emoji) => {
                    try {
                        await client.sendMessage(from, {
                            react: { text: emoji, key: message.key }
                        });
                    } catch (e) {}
                },
                prefix: PREFIX
            };
            
            try {
                await foundCommand.function(client, message, m, context);
            } catch (err) {
                console.error("Command execution error:", err);
                await sendQuoted(`❌ Error executing command: ${err.message}`);
            }
            
            return;
        }
        
        // ==================== STEP 4: FALLBACK TO NEXRAY AI ====================
        try {
            const thinkingMsg = await sendQuoted(`🤖 *AHMAD:* Let me think about that...`);
            
            if (thinkingMsg?.key) {
                await reactToMessage('🧠', thinkingMsg.key);
            }
            
            const fullPrompt = `${SYSTEM_PROMPT}\n\nUser: ${cleanMsg}\nYou:`;
            const apiUrl = `${API_BASE}${encodeURIComponent(fullPrompt)}`;
            
            console.log(`📡 Calling Nexray AI: ${cleanMsg}`);
            
            const response = await axios.get(apiUrl, {
                timeout: 30000
            });
            
            let replyText = null;
            
            if (response.data && response.data.status && response.data.result) {
                replyText = response.data.result.trim();
            }
            
            if (replyText && replyText.length > 0) {
                replyText = replyText
                    .replace(/^(You:|Assistant:|AHMAD:)\s*/i, '')
                    .replace(/^(User:|Human:).*?\n/i, '')
                    .trim();
                
                const finalText = `🤖 *AHMAD:* ${replyText}`;
                
                const protocolMsg = {
                    key: thinkingMsg.key,
                    type: 0xe,
                    editedMessage: { conversation: finalText }
                };
                await client.relayMessage(from, { protocolMessage: protocolMsg }, {});
            } else {
                const helpText = `🤖 *AHMAD:* I didn't understand "${cleanMsg}"

📋 *Available commands:*
• ${matchedText} menu - Show all commands
• ${matchedText} play <song> - Play music
• ${matchedText} ping - Check response
• ${matchedText} settings - View all settings

💡 *Type "${matchedText}" alone to see all options*`;

                const protocolMsg = {
                    key: thinkingMsg.key,
                    type: 0xe,
                    editedMessage: { conversation: helpText }
                };
                await client.relayMessage(from, { protocolMessage: protocolMsg }, {});
            }
            
        } catch (error) {
            console.error("Nexray AI Error:", error.message);
            
            const helpText = `🤖 *AHMAD:* I'm having trouble connecting. Try these commands instead:

• ${matchedText} menu - Show all commands
• ${matchedText} play <song> - Play music
• ${matchedText} ping - Check response
• ${matchedText} settings - View all settings`;

            await sendQuoted(helpText);
        }
        
    } catch (error) {
        console.error("AHMAD Plugin Error:", error);
        try {
            await client.sendMessage(from, { 
                text: `🤖 *AHMAD:* Sorry, I'm having trouble right now. Try again in a moment!`,
                quoted: message
            });
        } catch (e) {}
    }
});
