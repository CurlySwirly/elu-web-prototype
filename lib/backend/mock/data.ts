import type { Expert, ExpertOffer, Appointment, Room, RoomBooking, UserProfile, PlatformReview } from '@/lib/types';

export const mockExperts: Expert[] = [
  {
    id: '1',
    user_id: 'user-1',
    full_name: 'Sarah Müller',
    avatar_url: 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg',
    bio: 'Zertifizierte Physiotherapeutin mit 8 Jahren Erfahrung in manueller Therapie und Rehabilitation.',
    specializations: ['Physiotherapie', 'Manuelle Therapie', 'Rehabilitation'],
    hourly_rate: 85.00,
    rating: 4.8,
    total_reviews: 124,
    is_verified: true,
    address: 'Leopoldstraße 42',
    postal_code: '80802',
    city: 'München',
    country: 'Deutschland',
    email: 'sarah.mueller@example.com',
    phone: '+49 89 12345678',
    certifications: ['Staatlich anerkannte Physiotherapeutin', 'Manuelle Therapie'],
    years_experience: 8,
    availability_status: 'available',
  },
  {
    id: '2',
    user_id: 'user-2',
    full_name: 'Michael Schmidt',
    avatar_url: 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg',
    bio: 'Zertifizierter Personal Trainer mit Fokus auf Krafttraining und Körpertransformation.',
    specializations: ['Personal Training', 'Krafttraining', 'Ernährungsberatung'],
    hourly_rate: 75.00,
    rating: 4.9,
    total_reviews: 156,
    is_verified: true,
    address: 'Friedrichstraße 88',
    postal_code: '10117',
    city: 'Berlin',
    country: 'Deutschland',
    certifications: ['A-Lizenz Personal Trainer', 'Ernährungsberater B-Lizenz'],
    years_experience: 6,
    availability_status: 'busy',
  },
  {
    id: '3',
    user_id: 'user-3',
    full_name: 'Julia Weber',
    avatar_url: 'https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg',
    bio: 'Erfahrene Yoga-Lehrerin und Achtsamkeitscoach für Stressmanagement.',
    specializations: ['Yoga', 'Meditation', 'Stressmanagement'],
    hourly_rate: 65.00,
    rating: 4.7,
    total_reviews: 89,
    is_verified: true,
    address: 'Schanzenstraße 12',
    postal_code: '20357',
    city: 'Hamburg',
    country: 'Deutschland',
    certifications: ['200h Yoga Teacher Training', 'Mindfulness Coach'],
    years_experience: 5,
    availability_status: 'available',
  },
  {
    id: '4',
    user_id: 'user-4',
    full_name: 'Thomas Fischer',
    avatar_url: 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg',
    bio: 'Sportphysiotherapeut spezialisiert auf Prävention und Rehabilitation.',
    specializations: ['Physiotherapie', 'Sportmedizin', 'Prävention'],
    hourly_rate: 90.00,
    rating: 4.8,
    total_reviews: 201,
    is_verified: true,
    address: 'Zeil 45',
    postal_code: '60313',
    city: 'Frankfurt',
    country: 'Deutschland',
    certifications: ['Sportphysiotherapie', 'Manuelle Lymphdrainage'],
    years_experience: 10,
    availability_status: 'busy',
  },
  {
    id: '5',
    user_id: 'user-5',
    full_name: 'Anna Becker',
    avatar_url: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg',
    bio: 'Ernährungsberaterin für ganzheitliche Gesundheit und Langlebigkeit.',
    specializations: ['Ernährung', 'Gesundheitscoaching', 'Prävention'],
    hourly_rate: 70.00,
    rating: 4.6,
    total_reviews: 67,
    is_verified: true,
    address: 'Schildergasse 18',
    postal_code: '50667',
    city: 'Köln',
    country: 'Deutschland',
    certifications: ['Ernährungsberaterin BSc', 'Health Coach'],
    years_experience: 4,
    availability_status: 'available',
  },
  {
    id: '6',
    user_id: 'user-6',
    full_name: 'David Hoffmann',
    avatar_url: 'https://images.pexels.com/photos/1681010/pexels-photo-1681010.jpeg',
    bio: 'Massagetherapeut mit Fokus auf Tiefengewebsmassage und Faszientherapie.',
    specializations: ['Massage', 'Faszientherapie', 'Schmerztherapie'],
    hourly_rate: 80.00,
    rating: 4.9,
    total_reviews: 178,
    is_verified: true,
    address: 'Königstraße 30',
    postal_code: '70173',
    city: 'Stuttgart',
    country: 'Deutschland',
    certifications: ['Massagetherapeut', 'Faszientherapeut'],
    years_experience: 7,
    availability_status: 'available',
  },
  {
    id: '7',
    user_id: 'user-7',
    full_name: 'Lisa Schulz',
    avatar_url: 'https://images.pexels.com/photos/1468379/pexels-photo-1468379.jpeg',
    bio: 'Mental Coach für Leistungssteigerung und persönliche Entwicklung.',
    specializations: ['Coaching', 'Mentale Gesundheit', 'Persönlichkeitsentwicklung'],
    hourly_rate: 95.00,
    rating: 4.8,
    total_reviews: 143,
    is_verified: true,
    address: 'Maximilianstraße 15',
    postal_code: '80539',
    city: 'München',
    country: 'Deutschland',
    certifications: ['Systemischer Coach', 'NLP Master'],
    years_experience: 9,
    availability_status: 'busy',
  },
  {
    id: '8',
    user_id: 'user-8',
    full_name: 'Markus Wagner',
    avatar_url: 'https://images.pexels.com/photos/1043474/pexels-photo-1043474.jpeg',
    bio: 'Rückenschmerz-Spezialist mit ganzheitlichem Behandlungsansatz.',
    specializations: ['Physiotherapie', 'Rückenschmerzen', 'Haltungskorrektur'],
    hourly_rate: 85.00,
    rating: 4.7,
    total_reviews: 112,
    is_verified: true,
    address: 'Königsallee 60',
    postal_code: '40212',
    city: 'Düsseldorf',
    country: 'Deutschland',
    certifications: ['Physiotherapeut', 'Rückenschule'],
    years_experience: 6,
    availability_status: 'unavailable',
  },
];

