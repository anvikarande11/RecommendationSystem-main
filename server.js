console.log('[STARTUP] Starting server...');
require('dotenv').config();
console.log('[STARTUP] Dotenv loaded');
const express = require('express');
console.log('[STARTUP] Express loaded');
const path = require('path');
console.log('[STARTUP] Path loaded');

const app = express();
console.log('[STARTUP] Express app created');
const PORT = 3000;
console.log('[STARTUP] PORT set to:', PORT);

// Request logging middleware - to see ALL requests
app.use((req, res, next) => {
    console.log(`[REQUEST] ${req.method} ${req.path}`);
    next();
});

// Test endpoint
console.log('[STARTUP] Registering /ping route');
app.get('/ping', (req, res) => {
    console.log('[PING] Request received');
    res.json({ pong: true });
});

// Serve index.htm at root
console.log('[STARTUP] Registering / route');
app.get('/', (req, res) => {
    console.log('[ROOT] Serving index.htm');
    const filePath = path.join(__dirname, 'public', 'index.htm');
    console.log('[ROOT] File path:', filePath);
    res.sendFile(filePath, (err) => {
        if (err) {
            console.error('[ROOT] Error:', err.message);
            res.status(500).send('Error: ' + err.message);
        }
    });
});

// Static files
console.log('[STARTUP] Registering static middleware');
app.use(express.static(path.join(__dirname, 'public')));

// Final fallback - serve index.htm for all other routes
console.log('[STARTUP] Registering fallback middleware');
app.use((req, res) => {
    console.log('[FALLBACK] Path:', req.path);
    const filePath = path.join(__dirname, 'public', 'index.htm');
    res.sendFile(filePath, (err) => {
        if (err) {
            console.error('[FALLBACK] Error:', err.message);
            res.status(500).send('Error: ' + err.message);
        }
    });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('[ERROR] Global error handler:', err.message);
    res.status(500).send('Error: ' + err.message);
});

console.log('[STARTUP] All routes registered');
const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`[STARTUP] Server listening on port ${PORT}`);
});

process.on('SIGTERM', () => {
    console.log('[SHUTDOWN] SIGTERM received');
    server.close();
    process.exit(0);
});
