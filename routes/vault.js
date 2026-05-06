const express = require('express');
const router = express.Router();
const {
    getUserProfile,
    addSearch,
    addFeedback,
    getAnalytics,
    computeTasteDNA,
    setOnboarding,
    tasteHintsFromProfile,
} = require('../utils/userMemory');

const TASTE_AXIS_WORDS = {
    minimalist: ['minimal', 'clean', 'simple', 'mono', 'scandi', 'zen'],
    futuristic: ['sci', 'tech', 'cyber', 'space', 'neon', 'future'],
    emotional: ['drama', 'romance', 'heart', 'feel', 'melanchol', 'soul'],
    luxury: ['luxury', 'premium', 'gold', 'designer', 'elegant', 'velvet'],
    cozy: ['cozy', 'warm', 'soft', 'comfort', 'hygge', 'blanket'],
};

const MOOD_LEXICON = {
    calm: { label: 'Calm', keywords: 'relaxing ambient soft slow peaceful meditation lofi gentle' },
    focused: { label: 'Focused', keywords: 'instrumental productivity deep work minimal concentration study' },
    emotional: { label: 'Emotional', keywords: 'dramatic heartfelt moving cathartic bittersweet intimate soulful' },
    energetic: { label: 'Energetic', keywords: 'high energy upbeat fast intense uplifting party pulse driving' },
    lonely: { label: 'Lonely', keywords: 'intimate melancholic reflective solitary late night quiet raw' },
    romantic: { label: 'Romantic', keywords: 'love dreamy intimate sweep candlelight soft glow tender' },
    productive: { label: 'Productive', keywords: 'efficient tools workflow desk setup tech organized crisp' },
    cozy: { label: 'Cozy', keywords: 'warm rainy blanket hygge soft lighting comfort hearth slow' },
    dark_academia: { label: 'Dark Academia', keywords: 'gothic library vintage scholarly moody autumn tweed candle' },
    cyberpunk: { label: 'Cyberpunk', keywords: 'neon futuristic dystopian synth urban tech noir hologram rain' },
};

const DOMAIN_SOURCES = {
    movies: ['TMDB API (optional key)', 'TVMaze API'],
    products: ['DummyJSON API', 'FakeStore API'],
    dressing: ['DummyJSON API (fashion category)'],
    music: ['iTunes Search API'],
    books: ['Google Books API'],
    food: ['TheMealDB API'],
    lifestyle: ['Unsplash Source'],
};

function normalizeType(type) {
    const value = String(type || '').toLowerCase();
    if (value.includes('movie') || value.includes('tv')) return 'movies';
    if (value.includes('dress') || value.includes('fashion')) return 'dressing';
    if (value.includes('product') || value.includes('gadget')) return 'products';
    if (value.includes('music') || value.includes('song')) return 'music';
    if (value.includes('book')) return 'books';
    if (value.includes('food')) return 'food';
    if (value.includes('life') || value.includes('aesthetic')) return 'lifestyle';
    return 'movies';
}

function tokenize(text) {
    return String(text || '')
        .toLowerCase()
        .split(/[^a-z0-9]+/g)
        .filter((t) => t.length > 2);
}

function uniqueImages(values) {
    const out = [];
    const seen = new Set();
    for (const value of values || []) {
        const img = String(value || '').trim();
        if (!img || seen.has(img)) continue;
        seen.add(img);
        out.push(img);
    }
    return out.slice(0, 5);
}

function jaccard(a, b) {
    const setA = new Set(a);
    const setB = new Set(b);
    if (!setA.size || !setB.size) return 0;
    let overlap = 0;
    for (const token of setA) {
        if (setB.has(token)) overlap += 1;
    }
    return overlap / (setA.size + setB.size - overlap);
}

function countTokenHits(text, tokens) {
    const normalized = String(text || '').toLowerCase();
    return (tokens || []).reduce((acc, token) => (normalized.includes(token) ? acc + 1 : acc), 0);
}

