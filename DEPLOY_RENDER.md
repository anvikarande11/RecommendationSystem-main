# Deploy to Render

## 1) Push repository

- Commit and push this project to GitHub.

## 2) Create Render web service

- In Render, choose **New +** -> **Web Service**.
- Connect your GitHub repo.
- Render will automatically detect `render.yaml`.

## 3) Required environment variables

Set these in Render service environment:

- `GEMINI_API_KEY` (required for curator and visual-vibe)
- `TMDB_API_KEY` (optional but strongly recommended for accurate movie results)
- `GEMINI_MODEL` = `gemini-2.0-flash`
- `CORS_ORIGINS` = your Render URL(s), comma-separated

Example:

`https://aevora-recommendation.onrender.com`

If you host frontend separately, include both origins:

`https://aevora-recommendation.onrender.com,https://your-frontend-domain.com`

## 4) Health check

Render health path:

`/api/v1/health`

## 5) Post-deploy validation

Open:

- `/` (app page)
- `/admin.htm` (admin page)
- `/api/v1/health` (must return `{ ok: true }`)

Then test recommendation calls with realistic phrases:

- Movies: `psychological sci-fi thriller`
- Products: `minimal ergonomic desk setup`
- Books: `dark academia mystery novel`

## 6) Production reliability notes

- Strict precision ranking is enabled and domain-aware.
- Upstream API retries and timeouts are enabled.
- If Gemini quota is exceeded, curator endpoints degrade gracefully instead of crashing.
