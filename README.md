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

The game uses `/api/scores` for a shared top 10 leaderboard when these Vercel
environment variables are configured:

```text
UPSTASH_REDIS_REST_URL
UPSTASH_REDIS_REST_TOKEN
```

Without those variables, the browser falls back to local high scores.