function precisionFilter(rankedItems, vibes, domain) {
    const vibeTokens = tokenize(vibes);
    if (!vibeTokens.length) return rankedItems.slice(0, 8);
    const presets = {
        movies: { strictCoverage: 0.3, relaxedCoverage: 0.2, strictScore: 44, relaxedScore: 38, minExact: 3, minKeep: 6 },
        products: { strictCoverage: 0.52, relaxedCoverage: 0.38, strictScore: 58, relaxedScore: 52, minExact: 7, minKeep: 6 },
        dressing: { strictCoverage: 0.5, relaxedCoverage: 0.36, strictScore: 56, relaxedScore: 50, minExact: 7, minKeep: 6 },
        music: { strictCoverage: 0.42, relaxedCoverage: 0.3, strictScore: 52, relaxedScore: 46, minExact: 5, minKeep: 6 },
        books: { strictCoverage: 0.5, relaxedCoverage: 0.34, strictScore: 55, relaxedScore: 49, minExact: 6, minKeep: 6 },
        food: { strictCoverage: 0.4, relaxedCoverage: 0.28, strictScore: 50, relaxedScore: 44, minExact: 5, minKeep: 6 },
        lifestyle: { strictCoverage: 0.35, relaxedCoverage: 0.24, strictScore: 46, relaxedScore: 40, minExact: 4, minKeep: 6 },
    };
    const cfg = presets[domain] || presets.movies;

    const strict = rankedItems.filter((item) => {
        const itemText = `${item.title} ${item.description} ${(item.tags || []).join(' ')}`;
        const tokenHits = countTokenHits(itemText, vibeTokens);
        const coverage = tokenHits / vibeTokens.length;
        const strongScore = Number(item.match_percent || 0) >= cfg.strictScore;
        const similarityStrong = Number(item.similarity_score || 0) >= 16;
        return coverage >= cfg.strictCoverage && strongScore && similarityStrong;
    });

    if (strict.length >= 4) return strict.slice(0, 10);

    const relaxed = rankedItems.filter((item) => {
        const itemText = `${item.title} ${item.description} ${(item.tags || []).join(' ')}`;
        const tokenHits = countTokenHits(itemText, vibeTokens);
        const coverage = tokenHits / vibeTokens.length;
        const exact = Number(item.exact_match_score || 0) >= cfg.minExact;
        const score = Number(item.match_percent || 0) >= cfg.relaxedScore;
        return coverage >= cfg.relaxedCoverage && exact && score;
    });

    const merged = [...strict];
    for (const candidate of relaxed) {
        if (!merged.find((x) => x.id === candidate.id)) merged.push(candidate);
    }
    for (const candidate of rankedItems) {
        if (!merged.find((x) => x.id === candidate.id)) merged.push(candidate);
        if (merged.length >= cfg.minKeep) break;
    }
    return merged.slice(0, cfg.minKeep);
}

