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

  const r1 = await client.query("DELETE FROM stories WHERE slug = 'aline-mukamana'");
  const r2 = await client.query("DELETE FROM events WHERE slug = 'world-prematurity-day-2026'");
  const r3 = await client.query("DELETE FROM news_articles WHERE slug = 'king-faisal-hospital-partnership-expands-nicu-support'");
  console.log('Deleted test rows — stories:', r1.rowCount, 'events:', r2.rowCount, 'news:', r3.rowCount);

  await client.end();
}

main().catch((err) => {
  console.error('Failed:', err.message);
  process.exit(1);
});