export const mockExpertOffers: ExpertOffer[] = [
  {
    id: 'offer-1',
    expert_id: '1',
    title: 'Erstberatung & Analyse',
    description: 'Umfassende Erstberatung mit Bewegungsanalyse und Behandlungsplan',
    category: 'Beratung',
    format: 'in-person',
    duration_minutes: 60,
    price: 85.00,
    is_active: true,
    location_address: 'Leopoldstraße 42',
    location_postal_code: '80802',
    location_city: 'München',
  },
  {
    id: 'offer-2',
    expert_id: '1',
    title: 'Manuelle Therapie',
    description: 'Gezielte manuelle Behandlung bei Beschwerden',
    category: 'Behandlung',
    format: 'in-person',
    duration_minutes: 45,
    price: 70.00,
    is_active: true,
    location_address: 'Leopoldstraße 42',
    location_postal_code: '80802',
    location_city: 'München',
  },
  {
    id: 'offer-3',
    expert_id: '2',
    title: 'Personal Training Session',
    description: 'Individuelles Krafttraining mit persönlicher Betreuung',
    category: 'Training',
    format: 'in-person',
    duration_minutes: 60,
    price: 75.00,
    is_active: true,
    location_address: 'Friedrichstraße 88',
    location_postal_code: '10117',
    location_city: 'Berlin',
  },
];

// Mock offers for logged-in expert (when expert_id matches logged-in expert)
export const mockExpertOwnOffers: ExpertOffer[] = [
  {
    id: 'offer-expert-1',
    expert_id: 'mock-expert-profile-id',
    title: 'Physiotherapie Erstberatung',
    description: 'Umfassende Erstberatung mit Bewegungsanalyse, Anamnese und individuellem Behandlungsplan',
    category: 'Physiotherapie',
    format: 'in-person',
    duration_minutes: 60,
    price: 90.00,
    is_active: true,
    location_address: 'Leopoldstraße 42',
    location_postal_code: '80802',
    location_city: 'München',
  },
  {
    id: 'offer-expert-2',
    expert_id: 'mock-expert-profile-id',
    title: 'Online Beratung',
    description: 'Flexible Online-Beratung per Video-Call für Fragen und Follow-ups',
    category: 'Beratung',
    format: 'online',
    duration_minutes: 30,
    price: 50.00,
    is_active: true,
  },
  {
    id: 'offer-expert-3',
    expert_id: 'mock-expert-profile-id',
    title: 'Behandlungssession',
    description: 'Intensive Behandlungssession mit manueller Therapie und Übungen',
    category: 'Behandlung',
    format: 'in-person',
    duration_minutes: 45,
    price: 75.00,
    is_active: true,
    location_address: 'Leopoldstraße 42',
    location_postal_code: '80802',
    location_city: 'München',
  },
];

// Client appointments (viewed from client side) - using Appointment type but with expert field
export const mockClientAppointments: any[] = [
  {
    id: 'apt-client-upcoming-1',
    expert_id: '1',
    expert: {
      id: '1',
      full_name: 'Sarah Müller',
      avatar_url: 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg',
    },
    offer: {
      title: 'Erstberatung & Analyse',
      format: 'Präsenz',
      description: 'Umfassende Bestandsaufnahme und individueller Therapieplan.',
    },
    start_time: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
    end_time: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000).toISOString(),
    status: 'confirmed',
    total_price: 85.0,
    notes: 'Bitte bringen Sie bequeme Kleidung mit.',
  },
  {
    id: 'apt-client-upcoming-2',
    expert_id: '2',
    expert: {
      id: '2',
      full_name: 'Michael Schmidt',
      avatar_url: 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg',
    },
    offer: {
      title: 'Personal Training Session',
      format: 'online',
      description: 'Individuelles Krafttraining mit Fokus auf deine Ziele.',
    },
    start_time: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    end_time: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000).toISOString(),
    status: 'confirmed',
    total_price: 75.0,
  },
  {
    id: 'apt-client-upcoming-3',
    expert_id: '3',
    expert: {
      id: '3',
      full_name: 'Julia Weber',
      avatar_url: 'https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg',
    },
    offer: {
      title: 'Yoga & Meditation Session',
      format: 'Präsenz',
      description: 'Entspannung und Achtsamkeit für Körper und Geist.',
    },
    start_time: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    end_time: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 90 * 60 * 1000).toISOString(),
    status: 'confirmed',
    total_price: 65.0,
  },
  {
    id: 'apt-client-upcoming-4',
    expert_id: '4',
    expert: {
      id: '4',
      full_name: 'Thomas Fischer',
      avatar_url: 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg',
    },
    offer: {
      title: 'Sportphysiotherapie',
      format: 'Präsenz',
      description: 'Behandlung und Prävention sportbedingter Beschwerden.',
    },
    start_time: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
    end_time: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000).toISOString(),
    status: 'confirmed',
    total_price: 90.0,
  },
];

