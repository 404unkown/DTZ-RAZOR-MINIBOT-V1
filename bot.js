const { makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const { sms } = require('./msg.js');
const Pino = require('pino');
const fs = require('fs');
const path = require('path');

let sock = null;
let reconnectAttempts = 0;
const MAX_RECONNECT = 10;
let isBotRunning = false;

async function startBot() {
    try {
        const { state, saveCreds } = await useMultiFileAuthState('./auth_info');
        const { version } = await fetchLatestBaileysVersion();

        sock = makeWASocket({
            version,
            logger: Pino({ level: 'silent' }),
            printQRInTerminal: true,
            auth: state,
            browser: ['Chrome (Linux)', '', ''],
            markOnlineOnConnect: true,
            generateHighQualityLinkPreview: true,
            syncFullHistory: false,
            defaultQueryTimeoutMs: 60000,
        });

        // Save credentials on update
        sock.ev.on('creds.update', saveCreds);

        // Connection update handler
        sock.ev.on('connection.update', (update) => {
            const { connection, lastDisconnect, qr } = update;

            if (qr) {
                console.log('📱 QR Code generated - Scan with WhatsApp');
            }

            if (connection === 'close') {
                const statusCode = lastDisconnect?.error?.output?.statusCode;
                console.log('🔌 Connection closed:', statusCode);

                if (statusCode === DisconnectReason.loggedOut) {
                    console.log('❌ Logged out, deleting session...');
                    cleanupSession();
                    return;
                }

                // Auto-reconnect
                if (reconnectAttempts < MAX_RECONNECT) {
                    reconnectAttempts++;
                    console.log(`🔄 Reconnecting... Attempt ${reconnectAttempts}/${MAX_RECONNECT}`);
                    setTimeout(startBot, 5000);
                } else {
                    console.log('❌ Max reconnection attempts reached');
                }
            } else if (connection === 'open') {
                console.log('✅ Connected to WhatsApp');
                reconnectAttempts = 0;
                isBotRunning = true;
            }
        });

        // Message handler
        sock.ev.on('messages.upsert', async ({ messages }) => {
            const m = messages[0];
            if (!m.message) return;

            const msg = sms(sock, m);
            const body = msg.body?.toLowerCase() || '';

            // Basic commands
            if (body === '.ping') {
                await msg.reply('🏓 Pong!');
            }

            if (body === '.status') {
                await msg.reply(`✅ Bot Status: Online\n⏰ Uptime: ${formatUptime(process.uptime())}`);
            }
        });

        return sock;
    } catch (error) {
        console.error('❌ Bot startup error:', error);
        throw error;
    }
}

function cleanupSession() {
    try {
        const authDir = './auth_info';
        if (fs.existsSync(authDir)) {
            fs.rmSync(authDir, { recursive: true });
            console.log('🧹 Session cleaned up');
        }
    } catch (err) {
        console.error('Error cleaning session:', err);
    }
}

function formatUptime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return `${hours}h ${minutes}m ${secs}s`;
}

function getBotStatus() {
    return {
        running: isBotRunning,
        reconnectAttempts,
        maxReconnect: MAX_RECONNECT
    };
}

module.exports = { startBot, getBotStatus };