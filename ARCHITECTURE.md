# VibeVault Production Architecture (Phase 1 -> Phase 3)

## 1) Platform Architecture

- Frontend: `public/index.htm` (Phase 1), migrate to Next.js + Tailwind + Framer Motion in Phase 2.
- API Layer: Node.js + Express (`server.js`, `routes/vault.js`).
- Recommender Core:
  - Content-based matching (token similarity over metadata/tags).
  - Weighted scoring (similarity + rating + popularity + trend + personalization).
  - Feedback loop (`/api/v1/feedback`) into memory profile.
- Memory Store (Phase 1): local JSON (`data/user-memory.json`).
- Data integrations (real APIs only): Movies, products/fashion, books, music, food, lifestyle image sources.

## 2) Required External APIs

### Implemented in current code
- Movies/TV: TVMaze (TMDB supported when `TMDB_API_KEY` is set)
- Products/Fashion: DummyJSON + FakeStore
- Music: iTunes Search API
- Books: Google Books API
- Food: TheMealDB
- Lifestyle visuals: Unsplash Source

### Planned enterprise upgrades
- TMDB full integration + OMDb + IMDb datasets
- Spotify + Last.fm
- Amazon PA API / Shopify catalog ingestion
- Unsplash API key mode / Pexels API

## 3) Backend Recommendation Pipeline

1. Receive query + domain + user id.
2. Normalize domain and fetch real items from upstream APIs.
3. Build item feature tokens from title/description/tags.
4. Compute scores:
   - `match_percent`
   - `confidence`
   - `similarity_score`
   - `popularity_score`
   - `trend_score`
   - `personalized_score`
5. Generate a concrete `why_recommended` explanation.
6. Return ranked top-N results with real images and metadata.
7. Persist likes/dislikes/saves to user memory for future ranking bias.

## 4) Database Schema (Phase 2 target)

- `users(id, email, created_at)`
- `profiles(user_id, embedding, updated_at)`
- `interactions(id, user_id, item_id, domain, action, tags, created_at)`
- `items(id, domain, source, title, description, image_url, metadata_json, updated_at)`
- `recommendation_logs(id, user_id, query, domain, result_ids, created_at)`

Add vector store:
- `item_embeddings(item_id, embedding)`
- `user_embeddings(user_id, embedding)`

Recommended infra:
- PostgreSQL for transactional data
- Redis for caching hot queries/results
- FAISS/Chroma/Pinecone for semantic retrieval

## 5) ML / Ranking Workflow

- Baseline: weighted content + behavior profile.
- Next:
  - Sentence-transformers embeddings for query/item semantic similarity.
  - Implicit collaborative filtering (ALS/LightFM) from interaction matrix.
  - Hybrid re-ranker combining content + collaborative + popularity priors.
- Online loop:
  - Feedback ingestion -> profile update.
  - CTR/watch-time based adaptive weight tuning.

## 6) Frontend UX Components (target state)

- Hero recommendation shell
- Domain switcher and natural language search
- Recommendation rails/carousels
- Rich media cards:
  - image/poster
  - tags/source
  - score stack
  - explanation
  - feedback controls
- Skeleton loading, lazy image loading, smooth hover transitions

## 7) Deployment Blueprint

- Containerize app with Docker
- Add `.env` secrets from platform vault
- Configure API rate limiting and retries
- Add observability (request latency, upstream failures, CTR)
- Deploy:
  - frontend on Vercel/Netlify
  - API on Render/Fly/Railway/Kubernetes
  - PostgreSQL + Redis managed services

## 8) Implementation Roadmap

### Phase 1 (completed in this update)
- Replace hallucinated recommendations with real-data fetchers
- Add ranking and confidence scores
- Add visual cards and feedback loop
- Add domain expansion to movies/products/dressing/music/books/food/lifestyle

### Phase 2
- Move frontend to Next.js + Tailwind + Framer Motion
- Add PostgreSQL + Redis + auth (JWT/Clerk/Auth.js)
- Add vector search with sentence-transformers + Chroma/FAISS
- Add admin analytics dashboard

### Phase 3
- Collaborative filtering training jobs
- Image-based recommendation (CLIP/FashionCLIP)
- Real-time trend engine + stream updates
- SaaS-grade multi-tenant architecture
