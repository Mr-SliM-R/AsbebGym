# Cloudflare Deployment

This folder contains the Cloudflare Worker API for Gym Rival.

The local development server still uses `server/` with Express and SQLite. Cloudflare uses:

- Worker static assets for the React app
- Worker API routes under `/api/*`
- D1 database for persistent data

## Setup

1. Log in:

```bash
npx wrangler login
```

2. Create a D1 database:

```bash
npx wrangler d1 create gym-rival-db
```

3. Copy the created `database_id` into `wrangler.toml`.

4. Apply schema and seed data:

```bash
npm run cf:d1:schema
npm run cf:d1:seed
```

For an existing D1 database, apply the competition migration instead of reseeding:

```bash
npm run cf:d1:migrate:competition
npm run cf:d1:users
```

5. Deploy:

```bash
npm run cf:deploy
```

Cloudflare will serve the React app and route `/api/*` to `cloudflare/worker.ts`.