// Expert appointments (viewed from expert side) - using AppointmentCalendar interface with client field
export const mockExpertAppointments: any[] = [
  {
    id: 'apt-expert-1',
    client: {
      full_name: 'Max Mustermann',
      gender: 'male',
      avatar_url: 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg',
      phone: '+49 170 1234567',
      email: 'max@example.com',
    },
    offer: {
      title: 'Erstberatung & Analyse',
      format: 'Präsenz',
      description: 'Umfassende Bestandsaufnahme und individueller Therapieplan.',
    },
    start_time: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
    end_time: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000).toISOString(),
    status: 'confirmed',
    total_price: 85.0,
    notes: 'Erste Sitzung, Rückenschmerzen',
    is_new_booking: true,
    created_at: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
  },
  {
    id: 'apt-expert-2',
    client: {
      full_name: 'Anna Schmidt',
      gender: 'female',
      avatar_url: 'https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg',
      phone: '+49 170 9876543',
      email: 'anna@example.com',
    },
    offer: {
      title: 'Manuelle Therapie',
      format: 'Präsenz',
      description: 'Gezielte manuelle Behandlung bei Beschwerden.',
    },
    start_time: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    end_time: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000 + 45 * 60 * 1000).toISOString(),
    status: 'confirmed',
    total_price: 70.0,
    is_new_booking: true,
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'apt-expert-3',
    client: {
      full_name: 'Tom Weber',
      gender: 'male',
      avatar_url: 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg',
      phone: '+49 170 5555555',
      email: 'tom@example.com',
    },
    offer: {
      title: 'Erstberatung & Analyse',
      format: 'online',
      description: 'Online-Erstgespräch und Anamnese.',
    },
    start_time: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    end_time: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000).toISOString(),
    status: 'confirmed',
    total_price: 85.0,
    is_new_booking: false,
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'apt-expert-4',
    client: {
      full_name: 'Lisa König',
      gender: 'female',
      avatar_url: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg',
      phone: '+49 170 2223344',
      email: 'lisa@example.com',
    },
    offer: {
      title: 'Behandlungssession',
      format: 'Präsenz',
      description: 'Folgebehandlung nach Erstberatung.',
    },
    start_time: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    end_time: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000 + 45 * 60 * 1000).toISOString(),
    status: 'confirmed',
    total_price: 75.0,
    is_new_booking: true,
    created_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'apt-expert-past-1',
    client: {
      full_name: 'Jonas Berger',
      avatar_url: 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg',
      phone: '+49 170 1112233',
      email: 'jonas@example.com',
    },
    offer: {
      title: 'Manuelle Therapie',
      format: 'Präsenz',
    },
    start_time: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    end_time: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000 + 45 * 60 * 1000).toISOString(),
    status: 'completed',
    total_price: 70.0,
    is_new_booking: false,
    created_at: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'apt-expert-past-2',
    client: {
      full_name: 'Max Mustermann',
      avatar_url: 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg',
      phone: '+49 170 1234567',
      email: 'max@example.com',
    },
    offer: {
      title: 'Erstberatung & Analyse',
      format: 'Präsenz',
    },
    start_time: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
    end_time: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000).toISOString(),
    status: 'completed',
    total_price: 85.0,
    is_new_booking: false,
    created_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'apt-expert-past-3',
    client: {
      full_name: 'Anna Schmidt',
      avatar_url: 'https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg',
      phone: '+49 170 9876543',
      email: 'anna@example.com',
    },
    offer: {
      title: 'Behandlungssession',
      format: 'Präsenz',
    },
    start_time: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
    end_time: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000 + 45 * 60 * 1000).toISOString(),
    status: 'completed',
    total_price: 75.0,
    is_new_booking: false,
    created_at: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

/** Finance rows – see lib/backend/mock/finance-data.ts */
export { mockExpertFinanceTransactions } from './finance-data';
export type { MockFinanceTransaction } from './finance-data';

// Client bookings (direct confirmed bookings)
export const mockClientBookingRequests: any[] = [
  {
    id: 'req-client-1',
    expert_id: 'mock-expert-1',
    expert: {
      full_name: 'Sarah Müller',
      avatar_url: 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg',
    },
    offer: {
      title: 'Erstberatung & Analyse',
      format: 'Präsenz',
      duration_minutes: 60,
    },
    start_time: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
    end_time: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000).toISOString(),
    status: 'confirmed',
    total_price: 85.00,
    notes: 'Bitte bringen Sie bequeme Kleidung mit.',
  },
  {
    id: 'req-client-2',
    expert_id: 'mock-expert-2',
    expert: {
      full_name: 'Michael Schmidt',
      avatar_url: 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg',
    },
    offer: {
      title: 'Personal Training Session',
      format: 'online',
      duration_minutes: 60,
    },
    start_time: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    end_time: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000).toISOString(),
    status: 'confirmed',
    total_price: 75.00,
  },
  {
    id: 'req-client-3',
    expert_id: 'mock-expert-3',
    expert: {
      full_name: 'Julia Weber',
      avatar_url: 'https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg',
    },
    offer: {
      title: 'Yoga & Meditation Session',
      format: 'Präsenz',
      duration_minutes: 90,
    },
    start_time: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    end_time: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 90 * 60 * 1000).toISOString(),
    status: 'confirmed',
    total_price: 65.00,
  },
];

/** Mock weekly availability used for client reschedule/booking demos */
export const mockExpertAvailabilityByExpertId: Record<string, Array<{
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_available: boolean;
}>> = {
  'mock-expert-1': [
    { id: 'av-1-1', day_of_week: 1, start_time: '09:00', end_time: '17:00', is_available: true },
    { id: 'av-1-2', day_of_week: 3, start_time: '09:00', end_time: '17:00', is_available: true },
    { id: 'av-1-3', day_of_week: 5, start_time: '10:00', end_time: '16:00', is_available: true },
  ],
  'mock-expert-2': [
    { id: 'av-2-1', day_of_week: 2, start_time: '10:00', end_time: '18:00', is_available: true },
    { id: 'av-2-2', day_of_week: 4, start_time: '10:00', end_time: '18:00', is_available: true },
  ],
  'mock-expert-3': [
    { id: 'av-3-1', day_of_week: 6, start_time: '08:00', end_time: '14:00', is_available: true },
    { id: 'av-3-2', day_of_week: 0, start_time: '09:00', end_time: '13:00', is_available: true },
  ],
};

