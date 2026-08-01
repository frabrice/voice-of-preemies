const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
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

function generatePassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
  const bytes = crypto.randomBytes(20);
  let pw = '';
  for (let i = 0; i < 20; i++) pw += chars[bytes[i] % chars.length];
  return pw;
}

async function main() {
  const env = loadEnvLocal();
  const email = 'voiceofpreemies@gmail.com';
  const password = generatePassword();

  const res = await fetch(`${env.NEW_SUPABASE_URL}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      apikey: env.NEW_SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${env.NEW_SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email,
      password,
      email_confirm: true,
      user_metadata: { display_name: 'Voice of Preemies Admin' },
    }),
  });

  const body = await res.json();
  if (!res.ok) {
    console.error('Failed to create auth user:', res.status, JSON.stringify(body));
    process.exit(1);
  }

  const userId = body.id;
  console.log('Created auth user:', userId);

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
    `INSERT INTO user_roles (user_id, email, role, display_name, status)
     VALUES ($1, $2, 'super_admin', 'Voice of Preemies Admin', 'active')`,
    [userId, email]
  );
  await client.end();

  console.log('---');
  console.log('Email:   ', email);
  console.log('Password:', password);
  console.log('---');
}

main().catch((err) => {
  console.error('Script failed:', err.message);
  process.exit(1);
});
