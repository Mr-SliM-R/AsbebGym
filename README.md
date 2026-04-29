# Gym Rival

A modern three-user fitness web app for tracking workouts, browsing exercises by muscle group, watching placeholder exercise animations, and competing with ranks, badges, points, streaks, and weekly challenges.

## Stack

- Frontend: React, TypeScript, Tailwind CSS, Framer Motion
- Backend: Node.js, Express, TypeScript
- Database: local SQLite database using Node's built-in `node:sqlite`
- Auth: simple fixed-user login for `Slim`, `Adel`, and `Saber`
- Language: English and French UI toggle
- Profiles: each user can upload a profile picture

## Requirements

- Node.js 24 or newer
- npm 11 or newer

## Install

```bash
npm install
```

## Run Locally

```bash
npm run dev
```

The frontend runs at `http://localhost:5173` and proxies API calls to `http://localhost:4000`.

## Build

```bash
npm run build
npm start
```

After building, the Express server serves the compiled React app from `client/dist`.

## Deploy To Cloudflare

Cloudflare deployment uses the Worker in `cloudflare/worker.ts`, static assets from `client/dist`, and D1 for the database.

```bash
npx wrangler login
npx wrangler d1 create gym-rival-db
```

Copy the created D1 `database_id` into `wrangler.toml`, then run:

```bash
npm run cf:d1:schema
npm run cf:d1:seed
npm run cf:deploy
```

Cloudflare serves the React app and routes `/api/*` to the Worker API.

For an existing Cloudflare D1 database that already has data, run the non-destructive user sync instead of reseeding:

```bash
npm run cf:d1:users
```

## Reset Seed Data

The database is created automatically at `server/data/gym-rival.sqlite`.

To reset it:

```bash
npm run seed
```

## Folder Structure

```text
Gym Rival/
  client/
    src/
      components/
      pages/
      App.tsx
      api.ts
      auth.tsx
      main.tsx
      styles.css
      types.ts
  server/
    src/
      db.ts
      index.ts
      seedData.ts
    data/
      gym-rival.sqlite
```

## API Routes

- `GET /api/health`
- `GET /api/users`
- `PATCH /api/users/:userId/avatar`
- `POST /api/auth/login`
- `GET /api/meta`
- `GET /api/dashboard/:userId`
- `GET /api/exercises`
- `GET /api/exercises/:id`
- `GET /api/workouts/:userId`
- `POST /api/workouts`
- `GET /api/leaderboard`
- `GET /api/challenges/:userId`
- `PATCH /api/challenges/:userId/:challengeId`
- `GET /api/profile/:userId`

## Database Schema

Core tables:

- `users`
- `user_stats`
- `exercises`
- `workouts`
- `workout_exercises`
- `personal_records`
- `badges`
- `user_badges`
- `challenges`
- `user_challenges`

## Extending Exercise Animations

The reusable `ExerciseAnimation` component renders real media when a source is available, otherwise it falls back to a CSS/Framer Motion movement placeholder.

Each exercise has an `animationAssetKey`. Put licensed files here:

```text
client/public/exercise-media/
```

Examples:

```text
client/public/exercise-media/bench-press.gif
client/public/exercise-media/push-ups.gif
client/public/exercise-media/back-squat.gif
```

Then set these exercise database fields:

- `animation_media_type`: `image`, `gif`, `video`, `lottie`, or `three`
- `animation_src`: for example `/exercise-media/bench-press.mp4`
- `animation_credit`: optional source/license note

That structure is ready for:

- Three.js GLB/GLTF model
- GIF
- Lottie animation
- Video
- Custom canvas animation

Only use third-party assets if you have the correct license. GymVisual's public preview thumbnails are copyrighted; their commercial license applies to purchased non-watermarked media.
