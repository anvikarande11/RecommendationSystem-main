require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;

// Minimal middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Test endpoint
app.get('/ping', (req, res) => {
    console.log('[PING] Health check');
    res.json({ pong: true });
});

// Index
app.get('/', (req, res) => {
    console.log('[INDEX] Serving index.htm');
    res.sendFile(path.join(__dirname, 'public', 'index.htm'));
});

// Catch all for SPA
app.get('*', (req, res) => {
    console.log('[CATCH-ALL] Path:', req.path);
    res.sendFile(path.join(__dirname, 'public', 'index.htm'));
});

const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on port ${PORT}`);
});

process.on('SIGTERM', () => {
    server.close();
    process.exit(0);
});
