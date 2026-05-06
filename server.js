require('dotenv').config();
const express = require('express');
const path = require('path');

const app = express();
const PORT = 3000;

// Test endpoint
app.get('/ping', (req, res) => {
    res.json({ pong: true });
});

// Serve index.htm at root
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.htm'));
});

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Final fallback - serve index.htm for all other routes
app.use((req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.htm'), (err) => {
        if (err) {
            res.status(500).send('Error loading page');
        }
    });
});

const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on port ${PORT}`);
});

process.on('SIGTERM', () => {
    server.close();
    process.exit(0);
});
