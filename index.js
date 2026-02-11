const express = require('express');
const { startBot } = require('./bot'); // Import your bot
const app = express();
const path = process.cwd();
const bodyParser = require("body-parser");
const PORT = process.env.PORT || 8000;
const code = require('./pair');

// Increase event listeners for WhatsApp bot
require('events').EventEmitter.defaultMaxListeners = 500;

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Routes
app.use('/code', code);
app.use('/pair', async (req, res, next) => {
    res.sendFile(path + '/pair.html');
});

app.use('/', async (req, res, next) => {
    res.sendFile(path + '/main.html');
});

// Health check endpoint (for Heroku)
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        bot: 'WhatsApp Bot Running'
    });
});

// Start bot and server
async function startServer() {
    try {
        // Start WhatsApp bot
        console.log('🤖 Starting WhatsApp Bot...');
        await startBot();
        console.log('✅ WhatsApp Bot initialized');
        
        // Start web server
        app.listen(PORT, () => {
            console.log(`
╔══════════════════════════════════════╗
║       MAD MAX WhatsApp Bot           ║
║       Server running on port: ${PORT}      ║
║       Don't Forget To Give Star ‼️     ║
╚══════════════════════════════════════╝`);
        });
    } catch (error) {
        console.error('❌ Failed to start:', error);
        process.exit(1);
    }
}

// Handle process termination
process.on('SIGINT', () => {
    console.log('🛑 Shutting down gracefully...');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('🛑 Received SIGTERM, shutting down...');
    process.exit(0);
});

// Start everything
startServer();

module.exports = app;