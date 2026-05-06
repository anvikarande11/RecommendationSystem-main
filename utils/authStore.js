const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const STORE_PATH = path.join(__dirname, '..', 'data', 'users.json');

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

function hashPassword(password) {
    return crypto.createHash('sha256').update(password).digest('hex');
}

function signToken(email) {
    return Buffer.from(`${email}:${Date.now()}`).toString('base64');
}

function signup({ name, email, password }) {
    const store = readStore();
    const normalized = String(email || '').trim().toLowerCase();
    if (store.users.some((u) => u.email === normalized)) {
        throw new Error('Email already exists.');
    }
    const user = {
        id: crypto.randomUUID(),
        name: name || normalized.split('@')[0],
        email: normalized,
        passwordHash: hashPassword(password),
        avatar: '',
        createdAt: new Date().toISOString(),
    };
    store.users.push(user);
    writeStore(store);
    return {
        token: signToken(user.email),
        user: { id: user.id, name: user.name, email: user.email, avatar: user.avatar },
    };
}

function login({ email, password }) {
    const store = readStore();
    const normalized = String(email || '').trim().toLowerCase();
    const found = store.users.find((u) => u.email === normalized);
    if (!found || found.passwordHash !== hashPassword(password)) {
        throw new Error('Invalid credentials.');
    }
    return {
        token: signToken(found.email),
        user: { id: found.id, name: found.name, email: found.email, avatar: found.avatar },
    };
}

module.exports = {
    signup,
    login,
};