/** Client reviews shown on expert public profiles */
export const mockExpertReviews: Array<{
  id: string;
  appointment_id: string;
  expert_profile_id: string;
  client_id: string;
  rating: number;
  title: string;
  review_text: string;
  helpful_count: number;
  created_at: string;
  client: { full_name: string; avatar_url?: string };
  appointment?: {
    start_time: string;
    end_time: string;
    offer?: { title: string; format?: string };
  };
}> = [
  {
    id: 'expert-review-1',
    appointment_id: 'apt-past-1',
    expert_profile_id: '1',
    client_id: 'client-1',
    rating: 5,
    title: 'Sehr professionell und einfühlsam',
    review_text:
      'Die Sitzung war genau das, was ich gebraucht habe. Sehr professionell und einfühlsam. Ich fühle mich deutlich besser.',
    helpful_count: 8,
    created_at: new Date(Date.now() - 5 * 86400000).toISOString(),
    client: {
      full_name: 'Max Mustermann',
      avatar_url: 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg',
    },
    appointment: {
      start_time: new Date(Date.now() - 10 * 86400000).toISOString(),
      end_time: new Date(Date.now() - 10 * 86400000 + 60 * 60 * 1000).toISOString(),
      offer: { title: 'Erstberatung & Analyse', format: 'Präsenz' },
    },
  },
  {
    id: 'expert-review-2',
    appointment_id: 'apt-past-2',
    expert_profile_id: '1',
    client_id: 'client-2',
    rating: 5,
    title: 'Hervorragende Behandlung',
    review_text:
      'Die Expertin hat sich viel Zeit genommen und alle meine Fragen beantwortet. Die Behandlung war sehr effektiv.',
    helpful_count: 5,
    created_at: new Date(Date.now() - 12 * 86400000).toISOString(),
    client: {
      full_name: 'Anna Schmidt',
      avatar_url: 'https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg',
    },
    appointment: {
      start_time: new Date(Date.now() - 15 * 86400000).toISOString(),
      end_time: new Date(Date.now() - 15 * 86400000 + 45 * 60 * 1000).toISOString(),
      offer: { title: 'Manuelle Therapie', format: 'Präsenz' },
    },
  },
  {
    id: 'expert-review-3',
    appointment_id: 'apt-past-3',
    expert_profile_id: '1',
    client_id: 'client-3',
    rating: 4,
    title: 'Gute Erfahrung',
    review_text: 'Gute Sitzung, sehr kompetent. Würde wieder buchen.',
    helpful_count: 2,
    created_at: new Date(Date.now() - 20 * 86400000).toISOString(),
    client: {
      full_name: 'Tom Weber',
      avatar_url: 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg',
    },
    appointment: {
      start_time: new Date(Date.now() - 25 * 86400000).toISOString(),
      end_time: new Date(Date.now() - 25 * 86400000 + 60 * 60 * 1000).toISOString(),
      offer: { title: 'Erstberatung & Analyse', format: 'Präsenz' },
    },
  },
  {
    id: 'expert-review-4',
    appointment_id: 'apt-past-4',
    expert_profile_id: '2',
    client_id: 'client-4',
    rating: 5,
    title: 'Top Personal Training',
    review_text:
      'Motivierend, strukturiert und mit klaren Fortschritten. Kann Michael nur weiterempfehlen.',
    helpful_count: 6,
    created_at: new Date(Date.now() - 8 * 86400000).toISOString(),
    client: {
      full_name: 'Lisa König',
      avatar_url: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg',
    },
    appointment: {
      start_time: new Date(Date.now() - 14 * 86400000).toISOString(),
      end_time: new Date(Date.now() - 14 * 86400000 + 60 * 60 * 1000).toISOString(),
      offer: { title: 'Personal Training Session', format: 'Präsenz' },
    },
  },
  {
    id: 'expert-review-5',
    appointment_id: 'apt-past-5',
    expert_profile_id: '2',
    client_id: 'client-5',
    rating: 5,
    title: 'Sehr gute Betreuung',
    review_text: 'Individuelles Training mit Fokus auf Technik. Fühle mich deutlich stärker.',
    helpful_count: 3,
    created_at: new Date(Date.now() - 18 * 86400000).toISOString(),
    client: {
      full_name: 'Jonas Berger',
      avatar_url: 'https://images.pexels.com/photos/614810/pexels-photo-614810.jpeg',
    },
    appointment: {
      start_time: new Date(Date.now() - 22 * 86400000).toISOString(),
      end_time: new Date(Date.now() - 22 * 86400000 + 60 * 60 * 1000).toISOString(),
      offer: { title: 'Personal Training Session', format: 'Präsenz' },
    },
  },
];

/** Completed sessions awaiting a client review */
export const mockPendingReviewAppointments: Array<{
  id: string;
  expert_id: string;
  start_time: string;
  end_time: string;
  total_price: number;
  expert: { full_name: string; avatar_url: string };
  offer: { title: string; format: string };
}> = [
  {
    id: 'req-client-review-1',
    expert_id: 'mock-expert-1',
    expert: {
      full_name: 'Sarah Müller',
      avatar_url: 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg',
    },
    offer: {
      title: 'Erstberatung & Analyse',
      format: 'Präsenz',
    },
    start_time: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    end_time: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000).toISOString(),
    total_price: 85.0,
  },
  {
    id: 'req-client-review-2',
    expert_id: 'mock-expert-2',
    expert: {
      full_name: 'Michael Schmidt',
      avatar_url: 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg',
    },
    offer: {
      title: 'Personal Training Session',
      format: 'online',
    },
    start_time: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    end_time: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000).toISOString(),
    total_price: 75.0,
  },
];

/** Appointment ids that already have a submitted review (mutable in mock sessions) */
export const mockSubmittedReviewAppointmentIds = new Set<string>();

// Legacy export for backward compatibility
export const mockAppointments: Appointment[] = mockClientAppointments;

export const mockRooms: Room[] = [
  {
    id: 'room-1',
    provider_id: 'provider-1',
    name: 'Heller Yogaraum',
    description: 'Großzügiger, lichtdurchfluteter Raum perfekt für Yoga und Meditation',
    size_sqm: 45,
    hourly_rate: 35.00,
    amenities: ['Yogamatten', 'Kissen', 'Sound System', 'Umkleiden'],
    images: ['https://images.pexels.com/photos/3822906/pexels-photo-3822906.jpeg'],
    is_available: true,
    provider: {
      business_name: 'Wellness Center München',
      city: 'München',
    },
  },
  {
    id: 'room-2',
    provider_id: 'provider-1',
    name: 'Trainingsraum Pro',
    description: 'Vollausgestatteter Trainingsraum mit modernstem Equipment',
    size_sqm: 60,
    hourly_rate: 50.00,
    amenities: ['Kraftgeräte', 'Freihanteln', 'Cardio', 'Duschen'],
    images: ['https://images.pexels.com/photos/1552242/pexels-photo-1552242.jpeg'],
    is_available: true,
    provider: {
      business_name: 'Wellness Center München',
      city: 'München',
    },
  },
];

