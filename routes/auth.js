const express = require('express');
const router = express.Router();
const { signup, login } = require('../utils/authStore');

router.post('/signup', (req, res) => {
    try {
        const { name, email, password } = req.body || {};
        if (!email || !password) {
            return res.status(400).json({ success: false, error: 'Email and password are required.' });
        }
        const data = signup({ name, email, password });
        return res.json({ success: true, ...data });
    } catch (error) {
        return res.status(400).json({ success: false, error: error.message });
    }
});

router.post('/login', (req, res) => {
    try {
        const { email, password } = req.body || {};
        if (!email || !password) {
            return res.status(400).json({ success: false, error: 'Email and password are required.' });
        }
        const data = login({ email, password });
        return res.json({ success: true, ...data });
    } catch (error) {
        return res.status(401).json({ success: false, error: error.message });
    }
});

router.post('/guest', (req, res) => {
    return res.json({
        success: true,
        token: `guest-${Date.now()}`,
        user: {
            id: `guest-${Date.now()}`,
            name: 'Guest',
            email: 'guest@aevora.local',
            avatar: '',
        },
    });
});

module.exports = router;
