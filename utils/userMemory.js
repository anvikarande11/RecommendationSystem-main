const fs = require('fs');
const path = require('path');

const STORE_PATH = path.join(__dirname, '..', 'data', 'user-memory.json');

function ensureStore() {
    const dir = path.dirname(STORE_PATH);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(STORE_PATH)) {
        fs.writeFileSync(STORE_PATH, JSON.stringify({ users: {} }, null, 2), 'utf8');
    }
}

function readStore() {
    ensureStore();
    const raw = fs.readFileSync(STORE_PATH, 'utf8');
    return JSON.parse(raw || '{"users":{}}');
}

function writeStore(store) {
    ensureStore();
    fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2), 'utf8');
}

function defaultProfile() {
    return {
        likes: [],
        dislikes: [],
        searches: [],
        tags: {},
        onboarding: null,
    };
}

function getUserProfile(userId) {
    const store = readStore();
    const id = userId || 'anonymous';
    const profile = store.users[id] || defaultProfile();
    return { id, profile };
}

const AXIS_KEYWORDS = {
    minimalist: ['minimal', 'clean', 'simple', 'mono', 'scandi', 'zen'],
    futuristic: ['sci', 'tech', 'cyber', 'space', 'neon', 'future', 'robot'],
    emotional: ['drama', 'romance', 'heart', 'feel', 'melanchol', 'cathartic'],
    luxury: ['luxury', 'premium', 'gold', 'designer', 'elegant', 'velvet'],
    cozy: ['cozy', 'warm', 'soft', 'comfort', 'hygge', 'blanket', 'rain'],
};

const ONBOARDING_BOOSTS = {
    palette: {
        moonlit: { minimalist: 12, emotional: 10 },
        dawn: { cozy: 10, minimalist: 8 },
        neon: { futuristic: 14, luxury: 6 },
        parchment: { emotional: 8, luxury: 10 },
        forest: { cozy: 12, minimalist: 6 },
    },
    room: {
        library: { emotional: 10, luxury: 8 },
        loft: { minimalist: 12, futuristic: 8 },
        cafe: { cozy: 14, emotional: 6 },
        studio: { minimalist: 10, futuristic: 10 },
        greenhouse: { cozy: 12, emotional: 8 },
    },
    fashion: {
        minimal: { minimalist: 14, luxury: 6 },
        street: { futuristic: 10, emotional: 6 },
        vintage: { emotional: 12, luxury: 8 },
        avantgarde: { futuristic: 14, minimalist: 8 },
        quietluxury: { luxury: 16, minimalist: 10 },
    },
    movie: {
        scifi: { futuristic: 16, emotional: 8 },
        romance: { emotional: 14, cozy: 8 },
        thriller: { emotional: 10, futuristic: 6 },
        documentary: { minimalist: 10, emotional: 6 },
        anime: { futuristic: 10, emotional: 12 },
    },
};

function computeTasteDNA(profile) {
    const positiveTags = Object.entries(profile.tags || {})
        .filter(([, v]) => v > 0)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 16)
        .map(([k]) => String(k).toLowerCase());

    const axes = {
        minimalist: 38,
        futuristic: 38,
        emotional: 38,
        luxury: 38,
        cozy: 38,
    };

    for (const tag of positiveTags) {
        for (const [axis, keys] of Object.entries(AXIS_KEYWORDS)) {
            if (keys.some((k) => tag.includes(k))) {
                axes[axis] = Math.min(98, axes[axis] + 7);
            }
        }
    }

    const ob = profile.onboarding || {};
    for (const [dim, val] of Object.entries(ob)) {
        const table = ONBOARDING_BOOSTS[dim];
        if (!table || !val || !table[val]) continue;
        for (const [axis, bump] of Object.entries(table[val])) {
            if (axes[axis] !== undefined) axes[axis] = Math.min(98, axes[axis] + bump);
        }
    }

    const summary = positiveTags.length
        ? `Your taste signal is strongest around ${positiveTags.slice(0, 3).join(', ')} — we weight those patterns in every row.`
        : 'Like a few picks or finish the taste quiz — your DNA chart will light up.';

    return { axes, summary, tagSignals: positiveTags.slice(0, 8) };
}

function setOnboarding(userId, answers) {
    const store = readStore();
    const id = userId || 'anonymous';
    const current = store.users[id] || defaultProfile();
    current.onboarding = { ...(answers || {}), at: new Date().toISOString() };
    store.users[id] = current;
    writeStore(store);
    return current;
}

function tasteHintsFromProfile(profile) {
    const hints = {};
    const ob = profile.onboarding || {};
    for (const [dim, val] of Object.entries(ob)) {
        if (dim === 'at') continue;
        const table = ONBOARDING_BOOSTS[dim];
        if (!table || !val || !table[val]) continue;
        for (const [axis, bump] of Object.entries(table[val])) {
            hints[axis] = Math.min(98, (hints[axis] || 52) + bump);
        }
    }
    return hints;
}

function addSearch(userId, query, domain, meta = {}) {
    const store = readStore();
    const id = userId || 'anonymous';
    const current = store.users[id] || defaultProfile();
    current.searches.unshift({
        query,
        domain,
        mood: meta.mood || null,
        at: new Date().toISOString(),
    });
    current.searches = current.searches.slice(0, 50);
    store.users[id] = current;
    writeStore(store);
}

function addFeedback(userId, feedback) {
    const store = readStore();
    const id = userId || 'anonymous';
    const current = store.users[id] || defaultProfile();
    const bucket = feedback.action === 'dislike' ? 'dislikes' : 'likes';
    current[bucket].unshift({
        ...feedback,
        at: new Date().toISOString(),
    });
    current[bucket] = current[bucket].slice(0, 100);
    const tags = Array.isArray(feedback.tags) ? feedback.tags : [];
    for (const tag of tags) {
        const weight = feedback.action === 'dislike' ? -1 : 1;
        current.tags[tag] = (current.tags[tag] || 0) + weight;
    }
    store.users[id] = current;
    writeStore(store);
}

module.exports = {
    getUserProfile,
    addSearch,
    addFeedback,
    computeTasteDNA,
    setOnboarding,
    tasteHintsFromProfile,
    getAnalytics: () => {
        const store = readStore();
        const users = Object.entries(store.users || {});
        const likeCount = users.reduce((acc, [, profile]) => acc + (profile.likes || []).length, 0);
        const dislikeCount = users.reduce((acc, [, profile]) => acc + (profile.dislikes || []).length, 0);
        const searchCount = users.reduce((acc, [, profile]) => acc + (profile.searches || []).length, 0);
        const likedTitles = {};
        const dislikedTitles = {};
        for (const [, profile] of users) {
            for (const like of profile.likes || []) {
                const key = like.title || like.itemId || 'Unknown';
                likedTitles[key] = (likedTitles[key] || 0) + 1;
            }
            for (const dislike of profile.dislikes || []) {
                const key = dislike.title || dislike.itemId || 'Unknown';
                dislikedTitles[key] = (dislikedTitles[key] || 0) + 1;
            }
        }
        const topLiked = Object.entries(likedTitles)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 8)
            .map(([title, count]) => ({ title, count }));
        const topDisliked = Object.entries(dislikedTitles)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 8)
            .map(([title, count]) => ({ title, count }));
        return {
            users: users.length,
            likeCount,
            dislikeCount,
            searchCount,
            engagementRate: searchCount ? Number(((likeCount + dislikeCount) / searchCount).toFixed(2)) : 0,
            topLiked,
            topDisliked,
        };
    },
};
