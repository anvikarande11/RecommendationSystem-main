require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const vaultRoutes = require('./routes/vault');
const authRoutes = require('./routes/auth');
const curatorRoutes = require('./routes/curator');

const app = express();
const PORT = Number(process.env.PORT) || 3000;

function parseCorsOrigins() {
    const raw = process.env.CORS_ORIGINS;
    if (!raw || raw === '*') return true;
    return raw.split(',').map((s) => s.trim()).filter(Boolean);
}

function corsConfig() {
    const origin = parseCorsOrigins();
    const wildcard = origin === true;
    return {
        origin,
        credentials: !wildcard,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
    };
}

// Middleware — reflect request origin when using credentials; allow file:// dev via explicit origins
app.use(
    cors(corsConfig())
);
app.use(express.json({ limit: '12mb' }));
app.use((err, req, res, next) => {
    if (err && err.type === 'entity.parse.failed') {
        return res.status(400).json({
            success: false,
            error: 'Invalid JSON payload.',
        });
    }
    return next(err);
});
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const ms = Date.now() - start;
        console.log(`${req.method} ${req.originalUrl} ${res.statusCode} ${ms}ms`);
    });
    next();
});
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/v1/health', (req, res) => {
    res.json({
        ok: true,
        service: 'aevora-api',
        time: new Date().toISOString(),
        port: PORT,
    });
});

// API Routes
app.use('/api/v1', vaultRoutes);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/curator', curatorRoutes);

// Fallback for the root path
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.htm'));
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🚀 VibeVault Engine Running on port ${PORT}`);
    console.log(`   Health: /api/v1/health`);
    console.log(`✨ Mode: Academic & Creative Tech enabled\n`);
});