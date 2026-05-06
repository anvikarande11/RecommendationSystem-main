# Aevora Scalable Architecture

## Full Scalable Architecture

- Monolith-ready today (`Express + static frontend`) with a clean upgrade path to split services.
- API-first contracts under `/api/v1/*` so frontend is replaceable (web/mobile apps).
- Stateless app tier + externalized data store for horizontal scaling.
- Retry-aware upstream connectors to keep recommendations available during provider instability.

## Folder Structure

- `public/` - frontend pages and UI runtime logic
- `routes/` - API controllers (`vault`, `curator`, `auth`)
- `utils/` - shared services (AI client, auth store, memory utilities)
- `data/` - JSON persistence for local/dev mode
- `server.js` - app bootstrap, middleware, routing, CORS
- `ARCHITECTURE.md` - platform design and production roadmap

## Frontend Pages

- `public/index.htm` - main recommendation experience, onboarding, curator panel.
- `public/admin.htm` - analytics dashboard for engagement and quality review.

## Backend APIs

- `POST /api/v1/suggest` - domain recommendations with scoring and explanations.
- `POST /api/v1/feedback` - like/dislike/save ingestion for personalization.
- `GET /api/v1/taste-dna` - user profile axis summary.
- `POST /api/v1/profile/onboarding` - preference capture.
- `POST /api/v1/curator/chat` - LLM recommendation assistant.
- `POST /api/v1/curator/visual-vibe` - image-to-vibe analysis.
- `POST /api/v1/auth/*` - signup/login/guest session bootstrap.
- `GET /api/v1/admin/summary` - aggregate metrics for ops and curation.

## Database Schema

Current local dev storage:
- `data/user-memory.json` - profile, interactions, and search history.
- `data/users.json` - basic auth users.

Production schema (recommended):
- `users(id, email, password_hash, name, created_at)`
- `profiles(user_id, axis_json, onboarding_json, updated_at)`
- `interactions(id, user_id, item_id, domain, action, tags_json, created_at)`
- `items(id, source, source_item_id, domain, title, description, image_url, metadata_json, updated_at)`
- `recommendation_logs(id, user_id, query, domain, model_version, ranked_items_json, latency_ms, created_at)`

## AI Recommendation Pipeline

1. Normalize domain + enrich query with mood context.
2. Fetch live items from external catalogs.
3. Build textual features from title/description/tags.
4. Score on hybrid signals:
   - semantic token overlap
   - exact query-token coverage
   - mood fit
   - taste profile alignment
   - popularity/trend/rating
5. Explain each result (`why_recommended`) and return ranked candidates.
6. Store feedback loop signals for future ranking bias.

## Like/Dislike Logic

- Likes and saves add positive tag weights.
- Dislikes subtract tag weights.
- Updated tag weights directly influence future `similar_user_score` and profile DNA.

## Admin Dashboard

- KPI cards: users, searches, likes, dislikes, engagement.
- Ranked lists: most liked/disliked items.
- Data source: `GET /api/v1/admin/summary`.

## Authentication Flow

- Signup/login via local auth store in Phase 1.
- Guest mode for immediate product trial.
- Production upgrade path: JWT/session auth + OAuth providers.

## UI Component System

- Reusable card-driven rails.
- Mood chips + domain selector + autocomplete.
- Curator chat widget + visual search uploader.
- Consistent spacing, shadows, and neutral design tokens.

## Animation System

- Intro splash fade transition.
- Hover lift and parallax-like card affordances.
- Loading skeletons + subtle toast animations.
- Micro-feedback on like/dislike interactions.

## Recommendation Engine

- Source adapters per domain (movies/products/music/books/food/lifestyle).
- Weighted ranking with fallback mode when sources fail.
- Multi-image payload support (`image_gallery`) for richer visual confidence.

## Deployment Guide

1. `npm install`
2. Set env vars (`GEMINI_API_KEY`, `GEMINI_MODEL`, `PORT`, `CORS_ORIGINS`, optional `TMDB_API_KEY`)
3. `npm start` for production.
4. Put backend behind HTTPS and set strict allowed CORS origins.
5. Move local JSON persistence to PostgreSQL + Redis before high-traffic rollout.

## Production-Ready Code

- Secrets are server-side only.
- CORS is configurable for production origins.
- Upstream and AI calls include retry handling and graceful degradation.
- Input validation and JSON parse error handling are implemented.

## Responsive Design System

- Mobile-first breakpoints with stacked hero controls.
- Scrollable content rails for compact devices.
- Adaptive cards and overlays for low-width viewports.
