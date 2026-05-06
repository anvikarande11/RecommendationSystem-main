const { GoogleGenAI } = require('@google/genai');
require('dotenv').config();

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function ensureGeminiKey() {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
        throw new Error('GEMINI_API_KEY is missing.');
    }
    return key;
}

let client = null;
function getClient() {
    if (!client) {
        client = new GoogleGenAI({
            apiKey: ensureGeminiKey(),
        });
    }
    return client;
}

async function generateContentWithRetry(request, options = {}) {
    const retries = Number.isInteger(options.retries) ? options.retries : 2;
    const baseDelayMs = Number.isFinite(options.baseDelayMs) ? options.baseDelayMs : 450;
    let lastError = null;

    for (let attempt = 0; attempt <= retries; attempt += 1) {
        try {
            return await getClient().models.generateContent(request);
        } catch (error) {
            lastError = error;
            const message = String(error?.message || '');
            const retryable =
                /429|rate|quota|timeout|timed out|deadline|temporar|503|502|500|unavailable|network|ECONNRESET|EAI_AGAIN/i.test(
                    message
                );
            if (attempt >= retries || !retryable) break;
            const jitter = Math.floor(Math.random() * 120);
            await sleep(baseDelayMs * (attempt + 1) + jitter);
        }
    }

    throw lastError || new Error('Gemini request failed.');
}

module.exports = {
    getClient,
    generateContentWithRetry,
    ensureGeminiKey,
};