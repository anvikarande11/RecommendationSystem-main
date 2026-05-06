const { GoogleGenAI } = require("@google/genai");
require("dotenv").config();

// Initialize with the API key object
const client = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
});

module.exports = client;