function scoreItem(item, vibes, profile, options = {}) {
    const moodKey = options.mood && MOOD_LEXICON[options.mood] ? options.mood : null;
    const moodMeta = moodKey ? MOOD_LEXICON[moodKey] : { label: 'Explore', keywords: '' };
    const moodTokens = tokenize(moodMeta.keywords);
    const tasteHints = options.tasteHints && typeof options.tasteHints === 'object' ? options.tasteHints : {};

    const vibeTokens = tokenize(vibes);
    const itemText = `${item.title} ${item.description} ${(item.tags || []).join(' ')}`.toLowerCase();
    const itemTokens = tokenize(itemText);
    const similarity = Math.round(jaccard(vibeTokens, itemTokens) * 100);
    const exactTokenHits = vibeTokens.reduce((acc, token) => (itemText.includes(token) ? acc + 1 : acc), 0);
    const exactBoost = vibeTokens.length ? Math.min(20, Math.round((exactTokenHits / vibeTokens.length) * 22)) : 0;
    const emotionalMatch = moodTokens.length
        ? Math.round(jaccard(moodTokens, itemTokens) * 100)
        : Math.round(similarity * 0.85);

    let similarUserScore = 48;
    for (const tag of item.tags || []) {
        const w = profile.tags[tag] || 0;
        if (w > 0) similarUserScore += Math.min(14, w * 3);
    }
    similarUserScore = Math.max(22, Math.min(97, Math.round(similarUserScore)));

    let tasteAlignment = 50;
    const hintEntries = Object.entries(tasteHints).filter(([, v]) => Number(v) > 0);
    if (hintEntries.length) {
        for (const [axis, raw] of hintEntries) {
            const weight = Math.min(100, Number(raw)) / 100;
            const words = TASTE_AXIS_WORDS[axis] || [];
            if (words.some((w) => itemText.includes(w))) tasteAlignment += 16 * weight;
        }
        tasteAlignment = Math.min(95, Math.round(tasteAlignment));
    }

    const rating = Number(item.rating || 0);
    const popularity = Math.min(100, Math.round(Number(item.popularity || 50)));
    const trend = Math.min(100, Math.round(Number(item.trend || popularity * 0.85)));
    let personalization = 55;
    for (const tag of item.tags || []) {
        personalization += (profile.tags[tag] || 0) * 4;
    }
    personalization = Math.max(10, Math.min(98, personalization));

    const weighted = Math.round(
        similarity * 0.24 +
            exactBoost * 0.12 +
            emotionalMatch * 0.14 +
            similarUserScore * 0.12 +
            tasteAlignment * 0.06 +
            rating * 10 * 0.18 +
            popularity * 0.12 +
            trend * 0.06 +
            personalization * 0.14
    );
    const confidence = Math.max(45, Math.min(99, Math.round(weighted * 0.78 + similarity * 0.12 + emotionalMatch * 0.1)));
    return {
        match_percent: Math.max(20, Math.min(99, weighted)),
        confidence,
        exact_match_score: exactBoost,
        similarity_score: similarity,
        popularity_score: popularity,
        trend_score: trend,
        personalized_score: personalization,
        emotional_match: emotionalMatch,
        similar_user_score: similarUserScore,
        taste_alignment: tasteAlignment,
        mood_applied: moodMeta.label,
    };
}

function explainRich(item, score, vibes, profile) {
    const topTags = (item.tags || []).slice(0, 2).join(', ') || 'similar aesthetics';
    const likedTitles = (profile.likes || []).slice(0, 3).map((l) => l.title).filter(Boolean);
    const becauseLiked =
        likedTitles.length > 0 && score.similar_user_score >= 58
            ? ` Echoes themes you saved (${likedTitles.slice(0, 2).join(', ')}).`
            : '';
    const moodLine =
        score.emotional_match >= 55 && score.mood_applied && score.mood_applied !== 'Explore'
            ? ` Emotional fit for a ${score.mood_applied} session (${score.emotional_match}% mood match).`
            : '';
    const primary = `Curated for “${vibes.slice(0, 120)}${vibes.length > 120 ? '…' : ''}” — ${topTags} lines up with your search.${moodLine}${becauseLiked}`;

    const badges = [];
    if (score.similarity_score >= 28) badges.push({ label: 'Vibe match', value: `${score.similarity_score}%` });
    if (score.emotional_match >= 55 && score.mood_applied && score.mood_applied !== 'Explore') {
        badges.push({ label: 'Mood fit', value: score.mood_applied });
    }
    if (score.similar_user_score >= 62) badges.push({ label: 'Your taste', value: `${score.similar_user_score}%` });
    if (score.taste_alignment >= 68) badges.push({ label: 'Quiz DNA', value: `${score.taste_alignment}%` });
    if (score.trend_score >= 75) badges.push({ label: 'Trending', value: `${score.trend_score}%` });

    return { why_recommended: primary, ai_insights: badges };
}

