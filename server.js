const express = require('express');
const path = require('path');

const app = express();
const PORT = 3000;

// Static files first
app.use(express.static(path.join(__dirname, 'public')));

// Root route - serve index.htm
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.htm'));
});

// Catch-all for SPA - use middleware for Express 5.x compatibility
app.use((req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.htm'));
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
