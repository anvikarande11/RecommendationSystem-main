const express = require('express');
const router = express.Router();
const { client, callWithRetry, withTimeout } = require('../utils/aiClient');
const { getUserProfile, computeTasteDNA } = require('../utils/userMemory');

const MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash';

function extractText(response) {
    if (!response) return '';
    const t = response.text;
    return typeof t === 'string' ? t : '';
}

router.post('/chat', async (req, res) => {
    try {
        if (!process.env.GEMINI_API_KEY) {
            return res.status(503).json({
                success: false,
                error: 'Curator requires GEMINI_API_KEY in environment.',
            });
        }
        const { userId, message, contextTitles } = req.body || {};
        if (!message || typeof message !== 'string' || message.length > 1000) {
            return res.status(400).json({ success: false, error: 'Invalid message.' });
        }
        const { profile } = getUserProfile(userId);
        const dna = computeTasteDNA(profile);
        const titles = Array.isArray(contextTitles) ? contextTitles.filter(Boolean).slice(0, 8) : [];
        const system = `You are Aevora Curator, a concise, warm recommendation stylist. 
User taste summary: ${dna.summary}
DNA axes (0-100): ${JSON.stringify(dna.axes)}
Recent on-screen picks: ${titles.length ? titles.join('; ') : 'none yet'}
Rules: Answer in under 120 words. Suggest 2–4 concrete vibe queries they could type. No markdown headings.`;

        const response = await callWithRetry(
            () => withTimeout(
                client.models.generateContent({
                    model: MODEL,
                    contents: `${system}\n\nUser: ${message}\n\nCurator:`,
                }),
                30000
            ),
            3,
            1000
        );
        
        const reply = extractText(response).trim() || 'Try adjusting your mood chip and searching again — I am here to refine the vibe.';
        return res.json({ success: true, reply });
    } catch (error) {
        console.error('Curator chat error:', error);
        const statusCode = error.message?.includes('timeout') ? 504 : 503;
        return res.status(statusCode).json({
            success: false,
            error: error.message || 'Curator unavailable.',
        });
    }
});

router.post('/visual-vibe', async (req, res) => {
    try {
        if (!process.env.GEMINI_API_KEY) {
            return res.status(503).json({
                success: false,
                error: 'Visual search requires GEMINI_API_KEY in environment.',
            });
        }
        const { imageBase64, mimeType } = req.body || {};
        if (!imageBase64 || typeof imageBase64 !== 'string' || imageBase64.length > 5000000) {
            return res.status(400).json({ success: false, error: 'Invalid or oversized image.' });
        }
        const mime = mimeType && typeof mimeType === 'string' ? mimeType : 'image/jpeg';
        const prompt =
            'You help an aesthetic discovery app. Look at the image. Reply with ONLY valid JSON (no markdown) in this shape: {"vibes":"one short search phrase for recommendations","mood":"one of: calm,focused,emotional,energetic,lonely,romantic,productive,cozy,dark_academia,cyberpunk","palette":["up to 4 color words"],"objects":["up to 5 objects or styles"]}';

        const response = await callWithRetry(
            () => withTimeout(
                client.models.generateContent({
                    model: MODEL,
                    contents: [
                        prompt,
                        {
                            inlineData: {
                                mimeType: mime,
                                data: imageBase64.replace(/^data:image\/\w+;base64,/, ''),
                            },
                        },
                    ],
                }),
                30000
            ),
            3,
            1000
        );
        
        const raw = extractText(response).trim();
        let parsed = null;
        try {
            parsed = JSON.parse(raw.replace(/^```json\s*|\s*```$/g, ''));
        } catch {
            parsed = { vibes: 'cinematic aesthetic inspired by uploaded image', mood: 'emotional', palette: [], objects: [] };
        }
        const rawMood = String(parsed.mood || 'emotional')
            .toLowerCase()
            .replace(/[\s-]+/g, '_');
        const moodAliases = {
            dark_academia: 'dark_academia',
            darkacademia: 'dark_academia',
            academia: 'dark_academia',
            cyber_punk: 'cyberpunk',
        };
        const mood = moodAliases[rawMood] || rawMood;
        return res.json({
            success: true,
            vibes: String(parsed.vibes || '').slice(0, 280),
            mood,
            palette: Array.isArray(parsed.palette) ? parsed.palette : [],
            objects: Array.isArray(parsed.objects) ? parsed.objects : [],
        });
    } catch (error) {
        console.error('Visual vibe error:', error);
        const statusCode = error.message?.includes('timeout') ? 504 : 503;
        return res.status(statusCode).json({
            success: false,
            error: error.message || 'Visual analysis failed.',
        });
    }
});

module.exports = router;