function buildMockRecommendations(domain, vibes, profile = { tags: {}, likes: [] }, scoreOpts = {}) {
    const snippet = String(vibes || 'your search').slice(0, 48);
    return Array.from({ length: 8 }).map((_, i) => {
        const item = {
            id: `fallback-${domain}-${i}`,
            title: `Sample ${domain} pick ${i + 1} · “${snippet}${String(vibes || '').length > 48 ? '…' : ''}”`,
            description:
                'Graceful fallback while live recommendation sources are unreachable. Start the API server and check your network.',
            image: 'https://placehold.co/900x600/f4f8ff/1e2b4d?text=Aevora',
            image_gallery: uniqueImages([
                'https://placehold.co/900x600/f4f8ff/1e2b4d?text=Aevora',
                'https://placehold.co/900x600/efe7da/3b342c?text=Fallback+Result',
            ]),
            tags: [domain, 'offline-fallback'],
            rating: 7.2,
            popularity: 52,
            trend: 55,
            genre: domain,
            source: 'Aevora offline',
        };
        const score = scoreItem(item, vibes, profile, scoreOpts);
        const { why_recommended, ai_insights } = explainRich(item, score, vibes, profile);
        return {
            ...item,
            ...score,
            why_recommended,
            ai_insights,
        };
    });
}

async function fetchJson(url, options = {}) {
    const retries = Number.isInteger(options.retries) ? options.retries : 2;
    const timeoutMs = Number.isFinite(options.timeoutMs) ? options.timeoutMs : 8500;
    let lastError = null;

    for (let attempt = 0; attempt <= retries; attempt += 1) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);
        try {
            if (typeof fetch !== 'function') {
                throw new Error('Global fetch is unavailable in this Node runtime.');
            }
            const response = await fetch(url, {
                ...options,
                signal: controller.signal,
            });
            if (!response.ok) {
                const retryableStatus = [408, 425, 429, 500, 502, 503, 504];
                const err = new Error(`Upstream error ${response.status} for ${url}`);
                if (!retryableStatus.includes(response.status)) throw err;
                throw err;
            }
            return await response.json();
        } catch (error) {
            lastError = error;
            const msg = String(error?.message || '');
            const retryable =
                /Upstream error (408|425|429|500|502|503|504)|timed out|aborted|network|fetch failed|ECONNRESET|EAI_AGAIN/i.test(msg);
            if (attempt >= retries || !retryable) break;
            await new Promise((resolve) => setTimeout(resolve, 300 * (attempt + 1)));
        } finally {
            clearTimeout(timer);
        }
    }

    throw lastError || new Error(`Upstream request failed for ${url}`);
}

async function fetchMovies(vibes) {
    const tmdbKey = process.env.TMDB_API_KEY;
    if (tmdbKey) {
        const tmdb = await fetchJson(
            `https://api.themoviedb.org/3/search/movie?api_key=${tmdbKey}&query=${encodeURIComponent(vibes)}&include_adult=false`
        );
        return (tmdb.results || []).slice(0, 20).map((m) => ({
            id: `tmdb-${m.id}`,
            title: m.title,
            description: m.overview || 'No summary available.',
            image: m.poster_path ? `https://image.tmdb.org/t/p/w500${m.poster_path}` : '',
            image_gallery: uniqueImages([
                m.poster_path ? `https://image.tmdb.org/t/p/w500${m.poster_path}` : '',
                m.poster_path ? `https://image.tmdb.org/t/p/w780${m.poster_path}` : '',
            ]),
            tags: [m.original_language, m.release_date?.slice(0, 4)].filter(Boolean),
            rating: Number(m.vote_average || 0),
            popularity: Number(m.popularity || 0),
            trend: Number(m.vote_count || 0) / 5,
            genre: 'Movie',
            source: 'TMDB',
        }));
    }

    let tvMaze = [];
    try {
        tvMaze = await fetchJson(`https://api.tvmaze.com/search/shows?q=${encodeURIComponent(vibes)}`);
    } catch (error) {
        tvMaze = [];
    }
    if (!Array.isArray(tvMaze) || tvMaze.length === 0) {
        const tokens = tokenize(vibes).slice(0, 3);
        if (tokens.length) {
            const refined = tokens.join(' ');
            try {
                tvMaze = await fetchJson(`https://api.tvmaze.com/search/shows?q=${encodeURIComponent(refined)}`);
            } catch (error) {
                tvMaze = [];
            }
        }
    }
    if (!Array.isArray(tvMaze) || tvMaze.length === 0) {
        const tokens = tokenize(vibes).slice(0, 4);
        const bucket = [];
        for (const token of tokens) {
            try {
                const partial = await fetchJson(`https://api.tvmaze.com/search/shows?q=${encodeURIComponent(token)}`);
                if (Array.isArray(partial)) bucket.push(...partial);
            } catch (error) {
                // Keep trying next token.
            }
        }
        tvMaze = bucket;
    }
    if (!Array.isArray(tvMaze) || tvMaze.length === 0) return [];
    return tvMaze.slice(0, 20).map((entry) => {
        const show = entry.show || {};
        return {
            id: `tvmaze-${show.id}`,
            title: show.name,
            description: String(show.summary || 'No summary available.').replace(/<[^>]*>/g, ''),
            image: show.image?.original || show.image?.medium || '',
            image_gallery: uniqueImages([show.image?.original, show.image?.medium]),
            tags: show.genres || [],
            rating: Number(show.rating?.average || 0),
            popularity: Number(show.weight || 50),
            trend: Number(show.updated ? (Date.now() / 1000 - show.updated) / 86400 : 50),
            genre: (show.genres || []).join(', ') || 'TV Show',
            source: 'TVMaze',
        };
    });
}

