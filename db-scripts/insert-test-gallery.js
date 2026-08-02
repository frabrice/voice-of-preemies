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

const GALLERY = [
  'https://res.cloudinary.com/dbhyrnypc/image/upload/v1779951323/akagofero_r83ks8.png',
  'https://res.cloudinary.com/dbhyrnypc/image/upload/v1779951323/Tender_moment_in_the_NICU_vkmzge.png',
  'https://res.cloudinary.com/dbhyrnypc/image/upload/v1779951322/Serene_moments_in_a_cozy_nursery_t13cjj.png',
];

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

  await client.query(
    `INSERT INTO news_articles (slug, title, excerpt, content, tag, date, image_url, gallery_urls, published, featured)
     VALUES ('test-gallery-article', 'Test Gallery Article', 'Testing the new photo gallery feature.', 'Full content for the test article.', 'News', CURRENT_DATE, $1, $2, true, false)`,
    [GALLERY[0], GALLERY]
  );
  console.log('Inserted test news article with gallery.');

  await client.query(
    `INSERT INTO events (slug, title, date, location, type, description, organizer, image_url, gallery_urls, published, featured)
     VALUES ('test-gallery-event', 'Test Gallery Event', CURRENT_DATE, 'Kigali', 'Community', 'Testing the new photo gallery feature.', 'Voice of Preemies', $1, $2, true, false)`,
    [GALLERY[0], GALLERY]
  );
  console.log('Inserted test event with gallery.');

  await client.end();
}

main().catch((err) => {
  console.error('Failed:', err.message);
  process.exit(1);
});
