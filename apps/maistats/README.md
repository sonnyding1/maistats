# maistats

Vite + React frontend for browsing a static song database alongside `maistats-record-collector` data.

## Requirements

- Node.js 20+ (20 LTS or newer recommended)
- npm 10+

## What It Does

- Browse score lists and play logs
- Filter by title, chart type, difficulty, version, rank, FC and SYNC
- Sort and range-search by achievement, internal level and days since played
- Per-song detail view with chart-level `play_count`
- Switch API origins through deploy-time environment variables or in-browser UI settings

## Quick Start

This app is an npm workspace member of the monorepo. The commands below run from the repository root.

1. Install dependencies:

```bash
npm ci
```

2. Create the environment file:

```bash
cp apps/maistats/.env.example apps/maistats/.env
```

3. Edit `.env` if needed:

```env
SONG_DATABASE_URL=https://maimai-charts.muhwan.dev
RECORD_COLLECTOR_SERVER_URL=<your-record-collector-server-origin>
```

The local defaults live in [.env.example](./.env.example).

4. Start the dev server:

```bash
npm run dev --workspace apps/maistats
```

Vite prints the reachable local address to the terminal.

## Environment Variables

- `SONG_DATABASE_URL`
  - base URL of the static song database
- `RECORD_COLLECTOR_SERVER_URL`
  - origin of `maistats-record-collector`

These are the app's default API targets. At runtime they can be overridden per browser under `Server Connection` in the UI.

When deploying to Cloudflare Pages, set these as Pages environment variables rather than committing them to the repository.

## Scripts

- `npm run dev --workspace apps/maistats`: start the dev server
- `npm run build --workspace apps/maistats`: type-check, then produce a production build
- `npm run preview --workspace apps/maistats`: preview the build locally

## Build

```bash
npm run build --workspace apps/maistats
```

The build output is written to `dist/`.

To preview it:

```bash
npm run preview --workspace apps/maistats
```

Vite prints the preview address to the terminal.

## Deploying With Cloudflare Pages

Cloudflare Pages is the recommended target.

Default settings:

- Connect the GitHub repository
- Production branch: `main`
- Framework preset: `Vite` or `None`
- Build command: `npm ci && npm run build --workspace apps/maistats`
- Build output directory: `apps/maistats/dist`
- Root directory: repository root
- `NODE_VERSION=20`
- Deploy command: `npx wrangler deploy --config apps/maistats/wrangler.jsonc`

Environment variables:

- Set `SONG_DATABASE_URL` and `RECORD_COLLECTOR_SERVER_URL` for both Production and Preview
- Attach a custom domain if needed

The repository includes `@cloudflare/vite-plugin` and `wrangler.jsonc`, so deploying from the root with `npx wrangler deploy --config apps/maistats/wrangler.jsonc` also works.

Behaviour:

- Pushes to `main` deploy production
- Opening or updating a PR deploys a preview

## Data Notes

- Last Played/Days on the Score screen come from `maistats-record-collector`'s `/api/scores/rated` (the `last_played_at` column of `scores`).
- The Playlog screen reads `maistats-record-collector`'s `/api/recent?limit=10000` (the `playlogs` table).
- Per-chart `play_count` is not inferred from play logs; it uses the value the record collector's score API returns.
- Longer-range analysis would need an additional record collector API (for example, a full playlog query).