async function fetchProducts(vibes, mode) {
    const q = encodeURIComponent(vibes);
    const settled = await Promise.allSettled([
        fetchJson(`https://dummyjson.com/products/search?q=${q}`),
        fetchJson('https://fakestoreapi.com/products'),
    ]);
    const dummy = settled[0].status === 'fulfilled' ? settled[0].value : { products: [] };
    const fake = settled[1].status === 'fulfilled' ? settled[1].value : [];
    if (settled[0].status === 'rejected') console.warn('DummyJSON unavailable:', settled[0].reason?.message);
    if (settled[1].status === 'rejected') console.warn('FakeStore unavailable:', settled[1].reason?.message);
    const dummyItems = (dummy.products || []).map((p) => ({
        id: `dummy-${p.id}`,
        title: p.title,
        description: p.description,
        image: p.thumbnail || (p.images || [])[0] || '',
        image_gallery: uniqueImages([p.thumbnail, ...(p.images || [])]),
        tags: [p.category, p.brand].filter(Boolean),
        rating: Number(p.rating || 0),
        popularity: Number(p.stock || 50),
        trend: Number(p.discountPercentage || 0) * 5,
        genre: p.category,
        source: 'DummyJSON',
    }));
    const fakeItems = (fake || []).map((p) => ({
        id: `fakestore-${p.id}`,
        title: p.title,
        description: p.description,
        image: p.image,
        image_gallery: uniqueImages([p.image]),
        tags: [p.category],
        rating: Number(p.rating?.rate || 0),
        popularity: Number(p.rating?.count || 0),
        trend: Number(p.rating?.count || 0) / 3,
        genre: p.category,
        source: 'FakeStore',
    }));
    const all = dummyItems.concat(fakeItems);
    if (mode === 'dressing') {
        return all.filter((item) => /shirt|shoe|fashion|dress|jacket|clothing|tops|womens|mens/i.test(item.genre || item.title));
    }
    return all;
}

async function fetchMusic(vibes) {
    const data = await fetchJson(`https://itunes.apple.com/search?term=${encodeURIComponent(vibes)}&entity=song&limit=30`);
    return (data.results || []).map((s) => ({
        id: `itunes-${s.trackId || s.collectionId}`,
        title: `${s.trackName} - ${s.artistName}`,
        description: `Album: ${s.collectionName || 'Unknown'}${s.primaryGenreName ? ` | Genre: ${s.primaryGenreName}` : ''}`,
        image: s.artworkUrl100?.replace('100x100', '600x600') || s.artworkUrl100 || '',
        image_gallery: uniqueImages([
            s.artworkUrl100?.replace('100x100', '600x600'),
            s.artworkUrl100?.replace('100x100', '300x300'),
            s.artworkUrl100,
        ]),
        tags: [s.primaryGenreName, s.artistName].filter(Boolean),
        rating: 7.4,
        popularity: Number(s.trackPrice ? 70 : 58),
        trend: 66,
        genre: s.primaryGenreName || 'Music',
        source: 'iTunes',
    }));
}

