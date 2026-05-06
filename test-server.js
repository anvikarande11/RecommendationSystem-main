const express = require('express');
const app = express();

app.use((req, res, next) => {
    console.log('[MIDDLEWARE] Request received:', req.method, req.path);
    next();
});

app.get('/test', (req, res) => {
    console.log('[ROUTE] GET /test matched');
    res.json({ ok: true });
});

app.get('/', (req, res) => {
    console.log('[ROUTE] GET / matched');
    res.json({ hello: 'world' });
});

app.listen(3001, '0.0.0.0', () => {
    console.log('Test server on 3001');
});
