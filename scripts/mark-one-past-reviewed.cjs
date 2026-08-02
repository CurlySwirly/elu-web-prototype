#!/usr/bin/env node
/**
 * Marks one past completed appointment of client@test.com as reviewed
 * so the „Bereits bewertet“ button is visible in Meine Termine.
 */
const fs = require('fs');
const path = require('path');
const { URL: NodeURL } = require('url');

function loadEnvLocal() {
  const p = path.join(__dirname, '..', '.env.local');
  const env = {};
  for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '');
  }
  return env;
}

const env = loadEnvLocal();
const BASE = env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = env.SUPABASE_SERVICE_ROLE_KEY;
if (!BASE || !KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

async function api(method, pathname, body) {
  const target = new NodeURL(pathname, BASE.endsWith('/') ? BASE : `${BASE}/`);
  // pathname for rest should be absolute path on host
  const href = `${BASE.replace(/\/$/, '')}${pathname.startsWith('/') ? pathname : `/${pathname}`}`;
  const res = await fetch(href, {
    method,
    headers: {
      apikey: KEY,
      Authorization: `Bearer ${KEY}`,
      'Content-Type': 'application/json',
      Prefer: method === 'POST' ? 'return=representation' : 'return=minimal',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${pathname} ${res.status} ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : null;
}

(async () => {
  const profile = await api('GET', '/rest/v1/profiles?email=eq.client@test.com&select=id');
  const clientId = profile?.[0]?.id;
  if (!clientId) throw new Error('client@test.com profile not found');

  const apts = await api(
    'GET',
    `/rest/v1/appointments?client_id=eq.${clientId}&status=eq.completed&select=id,expert_id,start_time,total_price,expert_offers:offer_id(title)&order=start_time.desc`
  );

  if (!apts?.length) throw new Error('No completed appointments for client');

  const target =
    apts.find((a) => (a.expert_offers?.title || '').toLowerCase().includes('personal')) ||
    apts.find((a) => (a.expert_offers?.title || '').toLowerCase().includes('yoga')) ||
    (apts.length > 1 ? apts[1] : apts[0]);

  const existing = await api(
    'GET',
    `/rest/v1/reviews?appointment_id=eq.${target.id}&select=id`
  );
  if (existing?.length) {
    console.log('Already reviewed:', target.expert_offers?.title || target.id);
    return;
  }

  await api('POST', '/rest/v1/reviews', {
    appointment_id: target.id,
    expert_profile_id: target.expert_id,
    client_id: clientId,
    rating: 5,
    title: 'Starkes Training',
    review_text: 'Motivierend und effektiv – Demo-Bewertung für UI.',
    helpful_count: 2,
  });

  console.log('✓ Marked as reviewed:', target.expert_offers?.title || target.id);
})().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
