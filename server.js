require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');

// Import routes
const vaultRoutes = require('./routes/vault');
const authRoutes = require('./routes/auth');
const curatorRoutes = require('./routes/curator');
const { verifyToken } = require('./utils/authStore');

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// ============ SECURITY MIDDLEWARE ============

// Temporarily disable Helmet to debug
// app.use(helmet({
//     contentSecurityPolicy: {
//         directives: {
//             defaultSrc: ["'self'"],
//             scriptSrc: ["'self'", "'unsafe-inline'"],
//             styleSrc: ["'self'", "'unsafe-inline'"],
//             imgSrc: ["'self'", "data:", "https:"],
//         },
//     },
// }));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: 'Too many requests, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
});

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    skipSuccessfulRequests: true,
    message: 'Too many login attempts, please try again later.',
});

const apiLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 30,
    message: 'Too many API requests, please try again later.',
});

app.use(limiter);

// CORS
function parseCorsOrigins() {
    const raw = process.env.CORS_ORIGINS;
    if (!raw) return ['http://localhost:3000', 'http://127.0.0.1:3000'];
    if (raw === '*') return '*';
    return raw.split(',').map((s) => s.trim()).filter(Boolean);
}

app.use(cors({
    origin: parseCorsOrigins(),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 3600,
}));

// ============ BODY PARSER & LOGGING ============

app.use(express.json({ limit: '12mb' }));
app.use(express.urlencoded({ limit: '12mb', extended: true }));

app.use((req, res, next) => {
    const start = Date.now();
    console.log(`[DEBUG] Incoming request: ${req.method} ${req.path}`);
    res.on('finish', () => {
        const ms = Date.now() - start;
        const logLevel = res.statusCode >= 400 ? 'WARN' : 'INFO';
        console.log(`[${logLevel}] ${req.method} ${req.originalUrl} ${res.statusCode} ${ms}ms`);
    });
    next();
});

// ============ STATIC ASSETS ============

app.use(express.static('public', {
    maxAge: '1h',
    etag: false
}));

// ============ HEALTH CHECK ============

app.get('/api/v1/health', (req, res) => {
    res.json({
        ok: true,
        service: 'aevora-api',
        time: new Date().toISOString(),
        port: PORT,
        env: process.env.NODE_ENV || 'development',
    });
});

// ============ AUTHENTICATION MIDDLEWARE ============

function requireAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, error: 'Missing or invalid Authorization header.' });
    }
    
    const token = authHeader.substring(7);
    try {
        const decoded = verifyToken(token);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ success: false, error: 'Invalid or expired token.' });
    }
}

// ============ API ROUTES ============

app.use('/api/v1/auth', authLimiter, authRoutes);
app.use('/api/v1/curator', apiLimiter, requireAuth, curatorRoutes);
app.use('/api/v1', apiLimiter, requireAuth, vaultRoutes);

// ============ SPA FALLBACK ============
// Serve index.htm for any non-API route (must be AFTER static and API routes)

app.get('/', (req, res) => {
    const indexPath = path.join(__dirname, 'public', 'index.htm');
    if (fs.existsSync(indexPath)) {
        return res.sendFile(indexPath);
    }
    res.status(404).json({ success: false, error: 'index.htm not found' });
});

// Catch-all for SPA routes - serve index.htm for everything except /api/
app.use((req, res, next) => {
    console.log('[SPA] Catch-all middleware:', req.path, 'Starts with /api/?', req.path.startsWith('/api/'));
    
    if (req.path.startsWith('/api/')) {
        return next(); // Let API routes handle their own 404s
    }
    
    const indexPath = path.join(__dirname, 'public', 'index.htm');
    console.log('[SPA] Checking file:', indexPath);
    console.log('[SPA] File exists?', fs.existsSync(indexPath));
    
    if (fs.existsSync(indexPath)) {
        console.log('[SPA] Serving index.htm');
        return res.sendFile(indexPath);
    }
    
    res.status(404).json({ success: false, error: 'Not found' });
});

// ============ API 404 HANDLER ============

app.use('/api', (req, res) => {
    res.status(404).json({ success: false, error: 'API endpoint not found.' });
});

// ============ GLOBAL ERROR HANDLER ============

app.use((err, req, res, next) => {
    console.error('[ERROR]', err.message || err);
    
    const statusCode = err.statusCode || 500;
    const message = process.env.NODE_ENV === 'production' 
        ? 'Internal server error.' 
        : err.message;
    
    res.status(statusCode).json({
        success: false,
        error: message,
    });
});

// ============ START SERVER ============

const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🚀 VibeVault Engine Running on http://127.0.0.1:${PORT}`);
    console.log(`   Health: http://127.0.0.1:${PORT}/api/v1/health`);
    console.log(`✨ Mode: ${process.env.NODE_ENV || 'development'}\n`);
});

process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully...');
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});
