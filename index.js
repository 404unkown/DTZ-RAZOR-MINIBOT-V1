const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

// Import your WhatsApp bot router
const botRouter = require('./pair');

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Use your WhatsApp bot routes
app.use('/', botRouter);

// Health check endpoint (required for Heroku)
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    bot: 'MAD MAX WhatsApp Bot',
    version: '1.0.0'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════╗
║       MAD MAX WhatsApp Bot           ║
║       Server running on port: ${PORT}      ║
║       Powered by CYBER DARK TECH     ║
╚══════════════════════════════════════╝`);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('🛑 Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('🛑 Received SIGTERM, shutting down...');
  process.exit(0);
});

module.exports = app;