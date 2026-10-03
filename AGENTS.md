# Base44 Dev Environment

## Stack
- Next.js 16 (App Router) + React 19 + TypeScript
- Tailwind CSS 4 + shadcn/ui (Radix UI)
- Supabase (hosted) — PostgreSQL, Auth, RLS. There is NO local database; the app talks to a remote Supabase project.
- Recharts (charts), @react-pdf/renderer (PDF invoices)

## Running the app
```bash
docker compose -f docker-compose.base44.yml up -d
```
- Web entry point: http://localhost:3000 (mapped from container port 3000).
- Dev server runs `next dev -H 0.0.0.0` with bind-mounted source; edits hot-reload.
- Dependencies install on container startup via `npm ci` (node_modules is an anonymous volume, not mounted from host).

## Required environment / secrets
The app needs a real Supabase project to function. Provide via the Secrets page (delivered to `/run/base44/app.env`):
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL (required to boot; `src/lib/supabase.ts` validates it is an HTTP(S) URL).
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anon public key (required to boot).
- `SUPABASE_SERVICE_ROLE_KEY` — optional; enables user management API routes (`src/app/api/create-user`, `delete-user`).
- `FONNTE_API_KEY` — optional; enables WhatsApp notifications (`src/app/api/send-whatsapp`).

Without real Supabase credentials, `src/lib/supabase.ts` falls back to a placeholder URL so the app boots and renders the login page, but auth and all data operations will fail.

## Database setup
SQL schema + migrations live in `supabase/` (schema.sql, setup-fresh-database.sql, demo_data.sql, and many migration_*.sql files). These must be applied to your Supabase project (see docs/QUICKSTART.md), not run locally.

## Notes
- `next.config.ts` sets `allowedDevOrigins` from `BASE44_PUBLIC_HOST_SUFFIX` so the preview origin can access dev assets/HMR.
- `.env.base44-defaults` holds boot placeholders; `/run/base44/app.env` (platform secrets) always overrides them.
