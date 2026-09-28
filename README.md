# Iniciativa Ser o Estar

Bilingual Spanish-academy website with student, tutor, and administrator portals, Daily live classes, PostgreSQL persistence, and Vercel Blob file storage.

## Local development

Requirements: Node.js 22+, Python 3.12, and FFmpeg for local video transcoding. PostgreSQL is
optional locally — leave `DATABASE_URL` empty and the backend persists to a local SQLite file.

1. Copy `.env.example` to `.env` and replace every placeholder.
2. Install frontend dependencies with `npm install`.
3. Create a virtual environment and install `requirements.txt`.
4. Apply migrations with `alembic upgrade head` (uses the same database as the app).
5. Run FastAPI with `uvicorn backend.main:app --reload --port 8000`. On first start it
   creates the default developer, student, and tutor accounts (see below).
6. Run the website with `npm run dev`.

## Authentication and the default portal accounts

All three login areas — the root developer shell, the student portal, and the
tutor portal — authenticate against one persistent database. Accounts are rows
in the `users` table, passwords are stored as bcrypt hashes, and nothing about a
session depends on process memory, a mock store, or a JSON file. A credential
created today keeps working after the dev server stops, the folder is closed,
the machine reboots, or the app is redeployed.

### Roles

| Portal                | Role in the database | Legacy name still accepted |
| --------------------- | -------------------- | -------------------------- |
| Root developer shell  | `developer`          | `admin`                    |
| Student portal        | `student`            | `student`                  |
| Tutor portal          | `tutor`              | `teacher`                  |

Existing `admin`/`teacher` rows are renamed by the `a7c3d18b52e1` migration and,
as a safety net, by the startup bootstrap. Tokens issued before the rename are
still accepted, and API responses include both `role` and `legacy_role`.

### Default credentials

On first boot the backend creates any of these accounts that do not already
exist:

| Role        | Email                     | Password                  |
| ----------- | ------------------------- | ------------------------- |
| `developer` | `developer@seroestar.com` | `SeroEstar-Dev-2026!`     |
| `student`   | `student@seroestar.com`   | `SeroEstar-Student-2026!` |
| `tutor`     | `tutor@seroestar.com`     | `SeroEstar-Tutor-2026!`   |

Override any of them with `SEED_DEVELOPER_EMAIL` / `SEED_DEVELOPER_PASSWORD`,
`SEED_STUDENT_*`, and `SEED_TUTOR_*`. `ADMIN_EMAIL` / `ADMIN_PASSWORD` remain
accepted as aliases for the developer pair.

Seeding is create-if-absent. An account that already exists is never recreated
and its password is never rewritten, so a password you change later survives
every restart. To deliberately reset the defaults:

```bash
python scripts/seed_accounts.py --reset-passwords
python scripts/seed_accounts.py --list          # show what is stored
```

**Change these passwords before the site is public.** The built-in defaults are
a local-development convenience: when `ENVIRONMENT=production`, an account whose
`SEED_*_PASSWORD` is unset is skipped rather than created, so production never
ships a well-known login.

### Where the data lives

`DATABASE_URL` is the single source of truth and is required in production. When
it is unset during local development the backend falls back to
`backend/data/seroestar.db`, a SQLite file resolved from the package directory
so the same database is opened regardless of the working directory. Alembic
reads the same URL, so migrations and the API can never drift apart.

`GET /api/health` reports which database the backend reached and whether the
bootstrap succeeded.

Sessions are JWTs signed with `JWT_SECRET`. Locally, when that variable is
unset, a key is generated once into `backend/data/.jwt_secret` and reused, so a
restart no longer invalidates everyone's session. Both files are gitignored.

## Vercel production deployment

The repository includes `vercel.json` and `api/index.py`. Vercel builds the Vite frontend into `dist` and runs FastAPI as a Python function.

Create a public Vercel Blob store attached to the project, then configure these variables for Production and Preview:

- `ENVIRONMENT=production`
- `DATABASE_URL` — pooled PostgreSQL/Neon connection string
- `JWT_SECRET` — a new random value of at least 48 characters
- `ADMIN_EMAIL` — email that seeds the root developer account
- `ADMIN_PASSWORD` — unique password of at least 16 characters; seeds that account on first boot
- `SEED_STUDENT_PASSWORD`, `SEED_TUTOR_PASSWORD` — set these to have the student and tutor
  accounts created too; without them those accounts are skipped rather than given a default
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
python -m unittest discover -s backend/tests -t . -v
alembic upgrade head
```

Deploy from the project root with `vercel`, verify the preview, and promote the tested deployment with `vercel --prod`.

## Operational notes

- Production tutor uploads are stored in Vercel Blob and limited to 4 MB per server upload because of Vercel Functions limits.
- Larger lesson videos should be uploaded directly to a video/object-storage provider. The bundled A1 example video is served as a static asset.
- Never commit `.env`, database exports, student documents, or tokens. These paths are excluded by `.gitignore` and `.vercelignore`.
- Run Alembic migrations before production deployments; production functions do not create database tables automatically.
- The Express dev server proxies every auth route to FastAPI. It keeps no credentials of its
  own, so if `/api/login` returns 502 the fix is to start the backend, not to work around it.
# iniciativa_seroestar
