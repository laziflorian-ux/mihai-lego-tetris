# Mihai's Lego Tetris

A mobile-first browser Tetris game for Mihai.

## Local Run

```bash
python3 -m http.server 3010
```

Then open:

```text
http://localhost:3010
```

## Controls

- Tap board: rotate
- Swipe left/right: move
- Swipe down/flick down: drop
- Buttons: left, rotate, right, drop
- Mute button in the top HUD

## Global Leaderboard

The game uses `/api/scores` for a shared top 10 leaderboard when Upstash Redis
is connected through Vercel Marketplace. The integration usually provides:

```text
KV_REST_API_URL
KV_REST_API_TOKEN
```

The API also supports the older `UPSTASH_REDIS_REST_URL` and
`UPSTASH_REDIS_REST_TOKEN` names.

Without those variables, the browser falls back to local high scores.
