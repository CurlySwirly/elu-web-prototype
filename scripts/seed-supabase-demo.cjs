#!/usr/bin/env node
/**
 * Seeds demo data into the linked Supabase project.
 * Requires .env.local: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *
 * Demo logins (password for all: Test1234!):
 *   client@test.com      – Klient (Client-Dashboard)
 *   onboarding@test.com  – Expert:in mit offenem Verifizierungsprozess
 *   expert@test.com      – verifizierte Expertin (Sarah Müller), aktives Profil
 */
const fs = require('fs');
const path = require('path');

function loadEnvLocal() {
  const p = path.join(__dirname, '..', '.env.local');
  const env = {};
  for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) env[m[1].trim()] = m[2].trim();
  }
  return env;
}

const env = loadEnvLocal();
const URL = env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const PASSWORD = 'Test1234!';
const now = Date.now();
const days = (n) => new Date(now + n * 86400000).toISOString();
const hoursAgo = (h) => new Date(now - h * 3600000).toISOString();

async function api(method, pathname, body, { auth = true } = {}) {
  const res = await fetch(`${URL}${pathname}`, {
    method,
    headers: {
      apikey: KEY,
      Authorization: `Bearer ${KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) {
    const err = new Error(`${method} ${pathname} → ${res.status}: ${text.slice(0, 400)}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

async function createUser({ email, full_name, role }) {
  let id;
  try {
    const user = await api('POST', '/auth/v1/admin/users', {
      email,
      password: PASSWORD,
      email_confirm: true,
      user_metadata: { full_name, role },
    });
    id = user.id || user.user?.id;
  } catch (e) {
    if (e.status === 422 || String(e.message).includes('already')) {
      const list = await api('GET', `/auth/v1/admin/users?page=1&per_page=200`);
      const users = list.users || list;
      const found = (users || []).find((u) => u.email?.toLowerCase() === email.toLowerCase());
      if (found) id = found.id;
      else throw e;
    } else {
      throw e;
    }
  }
  if (!id) throw new Error(`Could not create/find user ${email}`);

  // Keep auth metadata in sync (needed for greeting fallbacks)
  await api('PUT', `/auth/v1/admin/users/${id}`, {
    user_metadata: { full_name, role },
    email_confirm: true,
  }).catch((e) => console.warn('metadata update skip', email, e.message?.slice(0, 80)));

  return id;
}

async function upsertProfile(id, { email, full_name, role, phone = '', avatar_url = '' }) {
  const payload = {
    email,
    full_name,
    role,
    phone,
    avatar_url,
    updated_at: new Date().toISOString(),
  };
  // Always PATCH so re-seeds refresh names/avatars for existing users
  const existing = await api('GET', `/rest/v1/profiles?id=eq.${id}&select=id`).catch(() => []);
  if (existing?.[0]?.id) {
    await api('PATCH', `/rest/v1/profiles?id=eq.${id}`, payload);
  } else {
    await api('POST', '/rest/v1/profiles', { id, ...payload });
  }
}

function normalizeFormat(f) {
  const v = (f || '').toLowerCase();
  if (v.includes('online')) return 'online';
  return 'in-person';
}

async function main() {
  console.log('Seeding', URL);

  // --- Core demo accounts ---
  const clientId = await createUser({
    email: 'client@test.com',
    full_name: 'Max Mustermann',
    role: 'client',
  });
  await upsertProfile(clientId, {
    email: 'client@test.com',
    full_name: 'Max Mustermann',
    role: 'client',
    phone: '+49 170 1111111',
    avatar_url: 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg',
  });
  console.log('✓ client@test.com', clientId);

  const expertUserId = await createUser({
    email: 'expert@test.com',
    full_name: 'Sarah Müller',
    role: 'expert',
  });
  await upsertProfile(expertUserId, {
    email: 'expert@test.com',
    full_name: 'Sarah Müller',
    role: 'expert',
    phone: '+49 89 12345678',
    avatar_url: 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg',
  });
  console.log('✓ expert@test.com', expertUserId);

  const onboardingId = await createUser({
    email: 'onboarding@test.com',
    full_name: 'Alex Neubeginn',
    role: 'expert',
  });
  await upsertProfile(onboardingId, {
    email: 'onboarding@test.com',
    full_name: 'Alex Neubeginn',
    role: 'expert',
    phone: '+49 170 0000000',
    avatar_url: 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg',
  });
  console.log('✓ onboarding@test.com', onboardingId);

  // Extra clients for expert bookings
  const extraClients = [
    {
      email: 'anna.schmidt@example.com',
      full_name: 'Anna Schmidt',
      phone: '+49 170 9876543',
      avatar_url: 'https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg',
    },
    {
      email: 'tom.weber@example.com',
      full_name: 'Tom Weber',
      phone: '+49 170 5555555',
      avatar_url: 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg',
    },
    {
      email: 'lisa.koenig@example.com',
      full_name: 'Lisa König',
      phone: '+49 170 2223344',
      avatar_url: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg',
    },
    {
      email: 'jonas.berger@example.com',
      full_name: 'Jonas Berger',
      phone: '+49 170 1112233',
      avatar_url: 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg',
    },
  ];
  const extraClientIds = [];
  for (const c of extraClients) {
    const id = await createUser({ email: c.email, full_name: c.full_name, role: 'client' });
    await upsertProfile(id, { ...c, role: 'client' });
    extraClientIds.push(id);
  }
  const [annaId, tomId, lisaId, jonasId] = extraClientIds;

  // --- Public marketplace experts (8) ---
  const marketplaceExperts = [
    {
      email: 'sarah.mueller@example.com',
      full_name: 'Sarah Müller',
      avatar_url: 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg',
      bio: 'Zertifizierte Physiotherapeutin mit 8 Jahren Erfahrung in manueller Therapie und Rehabilitation.',
      specializations: ['Physiotherapie', 'Manuelle Therapie', 'Rehabilitation'],
      certifications: ['Staatlich anerkannte Physiotherapeutin', 'Manuelle Therapie'],
      hourly_rate: 85,
      years_experience: 8,
      rating: 4.8,
      total_reviews: 124,
      address: 'Leopoldstraße 42',
      postal_code: '80802',
      city: 'München',
      phone: '+49 89 12345678',
      skip: true, // use expert@test.com instead
    },
    {
      email: 'michael.schmidt@example.com',
      full_name: 'Michael Schmidt',
      avatar_url: 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg',
      bio: 'Zertifizierter Personal Trainer mit Fokus auf Krafttraining und Körpertransformation.',
      specializations: ['Personal Training', 'Krafttraining', 'Ernährungsberatung'],
      certifications: ['A-Lizenz Personal Trainer', 'Ernährungsberater B-Lizenz'],
      hourly_rate: 75,
      years_experience: 6,
      rating: 4.9,
      total_reviews: 156,
      address: 'Friedrichstraße 88',
      postal_code: '10117',
      city: 'Berlin',
    },
    {
      email: 'julia.weber@example.com',
      full_name: 'Julia Weber',
      avatar_url: 'https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg',
      bio: 'Erfahrene Yoga-Lehrerin und Achtsamkeitscoach für Stressmanagement.',
      specializations: ['Yoga', 'Meditation', 'Stressmanagement'],
      certifications: ['200h Yoga Teacher Training', 'Mindfulness Coach'],
      hourly_rate: 65,
      years_experience: 5,
      rating: 4.7,
      total_reviews: 89,
      address: 'Schanzenstraße 12',
      postal_code: '20357',
      city: 'Hamburg',
    },
    {
      email: 'thomas.fischer@example.com',
      full_name: 'Thomas Fischer',
      avatar_url: 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg',
      bio: 'Sportphysiotherapeut spezialisiert auf Prävention und Rehabilitation.',
      specializations: ['Physiotherapie', 'Sportmedizin', 'Prävention'],
      certifications: ['Sportphysiotherapie', 'Manuelle Lymphdrainage'],
      hourly_rate: 90,
      years_experience: 10,
      rating: 4.8,
      total_reviews: 201,
      address: 'Zeil 45',
      postal_code: '60313',
      city: 'Frankfurt',
    },
    {
      email: 'anna.becker@example.com',
      full_name: 'Anna Becker',
      avatar_url: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg',
      bio: 'Ernährungsberaterin für ganzheitliche Gesundheit und Langlebigkeit.',
      specializations: ['Ernährung', 'Gesundheitscoaching', 'Prävention'],
      certifications: ['Ernährungsberaterin BSc', 'Health Coach'],
      hourly_rate: 70,
      years_experience: 4,
      rating: 4.6,
      total_reviews: 67,
      address: 'Schildergasse 18',
      postal_code: '50667',
      city: 'Köln',
    },
    {
      email: 'david.hoffmann@example.com',
      full_name: 'David Hoffmann',
      avatar_url: 'https://images.pexels.com/photos/1681010/pexels-photo-1681010.jpeg',
      bio: 'Massagetherapeut mit Fokus auf Tiefengewebsmassage und Faszientherapie.',
      specializations: ['Massage', 'Faszientherapie', 'Schmerztherapie'],
      certifications: ['Massagetherapeut', 'Faszientherapeut'],
      hourly_rate: 80,
      years_experience: 7,
      rating: 4.9,
      total_reviews: 178,
      address: 'Königstraße 30',
      postal_code: '70173',
      city: 'Stuttgart',
    },
    {
      email: 'laura.klein@example.com',
      full_name: 'Laura Klein',
      avatar_url: 'https://images.pexels.com/photos/1181686/pexels-photo-1181686.jpeg',
      bio: 'Osteopathin mit ganzheitlichem Ansatz für Beweglichkeit und Wohlbefinden.',
      specializations: ['Osteopathie', 'Manuelle Therapie', 'Prävention'],
      certifications: ['Osteopathin D.O.', 'Heilpraktikerin'],
      hourly_rate: 95,
      years_experience: 9,
      rating: 4.8,
      total_reviews: 142,
      address: 'Ludwigstraße 15',
      postal_code: '80539',
      city: 'München',
    },
    {
      email: 'markus.braun@example.com',
      full_name: 'Markus Braun',
      avatar_url: 'https://images.pexels.com/photos/1516680/pexels-photo-1516680.jpeg',
      bio: 'Physiotherapeut mit Fokus auf Rückengesundheit und Haltung.',
      specializations: ['Physiotherapie', 'Rückenschule', 'Prävention'],
      certifications: ['Physiotherapeut', 'Rückenschule'],
      hourly_rate: 78,
      years_experience: 6,
      rating: 4.5,
      total_reviews: 54,
      address: 'Königsallee 60',
      postal_code: '40212',
      city: 'Düsseldorf',
    },
  ];

  async function ensureExpertProfile(userId, e, { verified = true, force = false } = {}) {
    const specializations = e.specializations || [];
    const profession =
      e.profession ||
      (Array.isArray(e.professions) && e.professions[0]) ||
      specializations[0] ||
      '';
    const professions =
      Array.isArray(e.professions) && e.professions.length
        ? e.professions
        : profession
          ? [profession]
          : [];
    const payload = {
      bio: e.bio || '',
      specializations,
      profession,
      professions,
      certifications: e.certifications || [],
      hourly_rate: e.hourly_rate || 0,
      years_experience: e.years_experience || 0,
      rating: e.rating || 0,
      total_reviews: e.total_reviews || 0,
      is_verified: verified,
      verification_status: verified ? 'verified' : 'pending',
      address: e.address || '',
      postal_code: e.postal_code || '',
      city: e.city || '',
      country: 'Deutschland',
      profile_image_url: e.avatar_url || '',
      availability_status: verified ? 'available' : 'unavailable',
      is_profile_complete: verified,
      checklist_stammdaten_completed: verified,
      checklist_qualifications_uploaded: verified,
      checklist_offers_created: verified,
      checklist_availability_set: verified,
      checklist_stripe_connected: verified,
      qualification_verified: verified,
      admin_approval_status: verified ? 'approved' : 'pending',
      profile_completion_status: verified ? 'approved' : 'basic_signup',
    };

    const existing = await api(
      'GET',
      `/rest/v1/expert_profiles?user_id=eq.${userId}&select=id`
    );
    if (existing?.[0]?.id) {
      if (force) {
        await api('PATCH', `/rest/v1/expert_profiles?id=eq.${existing[0].id}`, payload);
      }
      return existing[0].id;
    }

    const rows = await api('POST', '/rest/v1/expert_profiles', {
      user_id: userId,
      ...payload,
    });
    return rows[0].id;
  }

  const mainExpertProfileId = await ensureExpertProfile(expertUserId, marketplaceExperts[0], {
    verified: true,
    force: true,
  });
  console.log('✓ main expert_profile (verified/active)', mainExpertProfileId);

  await ensureExpertProfile(
    onboardingId,
    {
      bio: '',
      specializations: [],
      certifications: [],
      hourly_rate: 0,
      years_experience: 0,
      rating: 0,
      total_reviews: 0,
      address: '',
      postal_code: '',
      city: '',
      avatar_url: '',
    },
    { verified: false, force: true }
  );
  console.log('✓ onboarding expert_profile (open verification)');

  const expertProfileByEmail = { 'expert@test.com': mainExpertProfileId };

  for (const e of marketplaceExperts) {
    if (e.skip) continue;
    const uid = await createUser({ email: e.email, full_name: e.full_name, role: 'expert' });
    await upsertProfile(uid, {
      email: e.email,
      full_name: e.full_name,
      role: 'expert',
      phone: e.phone || '',
      avatar_url: e.avatar_url,
    });
    const epid = await ensureExpertProfile(uid, e, { verified: true, force: true });
    expertProfileByEmail[e.email] = epid;
    console.log('✓ expert', e.full_name, epid);
  }

  // --- Offers for main expert ---
  async function ensureOffer(expertId, offer) {
    const location = {
      location_address: offer.location_address || '',
      location_postal_code: offer.location_postal_code || '',
      location_city: offer.location_city || '',
    };
    const existing = await api(
      'GET',
      `/rest/v1/expert_offers?expert_id=eq.${expertId}&title=eq.${encodeURIComponent(offer.title)}&select=id`
    );
    if (existing?.[0]?.id) {
      await api('PATCH', `/rest/v1/expert_offers?id=eq.${existing[0].id}`, {
        format: normalizeFormat(offer.format),
        ...location,
      });
      return existing[0].id;
    }
    const rows = await api('POST', '/rest/v1/expert_offers', {
      expert_id: expertId,
      title: offer.title,
      description: offer.description,
      category: offer.category,
      format: normalizeFormat(offer.format),
      duration_minutes: offer.duration_minutes,
      price: offer.price,
      is_active: true,
      ...location,
    });
    return rows[0].id;
  }

  const sarahLocation = {
    location_address: 'Leopoldstraße 42',
    location_postal_code: '80802',
    location_city: 'München',
  };

  const offerErst = await ensureOffer(mainExpertProfileId, {
    title: 'Erstberatung & Analyse',
    description: 'Umfassende Erstberatung mit Bewegungsanalyse und Behandlungsplan',
    category: 'Beratung',
    format: 'in-person',
    duration_minutes: 60,
    price: 85,
    ...sarahLocation,
  });
  const offerManuell = await ensureOffer(mainExpertProfileId, {
    title: 'Manuelle Therapie',
    description: 'Gezielte manuelle Behandlung bei Beschwerden',
    category: 'Behandlung',
    format: 'in-person',
    duration_minutes: 45,
    price: 70,
    ...sarahLocation,
  });
  const offerOnline = await ensureOffer(mainExpertProfileId, {
    title: 'Online Beratung',
    description: 'Flexible Online-Beratung per Video-Call',
    category: 'Beratung',
    format: 'online',
    duration_minutes: 30,
    price: 50,
  });
  const offerBehandlung = await ensureOffer(mainExpertProfileId, {
    title: 'Behandlungssession',
    description: 'Folgebehandlung nach Erstberatung.',
    category: 'Behandlung',
    format: 'in-person',
    duration_minutes: 45,
    price: 75,
    ...sarahLocation,
  });
  console.log('✓ offers', offerErst, offerManuell, offerOnline, offerBehandlung);

  // Offers for a couple of marketplace experts (for client bookings)
  const michaelId = expertProfileByEmail['michael.schmidt@example.com'];
  const juliaId = expertProfileByEmail['julia.weber@example.com'];
  const thomasId = expertProfileByEmail['thomas.fischer@example.com'];

  const offerPT = await ensureOffer(michaelId, {
    title: 'Personal Training Session',
    description: 'Individuelles Krafttraining mit persönlicher Betreuung',
    category: 'Training',
    format: 'in-person',
    duration_minutes: 60,
    price: 75,
    location_address: 'Friedrichstraße 88',
    location_postal_code: '10117',
    location_city: 'Berlin',
  });
  const offerYoga = await ensureOffer(juliaId, {
    title: 'Yoga & Meditation Session',
    description: 'Entspannung und Achtsamkeit für Körper und Geist',
    category: 'Yoga',
    format: 'in-person',
    duration_minutes: 90,
    price: 65,
    location_address: 'Schanzenstraße 12',
    location_postal_code: '20357',
    location_city: 'Hamburg',
  });
  const offerSport = await ensureOffer(thomasId, {
    title: 'Sportphysiotherapie',
    description: 'Behandlung und Prävention sportbedingter Beschwerden',
    category: 'Physiotherapie',
    format: 'in-person',
    duration_minutes: 60,
    price: 90,
    location_address: 'Zeil 45',
    location_postal_code: '60313',
    location_city: 'Frankfurt',
  });

  const annaExpertId = expertProfileByEmail['anna.becker@example.com'];
  const davidExpertId = expertProfileByEmail['david.hoffmann@example.com'];
  const lauraExpertId = expertProfileByEmail['laura.klein@example.com'];
  const markusExpertId = expertProfileByEmail['markus.braun@example.com'];

  await ensureOffer(annaExpertId, {
    title: 'Ernährungsberatung',
    description: 'Individueller Ernährungsplan und ganzheitliche Beratung',
    category: 'Ernährung',
    format: 'online',
    duration_minutes: 60,
    price: 70,
  });
  await ensureOffer(davidExpertId, {
    title: 'Tiefengewebsmassage',
    description: 'Intensive Massage bei Verspannungen und Faszienbeschwerden',
    category: 'Massage',
    format: 'in-person',
    duration_minutes: 60,
    price: 80,
    location_address: 'Königstraße 30',
    location_postal_code: '70173',
    location_city: 'Stuttgart',
  });
  await ensureOffer(lauraExpertId, {
    title: 'Osteopathie-Behandlung',
    description: 'Ganzheitliche osteopathische Behandlung',
    category: 'Osteopathie',
    format: 'in-person',
    duration_minutes: 60,
    price: 95,
    location_address: 'Ludwigstraße 15',
    location_postal_code: '80539',
    location_city: 'München',
  });
  await ensureOffer(markusExpertId, {
    title: 'Rückenschule & Haltung',
    description: 'Prävention und Übungen für einen gesunden Rücken',
    category: 'Physiotherapie',
    format: 'in-person',
    duration_minutes: 45,
    price: 78,
    location_address: 'Königsallee 60',
    location_postal_code: '40212',
    location_city: 'Düsseldorf',
  });
  await ensureOffer(juliaId, {
    title: 'Online Yoga Flow',
    description: 'Geführte Yoga-Einheit per Video',
    category: 'Yoga',
    format: 'online',
    duration_minutes: 45,
    price: 45,
  });

  // Activate online offer for main expert if previously inactive
  try {
    await api('PATCH', `/rest/v1/expert_offers?id=eq.${offerOnline}`, { is_active: true });
  } catch {
    /* ignore */
  }

  console.log('✓ marketplace offers', offerPT, offerYoga, offerSport);

  // Second offer per marketplace expert (min. 2 offers each)
  await ensureOffer(michaelId, {
    title: 'Online Trainingsplan Review',
    description: 'Besprechung und Anpassung deines Trainingsplans per Video',
    category: 'Training',
    format: 'online',
    duration_minutes: 30,
    price: 45,
  });
  await ensureOffer(thomasId, {
    title: 'Online Sportberatung',
    description: 'Beratung zu Belastung, Regeneration und Prävention',
    category: 'Beratung',
    format: 'online',
    duration_minutes: 30,
    price: 55,
  });
  await ensureOffer(annaExpertId, {
    title: 'Ernährungs-Check vor Ort',
    description: 'Persönliche Analyse und Einkaufsberatung',
    category: 'Ernährung',
    format: 'in-person',
    duration_minutes: 45,
    price: 65,
    location_address: 'Schildergasse 18',
    location_postal_code: '50667',
    location_city: 'Köln',
  });
  await ensureOffer(davidExpertId, {
    title: 'Entspannungsmassage',
    description: 'Wohltuende Massage zur Stressreduktion',
    category: 'Massage',
    format: 'in-person',
    duration_minutes: 45,
    price: 65,
    location_address: 'Königstraße 30',
    location_postal_code: '70173',
    location_city: 'Stuttgart',
  });
  await ensureOffer(lauraExpertId, {
    title: 'Online Osteopathie-Beratung',
    description: 'Einschätzung und Übungen per Video-Call',
    category: 'Osteopathie',
    format: 'online',
    duration_minutes: 30,
    price: 60,
  });
  await ensureOffer(markusExpertId, {
    title: 'Online Rückencheck',
    description: 'Analyse von Haltung und Alltagsbelastung online',
    category: 'Physiotherapie',
    format: 'online',
    duration_minutes: 30,
    price: 49,
  });

  // --- Availability for all verified marketplace experts ---
  async function ensureAvailability(expertProfileId, daysOfWeek, startTime = '09:00', endTime = '17:00') {
    if (!expertProfileId) return;
    try {
      await api('DELETE', `/rest/v1/expert_availability?expert_profile_id=eq.${expertProfileId}`);
    } catch {
      /* ignore */
    }
    const slots = daysOfWeek.map((dow) => ({
      expert_profile_id: expertProfileId,
      day_of_week: dow,
      start_time: startTime,
      end_time: endTime,
      is_available: true,
    }));
    await api('POST', '/rest/v1/expert_availability', slots);
  }

  await ensureAvailability(mainExpertProfileId, [1, 3, 5], '09:00', '17:00');
  await ensureAvailability(michaelId, [2, 4], '10:00', '18:00');
  await ensureAvailability(juliaId, [0, 2, 4, 6], '09:00', '14:00');
  await ensureAvailability(thomasId, [1, 2, 3, 4, 5], '08:00', '16:00');
  await ensureAvailability(annaExpertId, [1, 3, 5], '09:00', '15:00');
  await ensureAvailability(davidExpertId, [2, 3, 4, 5], '11:00', '19:00');
  await ensureAvailability(lauraExpertId, [1, 3, 5], '09:00', '17:00');
  await ensureAvailability(markusExpertId, [1, 2, 4], '08:00', '16:00');
  console.log('✓ availability for all marketplace experts');

  // Blocked day sample for calendar demo
  try {
    const existingBlock = await api(
      'GET',
      `/rest/v1/expert_absences?expert_profile_id=eq.${mainExpertProfileId}&select=id&limit=1`
    );
    if (!existingBlock?.length) {
      const blockDay = days(4).slice(0, 10);
      await api('POST', '/rest/v1/expert_absences', {
        expert_profile_id: mainExpertProfileId,
        start_date: blockDay,
        end_date: blockDay,
        reason: 'Fortbildung',
      });
    }
    console.log('✓ blocked day');
  } catch (e) {
    console.warn('absences skip:', e.message.slice(0, 160));
  }

  // --- Appointments ---
  async function ensureAppointment(row) {
    const existing = await api(
      'GET',
      `/rest/v1/appointments?client_id=eq.${row.client_id}&expert_id=eq.${row.expert_id}&start_time=eq.${encodeURIComponent(row.start_time)}&select=id`
    );
    if (existing?.[0]?.id) return existing[0].id;
    const rows = await api('POST', '/rest/v1/appointments', row);
    return rows[0].id;
  }

  // Keep client calendar realistic: wipe prior demo bookings (seed re-runs otherwise pile up)
  async function resetClientAppointments(cid) {
    try {
      const threads = await api('GET', `/rest/v1/chat_threads?client_id=eq.${cid}&select=id`);
      for (const t of threads || []) {
        try {
          await api('DELETE', `/rest/v1/chat_messages?thread_id=eq.${t.id}`);
        } catch {
          /* ignore */
        }
      }
      await api('DELETE', `/rest/v1/chat_threads?client_id=eq.${cid}`);
    } catch {
      /* ignore */
    }
    try {
      await api('DELETE', `/rest/v1/reviews?client_id=eq.${cid}`);
    } catch {
      /* ignore */
    }
    await api('DELETE', `/rest/v1/appointments?client_id=eq.${cid}`);
  }

  await resetClientAppointments(clientId);

  // Client view: ~1 session / week (never stacked same day)
  const atHour = (dayOffset, hour, minute = 0) => {
    const d = new Date(now + dayOffset * 86400000);
    d.setHours(hour, minute, 0, 0);
    return d;
  };
  let todaySession = atHour(0, Math.min(20, new Date().getHours() + 3), 0);
  if (todaySession.getTime() <= Date.now()) {
    todaySession = atHour(1, 11, 0);
  }

  async function upsertClientAppointment(row) {
    const rows = await api('POST', '/rest/v1/appointments', row);
    return rows[0].id;
  }

  await upsertClientAppointment({
    client_id: clientId,
    expert_id: mainExpertProfileId,
    offer_id: offerErst,
    start_time: todaySession.toISOString(),
    end_time: new Date(todaySession.getTime() + 60 * 60000).toISOString(),
    status: 'confirmed',
    notes: 'Bitte bringen Sie bequeme Kleidung mit.',
    total_price: 85,
    payment_status: 'paid',
  });
  const inFourDays = atHour(4, 10, 0);
  await upsertClientAppointment({
    client_id: clientId,
    expert_id: michaelId,
    offer_id: offerPT,
    start_time: inFourDays.toISOString(),
    end_time: new Date(inFourDays.getTime() + 60 * 60000).toISOString(),
    status: 'confirmed',
    total_price: 75,
    payment_status: 'paid',
  });
  const inElevenDays = atHour(11, 14, 0);
  await upsertClientAppointment({
    client_id: clientId,
    expert_id: juliaId,
    offer_id: offerYoga,
    start_time: inElevenDays.toISOString(),
    end_time: new Date(inElevenDays.getTime() + 90 * 60000).toISOString(),
    status: 'confirmed',
    total_price: 65,
    payment_status: 'paid',
  });

  // Expert view: bookings for Sarah / expert@test.com (other clients – not demo client)
  await ensureAppointment({
    client_id: annaId,
    expert_id: mainExpertProfileId,
    offer_id: offerManuell,
    start_time: days(2),
    end_time: new Date(now + 2 * 86400000 + 45 * 60000).toISOString(),
    status: 'confirmed',
    total_price: 70,
    payment_status: 'paid',
  });
  await ensureAppointment({
    client_id: tomId,
    expert_id: mainExpertProfileId,
    offer_id: offerOnline,
    start_time: days(5),
    end_time: new Date(now + 5 * 86400000 + 60 * 60000).toISOString(),
    status: 'confirmed',
    total_price: 85,
    payment_status: 'paid',
  });
  await ensureAppointment({
    client_id: lisaId,
    expert_id: mainExpertProfileId,
    offer_id: offerBehandlung,
    start_time: days(3),
    end_time: new Date(now + 3 * 86400000 + 45 * 60000).toISOString(),
    status: 'confirmed',
    total_price: 75,
    payment_status: 'paid',
  });
  // past completed (other clients)
  await ensureAppointment({
    client_id: annaId,
    expert_id: mainExpertProfileId,
    offer_id: offerErst,
    start_time: days(-5),
    end_time: new Date(now - 5 * 86400000 + 60 * 60000).toISOString(),
    status: 'completed',
    total_price: 85,
    payment_status: 'paid',
  });
  const jonasPastId = await ensureAppointment({
    client_id: jonasId,
    expert_id: mainExpertProfileId,
    offer_id: offerManuell,
    start_time: days(-12),
    end_time: new Date(now - 12 * 86400000 + 45 * 60000).toISOString(),
    status: 'completed',
    total_price: 70,
    payment_status: 'paid',
  });

  console.log('✓ appointments');

  // Completed sessions for main client → open reviews (no review rows)
  const clientPastSarah = await upsertClientAppointment({
    client_id: clientId,
    expert_id: mainExpertProfileId,
    offer_id: offerErst,
    start_time: days(-3),
    end_time: new Date(now - 3 * 86400000 + 60 * 60000).toISOString(),
    status: 'completed',
    total_price: 85,
    payment_status: 'paid',
    notes: 'Abgeschlossene Session – Bewertung offen',
  });
  const clientPastMichael = await upsertClientAppointment({
    client_id: clientId,
    expert_id: michaelId,
    offer_id: offerPT,
    start_time: days(-10),
    end_time: new Date(now - 10 * 86400000 + 60 * 60000).toISOString(),
    status: 'completed',
    total_price: 75,
    payment_status: 'paid',
    notes: 'Personal Training abgeschlossen',
  });
  console.log('✓ client pending-review appointments', clientPastSarah, clientPastMichael);

  // Chat threads + messages (aligned with mock chat demo)
  async function ensureThread(appointmentId, threadClientId, expertProfileId) {
    const existing = await api(
      'GET',
      `/rest/v1/chat_threads?appointment_id=eq.${appointmentId}&select=id`
    );
    if (existing?.[0]?.id) return existing[0].id;
    const rows = await api('POST', '/rest/v1/chat_threads', {
      appointment_id: appointmentId,
      client_id: threadClientId,
      expert_id: expertProfileId,
      updated_at: new Date().toISOString(),
    });
    return rows[0].id;
  }

  async function ensureMessages(threadId, messages) {
    const existingMsgs = await api(
      'GET',
      `/rest/v1/chat_messages?thread_id=eq.${threadId}&select=id`
    );
    if ((existingMsgs?.length || 0) >= messages.length) return;
    if (existingMsgs?.length) {
      await api('DELETE', `/rest/v1/chat_messages?thread_id=eq.${threadId}`);
    }
    await api('POST', '/rest/v1/chat_messages', messages);
  }

  const clientAptWithSarah = await api(
    'GET',
    `/rest/v1/appointments?client_id=eq.${clientId}&expert_id=eq.${mainExpertProfileId}&status=eq.confirmed&select=id&order=start_time.asc&limit=1`
  );
  const clientAptWithMichael = await api(
    'GET',
    `/rest/v1/appointments?client_id=eq.${clientId}&expert_id=eq.${michaelId}&status=eq.confirmed&select=id&order=start_time.asc&limit=1`
  );
  const clientAptWithJulia = await api(
    'GET',
    `/rest/v1/appointments?client_id=eq.${clientId}&expert_id=eq.${juliaId}&status=eq.confirmed&select=id&order=start_time.asc&limit=1`
  );
  const annaApt = await api(
    'GET',
    `/rest/v1/appointments?client_id=eq.${annaId}&expert_id=eq.${mainExpertProfileId}&status=eq.confirmed&select=id&order=start_time.asc&limit=1`
  );
  const tomApt = await api(
    'GET',
    `/rest/v1/appointments?client_id=eq.${tomId}&expert_id=eq.${mainExpertProfileId}&status=eq.confirmed&select=id&order=start_time.asc&limit=1`
  );

  const michaelUserId = (
    await api('GET', `/rest/v1/expert_profiles?id=eq.${michaelId}&select=user_id`)
  )?.[0]?.user_id;
  const juliaUserId = (
    await api('GET', `/rest/v1/expert_profiles?id=eq.${juliaId}&select=user_id`)
  )?.[0]?.user_id;

  if (clientAptWithSarah?.[0]?.id) {
    const threadSarah = await ensureThread(
      clientAptWithSarah[0].id,
      clientId,
      mainExpertProfileId
    );
    await ensureMessages(threadSarah, [
      {
        thread_id: threadSarah,
        sender_id: clientId,
        message:
          'Hallo Sarah! Hast du noch einen Moment für eine Frage zur Erstberatung am Freitag?',
        is_read: true,
        created_at: hoursAgo(5),
      },
      {
        thread_id: threadSarah,
        sender_id: expertUserId,
        message: 'Hallo Max, gerne! Was möchtest du wissen?',
        is_read: true,
        created_at: hoursAgo(4),
      },
      {
        thread_id: threadSarah,
        sender_id: clientId,
        message: 'Soll ich Befunde oder Röntgenbilder mitbringen?',
        is_read: true,
        created_at: hoursAgo(3.5),
      },
      {
        thread_id: threadSarah,
        sender_id: expertUserId,
        message:
          'Ja bitte, falls vorhanden. Ansonsten reicht es, wenn du deine Beschwerden grob notierst.',
        is_read: true,
        created_at: hoursAgo(2),
      },
      {
        thread_id: threadSarah,
        sender_id: clientId,
        message: 'Perfekt – ich freue mich auf Freitag!',
        is_read: false,
        created_at: hoursAgo(0.6),
      },
    ]);
  }

  if (clientAptWithMichael?.[0]?.id && michaelUserId) {
    const threadMichael = await ensureThread(
      clientAptWithMichael[0].id,
      clientId,
      michaelId
    );
    await ensureMessages(threadMichael, [
      {
        thread_id: threadMichael,
        sender_id: michaelUserId,
        message:
          'Hi Max! Für unser Personal Training bring bitte Sportkleidung und ein Handtuch mit.',
        is_read: true,
        created_at: hoursAgo(7),
      },
      {
        thread_id: threadMichael,
        sender_id: clientId,
        message: 'Alles klar. Gibt es Parkplätze vor Ort?',
        is_read: true,
        created_at: hoursAgo(6.5),
      },
      {
        thread_id: threadMichael,
        sender_id: michaelUserId,
        message: 'Ja, direkt hinter dem Studio – die ersten 2 Stunden sind kostenlos.',
        is_read: true,
        created_at: hoursAgo(6.2),
      },
      {
        thread_id: threadMichael,
        sender_id: clientId,
        message: 'Super, danke für den Hinweis – bis bald!',
        is_read: true,
        created_at: hoursAgo(6),
      },
    ]);
  }

  if (clientAptWithJulia?.[0]?.id && juliaUserId) {
    const threadJulia = await ensureThread(clientAptWithJulia[0].id, clientId, juliaId);
    await ensureMessages(threadJulia, [
      {
        thread_id: threadJulia,
        sender_id: clientId,
        message:
          'Hallo Julia, ich freue mich auf die Yoga-Session. Bin kompletter Anfänger – passt das?',
        is_read: true,
        created_at: hoursAgo(26),
      },
      {
        thread_id: threadJulia,
        sender_id: juliaUserId,
        message: 'Absolut! Wir starten ganz ruhig und ich passe alles an dein Tempo an.',
        is_read: false,
        created_at: hoursAgo(23),
      },
      {
        thread_id: threadJulia,
        sender_id: juliaUserId,
        message: 'Bring gerne eine Matte mit – ansonsten habe ich Leihmatten da.',
        is_read: false,
        created_at: hoursAgo(22),
      },
    ]);
  }

  if (annaApt?.[0]?.id) {
    const threadAnna = await ensureThread(annaApt[0].id, annaId, mainExpertProfileId);
    await ensureMessages(threadAnna, [
      {
        thread_id: threadAnna,
        sender_id: annaId,
        message:
          'Hallo Sarah, ich habe seit gestern stärkere Nackenschmerzen. Sollen wir den Fokus anpassen?',
        is_read: true,
        created_at: hoursAgo(3),
      },
      {
        thread_id: threadAnna,
        sender_id: expertUserId,
        message:
          'Danke fürs Bescheidgeben – ja, dann starten wir mit einer kurzen Untersuchung und lockern den Nackenbereich.',
        is_read: true,
        created_at: hoursAgo(2),
      },
      {
        thread_id: threadAnna,
        sender_id: annaId,
        message: 'Danke, ich melde mich, falls noch Fragen sind.',
        is_read: false,
        created_at: hoursAgo(0.8),
      },
    ]);
  }

  if (tomApt?.[0]?.id) {
    const threadTom = await ensureThread(tomApt[0].id, tomId, mainExpertProfileId);
    await ensureMessages(threadTom, [
      {
        thread_id: threadTom,
        sender_id: tomId,
        message: 'Hi! Komme ich per Laptop oder reicht das Handy für die Online-Session?',
        is_read: true,
        created_at: hoursAgo(30),
      },
      {
        thread_id: threadTom,
        sender_id: expertUserId,
        message: 'Laptop ist angenehmer, aber Handy geht auch. Bitte stabile WLAN-Verbindung.',
        is_read: true,
        created_at: hoursAgo(29),
      },
      {
        thread_id: threadTom,
        sender_id: expertUserId,
        message: 'Online-Link schicke ich dir 15 Min. vorher.',
        is_read: true,
        created_at: hoursAgo(28),
      },
    ]);
  }

  if (jonasPastId) {
    const threadJonas = await ensureThread(jonasPastId, jonasId, mainExpertProfileId);
    await ensureMessages(threadJonas, [
      {
        thread_id: threadJonas,
        sender_id: expertUserId,
        message:
          'Hallo Jonas, wie geht es nach der letzten Sitzung? Konntest du die Übungen machen?',
        is_read: true,
        created_at: days(-6),
      },
      {
        thread_id: threadJonas,
        sender_id: jonasId,
        message: 'Ja, jeden Morgen. Der Schulterbereich fühlt sich deutlich freier an.',
        is_read: true,
        created_at: days(-5.5),
      },
      {
        thread_id: threadJonas,
        sender_id: jonasId,
        message: 'Vielen Dank nochmal – die Übungen helfen schon!',
        is_read: true,
        created_at: days(-5),
      },
    ]);
  }
  console.log('✓ chat threads + messages');

  // Reviews – at least one per verified marketplace expert
  try {
    async function ensureReview(row) {
      const existing = await api(
        'GET',
        `/rest/v1/reviews?appointment_id=eq.${row.appointment_id}&select=id`
      );
      if (existing?.length) return;
      await api('POST', '/rest/v1/reviews', row);
    }

    async function ensureCompletedWithReview({
      expertProfileId,
      offerId,
      clientUserId,
      dayOffset,
      rating,
      title,
      review_text,
      helpful_count = 2,
      durationMinutes = 60,
      price = 70,
    }) {
      if (!expertProfileId || !offerId || !clientUserId) return;
      const start = new Date(now + dayOffset * 86400000);
      start.setHours(11, 0, 0, 0);
      const end = new Date(start.getTime() + durationMinutes * 60000);
      const aptId = await ensureAppointment({
        client_id: clientUserId,
        expert_id: expertProfileId,
        offer_id: offerId,
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        status: 'completed',
        total_price: price,
        payment_status: 'paid',
      });
      if (!aptId) return;
      await ensureReview({
        appointment_id: aptId,
        expert_profile_id: expertProfileId,
        client_id: clientUserId,
        rating,
        title,
        review_text,
        helpful_count,
      });
    }

    if (jonasPastId) {
      await ensureReview({
        appointment_id: jonasPastId,
        expert_profile_id: mainExpertProfileId,
        client_id: jonasId,
        rating: 5,
        title: 'Sehr professionell',
        review_text: 'Sehr professionell und einfühlsam – klare Übungen für zuhause.',
        helpful_count: 4,
      });
    }
    const annaPast = await api(
      'GET',
      `/rest/v1/appointments?client_id=eq.${annaId}&expert_id=eq.${mainExpertProfileId}&status=eq.completed&select=id&limit=1`
    );
    if (annaPast?.[0]?.id) {
      await ensureReview({
        appointment_id: annaPast[0].id,
        expert_profile_id: mainExpertProfileId,
        client_id: annaId,
        rating: 5,
        title: 'Sehr hilfreich',
        review_text: 'Tolle Erstberatung, klare Empfehlungen und angenehme Atmosphäre.',
        helpful_count: 3,
      });
    }

    // Extra Sarah review from main demo client
    await ensureCompletedWithReview({
      expertProfileId: mainExpertProfileId,
      offerId: offerBehandlung,
      clientUserId: clientId,
      dayOffset: -18,
      rating: 5,
      title: 'Fühle mich deutlich besser',
      review_text:
        'Nach wenigen Sitzungen spüre ich klare Fortschritte. Sarah erklärt alles verständlich und nimmt sich Zeit.',
      helpful_count: 6,
      durationMinutes: 45,
      price: 75,
    });

    // One of the visible „Vergangene“ sessions is already rated (UI: „Bereits bewertet“)
    if (clientPastMichael) {
      await ensureReview({
        appointment_id: clientPastMichael,
        expert_profile_id: michaelId,
        client_id: clientId,
        rating: 5,
        title: 'Starkes Training',
        review_text: 'Motivierend und effektiv – genau die richtige Intensität.',
        helpful_count: 2,
      });
      console.log('✓ client past Michael marked as reviewed', clientPastMichael);
    }
    await ensureCompletedWithReview({
      expertProfileId: mainExpertProfileId,
      offerId: offerManuell,
      clientUserId: lisaId,
      dayOffset: -25,
      rating: 4,
      title: 'Sehr gute Behandlung',
      review_text:
        'Kompetent, freundlich und strukturiert. Die manuelle Therapie hat meine Verspannungen gelöst.',
      helpful_count: 2,
      durationMinutes: 45,
      price: 70,
    });

    // One review per other marketplace expert
    await ensureCompletedWithReview({
      expertProfileId: michaelId,
      offerId: offerPT,
      clientUserId: tomId,
      dayOffset: -14,
      rating: 5,
      title: 'Starkes Training',
      review_text: 'Motivierend und effektiv – mein Kraftlevel hat sich spürbar verbessert.',
      price: 75,
    });
    await ensureCompletedWithReview({
      expertProfileId: juliaId,
      offerId: offerYoga,
      clientUserId: lisaId,
      dayOffset: -11,
      rating: 5,
      title: 'Wunderbar entspannt',
      review_text: 'Die Yoga-Session war genau richtig für meinen Stress. Komme gerne wieder.',
      durationMinutes: 90,
      price: 65,
    });
    await ensureCompletedWithReview({
      expertProfileId: thomasId,
      offerId: offerSport,
      clientUserId: jonasId,
      dayOffset: -16,
      rating: 5,
      title: 'Endlich schmerzfrei trainieren',
      review_text: 'Thomas hat die Ursache meiner Beschwerden schnell gefunden. Top Sportphysio.',
      price: 90,
    });

    const offerAnna = await api(
      'GET',
      `/rest/v1/expert_offers?expert_id=eq.${annaExpertId}&title=eq.${encodeURIComponent('Ernährungsberatung')}&select=id&limit=1`
    );
    await ensureCompletedWithReview({
      expertProfileId: annaExpertId,
      offerId: offerAnna?.[0]?.id,
      clientUserId: annaId,
      dayOffset: -9,
      rating: 4,
      title: 'Klare Ernährungsstrategie',
      review_text: 'Praktische Tipps ohne Dogma – fühle mich energiegeladener im Alltag.',
      price: 70,
    });

    const offerDavid = await api(
      'GET',
      `/rest/v1/expert_offers?expert_id=eq.${davidExpertId}&title=eq.${encodeURIComponent('Tiefengewebsmassage')}&select=id&limit=1`
    );
    await ensureCompletedWithReview({
      expertProfileId: davidExpertId,
      offerId: offerDavid?.[0]?.id,
      clientUserId: tomId,
      dayOffset: -8,
      rating: 5,
      title: 'Verspannungen weg',
      review_text: 'Intensive, aber wohltuende Massage. Nacken und Schultern fühlen sich frei an.',
      price: 80,
    });

    const offerLaura = await api(
      'GET',
      `/rest/v1/expert_offers?expert_id=eq.${lauraExpertId}&title=eq.${encodeURIComponent('Osteopathie-Behandlung')}&select=id&limit=1`
    );
    await ensureCompletedWithReview({
      expertProfileId: lauraExpertId,
      offerId: offerLaura?.[0]?.id,
      clientUserId: lisaId,
      dayOffset: -13,
      rating: 5,
      title: 'Ganzheitlich und einfühlsam',
      review_text: 'Laura nimmt sich Zeit und schaut den ganzen Körper an. Sehr empfehlenswert.',
      price: 95,
    });

    const offerMarkus = await api(
      'GET',
      `/rest/v1/expert_offers?expert_id=eq.${markusExpertId}&title=eq.${encodeURIComponent('Rückenschule & Haltung')}&select=id&limit=1`
    );
    await ensureCompletedWithReview({
      expertProfileId: markusExpertId,
      offerId: offerMarkus?.[0]?.id,
      clientUserId: jonasId,
      dayOffset: -7,
      rating: 4,
      title: 'Gute Übungen für den Alltag',
      review_text: 'Praktische Rückenschule – die Haltungstipps nutze ich jetzt täglich im Büro.',
      durationMinutes: 45,
      price: 78,
    });

    console.log('✓ reviews for all marketplace experts');
  } catch (e) {
    console.warn('review skip:', e.message.slice(0, 160));
  }

  // Personal calendar event for client
  try {
    const existingPersonal = await api(
      'GET',
      `/rest/v1/personal_calendar_events?user_id=eq.${clientId}&select=id&limit=1`
    );
    if (!existingPersonal?.length) {
      await api('POST', '/rest/v1/personal_calendar_events', {
        user_id: clientId,
        title: 'Arzttermin',
        notes: 'Hausarzt – Vorsorge',
        start_time: new Date(now + 4 * 86400000 + 10 * 3600000).toISOString(),
        end_time: new Date(now + 4 * 86400000 + 11 * 3600000).toISOString(),
      });
    }
    console.log('✓ personal calendar');
  } catch (e) {
    console.warn('personal calendar skip:', e.message.slice(0, 160));
  }

  // --- Notifications (client + expert) ---
  try {
    async function ensureNotification(row) {
      const existing = await api(
        'GET',
        `/rest/v1/booking_notifications?user_id=eq.${row.user_id}&notification_type=eq.${encodeURIComponent(row.notification_type)}&title=eq.${encodeURIComponent(row.title)}&select=id&limit=1`
      );
      if (existing?.[0]?.id) {
        await api('PATCH', `/rest/v1/booking_notifications?id=eq.${existing[0].id}`, {
          message: row.message,
          is_read: row.is_read,
          created_at: row.created_at,
          booking_id: row.booking_id,
        });
        return existing[0].id;
      }
      const rows = await api('POST', '/rest/v1/booking_notifications', row);
      return rows[0].id;
    }

    const pastForNotif = await api(
      'GET',
      `/rest/v1/appointments?expert_id=eq.${mainExpertProfileId}&status=eq.completed&select=id&order=start_time.desc&limit=1`
    );
    const upcomingForNotif = await api(
      'GET',
      `/rest/v1/appointments?expert_id=eq.${mainExpertProfileId}&status=eq.confirmed&select=id&order=start_time.asc&limit=1`
    );
    const notifBookingId =
      pastForNotif?.[0]?.id || upcomingForNotif?.[0]?.id || offerErst;
    const clientUpcomingId = clientAptWithSarah?.[0]?.id || notifBookingId;

    // Client notifications
    await ensureNotification({
      user_id: clientId,
      booking_type: 'appointment',
      booking_id: clientPastSarah,
      notification_type: 'review_request',
      title: 'Bewertung abgeben',
      message:
        'Wie war deine Session mit Sarah Müller („Erstberatung & Analyse“)? Teile kurz deine Erfahrung.',
      is_read: false,
      created_at: hoursAgo(0.5),
    });
    await ensureNotification({
      user_id: clientId,
      booking_type: 'appointment',
      booking_id: clientUpcomingId,
      notification_type: 'booking_created',
      title: 'Termin gebucht',
      message: 'Dein Termin „Erstberatung & Analyse“ mit Sarah Müller ist gebucht.',
      is_read: false,
      created_at: hoursAgo(0.2),
    });
    await ensureNotification({
      user_id: clientId,
      booking_type: 'appointment',
      booking_id: clientUpcomingId,
      notification_type: 'reminder',
      title: 'Terminerinnerung',
      message: 'Dein Termin mit Sarah Müller findet morgen um 11:00 Uhr statt.',
      is_read: false,
      created_at: hoursAgo(0.75),
    });
    await ensureNotification({
      user_id: clientId,
      booking_type: 'appointment',
      booking_id: clientAptWithMichael?.[0]?.id || clientUpcomingId,
      notification_type: 'payment_received',
      title: 'Zahlung erhalten',
      message: 'Deine Zahlung für „Personal Training Session“ wurde erfolgreich verarbeitet.',
      is_read: true,
      created_at: hoursAgo(2),
    });
    await ensureNotification({
      user_id: clientId,
      booking_type: 'appointment',
      booking_id: clientUpcomingId,
      notification_type: 'chat_message',
      title: 'Neue Nachricht',
      message: 'Sarah Müller hat dir eine Nachricht geschrieben.',
      is_read: false,
      created_at: hoursAgo(8),
    });

    // Expert notifications
    await ensureNotification({
      user_id: expertUserId,
      booking_type: 'appointment',
      booking_id: notifBookingId,
      notification_type: 'booking_created',
      title: 'Neue Buchung',
      message:
        'Max Mustermann hat „Erstberatung & Analyse“ für morgen gebucht. Öffne die Termine, um Details zu sehen.',
      is_read: false,
      created_at: hoursAgo(0.35),
    });
    await ensureNotification({
      user_id: expertUserId,
      booking_type: 'appointment',
      booking_id: annaApt?.[0]?.id || notifBookingId,
      notification_type: 'booking_created',
      title: 'Neue Buchung',
      message: 'Anna Schmidt hat „Manuelle Therapie“ gebucht (übermorgen, 45 Min.).',
      is_read: false,
      created_at: hoursAgo(2),
    });
    await ensureNotification({
      user_id: expertUserId,
      booking_type: 'appointment',
      booking_id: jonasPastId || notifBookingId,
      notification_type: 'new_review',
      title: 'Neue Bewertung',
      message:
        'Jonas Berger hat dich mit 5 Sternen bewertet: „Sehr professionell und einfühlsam“.',
      is_read: false,
      created_at: hoursAgo(3),
    });
    await ensureNotification({
      user_id: expertUserId,
      booking_type: 'appointment',
      booking_id: notifBookingId,
      notification_type: 'payment_received',
      title: 'Zahlung eingegangen',
      message:
        '€85,00 für „Erstberatung & Analyse“ (Max Mustermann) wurden deinem Konto gutgeschrieben.',
      is_read: false,
      created_at: hoursAgo(5),
    });
    await ensureNotification({
      user_id: expertUserId,
      booking_type: 'appointment',
      booking_id: notifBookingId,
      notification_type: 'payout_info',
      title: 'Auszahlungsinformationen',
      message:
        'Deine nächste Auszahlung (€240,00) ist für Freitag geplant. Details und Bankverbindung findest du unter Finanzen.',
      is_read: false,
      created_at: hoursAgo(6),
    });
    await ensureNotification({
      user_id: expertUserId,
      booking_type: 'appointment',
      booking_id: annaApt?.[0]?.id || notifBookingId,
      notification_type: 'chat_message',
      title: 'Neue Nachricht',
      message: 'Anna Schmidt hat dir eine Nachricht geschrieben.',
      is_read: false,
      created_at: hoursAgo(0.9),
    });
    await ensureNotification({
      user_id: expertUserId,
      booking_type: 'appointment',
      booking_id: clientUpcomingId,
      notification_type: 'reminder',
      title: 'Terminerinnerung',
      message: 'Morgen: Erstberatung & Analyse mit Max Mustermann.',
      is_read: true,
      created_at: hoursAgo(26),
    });
    console.log('✓ client + expert notifications');
  } catch (e) {
    console.warn('notifications skip:', e.message.slice(0, 160));
  }

  console.log('\nDone. Demo passwords: Test1234!');
  console.log('  client@test.com / expert@test.com / onboarding@test.com');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
