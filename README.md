# Iniciativa Ser o Estar

Bilingual Spanish-academy website with student, tutor, and administrator portals, Daily live classes, PostgreSQL persistence, and Vercel Blob file storage.

## Local development

Requirements: Node.js 22+, Python 3.12, PostgreSQL, and FFmpeg for local video transcoding.

1. Copy `.env.example` to `.env` and replace every placeholder.
2. Install frontend dependencies with `npm install`.
3. Create a virtual environment and install `requirements.txt`.
4. Apply migrations with `alembic upgrade head`.
5. Run FastAPI with `uvicorn backend.main:app --reload --port 8000`.
6. Run the website with `npm run dev`.

## Vercel production deployment

The repository includes `vercel.json` and `api/index.py`. Vercel builds the Vite frontend into `dist` and runs FastAPI as a Python function.

Create a public Vercel Blob store attached to the project, then configure these variables for Production and Preview:

- `ENVIRONMENT=production`
- `DATABASE_URL` — pooled PostgreSQL/Neon connection string
- `JWT_SECRET` — a new random value of at least 48 characters
- `ADMIN_EMAIL` — private academy administrator email
- `ADMIN_PASSWORD` — unique password of at least 16 characters
- `DAILY_API_KEY` — newly rotated Daily API key
- `DAILY_DOMAIN=seroestar.daily.co`
- `BLOB_READ_WRITE_TOKEN` — added automatically when the Blob store is connected
- `RECORDING_WEBHOOK_SECRET` — a new random value
- `FRONTEND_ORIGINS` — final `https://` production domain; Vercel preview origins are added automatically
- `COOKIE_SECURE=true`

Optional AI/email variables are documented in `.env.example`.

Before deployment:

```bash
npm run lint
npm run build:vercel
python -m unittest discover -s backend/tests -v
alembic upgrade head
```

Deploy from the project root with `vercel`, verify the preview, and promote the tested deployment with `vercel --prod`.

## Operational notes

- Production tutor uploads are stored in Vercel Blob and limited to 4 MB per server upload because of Vercel Functions limits.
- Larger lesson videos should be uploaded directly to a video/object-storage provider. The bundled A1 example video is served as a static asset.
- Never commit `.env`, database exports, student documents, or tokens. These paths are excluded by `.gitignore` and `.vercelignore`.
- Run Alembic migrations before production deployments; production functions do not create database tables automatically.
# iniciativa_seroestar