export const mockRoomBookings: RoomBooking[] = [
  {
    id: 'booking-1',
    room: {
      name: 'Heller Yogaraum',
      provider: {
        business_name: 'Wellness Center München',
      },
    },
    start_time: new Date(Date.now() + 86400000).toISOString(),
    end_time: new Date(Date.now() + 90000000).toISOString(),
    status: 'confirmed',
    total_price: 35.00,
  },
];

export const mockProfile: UserProfile = {
  id: 'user-client-1',
  email: 'client@example.com',
  full_name: 'Max Mustermann',
  role: 'client',
  avatar_url: 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg',
  phone: '+49 170 1234567',
  created_at: new Date(Date.now() - 180 * 86400000).toISOString(),
};

/** Verified expert demo account (`expert@test.com`) */
export const MOCK_VERIFIED_EXPERT_USER_ID = 'mock-user-expert';

/** Onboarding / verification demo account (`onboarding@test.com`) */
export const MOCK_ONBOARDING_EXPERT_USER_ID = 'mock-user-expert-onboarding';

export const mockOnboardingExpertProfile = {
  id: 'mock-expert-onboarding',
  user_id: MOCK_ONBOARDING_EXPERT_USER_ID,
  full_name: 'Alex Neubeginn',
  email: 'onboarding@test.com',
  avatar_url: '',
  verification_status: 'not_verified_incomplete' as const,
  checklist_stammdaten_completed: false,
  checklist_qualifications_uploaded: false,
  checklist_offers_created: false,
  checklist_availability_set: false,
  checklist_stripe_connected: false,
  qualification_verified: false,
  bio: '',
  profile_image_url: '',
};

export const mockPlatformReviews: PlatformReview[] = [
  {
    id: 'review-1',
    expert_id: '1',
    expert_name: 'Sarah Müller',
    expert_avatar_url: 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg',
    rating: 5,
    title: 'Perfekte Plattform für meine Praxis',
    review_text: 'Die Plattform hat meine Arbeitsweise komplett verändert. Die Terminverwaltung ist intuitiv, die Zahlungsabwicklung reibungslos und ich erreiche genau die Kund:innen, die zu mir passen. Besonders schätze ich den professionellen Support und die faire Preisgestaltung.',
    created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
    helpful_count: 24,
  },
  {
    id: 'review-2',
    expert_id: '2',
    expert_name: 'Michael Schmidt',
    expert_avatar_url: 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg',
    rating: 5,
    title: 'Endlich mehr Zeit für meine Klient:innen',
    review_text: 'Seit ich auf dieser Plattform bin, spare ich unglaublich viel Zeit bei der Verwaltung. Die automatische Terminbestätigung, Erinnerungen und Zahlungsabwicklung nehmen mir so viel Arbeit ab. Ich kann mich endlich voll auf meine Kund:innen konzentrieren.',
    created_at: new Date(Date.now() - 45 * 86400000).toISOString(),
    helpful_count: 18,
  },
  {
    id: 'review-3',
    expert_id: '3',
    expert_name: 'Julia Weber',
    expert_avatar_url: 'https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg',
    rating: 4,
    title: 'Großartige Plattform mit kleinen Verbesserungswünschen',
    review_text: 'Insgesamt bin ich sehr zufrieden. Die Plattform ist übersichtlich und meine Buchungszahlen haben sich seit dem Start verdoppelt. Ein paar mehr Anpassungsmöglichkeiten beim Profil wären noch super, aber das Team arbeitet ja ständig an Updates.',
    created_at: new Date(Date.now() - 60 * 86400000).toISOString(),
    helpful_count: 12,
  },
  {
    id: 'review-4',
    expert_id: '4',
    expert_name: 'Thomas Fischer',
    expert_avatar_url: 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg',
    rating: 5,
    title: 'Professionell und zuverlässig',
    review_text: 'Als selbstständiger Physiotherapeut war ich anfangs skeptisch gegenüber Online-Plattformen. Aber die Qualität der Anfragen ist hervorragend und die Plattform wirkt sehr professionell auf meine Kund:innen. Die Verifizierung gibt beiden Seiten Sicherheit.',
    created_at: new Date(Date.now() - 75 * 86400000).toISOString(),
    helpful_count: 21,
  },
  {
    id: 'review-5',
    expert_id: '6',
    expert_name: 'David Hoffmann',
    expert_avatar_url: 'https://images.pexels.com/photos/1681010/pexels-photo-1681010.jpeg',
    rating: 5,
    title: 'Die beste Entscheidung für mein Business',
    review_text: 'Ich habe mehrere Plattformen ausprobiert und diese ist mit Abstand die beste. Die Gebühren sind fair, die Funktionen durchdacht und der Kundenstamm qualitativ hochwertig. Mein Einkommen hat sich in 6 Monaten verdreifacht.',
    created_at: new Date(Date.now() - 90 * 86400000).toISOString(),
    helpful_count: 31,
  },
  {
    id: 'review-6',
    expert_id: '7',
    expert_name: 'Lisa Schulz',
    expert_avatar_url: 'https://images.pexels.com/photos/1468379/pexels-photo-1468379.jpeg',
    rating: 4,
    title: 'Sehr empfehlenswert für Coaches',
    review_text: 'Als Mental Coach habe ich hier genau die richtigen Klient:innen gefunden. Die Plattform zieht Menschen an, die wirklich etwas verändern wollen. Die Kommunikationstools sind gut, nur die Video-Funktion könnte noch stabiler sein.',
    created_at: new Date(Date.now() - 105 * 86400000).toISOString(),
    helpful_count: 15,
  },
  {
    id: 'review-7',
    expert_id: '8',
    expert_name: 'Markus Wagner',
    expert_avatar_url: 'https://images.pexels.com/photos/1043474/pexels-photo-1043474.jpeg',
    rating: 5,
    title: 'Unverzichtbar für moderne Expert:innen',
    review_text: 'Die Plattform hat meine Erwartungen übertroffen. Besonders beeindruckt bin ich von der Marketing-Unterstützung und den Analytics-Tools. Ich kann genau sehen, wie sich mein Profil entwickelt und wo ich noch optimieren kann.',
    created_at: new Date(Date.now() - 120 * 86400000).toISOString(),
    helpful_count: 19,
  },
];

