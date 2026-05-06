const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const STORE_PATH = path.join(__dirname, '..', 'data', 'users.json');
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key-change-in-production';
const BCRYPT_ROUNDS = 12;

function ensureStore() {
    const dir = path.dirname(STORE_PATH);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(STORE_PATH)) {
        fs.writeFileSync(STORE_PATH, JSON.stringify({ users: [] }, null, 2), 'utf8');
    }
}

function readStore() {
    ensureStore();
    return JSON.parse(fs.readFileSync(STORE_PATH, 'utf8'));
}

function writeStore(store) {
    ensureStore();
    fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2), 'utf8');
}

function hashPasswordSync(password) {
    return bcrypt.hashSync(password, BCRYPT_ROUNDS);
}

function comparePassword(password, hash) {
    return bcrypt.compareSync(password, hash);
}

function signToken(userId, email) {
    return jwt.sign(
        { userId, email, iat: Math.floor(Date.now() / 1000) },
        JWT_SECRET,
        { expiresIn: '7d', algorithm: 'HS256' }
    );
}

function verifyToken(token) {
    try {
        return jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
    } catch (error) {
        throw new Error('Invalid or expired token');
    }
}

function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

function validatePassword(password) {
    if (!password || password.length < 6) {
        throw new Error('Password must be at least 6 characters.');
    }
}

function signup({ name, email, password }) {
    const store = readStore();
    const normalized = String(email || '').trim().toLowerCase();
    
    // Validate inputs
    if (!validateEmail(normalized)) {
        throw new Error('Invalid email format.');
    }
    validatePassword(password);
    
    if (store.users.some((u) => u.email === normalized)) {
        throw new Error('Email already exists.');
    }
    
    const user = {
        id: crypto.randomUUID(),
        name: name || normalized.split('@')[0],
        email: normalized,
        passwordHash: hashPasswordSync(password),
        avatar: '',
        createdAt: new Date().toISOString(),
    };
    
    store.users.push(user);
    writeStore(store);
    
    return {
        token: signToken(user.id, user.email),
        user: { id: user.id, name: user.name, email: user.email, avatar: user.avatar },
    };
}

function login({ email, password }) {
    const store = readStore();
    const normalized = String(email || '').trim().toLowerCase();
    
    if (!validateEmail(normalized)) {
        throw new Error('Invalid email format.');
    }
    
    const found = store.users.find((u) => u.email === normalized);
    if (!found || !comparePassword(password, found.passwordHash)) {
        // Intentionally vague for security
        throw new Error('Invalid credentials.');
    }
    
    return {
        token: signToken(found.id, found.email),
        user: { id: found.id, name: found.name, email: found.email, avatar: found.avatar },
    };
}

module.exports = {
    signup,
    login,
    verifyToken,
    comparePassword,
};
