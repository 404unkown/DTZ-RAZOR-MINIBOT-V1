const { makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const { sms } = require('./msg.js');
const Pino = require('pino');
const fs = require('fs');
const path = require('path');

let sock = null;
let reconnectAttempts = 0;
const MAX_RECONNECT = 10;

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('./auth_info');
    
    const { version } = await fetchLatestBaileysVersion();
    
    sock = makeWASocket({
        version,
        logger: Pino({ level: 'silent' }),
        printQRInTerminal: true,
        auth: state,
        browser: ['Chrome', 'Windows', '10.0.0'],
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
        }
    });

    // Message handler
    sock.ev.on('messages.upsert', async ({ messages }) => {
        const m = messages[0];
        if (!m.message) return;
        
        const msg = sms(sock, m);
        
        // Your command handling here
        const body = msg.body?.toLowerCase() || '';
        
        if (body === '.ping') {
            await msg.reply('🏓 Pong!');
        }
        
        if (body === '.status') {
            await msg.reply(`✅ Bot Status: Online\n⏰ Uptime: ${formatUptime(process.uptime())}`);
        }
    });

    return sock;
}

function cleanupSession() {
    const authDir = './auth_info';
    if (fs.existsSync(authDir)) {
        fs.rmSync(authDir, { recursive: true });
        console.log('🧹 Session cleaned up');
    }
}

function formatUptime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return `${hours}h ${minutes}m ${secs}s`;
}

module.exports = { startBot };