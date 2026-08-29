const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

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

const HEAD_OF_DIGITAL_DESC = `Voice of Preemies Rwanda is seeking a Head of Digital to lead all of the organization's digital and technology work, and to help build Voice of Preemies as an organization centered on strong, modern technology.

Key Responsibilities
- Own all digital work across the organization — the public website, admin systems, digital communications, and any other technology the organization relies on
- Design, build, and maintain the organization's public website and internal admin dashboard
- Manage the organization's database and backend systems, including data security and access control for donor, beneficiary, and program records
- Set up and manage third-party technology integrations (payment and donation processing, email communications, media hosting, and others as needed)
- Oversee hosting, deployment, and domain infrastructure
- Ensure every part of the organization has the digital tools it needs to run effectively — from fundraising to program delivery to family support
- Lead the organization's overall technology strategy and represent Voice of Preemies as a technology-forward organization

Qualifications
- Strong background in web development, databases, and digital systems
- Experience with modern web technologies and cloud infrastructure
- Strong understanding of data privacy and security, particularly for sensitive health and donor information
- Able to work independently, think strategically, and turn organizational needs into working technology

To Apply: Send your CV to voiceofpreemies@gmail.com`;

const COORDINATOR_DESC = `Voice of Preemies Rwanda is looking for an Activities Coordinator to serve as the organization's day-to-day point of contact for families, donors, and partners.

Key Responsibilities
- Answer and manage incoming calls and messages from parents, donors, and partners
- Respond to inquiries submitted through the website (contact, support requests, and donation forms)
- Coordinate the receipt and organization of both cash and in-kind donations, including scheduling pickups/drop-offs with donors
- Maintain accurate, up-to-date records of communications and donations
- Support the planning and coordination of Voice of Preemies activities and community events
- Liaise between families, hospital partners, and the Voice of Preemies team to ensure timely follow-up

Qualifications
- Strong communication and interpersonal skills (Kinyarwanda and English required; French a plus)
- Highly organized, comfortable managing multiple ongoing conversations and tasks
- Compassionate, comfortable engaging with families in sensitive circumstances
- Based in or able to work from Kigali

To Apply: Send your CV to voiceofpreemies@gmail.com`;

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

  const jobs = [
    {
      slug: 'head-of-digital',
      title: 'Head of Digital',
      summary: 'Lead all of Voice of Preemies’ digital and technology work, from the website to the admin systems to our data and communications infrastructure.',
      description: HEAD_OF_DIGITAL_DESC,
      duration_days: 45,
    },
    {
      slug: 'vop-activities-coordinator',
      title: 'VoP Activities Coordinator',
      summary: 'Be the friendly, organized point of contact for families, donors, and partners — handling calls, correspondence, and donation coordination.',
      description: COORDINATOR_DESC,
      duration_days: 45,
    },
  ];

  for (const job of jobs) {
    const r = await client.query(
      `INSERT INTO careers (slug, title, summary, description, apply_email, posted_date, duration_days, deadline, published)
       VALUES ($1, $2, $3, $4, 'voiceofpreemies@gmail.com', CURRENT_DATE, $5, CURRENT_DATE + $5::int, true)
       RETURNING id, slug, deadline`,
      [job.slug, job.title, job.summary, job.description, job.duration_days]
    );
    console.log('Inserted:', JSON.stringify(r.rows[0]));
  }

  await client.end();
}

main().catch((err) => {
  console.error('Failed:', err.message);
  process.exit(1);
});
