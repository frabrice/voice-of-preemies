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

function fmtDate(d) {
  const dt = new Date(d);
  return dt.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

/** One job listing card. Returns { svg, height } so the caller can stack the next card correctly.
 *  Uses a single running "cursor" baseline instead of separately-derived top/bottom offsets,
 *  since mixing those two ways of measuring is what caused the mismatched card padding before. */
function buildJobCard({ x, y, width, index, title, summary, deadline }) {
  const pad = 40;
  const titleLines = wrap(title, 28);
  const summaryLines = wrap(summary, 52);
  const titleFontSize = 34;
  const titleLineH = titleFontSize * 1.18;
  const summaryFontSize = 21;
  const summaryLineH = summaryFontSize * 1.55;

  const badgeY = y + pad + 34;
  const titleFirstBaseline = badgeY + 8;
  let cursor = titleFirstBaseline + (titleLines.length - 1) * titleLineH;
  cursor += titleLineH * 0.8;
  const summaryFirstBaseline = cursor;
  cursor = summaryFirstBaseline + (summaryLines.length - 1) * summaryLineH;
  cursor += summaryLineH * 0.95;
  const deadlineBaseline = cursor;
  const cardHeight = (deadlineBaseline - y) + pad - 10;

  const svg = `
    <rect x="${x}" y="${y}" width="${width}" height="${cardHeight}" rx="24" fill="#ffffff" stroke="${COLORS.teal}" stroke-opacity="0.08" stroke-width="1.5"/>

    <circle cx="${x + pad + 26}" cy="${badgeY}" r="26" fill="${COLORS.coral}" fill-opacity="0.12"/>
    <text x="${x + pad + 26}" y="${badgeY + 9}" text-anchor="middle" font-family="Georgia, serif" font-size="26" font-weight="700" fill="${COLORS.coral}">0${index}</text>

    <text x="${x + pad + 66}" y="${titleFirstBaseline}" font-family="Georgia, 'Times New Roman', serif" font-size="${titleFontSize}" font-weight="700" fill="${COLORS.text}">${tspans(titleLines, x + pad + 66, 0, titleLineH)}</text>

    <text x="${x + pad}" y="${summaryFirstBaseline}" font-family="Arial, Helvetica, sans-serif" font-size="${summaryFontSize}" fill="${COLORS.muted}">${tspans(summaryLines, x + pad, 0, summaryLineH)}</text>

    <text x="${x + pad}" y="${deadlineBaseline}" font-family="Arial, Helvetica, sans-serif" font-size="19" font-weight="700" fill="${COLORS.tealLight}">APPLY BY ${escapeXml(fmtDate(deadline).toUpperCase())}</text>
  `;

  return { svg, height: cardHeight };
}

function buildFlyerSVG({ jobs, applyEmail, logoDataUri }) {
  const W = 1080;
  const cx = W / 2;
  const cardX = 70;
  const cardW = W - cardX * 2;

  // ── Header block ──
  const logoTop = 100;
  const eyebrowY = 300;
  const briefcaseY = 340;
  const headlineY = 460;
  const subheadY = 520;
  const cardsStartY = 590;

  // ── Stack the two cards, tracking real height so text wrapping never overlaps ──
  let cursorY = cardsStartY;
  const cardBlocks = jobs.map((job, i) => {
    const card = buildJobCard({ x: cardX, y: cursorY, width: cardW, index: i + 1, title: job.title, summary: job.summary, deadline: job.deadline });
    cursorY += card.height + 32;
    return card.svg;
  });

  const footerH = 150;
  const H = cursorY + 20 + footerH;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
  <defs>
    <radialGradient id="glowTeal" cx="85%" cy="5%" r="45%">
      <stop offset="0%" stop-color="${COLORS.tealLight}" stop-opacity="0.20"/>
      <stop offset="100%" stop-color="${COLORS.tealLight}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="glowCoral" cx="8%" cy="45%" r="35%">
      <stop offset="0%" stop-color="${COLORS.coral}" stop-opacity="0.12"/>
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

  <image href="${logoDataUri}" x="${cx - 190}" y="${logoTop}" width="380" height="87" preserveAspectRatio="xMidYMid meet"/>
  <line x1="${cx - 90}" y1="${logoTop + 128}" x2="${cx + 90}" y2="${logoTop + 128}" stroke="${COLORS.teal}" stroke-width="1.5" stroke-opacity="0.35"/>

  <text x="${cx}" y="${eyebrowY}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="26" font-weight="700" letter-spacing="5" fill="${COLORS.gold}">JOIN OUR TEAM</text>

  <!-- Briefcase glyph -->
  <g transform="translate(${cx - 30}, ${briefcaseY})">
    <rect x="0" y="14" width="60" height="42" rx="8" fill="${COLORS.coral}"/>
    <rect x="20" y="2" width="20" height="16" rx="4" fill="none" stroke="${COLORS.coral}" stroke-width="5"/>
    <line x1="0" y1="34" x2="60" y2="34" stroke="${COLORS.cream}" stroke-width="4"/>
  </g>

  <text x="${cx}" y="${headlineY}" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="84" fill="${COLORS.text}">We're Hiring</text>
  <text x="${cx}" y="${subheadY}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="24" fill="${COLORS.muted}">Two roles now open at Voice of Preemies Rwanda</text>

  ${cardBlocks.join('\n')}

  <rect x="0" y="${H - footerH}" width="${W}" height="${footerH}" fill="url(#footerGrad)"/>
  <text x="${cx}" y="${H - footerH + 62}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="27" font-weight="700" fill="#ffffff">Send your CV to ${escapeXml(applyEmail)}</text>
  <text x="${cx}" y="${H - footerH + 98}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="20" fill="#ffffffcc">voiceofpreemies.org/careers</text>
</svg>`;
}

async function uploadSvg(svgString, publicIdHint) {
  const blob = new Blob([svgString], { type: 'image/svg+xml' });
  const form = new FormData();
  form.append('file', blob, `${publicIdHint}.svg`);
  form.append('upload_preset', UPLOAD_PRESET);
  form.append('folder', 'voice-of-preemies/careers');
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
    `SELECT title, summary, apply_email, deadline FROM careers WHERE deleted_at IS NULL AND published = true AND deadline >= CURRENT_DATE ORDER BY deadline`
  );
  await client.end();

  if (rows.length === 0) throw new Error('No open positions found to put on the flyer.');

  const svg = buildFlyerSVG({ jobs: rows, applyEmail: rows[0].apply_email, logoDataUri });

  console.log('Uploading flyer...');
  const svgUrl = await uploadSvg(svg, 'now-hiring');
  console.log('SVG URL:', svgUrl);

  const pngUrl = svgUrl.replace('/upload/', '/upload/f_png/');
  const pngRes = await fetch(pngUrl);
  const pngBuf = Buffer.from(await pngRes.arrayBuffer());
  const outPath = path.join(__dirname, 'now-hiring-flyer.png');
  fs.writeFileSync(outPath, pngBuf);
  console.log('Saved PNG to:', outPath);
}

main().catch((err) => {
  console.error('Failed:', err.message);
  process.exit(1);
});
