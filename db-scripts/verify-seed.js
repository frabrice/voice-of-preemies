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

  const programs = await client.query('select title, slug, services from programs order by sort_order');
  console.log(`programs: ${programs.rowCount} rows`);
  console.log('  first services value:', JSON.stringify(programs.rows[0]?.services));

  const team = await client.query('select name, role from team_members order by sort_order');
  console.log(`team_members: ${team.rowCount} rows`);
  team.rows.forEach((r) => console.log('  -', r.name, '/', r.role));

  const stats = await client.query('select label, value from site_stats order by sort_order');
  console.log(`site_stats: ${stats.rowCount} rows`);

  const buckets = await client.query("select id, public from storage.buckets where id = 'team-applications'");
  console.log('storage bucket team-applications:', buckets.rows[0] ?? 'MISSING');

  await client.end();
}

main().catch((err) => {
  console.error('Failed:', err.message);
  process.exit(1);
});