export type MockBookingNotification = {
  id: string;
  user_id: string;
  booking_type: 'appointment' | 'room_booking';
  booking_id: string;
  notification_type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
};

/** Mutable mock inbox so mark-as-read works in-session */
export const mockNotifications: MockBookingNotification[] = [
  // Client notifications
  {
    id: 'notif-review-1',
    user_id: 'mock-user-client',
    booking_type: 'appointment',
    booking_id: 'req-client-review-1',
    notification_type: 'review_request',
    title: 'Bewertung abgeben',
    message:
      'Wie war deine Session mit Sarah Müller („Erstberatung & Analyse“)? Teile kurz deine Erfahrung.',
    is_read: false,
    created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
  },
  {
    id: 'notif-client-1',
    user_id: 'mock-user-client',
    booking_type: 'appointment',
    booking_id: 'apt-client-upcoming-1',
    notification_type: 'booking_created',
    title: 'Termin gebucht',
    message: 'Dein Termin „Erstberatung & Analyse“ mit Sarah Müller ist gebucht.',
    is_read: false,
    created_at: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
  },
  {
    id: 'notif-client-2',
    user_id: 'mock-user-client',
    booking_type: 'appointment',
    booking_id: 'apt-client-upcoming-1',
    notification_type: 'reminder',
    title: 'Terminerinnerung',
    message: 'Dein Termin mit Sarah Müller findet morgen um 11:00 Uhr statt.',
    is_read: false,
    created_at: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
  },
  {
    id: 'notif-client-3',
    user_id: 'mock-user-client',
    booking_type: 'appointment',
    booking_id: 'apt-client-upcoming-2',
    notification_type: 'payment_received',
    title: 'Zahlung erhalten',
    message: 'Deine Zahlung für „Personal Training Session“ wurde erfolgreich verarbeitet.',
    is_read: true,
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'notif-client-4',
    user_id: 'mock-user-client',
    booking_type: 'appointment',
    booking_id: 'thread-1',
    notification_type: 'chat_message',
    title: 'Neue Nachricht',
    message: 'Sarah Müller hat dir eine Nachricht geschrieben.',
    is_read: false,
    created_at: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
  },

  // Verified expert notifications (expert@test.com)
  {
    id: 'notif-expert-booking-1',
    user_id: 'mock-user-expert',
    booking_type: 'appointment',
    booking_id: 'apt-expert-1',
    notification_type: 'booking_created',
    title: 'Neue Buchung',
    message:
      'Max Mustermann hat „Erstberatung & Analyse“ für morgen gebucht. Öffne die Termine, um Details zu sehen.',
    is_read: false,
    created_at: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
  },
  {
    id: 'notif-expert-booking-2',
    user_id: 'mock-user-expert',
    booking_type: 'appointment',
    booking_id: 'apt-expert-2',
    notification_type: 'booking_created',
    title: 'Neue Buchung',
    message: 'Anna Schmidt hat „Manuelle Therapie“ gebucht (übermorgen, 45 Min.).',
    is_read: false,
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'notif-expert-review-1',
    user_id: 'mock-user-expert',
    booking_type: 'appointment',
    booking_id: 'apt-expert-past-1',
    notification_type: 'new_review',
    title: 'Neue Bewertung',
    message: 'Jonas Berger hat dich mit 5 Sternen bewertet: „Sehr professionell und einfühlsam“.',
    is_read: false,
    created_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'notif-expert-payment-1',
    user_id: 'mock-user-expert',
    booking_type: 'appointment',
    booking_id: 'apt-expert-past-2',
    notification_type: 'payment_received',
    title: 'Zahlung eingegangen',
    message: '€85,00 für „Erstberatung & Analyse“ (Max Mustermann) wurden deinem Konto gutgeschrieben.',
    is_read: false,
    created_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'notif-expert-payout-1',
    user_id: 'mock-user-expert',
    booking_type: 'appointment',
    booking_id: 'apt-expert-past-2',
    notification_type: 'payout_info',
    title: 'Auszahlungsinformationen',
    message:
      'Deine nächste Auszahlung (€240,00) ist für Freitag geplant. Bankverbindung und Details findest du unter Finanzen.',
    is_read: false,
    created_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'notif-expert-chat-1',
    user_id: 'mock-user-expert',
    booking_type: 'appointment',
    booking_id: 'thread-1',
    notification_type: 'chat_message',
    title: 'Neue Nachricht',
    message: 'Max Mustermann hat dir eine Nachricht zur morgigen Sitzung geschrieben.',
    is_read: false,
    created_at: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
  },
  {
    id: 'notif-expert-reminder-1',
    user_id: 'mock-user-expert',
    booking_type: 'appointment',
    booking_id: 'apt-expert-1',
    notification_type: 'reminder',
    title: 'Terminerinnerung',
    message: 'Morgen: Erstberatung & Analyse mit Max Mustermann.',
    is_read: true,
    created_at: new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString(),
  },
];

export type MockChatThread = {
  id: string;
  appointment_id: string;
  client_id: string;
  expert_id: string;
  created_at: string;
  updated_at: string;
  client: {
    full_name: string;
    avatar_url: string;
  };
  expert: {
    full_name: string;
    avatar_url: string;
  };
  offer_title: string;
  last_message: string;
  /** Unread for the logged-in client */
  unread_count_client: number;
  /** Unread for the logged-in expert */
  unread_count_expert: number;
};

