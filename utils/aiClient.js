const { GoogleGenAI } = require("@google/genai");
require("dotenv").config();

if (!process.env.GEMINI_API_KEY) {
    console.warn('[WARN] GEMINI_API_KEY not set in environment. AI features will fail.');
}

// Initialize with the API key - NEVER expose this to frontend
const client = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
});

// Retry logic for API calls
async function callWithRetry(fn, retries = 3, delay = 1000) {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            console.error(`[Attempt ${attempt}/${retries}] Error:`, error.message);
            
            if (attempt === retries) {
                throw error;
            }
            
            // Exponential backoff
            const waitTime = delay * Math.pow(2, attempt - 1);
            console.log(`[Retry] Waiting ${waitTime}ms before attempt ${attempt + 1}`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
        }
    }
}

// Timeout wrapper
function withTimeout(promise, timeoutMs = 30000) {
    return Promise.race([
        promise,
        new Promise((_, reject) =>
            setTimeout(() => reject(new Error(`API call timeout after ${timeoutMs}ms`)), timeoutMs)
        )
    ]);
}

module.exports = {
    client,
    callWithRetry,
    withTimeout,
};
