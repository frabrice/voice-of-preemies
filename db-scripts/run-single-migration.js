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
  const migrationFile = process.argv[2];
  if (!migrationFile) throw new Error('Usage: node run-single-migration.js <path-to-sql-file>');

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

  const sql = fs.readFileSync(migrationFile, 'utf8');

  try {
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');
    console.log(`Applied successfully: ${migrationFile}`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Failed, rolled back. Error:', err.message);
    if (err.position) {
      const pos = Number(err.position);
      console.error('Context near error:', sql.slice(Math.max(0, pos - 200), pos + 200));
    }
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error('Script failed:', err.message);
  process.exit(1);
});