export type MockChatMessage = {
  id: string;
  thread_id: string;
  sender_id: string;
  message: string;
  is_read: boolean;
  created_at: string;
  sender?: {
    full_name: string;
    avatar_url?: string;
  };
};

const MOCK_CLIENT_AVATAR =
  'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg';
const MOCK_CLIENT_NAME = 'Max Mustermann';

export const mockChatThreads: MockChatThread[] = [
  {
    id: 'thread-1',
    appointment_id: 'apt-client-upcoming-1',
    client_id: 'mock-user-client',
    expert_id: '1',
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
    client: {
      full_name: MOCK_CLIENT_NAME,
      avatar_url: MOCK_CLIENT_AVATAR,
    },
    expert: {
      full_name: 'Sarah Müller',
      avatar_url: 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg',
    },
    offer_title: 'Erstberatung & Analyse',
    last_message: 'Perfekt – ich freue mich auf Freitag!',
    unread_count_client: 0,
    unread_count_expert: 1,
  },
  {
    id: 'thread-2',
    appointment_id: 'apt-client-upcoming-2',
    client_id: 'mock-user-client',
    expert_id: '2',
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    client: {
      full_name: MOCK_CLIENT_NAME,
      avatar_url: MOCK_CLIENT_AVATAR,
    },
    expert: {
      full_name: 'Michael Schmidt',
      avatar_url: 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg',
    },
    offer_title: 'Personal Training Session',
    last_message: 'Super, danke für den Hinweis – bis bald!',
    unread_count_client: 0,
    unread_count_expert: 0,
  },
  {
    id: 'thread-3',
    appointment_id: 'apt-client-upcoming-3',
    client_id: 'mock-user-client',
    expert_id: '3',
    created_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 22 * 60 * 60 * 1000).toISOString(),
    client: {
      full_name: MOCK_CLIENT_NAME,
      avatar_url: MOCK_CLIENT_AVATAR,
    },
    expert: {
      full_name: 'Julia Weber',
      avatar_url: 'https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg',
    },
    offer_title: 'Yoga & Achtsamkeit',
    last_message: 'Bring gerne eine Matte mit – ansonsten habe ich Leihmatten da.',
    unread_count_client: 2,
    unread_count_expert: 0,
  },
  {
    id: 'thread-4',
    appointment_id: 'apt-expert-2',
    client_id: 'client-anna',
    expert_id: '1',
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 50 * 60 * 1000).toISOString(),
    client: {
      full_name: 'Anna Schmidt',
      avatar_url: 'https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg',
    },
    expert: {
      full_name: 'Sarah Müller',
      avatar_url: 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg',
    },
    offer_title: 'Manuelle Therapie',
    last_message: 'Danke, ich melde mich, falls noch Fragen sind.',
    unread_count_client: 0,
    unread_count_expert: 1,
  },
  {
    id: 'thread-5',
    appointment_id: 'apt-expert-3',
    client_id: 'client-tom',
    expert_id: '1',
    created_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 28 * 60 * 60 * 1000).toISOString(),
    client: {
      full_name: 'Tom Weber',
      avatar_url: 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg',
    },
    expert: {
      full_name: 'Sarah Müller',
      avatar_url: 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg',
    },
    offer_title: 'Erstberatung & Analyse',
    last_message: 'Online-Link schicke ich dir 15 Min. vorher.',
    unread_count_client: 0,
    unread_count_expert: 0,
  },
  {
    id: 'thread-6',
    appointment_id: 'apt-expert-past-1',
    client_id: 'client-jonas',
    expert_id: '1',
    created_at: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    client: {
      full_name: 'Jonas Berger',
      avatar_url: 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg',
    },
    expert: {
      full_name: 'Sarah Müller',
      avatar_url: 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg',
    },
    offer_title: 'Manuelle Therapie',
    last_message: 'Vielen Dank nochmal – die Übungen helfen schon!',
    unread_count_client: 0,
    unread_count_expert: 0,
  },
];

