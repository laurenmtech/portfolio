# portfolio

Personal site. Astro (static) served by a Cloudflare Worker that also handles `/api/*`.
Spec and build plan: `../spec.html`, `../plan.html`.

## Commands

| Command | What it does |
| --- | --- |
| `pnpm dev` | Astro dev server (pages only, no `/api`) at `localhost:4321` |
| `pnpm preview` | Build, then run the real Worker locally with `/api` at `localhost:8787` |
| `pnpm typecheck` | `astro check` + typecheck the Worker |
| `pnpm run deploy` | Build and deploy to Cloudflare |

## Layout

- `src/content/` — all site content: `projects/*.mdx`, `profile.yaml`, `faq.yaml`. Schemas in `src/content.config.ts`.
- `worker/` — Hono app for `/api/*`; everything else is static assets from `dist/`.

## Secrets

Never commit secrets. Local: `.dev.vars`. Production: `wrangler secret put NAME`.
CI needs repo secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`.
