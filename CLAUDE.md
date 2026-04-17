# TextStudy-Web

Web version of TextStudy. Single-page React app built with Vite, sharing the Supabase backend with the mobile app.

## Stack
- React 18 + React Router (`react-router-dom`)
- Vite (dev server + build)
- Supabase (shared backend with `~/Projects/TextStudy/`)
- `qrcode.react` for QR code generation
- ESLint for linting

## Run
- `npm run dev` — Vite dev server (local, hot reload)
- `npm run build` — production build
- `npm run preview` — preview the built bundle
- `npm run lint` — ESLint

## Structure
- `index.html` — Vite entry
- `src/` — React components, pages, Supabase client
- `public/` — static assets (served as-is)
- `supabase-schema.sql` — canonical database schema for the shared Supabase project
- `.env` — local Supabase config (NEVER commit — `.env.example` is the template to share)
- `vite.config.js` — Vite config
- `eslint.config.js` — ESLint rules

## Conventions
- Any schema change should update `supabase-schema.sql` so the mobile and web apps stay in sync
- `.env.example` must stay up to date whenever new env vars are added
- Shared Supabase project — breaking schema changes affect both apps

## GitHub
- Remote: `git@github.com:jlanemorse/web-app-textstudy.git` (migrating to SSH)
- Default branch: `main`

## Related
- Native app at `~/Projects/TextStudy/`
