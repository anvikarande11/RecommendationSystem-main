# Aevora | AI-Powered Recommendation System

A full-stack recommendation engine that uses Google Gemini AI to suggest movies, products, music, books, food, and lifestyle content based on user preferences and mood. Works on desktop, mobile, and any network.

## ✨ Features

- 🎬 **Multi-Domain Recommendations**: Movies, Products, Fashion, Music, Books, Food, Lifestyle
- 🧠 **AI-Powered Curation**: Google Gemini integration for intelligent suggestions
- 🎨 **Taste DNA Profile**: Learn user preferences through interaction
- 📱 **Cross-Platform**: Works on desktop, mobile, any network (auto-detects API)
- 🔄 **Graceful Degradation**: Continues working even if APIs fail
- 🚀 **Production-Ready**: CORS hardening, error handling, deployment guides
- 📊 **Analytics Dashboard**: Track user engagement and trends

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Google Gemini API key ([Get one free](https://cloud.google.com/docs/genai/start))

### 1. Clone & Install
```bash
git clone https://github.com/anvikarande11/RecommendationSystem-main.git
cd RecommendationSystem-main
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env
# Edit .env and add your GEMINI_API_KEY
```

```dotenv
GEMINI_API_KEY=AIzaSyDxVGsCsbb1iK8nfd6aJzXVG6ewdNe6hOM
GEMINI_MODEL=gemini-2.0-flash
PORT=3000
NODE_ENV=development
CORS_ORIGINS=*
```

### 3. Run Locally
```bash
# Development mode (with hot reload)
npm run dev

# Production mode
npm start
```

Server starts on `http://localhost:3000`

### 4. Open in Browser
- **Web App**: http://localhost:3000
- **Admin Dashboard**: http://localhost:3000/admin.htm
- **Health Check**: http://localhost:3000/api/v1/health

---

## 📱 Access from Mobile / Different Network

The app auto-detects the API endpoint. No configuration needed!

### Same Machine
```
http://localhost:3000
```

### Different Machine on Network
```
http://192.168.x.x:3000  (find your IP with 'ipconfig' or 'ifconfig')
```

### Mobile Hotspot
```
http://192.168.x.x:3000  (connect to hotspot first)
```

### Production URL
```
https://yourdomain.com  (frontend and API on same domain)
```

---

## 🔌 API Endpoints

### Core Recommendation
**POST** `/api/v1/suggest`
```json
{
  "type": "movies",
  "vibes": "minimal sci-fi with emotional depth",
  "userId": "user123",
  "mood": "emotional"
}
```

Response:
```json
{
  "success": true,
  "domain": "movies",
  "recommendations": [
    {
      "id": "tvmaze-12345",
      "title": "Arrival",
      "match_percent": 87,
      "why_recommended": "Curated for...",
      "image": "...",
      "tags": ["sci-fi", "emotional"]
    }
  ]
}
```

### AI Chat with Curator
**POST** `/api/v1/curator/chat`
```json
{
  "userId": "user123",
  "message": "What should I watch tonight?",
  "contextTitles": ["Movie 1", "Movie 2"]
}
```

### Visual Search
**POST** `/api/v1/curator/visual-vibe`
```json
{
  "imageBase64": "data:image/jpeg;base64,...",
  "mimeType": "image/jpeg"
}
```

### Save Feedback
**POST** `/api/v1/feedback`
```json
{
  "userId": "user123",
  "itemId": "tvmaze-12345",
  "action": "like",
  "tags": ["sci-fi", "emotional"],
  "domain": "movies",
  "title": "Arrival"
}
```

### Analytics
**GET** `/api/v1/admin/summary`

---

## 🌍 Supported Domains

| Domain | Source API | Features |
|--------|-----------|----------|
| **Movies** | TVMaze, TMDB | Shows, films, ratings |
| **Products** | DummyJSON, FakeStore | Electronics, fashion, gadgets |
| **Dressing** | DummyJSON | Fashion, clothing, apparel |
| **Music** | iTunes | Songs, albums, artists |
| **Books** | Google Books | Titles, descriptions, ratings |
| **Food** | TheMealDB | Recipes, cuisines, meals |
| **Lifestyle** | Unsplash | Aesthetic visuals, inspiration |

---

## 🛠 Development

### Project Structure
```
├── server.js                 # Express server
├── routes/
│   ├── vault.js             # Recommendation engine
│   ├── curator.js           # AI chat & visual search
│   └── auth.js              # Auth endpoints
├── utils/
│   ├── aiClient.js          # Gemini AI client
│   ├── authStore.js         # User auth storage
│   └── userMemory.js        # User profile & feedback
├── public/
│   ├── index.htm            # Web app (HTML + CSS + JS)
│   └── admin.htm            # Analytics dashboard
├── data/
│   ├── users.json           # User accounts
│   └── user-memory.json     # User interactions & preferences
└── .env                      # Environment variables
```

### Key Files to Understand

- **`routes/vault.js`**: Core recommendation algorithm (scoring, ranking, API fetching)
- **`routes/curator.js`**: Gemini AI integration for chat and visual analysis
- **`utils/userMemory.js`**: User profile computation (taste DNA, personalization)
- **`public/index.htm`**: Single-page app with all UI components
- **`server.js`**: Express server with CORS, error handling, graceful shutdown

### Running Tests
```bash
# Health check
curl http://localhost:3000/api/v1/health

# Test recommendations
curl -X POST http://localhost:3000/api/v1/suggest \
  -H "Content-Type: application/json" \
  -d '{"type":"movies","vibes":"sci-fi","userId":"test"}'

# Test with no network (should return fallback picks)
# - Disconnect internet
# - Try suggestion → gets 8 fallback items
# - Reconnect → live results work
```

---

## 🚀 Deployment

### One-Click Deployment

**Vercel** (Easiest)
```bash
git push origin main
# Auto-deploys from GitHub
# Set env vars in Vercel dashboard
```
[See full guide](./DEPLOYMENT.md#2-vercel-deployment-recommended-for-nodejs)

**Render** (Recommended)
- Connect GitHub repo
- Set env vars
- Auto-deploys on push
[See full guide](./DEPLOYMENT.md#3-render-deployment)

**Railway**
```bash
railway up
railway variables set GEMINI_API_KEY=your_key
```

**Docker**
```bash
docker build -t aevora .
docker run -p 3000:3000 -e GEMINI_API_KEY=key aevora
```

### Environment Variables

| Variable | Example | Purpose |
|----------|---------|---------|
| `GEMINI_API_KEY` | AIzaSy... | Google Gemini API key |
| `PORT` | 3000 | Server port |
| `NODE_ENV` | production | deployment mode |
| `CORS_ORIGINS` | https://yourdomain.com | Allowed origins |
| `GEMINI_MODEL` | gemini-2.0-flash | AI model to use |

For production deployment, **see [DEPLOYMENT.md](./DEPLOYMENT.md)**.

---

## 🐛 Bug Fixes Applied

This version includes **critical production fixes**:

- ✅ **Complete Gemini prompt** - Fixed truncated visual-vibe prompt
- ✅ **Timeout protection** - 30s curator, 8s data fetches
- ✅ **CORS hardening** - Production-safe origin validation
- ✅ **API resilience** - Parallel API calls, graceful degradation
- ✅ **Cross-network support** - Auto-detects API base URL
- ✅ **Error fallbacks** - All endpoints return useful responses
- ✅ **Production deployment** - Guides for Vercel, Render, Railway, Docker

[See detailed fixes](./BUG_FIXES.md)

---

## 📊 Admin Dashboard

Access analytics at `http://localhost:3000/admin.htm`

Shows:
- Total users & searches
- Likes/dislikes ratio
- Engagement rate
- Most liked items
- Most disliked items
- Trending content

---

## 🤖 How It Works

### 1. User Search
```
User: "emotional sci-fi"
↓
```

### 2. Augment with Mood
```
Augmented: "emotional sci-fi dramatic heartfelt moving"
↓
```

### 3. Fetch from APIs
```
TVMaze API → 20 shows
TMDB API → 20 movies
```

### 4. Score & Rank
```
For each item:
  - Content similarity (query vs title/description): 28% weight
  - Emotional match (mood keywords): 14% weight
  - User taste history: 12% weight
  - Popularity & trends: 18%+12%+6%
  - Personalization (saved items): 14%
```

### 5. Explain Results
```
{
  "match_percent": 87,
  "why_recommended": "Curated for 'emotional sci-fi'...",
  "ai_insights": [
    { "label": "Vibe match", "value": "82%" },
    { "label": "Mood fit", "value": "Emotional" },
    { "label": "Trending", "value": "78%" }
  ]
}
```

### 6. Save User Feedback
```
User: "Like ❤️"
↓
Saved to data/user-memory.json
↓
Influences future recommendations
```

---

## 🎨 UI Components

### Hero Section
- Search bar with domain selector
- Mood mood (calm, emotional, energetic, etc.)
- Taste DNA radar chart

### Recommendation Cards
- Cover image with hover effect
- Title, description, tags
- Match score & confidence
- Why recommended explanation
- Like/dislike/save buttons

### Curator Panel
- AI chat interface
- Visual vibe analysis (image upload)
- Suggested queries

### Admin Dashboard
- KPI cards (users, searches, likes/dislikes)
- Top liked/disliked items
- Engagement metrics

---

## 🔒 Security & Privacy

- ✅ API keys never exposed to frontend
- ✅ CORS whitelist in production
- ✅ Input validation on all endpoints
- ✅ No user passwords stored (salted hashes)
- ✅ Local data storage (no external DB)
- ✅ .env excluded from git

---

## 📈 Performance

- **Initial load**: ~2s (static assets + JS)
- **Recommendation fetch**: 8-12s (parallel API calls)
- **Curator response**: 2-5s (Gemini AI)
- **Analytics load**: <1s (local JSON)

---

## 🚨 Troubleshooting

### "GEMINI_API_KEY not set"
```bash
# Check .env exists and has the key
cat .env | grep GEMINI_API_KEY

# If missing, add it:
echo "GEMINI_API_KEY=your_key_here" >> .env
```

### "Cannot reach API" on mobile
```bash
# Make sure API is listening on all interfaces
# server.js: app.listen(PORT, '0.0.0.0', ...)

# Get your machine's IP
ipconfig (Windows) or ifconfig (Mac/Linux)

# Access from mobile: http://192.168.x.x:3000
```

### "CORS error" in browser
```bash
# Development: CORS_ORIGINS=*
# Production: CORS_ORIGINS=https://yourdomain.com

# Update .env and restart
NODE_ENV=production CORS_ORIGINS=https://yourdomain.com npm start
```

### Recommendations return fallback picks
```bash
# Check if APIs are reachable:
curl https://api.tvmaze.com/shows?page=1  # Should return JSON

# Check server logs for errors
# In most cases, it means upstream APIs are slow/unavailable
# Fallback recommendations still work fine
```

---

## 📚 Documentation

- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - Deploy to Vercel, Render, Railway, Docker
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - System design & roadmap
- **[BUG_FIXES.md](./BUG_FIXES.md)** - Detailed fixes & improvements

---

## 🔄 Roadmap

### Phase 1 ✅ (Current)
- Real-data APIs (TVMaze, DummyJSON, iTunes, etc.)
- Scoring & ranking system
- User feedback loop
- Taste DNA profiling

### Phase 2 🚧
- PostgreSQL + Redis database
- JWT authentication
- Collaborative filtering
- Vector embeddings (semantic search)

### Phase 3 📅
- Image-based recommendations (CLIP)
- Real-time trends
- Multi-tenant SaaS
- Advanced analytics

---

## 🤝 Contributing

Found a bug? Have a suggestion?

1. Fork the repo
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is open source. Feel free to use, modify, and distribute.

---

## 🆘 Support

- 📧 Email: anvikarande11@gmail.com
- 🐛 Issues: [GitHub Issues](https://github.com/anvikarande11/RecommendationSystem-main/issues)
- 💬 Discussions: [GitHub Discussions](https://github.com/anvikarande11/RecommendationSystem-main/discussions)

---

## 🎯 Next Steps

1. **Get API Key**: [Google Gemini](https://cloud.google.com/docs/genai/start)
2. **Configure .env**: Copy API key to `.env`
3. **Run locally**: `npm run dev`
4. **Test APIs**: See [API Endpoints](#-api-endpoints)
5. **Deploy**: See [DEPLOYMENT.md](./DEPLOYMENT.md)

**Everything is production-ready! 🚀**
