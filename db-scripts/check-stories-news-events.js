const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

function loadEnvLocal() {
  const filePath = path.join(__dirname, '..', 'migration-credentials.local');
  const content = fs.readFileSync(filePath, 'utf8');
  const env = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    env[trimmed.slice(0, idx)] = trimmed.slice(idx + 1);
  }
  return env;
}

async function main() {
  const env = loadEnvLocal();
  const client = new Client({
    host: env.NEW_DB_HOST,
    port: Number(env.NEW_DB_PORT),
    user: env.NEW_DB_USER,
    password: env.NEW_DB_PASSWORD,
    database: env.NEW_DB_NAME,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  const stories = await client.query('select id, slug, name, published, deleted_at from stories');
  console.log(`stories: ${stories.rowCount} rows`);
  stories.rows.forEach((r) => console.log(' -', r.id, '|', r.slug, '|', r.name, '| published:', r.published, '| deleted:', r.deleted_at));

  const news = await client.query('select id, slug, title, published, deleted_at from news_articles');
  console.log(`news_articles: ${news.rowCount} rows`);
  news.rows.forEach((r) => console.log(' -', r.id, '|', r.slug, '|', r.title, '| published:', r.published, '| deleted:', r.deleted_at));

  const events = await client.query('select id, slug, title, published, deleted_at from events');
  console.log(`events: ${events.rowCount} rows`);
  events.rows.forEach((r) => console.log(' -', r.id, '|', r.slug, '|', r.title, '| published:', r.published, '| deleted:', r.deleted_at));

  await client.end();
}

main().catch((err) => {
  console.error('Failed:', err.message);
  process.exit(1);
});