async function fetchBooks(vibes) {
    const data = await fetchJson(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(vibes)}&maxResults=20`);
    return (data.items || []).map((b) => {
        const info = b.volumeInfo || {};
        return {
            id: `gbook-${b.id}`,
            title: info.title,
            description: info.description || 'No summary available.',
            image: info.imageLinks?.thumbnail || info.imageLinks?.smallThumbnail || '',
            image_gallery: uniqueImages([info.imageLinks?.thumbnail, info.imageLinks?.smallThumbnail]),
            tags: info.categories || [],
            rating: Number(info.averageRating || 0),
            popularity: Number(info.ratingsCount || 35),
            trend: Number(info.publishedDate?.slice(0, 4) || 2018) - 1900,
            genre: (info.categories || []).join(', ') || 'Book',
            source: 'Google Books',
        };
    });
}

async function fetchFood(vibes) {
    let meals = [];
    try {
        const data = await fetchJson(`https://www.themealdb.com/api/json/v1/1/search.php?s=${encodeURIComponent(vibes)}`);
        meals = data.meals || [];
    } catch (error) {
        meals = [];
    }
    if (!meals.length) {
        const token = tokenize(vibes)[0];
        if (token) {
            try {
                const fallback = await fetchJson(`https://www.themealdb.com/api/json/v1/1/search.php?s=${encodeURIComponent(token)}`);
                meals = fallback.meals || [];
            } catch (error) {
                meals = [];
            }
        }
    }
    if (!meals.length) return [];
    return meals.map((m) => ({
        id: `meal-${m.idMeal}`,
        title: m.strMeal,
        description: `${m.strArea || 'Global'} cuisine. ${m.strCategory || ''}`.trim(),
        image: m.strMealThumb,
        image_gallery: uniqueImages([m.strMealThumb]),
        tags: [m.strCategory, m.strArea].filter(Boolean),
        rating: 7.9,
        popularity: 62,
        trend: 58,
        genre: m.strCategory || 'Food',
        source: 'TheMealDB',
    }));
}

async function fetchLifestyle(vibes) {
    const keywords = tokenize(vibes).slice(0, 4).join(',');
    return Array.from({ length: 20 }).map((_, idx) => ({
        id: `unsplash-${idx}`,
        title: `Lifestyle inspiration ${idx + 1}`,
        description: `Curated visual aesthetic for ${vibes}.`,
        image: `https://source.unsplash.com/featured/1200x900?${encodeURIComponent(keywords || vibes)}&sig=${idx + 3}`,
        image_gallery: uniqueImages([
            `https://source.unsplash.com/featured/1200x900?${encodeURIComponent(keywords || vibes)}&sig=${idx + 3}`,
            `https://source.unsplash.com/featured/1200x900?${encodeURIComponent(keywords || vibes)}&sig=${idx + 300}`,
            `https://source.unsplash.com/featured/1200x900?${encodeURIComponent(keywords || vibes)}&sig=${idx + 900}`,
        ]),
        tags: tokenize(vibes).slice(0, 4),
        rating: 7.2,
        popularity: 57,
        trend: 72,
        genre: 'Lifestyle',
        source: 'Unsplash Source',
    }));
}

async function getDomainItems(type, vibes) {
    switch (type) {
        case 'movies':
            return fetchMovies(vibes);
        case 'products':
            return fetchProducts(vibes, 'products');
        case 'dressing':
            return fetchProducts(vibes, 'dressing');
        case 'music':
            return fetchMusic(vibes);
        case 'books':
            return fetchBooks(vibes);
        case 'food':
            return fetchFood(vibes);
        case 'lifestyle':
            return fetchLifestyle(vibes);
        default:
            return fetchMovies(vibes);
    }
}

