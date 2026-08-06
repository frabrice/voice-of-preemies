const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const CLOUD_NAME = 'xb6thsac';
const UPLOAD_PRESET = 'dw90puyp';
const LOGO_URL = 'https://res.cloudinary.com/dyqitacqz/image/upload/v1779117338/Horizontal_Voice_Of_Preemies_svmz0n.png';

const COLORS = {
  teal: '#0A6070',
  tealLight: '#1AADA0',
  coral: '#E8644A',
  gold: '#E8A020',
  cream: '#FBF8F3',
  text: '#1A2B35',
  muted: '#5A7280',
};

function loadEnvLocal() {
  const content = fs.readFileSync(path.join(__dirname, '..', 'migration-credentials.local'), 'utf8');
  const env = {};
  for (const line of content.split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i === -1) continue;
    env[t.slice(0, i)] = t.slice(i + 1);
  }
  return env;
}

function escapeXml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** Greedy word-wrap into lines no longer than maxChars. */
function wrap(text, maxChars) {
  const words = text.split(/\s+/);
  const lines = [];
  let cur = '';
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (next.length > maxChars && cur) {
      lines.push(cur);
      cur = w;
    } else {
      cur = next;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

function tspans(lines, x, startDy, lineHeight) {
  return lines.map((l, i) => `<tspan x="${x}" dy="${i === 0 ? startDy : lineHeight}">${escapeXml(l)}</tspan>`).join('');
}

function buildFlyerSVG({ eyebrow, title, dateRange, note, logoDataUri }) {
  const W = 1080, H = 1350;
  const cx = W / 2;
  const titleLines = wrap(title, 22);
  const noteLines = note ? wrap(note, 46).slice(0, 4) : [];
  const titleFontSize = titleLines.some(l => l.length > 16) ? 64 : 76;
  const titleBlockHeight = titleLines.length * (titleFontSize * 1.12);
  const titleStartY = 560;

  const dateY = titleStartY + titleBlockHeight + 70;
  const noteStartY = dateY + 90;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
  <defs>
    <radialGradient id="glowTeal" cx="80%" cy="10%" r="55%">
      <stop offset="0%" stop-color="${COLORS.tealLight}" stop-opacity="0.22"/>
      <stop offset="100%" stop-color="${COLORS.tealLight}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="glowCoral" cx="10%" cy="95%" r="50%">
      <stop offset="0%" stop-color="${COLORS.coral}" stop-opacity="0.16"/>
      <stop offset="100%" stop-color="${COLORS.coral}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="footerGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="${COLORS.teal}"/>
      <stop offset="100%" stop-color="${COLORS.tealLight}"/>
    </linearGradient>
  </defs>

  <rect width="${W}" height="${H}" fill="${COLORS.cream}"/>
  <rect width="${W}" height="${H}" fill="url(#glowTeal)"/>
  <rect width="${W}" height="${H}" fill="url(#glowCoral)"/>

  <!-- Logo -->
  <image href="${logoDataUri}" x="${cx - 190}" y="120" width="380" height="87" preserveAspectRatio="xMidYMid meet"/>
  <line x1="${cx - 90}" y1="248" x2="${cx + 90}" y2="248" stroke="${COLORS.teal}" stroke-width="1.5" stroke-opacity="0.35"/>

  <!-- Eyebrow -->
  <text x="${cx}" y="330" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="26" font-weight="700" letter-spacing="5" fill="${COLORS.gold}">${escapeXml(eyebrow.toUpperCase())}</text>

  <!-- Decorative heart motif -->
  <path d="M ${cx} 380 c -22 -26 -62 -26 -62 8 c 0 26 34 46 62 68 c 28 -22 62 -42 62 -68 c 0 -34 -40 -34 -62 -8 Z" fill="${COLORS.coral}" fill-opacity="0.85"/>

  <!-- Title -->
  <text x="${cx}" y="${titleStartY}" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="${titleFontSize}" fill="${COLORS.text}">${tspans(titleLines, cx, 0, titleFontSize * 1.12)}</text>

  <!-- Date pill -->
  <rect x="${cx - 180}" y="${dateY - 44}" width="360" height="66" rx="33" fill="${COLORS.teal}" fill-opacity="0.08"/>
  <text x="${cx}" y="${dateY}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="30" font-weight="700" letter-spacing="1" fill="${COLORS.teal}">${escapeXml(dateRange)}</text>

  ${noteLines.length ? `<text x="${cx}" y="${noteStartY}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="27" fill="${COLORS.muted}">${tspans(noteLines, cx, 0, 40)}</text>` : ''}

  <!-- Footer -->
  <rect x="0" y="${H - 130}" width="${W}" height="130" fill="url(#footerGrad)"/>
  <text x="${cx}" y="${H - 70}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="24" font-weight="700" letter-spacing="2" fill="#ffffff">VOICE OF PREEMIES RWANDA</text>
  <text x="${cx}" y="${H - 38}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="20" fill="#ffffffcc">voiceofpreemies.org</text>
</svg>`;
}

function fmtRange(start, end) {
  const s = new Date(start);
  const sMon = s.toLocaleDateString('en-US', { month: 'long' });
  if (!end || end === start) return `${sMon} ${s.getDate()}, ${s.getFullYear()}`;
  const e = new Date(end);
  const eMon = e.toLocaleDateString('en-US', { month: 'long' });
  if (sMon === eMon) return `${sMon} ${s.getDate()}–${e.getDate()}, ${s.getFullYear()}`;
  return `${sMon} ${s.getDate()} – ${eMon} ${e.getDate()}, ${e.getFullYear()}`;
}

async function uploadSvg(svgString, publicIdHint) {
  const blob = new Blob([svgString], { type: 'image/svg+xml' });
  const form = new FormData();
  form.append('file', blob, `${publicIdHint}.svg`);
  form.append('upload_preset', UPLOAD_PRESET);
  form.append('folder', 'voice-of-preemies/calendar');
  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, { method: 'POST', body: form });
  const data = await res.json();
  if (!res.ok) throw new Error('Cloudinary upload failed: ' + JSON.stringify(data));
  return data.secure_url;
}

async function main() {
  const env = loadEnvLocal();

  console.log('Fetching logo...');
  const logoRes = await fetch(LOGO_URL);
  const logoBuf = Buffer.from(await logoRes.arrayBuffer());
  const logoDataUri = `data:image/png;base64,${logoBuf.toString('base64')}`;

  const client = new Client({
    host: env.NEW_DB_HOST,
    port: Number(env.NEW_DB_PORT),
    user: env.NEW_DB_USER,
    password: env.NEW_DB_PASSWORD,
    database: env.NEW_DB_NAME,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  const { rows } = await client.query(
    `SELECT id, title, start_date, end_date, note FROM upcoming_highlights WHERE deleted_at IS NULL ORDER BY start_date`
  );

  for (const row of rows) {
    const isRange = row.end_date && row.end_date !== row.start_date;
    const eyebrow = isRange ? 'Awareness Week' : 'Awareness Day';
    const svg = buildFlyerSVG({
      eyebrow,
      title: row.title,
      dateRange: fmtRange(row.start_date, row.end_date),
      note: row.note,
      logoDataUri,
    });
    console.log(`Uploading flyer for "${row.title}"...`);
    const url = await uploadSvg(svg, row.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'));
    await client.query('UPDATE upcoming_highlights SET flyer_url = $1 WHERE id = $2', [url, row.id]);
    console.log(`  -> ${url}`);
  }

  await client.end();
  console.log('Done.');
}

main().catch(err => {
  console.error('Failed:', err.message);
  process.exit(1);
});
