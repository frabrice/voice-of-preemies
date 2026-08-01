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

  await client.query(`
    INSERT INTO stories (slug, name, baby_info, tag, location, year, excerpt, full_story, image_url, published, featured)
    VALUES ('aline-mukamana', 'Aline Mukamana', 'Baby Divine, born at 30 weeks', 'Parent Story', 'Kigali', 2026,
      'A mother reflects on her NICU journey and the peer support that carried her through.',
      E'The full story text goes here across multiple paragraphs.\\n\\nIt describes the entire journey in detail.',
      '', true, false)
  `);
  console.log('Inserted test story.');

  await client.query(`
    INSERT INTO events (slug, title, date, end_date, location, type, description, organizer, published, featured)
    VALUES ('world-prematurity-day-2026', 'World Prematurity Day 2026 Recap', '2026-11-17', '2026-11-17', 'Kigali Convention Centre', 'Community',
      E'On November 17th, families, nurses, and partner hospitals gathered to mark World Prematurity Day.\\n\\nThe event featured parent testimonials, a health worker panel, and a candle-lighting ceremony for families who lost a baby.',
      'Voice of Preemies', true, false)
  `);
  console.log('Inserted test event.');

  await client.end();
}

main().catch((err) => {
  console.error('Failed:', err.message);
  process.exit(1);
});