router.post('/suggest', async (req, res) => {
    const { type, vibes, userId, mood, tasteHints } = req.body || {};
    if (!type || !vibes) {
        return res.status(400).json({
            success: false,
            error: 'Both "type" and "vibes" are required.',
        });
    }
    const domain = normalizeType(type);
    const { profile } = getUserProfile(userId);
    const moodKey = mood && MOOD_LEXICON[mood] ? mood : null;
    addSearch(userId, vibes, domain, { mood: moodKey });

    const mergedHints = { ...tasteHintsFromProfile(profile), ...(tasteHints || {}) };
    const scoreOpts = { mood: moodKey, tasteHints: mergedHints };
    const dna = computeTasteDNA(profile);

    try {
        const items = await getDomainItems(domain, vibes);
        if (!items.length) {
            return res.json({
                success: true,
                degraded: true,
                domain,
                mood: moodKey,
                taste_dna: dna,
                vibe_check: `No precise live matches found for "${vibes}". Try a clearer phrase or a broader variant.`,
                recommendations: [],
            });
        }
        const ranked = items
            .map((item) => {
                const score = scoreItem(item, vibes, profile, scoreOpts);
                const ex = explainRich(item, score, vibes, profile);
                return {
                    ...item,
                    ...score,
                    ...ex,
                };
            })
            .sort((a, b) => b.match_percent - a.match_percent)
            .slice(0, 24);
        const precise = precisionFilter(ranked, vibes, domain);
        const moodTitle = moodKey ? MOOD_LEXICON[moodKey].label : 'Your';
        return res.json({
            success: true,
            domain,
            mood: moodKey,
            taste_dna: dna,
            vibe_check: `${moodTitle} precise matches for “${vibes}” — focused on exact intent with multiple options.`,
            recommendations: precise,
        });
    } catch (error) {
        console.error('Vault Error:', error);
        return res.json({
            success: true,
            degraded: true,
            domain,
            mood: moodKey,
            taste_dna: dna,
            vibe_check: `Live sources temporarily unavailable (${error.message || 'network or upstream error'}). Please retry in a moment.`,
            recommendations: [],
        });
    }
});

router.get('/taste-dna', (req, res) => {
    try {
        const userId = req.query.userId;
        const { profile } = getUserProfile(userId);
        const taste_dna = computeTasteDNA(profile);
        return res.json({ success: true, taste_dna });
    } catch (error) {
        return res.status(500).json({ success: false, error: 'Could not compute taste DNA.' });
    }
});

router.post('/profile/onboarding', (req, res) => {
    try {
        const { userId, answers } = req.body || {};
        if (!answers || typeof answers !== 'object') {
            return res.status(400).json({ success: false, error: 'answers object required.' });
        }
        setOnboarding(userId, answers);
        const { profile } = getUserProfile(userId);
        return res.json({ success: true, taste_dna: computeTasteDNA(profile) });
    } catch (error) {
        return res.status(500).json({ success: false, error: 'Could not save onboarding.' });
    }
});

router.post('/feedback', (req, res) => {
    try {
        const { userId, itemId, action, tags, domain, title } = req.body || {};
        if (!itemId || !action) {
            return res.status(400).json({
                success: false,
                error: 'itemId and action are required.',
            });
        }
        addFeedback(userId, {
            itemId,
            action,
            tags: Array.isArray(tags) ? tags : [],
            domain,
            title,
        });
        return res.json({ success: true });
    } catch (error) {
        return res.status(500).json({ success: false, error: 'Could not save feedback.' });
    }
});

router.get('/admin/summary', (req, res) => {
    try {
        const analytics = getAnalytics();
        return res.json({ success: true, analytics });
    } catch (error) {
        return res.status(500).json({ success: false, error: 'Could not load analytics.' });
    }
});

module.exports = router; // Essential for server.js to see this file