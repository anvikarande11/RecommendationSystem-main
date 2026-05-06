require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const vaultRoutes = require('./routes/vault');
const authRoutes = require('./routes/auth');
const curatorRoutes = require('./routes/curator');
const { verifyToken } = require('./utils/authStore');

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Security: Helmet middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https:"],
        },
    },
}));

// Rate limiting - Prevent abuse
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
});

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10, // stricter for auth endpoints
    skipSuccessfulRequests: true,
    message: 'Too many login attempts, please try again later.',
});

const apiLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 30, // stricter for API calls
    message: 'Too many API requests, please try again later.',
});

app.use(limiter);

// CORS Configuration - Production ready
function parseCorsOrigins() {
    const raw = process.env.CORS_ORIGINS;
    if (!raw) return ['http://localhost:3000', 'http://127.0.0.1:3000'];
    if (raw === '*') return '*'; // Only for development
    return raw.split(',').map((s) => s.trim()).filter(Boolean);
}

app.use(
    cors({
        origin: parseCorsOrigins(),
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
        maxAge: 3600,
    })
);

// Middleware
app.use(express.json({ limit: '12mb' }));

// Request logging middleware
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const ms = Date.now() - start;
        const logLevel = res.statusCode >= 400 ? 'WARN' : 'INFO';
        console.log(`[${logLevel}] ${req.method} ${req.originalUrl} ${res.statusCode} ${ms}ms`);
    });
    next();
});

// Static files
app.use(express.static('public'));

// Health check endpoint
app.get('/api/v1/health', (req, res) => {
    res.json({
        ok: true,
        service: 'aevora-api',
        time: new Date().toISOString(),
        port: PORT,
        env: process.env.NODE_ENV || 'development',
    });
});

// Token verification middleware for protected routes
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

// API Routes
app.use('/api/v1/auth', authLimiter, authRoutes);
app.use('/api/v1/curator', apiLimiter, requireAuth, curatorRoutes);
app.use('/api/v1', apiLimiter, requireAuth, vaultRoutes);

// Fallback for root path
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.htm'));
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ success: false, error: 'Not found.' });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('[ERROR]', err);
    
    // Avoid exposing internal errors to clients
    const statusCode = err.statusCode || 500;
    const message = process.env.NODE_ENV === 'production' 
        ? 'Internal server error.' 
        : err.message;
    
    res.status(statusCode).json({
        success: false,
        error: message,
    });
});

const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🚀 VibeVault Engine Running on http://127.0.0.1:${PORT}`);
    console.log(`   Health: http://127.0.0.1:${PORT}/api/v1/health`);
    console.log(`✨ Mode: ${process.env.NODE_ENV || 'development'}\n`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully...');
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});