/** Mutable mock messages keyed by thread id */
export const mockChatMessagesByThread: Record<string, MockChatMessage[]> = {
  'thread-1': [
    {
      id: 'msg-1-1',
      thread_id: 'thread-1',
      sender_id: 'mock-user-client',
      message: 'Hallo Sarah! Hast du noch einen Moment für eine Frage zur Erstberatung am Freitag?',
      is_read: true,
      created_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
      sender: { full_name: MOCK_CLIENT_NAME },
    },
    {
      id: 'msg-1-2',
      thread_id: 'thread-1',
      sender_id: '1',
      message: 'Hallo Max, gerne! Was möchtest du wissen?',
      is_read: true,
      created_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
      sender: { full_name: 'Sarah Müller' },
    },
    {
      id: 'msg-1-3',
      thread_id: 'thread-1',
      sender_id: 'mock-user-client',
      message: 'Soll ich Befunde oder Röntgenbilder mitbringen?',
      is_read: true,
      created_at: new Date(Date.now() - 3.5 * 60 * 60 * 1000).toISOString(),
      sender: { full_name: MOCK_CLIENT_NAME },
    },
    {
      id: 'msg-1-4',
      thread_id: 'thread-1',
      sender_id: '1',
      message:
        'Ja bitte, falls vorhanden. Ansonsten reicht es, wenn du deine Beschwerden grob notierst.',
      is_read: true,
      created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      sender: { full_name: 'Sarah Müller' },
    },
    {
      id: 'msg-1-5',
      thread_id: 'thread-1',
      sender_id: 'mock-user-client',
      message: 'Perfekt – ich freue mich auf Freitag!',
      is_read: false,
      created_at: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
      sender: { full_name: MOCK_CLIENT_NAME },
    },
  ],
  'thread-2': [
    {
      id: 'msg-2-1',
      thread_id: 'thread-2',
      sender_id: '2',
      message: 'Hi Max! Für unser Personal Training bring bitte Sportkleidung und ein Handtuch mit.',
      is_read: true,
      created_at: new Date(Date.now() - 7 * 60 * 60 * 1000).toISOString(),
      sender: { full_name: 'Michael Schmidt' },
    },
    {
      id: 'msg-2-2',
      thread_id: 'thread-2',
      sender_id: 'mock-user-client',
      message: 'Alles klar. Gibt es Parkplätze vor Ort?',
      is_read: true,
      created_at: new Date(Date.now() - 6.5 * 60 * 60 * 1000).toISOString(),
      sender: { full_name: MOCK_CLIENT_NAME },
    },
    {
      id: 'msg-2-3',
      thread_id: 'thread-2',
      sender_id: '2',
      message: 'Ja, direkt hinter dem Studio – die ersten 2 Stunden sind kostenlos.',
      is_read: true,
      created_at: new Date(Date.now() - 6.2 * 60 * 60 * 1000).toISOString(),
      sender: { full_name: 'Michael Schmidt' },
    },
    {
      id: 'msg-2-4',
      thread_id: 'thread-2',
      sender_id: 'mock-user-client',
      message: 'Super, danke für den Hinweis – bis bald!',
      is_read: true,
      created_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
      sender: { full_name: MOCK_CLIENT_NAME },
    },
  ],
  'thread-3': [
    {
      id: 'msg-3-1',
      thread_id: 'thread-3',
      sender_id: 'mock-user-client',
      message: 'Hallo Julia, ich freue mich auf die Yoga-Session. Bin kompletter Anfänger – passt das?',
      is_read: true,
      created_at: new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString(),
      sender: { full_name: MOCK_CLIENT_NAME },
    },
    {
      id: 'msg-3-2',
      thread_id: 'thread-3',
      sender_id: '3',
      message: 'Absolut! Wir starten ganz ruhig und ich passe alles an dein Tempo an.',
      is_read: false,
      created_at: new Date(Date.now() - 23 * 60 * 60 * 1000).toISOString(),
      sender: { full_name: 'Julia Weber' },
    },
    {
      id: 'msg-3-3',
      thread_id: 'thread-3',
      sender_id: '3',
      message: 'Bring gerne eine Matte mit – ansonsten habe ich Leihmatten da.',
      is_read: false,
      created_at: new Date(Date.now() - 22 * 60 * 60 * 1000).toISOString(),
      sender: { full_name: 'Julia Weber' },
    },
  ],
  'thread-4': [
    {
      id: 'msg-4-1',
      thread_id: 'thread-4',
      sender_id: 'client-anna',
      message: 'Hallo Sarah, ich habe seit gestern stärkere Nackenschmerzen. Sollen wir den Fokus anpassen?',
      is_read: true,
      created_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
      sender: { full_name: 'Anna Schmidt' },
    },
    {
      id: 'msg-4-2',
      thread_id: 'thread-4',
      sender_id: '1',
      message:
        'Danke fürs Bescheidgeben – ja, dann starten wir mit einer kurzen Untersuchung und lockern den Nackenbereich.',
      is_read: true,
      created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      sender: { full_name: 'Sarah Müller' },
    },
    {
      id: 'msg-4-3',
      thread_id: 'thread-4',
      sender_id: 'client-anna',
      message: 'Danke, ich melde mich, falls noch Fragen sind.',
      is_read: false,
      created_at: new Date(Date.now() - 50 * 60 * 1000).toISOString(),
      sender: { full_name: 'Anna Schmidt' },
    },
  ],
  'thread-5': [
    {
      id: 'msg-5-1',
      thread_id: 'thread-5',
      sender_id: 'client-tom',
      message: 'Hi! Komme ich per Laptop oder reicht das Handy für die Online-Session?',
      is_read: true,
      created_at: new Date(Date.now() - 30 * 60 * 60 * 1000).toISOString(),
      sender: { full_name: 'Tom Weber' },
    },
    {
      id: 'msg-5-2',
      thread_id: 'thread-5',
      sender_id: '1',
      message: 'Laptop ist angenehmer, aber Handy geht auch. Bitte stabile WLAN-Verbindung.',
      is_read: true,
      created_at: new Date(Date.now() - 29 * 60 * 60 * 1000).toISOString(),
      sender: { full_name: 'Sarah Müller' },
    },
    {
      id: 'msg-5-3',
      thread_id: 'thread-5',
      sender_id: '1',
      message: 'Online-Link schicke ich dir 15 Min. vorher.',
      is_read: true,
      created_at: new Date(Date.now() - 28 * 60 * 60 * 1000).toISOString(),
      sender: { full_name: 'Sarah Müller' },
    },
  ],
  'thread-6': [
    {
      id: 'msg-6-1',
      thread_id: 'thread-6',
      sender_id: '1',
      message: 'Hallo Jonas, wie geht es nach der letzten Sitzung? Konntest du die Übungen machen?',
      is_read: true,
      created_at: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
      sender: { full_name: 'Sarah Müller' },
    },
    {
      id: 'msg-6-2',
      thread_id: 'thread-6',
      sender_id: 'client-jonas',
      message: 'Ja, jeden Morgen. Der Schulterbereich fühlt sich deutlich freier an.',
      is_read: true,
      created_at: new Date(Date.now() - 5.5 * 24 * 60 * 60 * 1000).toISOString(),
      sender: { full_name: 'Jonas Berger' },
    },
    {
      id: 'msg-6-3',
      thread_id: 'thread-6',
      sender_id: 'client-jonas',
      message: 'Vielen Dank nochmal – die Übungen helfen schon!',
      is_read: true,
      created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      sender: { full_name: 'Jonas Berger' },
    },
  ],
};

export type MockPersonalCalendarEvent = {
  id: string;
  user_id: string;
  title: string;
  notes: string;
  start_time: string;
  end_time: string;
  created_at: string;
};

/** Mutable so create/delete work in mock sessions */
export const mockPersonalCalendarEvents: MockPersonalCalendarEvent[] = [
  {
    id: 'personal-1',
    user_id: 'any',
    title: 'Arzttermin',
    notes: 'Hausarzt Kontrolle',
    start_time: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(),
    end_time: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000 + 30 * 60 * 1000).toISOString(),
    created_at: new Date().toISOString(),
  },
];
