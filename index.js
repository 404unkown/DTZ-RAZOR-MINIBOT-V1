const express = require('express');
const app = express();
const path = require('path');
const bodyParser = require("body-parser");
const axios = require('axios');

__path = process.cwd()
const PORT = process.env.PORT || 8000;

// Import your WhatsApp bot
const { startBot } = require('./bot.js'); // You'll create this

// Self-ping URL (Render provides this)
const RENDER_URL = process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// === KEEP-ALIVE ROUTES ===
app.get('/ping', (req, res) => {
    res.status(200).send('pong');
});

app.get('/health', (req, res) => {
    res.json({
        status: 'online',
        timestamp: Date.now(),
        uptime: process.uptime(),
        bot: global.botStatus || 'offline'
    });
});

// === YOUR EXISTING ROUTES ===
app.use('/code', require('./pair'));
app.use('/pair', (req, res) => {
    res.sendFile(path.join(__path, '/pair.html'));
});

app.use('/', (req, res) => {
    res.sendFile(path.join(__path, '/main.html'));
});

// === SELF-PING SYSTEM ===
async function pingSelf() {
    try {
        await axios.get(`${RENDER_URL}/ping`, { timeout: 5000 });
        console.log('✅ Self-ping successful - Keeping bot awake');
    } catch (error) {
        console.log('⚠️ Self-ping failed, trying again...');
    }
}

// Start self-pinging every 4 minutes
setInterval(pingSelf, 4 * 60 * 1000);

// === BOT MANAGEMENT ===
let botInstance = null;

async function startWhatsAppBot() {
    try {
        console.log('🚀 Starting WhatsApp Bot...');
        botInstance = await startBot();
        global.botStatus = 'online';
        console.log('✅ WhatsApp Bot is now ONLINE');
    } catch (error) {
        console.error('❌ Failed to start bot:', error);
        global.botStatus = 'offline';
        
        // Auto-restart after 30 seconds
        setTimeout(startWhatsAppBot, 30000);
    }
}

// === START EVERYTHING ===
app.listen(PORT, async () => {
    console.log(`
╔══════════════════════════════════════╗
║     WHATSAPP BOT SERVER RUNNING      ║
║     Port: ${PORT}                      ║
║     URL: ${RENDER_URL}           ║
╚══════════════════════════════════════╝
`);
    
    // Start WhatsApp bot
    await startWhatsAppBot();
    
    // Initial ping
    pingSelf();
});

module.exports = app;