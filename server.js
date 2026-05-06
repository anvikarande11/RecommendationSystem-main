require('dotenv').config();
const express = require('express');
const path = require('path');

const app = express();
const PORT = 3001;  // Using 3001 to avoid v0 port proxy on 3000

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
const authRoutes = require('./routes/auth');
const curatorRoutes = require('./routes/curator');
const vaultRoutes = require('./routes/vault');

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/curator', curatorRoutes);
app.use('/api/v1', vaultRoutes);

// SPA Fallback
app.use((req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.htm'));
});

const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Aevora Engine Running on http://127.0.0.1:${PORT}`);
});

process.on('SIGTERM', () => {
    server.close();
    process.exit(0);
});
