# Repository Guidelines

## Project Structure & Module Organization

- `apps/api` — Fastify + TypeScript API. Source in `src/` (routes, services, middleware, workers), DB in `src/db/` (Drizzle + migrations), tests as `*.test.ts` beside code.
- `apps/web` — Vite + React TypeScript app. Source in `src/`.
- `apps/marketing` — Vite marketing site.
- `apps/webhook-test` — Minimal Fastify webhook receiver for local testing.
- `infrastructure/` — Docker and helper scripts; see `docker-compose.dev.yml` and `scripts/*.sh`.
- `docs/` — Auth/billing notes and plans.

## Build, Test, and Development Commands

- Install: `pnpm install`
- All apps (Turbo): `pnpm dev` | `pnpm build` | `pnpm lint` | `pnpm typecheck`
- API only: `pnpm --filter @mutate/api dev` | `pnpm --filter @mutate/api build`
- Web only: `pnpm --filter @mutate/web dev` | `pnpm --filter @mutate/marketing dev`
- Database (API): `pnpm db:generate` (Drizzle SQL) | `pnpm db:migrate` (apply) | `pnpm db:studio` (UI)

## Coding Style & Naming Conventions

- Formatting via Prettier; run `pnpm format`. Lint with `pnpm lint`.
- TypeScript throughout; prefer explicit types for public APIs.
- Naming: PascalCase for types/interfaces, camelCase for vars/functions, UPPER_SNAKE for constants/env.
- Files: kebab-case (`quota-enforcement-service.ts`); tests mirror files with `.test.ts`.

## Testing Guidelines

- Framework: Vitest in `apps/api`. Run: `pnpm --filter @mutate/api test`.
- Place tests next to implementation: `foo.ts` and `foo.test.ts`.
- Avoid external calls in unit tests; stub queue/storage/email. Use fast, deterministic data.

## Commit & Pull Request Guidelines

- Commits: imperative, concise subjects. Optional scope prefix, e.g. `api: add quota checks`, `web: fix mutation list`.
- PRs: include description, linked issues, testing steps. Add screenshots/GIFs for UI changes.
- API changes: note required env vars and include migrations/seed updates when relevant.

## Security & Configuration Tips

- Never commit secrets. Copy `.env.example` to `.env` per app.
- Local services: use `infrastructure/docker/docker-compose.dev.yml` and scripts in `infrastructure/scripts/` (`start-dev.sh`, `stop-dev.sh`).
- Some features require S3/Email/Redis credentials; see `apps/api/.env.example` and `README.md`.
