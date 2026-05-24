const SCORE_KEY = 'mihai-lego-tetris:scores';
const MAX_NAME_LENGTH = 18;
const MAX_SCORE = 999999999;
const MAX_LINES = 99999;

function json(response, status, payload) {
  response.statusCode = status;
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.setHeader('Cache-Control', 'no-store');
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  response.end(JSON.stringify(payload));
}

function clampNumber(value, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return min;
  return Math.max(min, Math.min(max, Math.floor(number)));
}

function sanitizeName(value) {
  const name = String(value || '')
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_NAME_LENGTH);

  return name || 'Anonymous';
}

function redisConfig() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    const error = new Error('Leaderboard storage is not configured.');
    error.statusCode = 503;
    throw error;
  }

  return { url, token };
}

async function redisCommand(command) {
  const { url, token } = redisConfig();
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(command)
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok || body.error) {
    const error = new Error(body.error || `Redis command failed with ${response.status}`);
    error.statusCode = 502;
    throw error;
  }

  return body.result;
}

function parseScoreMember(member, score) {
  try {
    const parsed = JSON.parse(member);
    return {
      name: sanitizeName(parsed.name),
      score: clampNumber(score, 0, MAX_SCORE),
      lines: clampNumber(parsed.lines, 0, MAX_LINES),
      date: typeof parsed.date === 'string' ? parsed.date : new Date().toISOString()
    };
  } catch {
    return null;
  }
}

async function getTopScores() {
  const result = await redisCommand(['ZREVRANGE', SCORE_KEY, 0, 9, 'WITHSCORES']);
  const scores = [];

  for (let index = 0; index < result.length; index += 2) {
    const entry = parseScoreMember(result[index], result[index + 1]);
    if (entry) scores.push(entry);
  }

  return scores;
}

async function readJson(request) {
  const chunks = [];
  for await (const chunk of request) {
    chunks.push(chunk);
  }

  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

export default async function handler(request, response) {
  if (request.method === 'OPTIONS') {
    json(response, 204, {});
    return;
  }

  try {
    if (request.method === 'GET') {
      json(response, 200, { scores: await getTopScores() });
      return;
    }

    if (request.method === 'POST') {
      const body = await readJson(request);
      const entry = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
        name: sanitizeName(body.name),
        score: clampNumber(body.score, 0, MAX_SCORE),
        lines: clampNumber(body.lines, 0, MAX_LINES),
        date: new Date().toISOString()
      };

      if (entry.score <= 0) {
        json(response, 400, { error: 'Score must be positive.' });
        return;
      }

      await redisCommand(['ZADD', SCORE_KEY, entry.score, JSON.stringify(entry)]);
      await redisCommand(['ZREMRANGEBYRANK', SCORE_KEY, 0, -101]);
      json(response, 200, { scores: await getTopScores() });
      return;
    }

    json(response, 405, { error: 'Method not allowed.' });
  } catch (error) {
    json(response, error.statusCode || 500, {
      error: error.statusCode === 503 ? error.message : 'Leaderboard request failed.'
    });
  }
}
