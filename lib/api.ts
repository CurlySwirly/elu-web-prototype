import { backend } from './backend/client';
import { getBackendMode } from './backend/mode';

export type {
  Expert,
  ExpertOffer,
  Appointment,
  Room,
  RoomBooking,
  UserProfile,
} from './types';

async function mockExpertsFallback() {
  const { mockExperts } = await import('./backend/mock/data');
  return [...mockExperts];
}

export async function fetchExperts() {
  try {
    const data = await backend.experts.findAll();
    if (data?.length) return data;
    // Supabase empty / RLS blocked → keep landing & browse usable
    if (getBackendMode() === 'supabase') {
      console.warn('[elu] fetchExperts: empty from Supabase, using mock experts');
      return mockExpertsFallback();
    }
    return data || [];
  } catch (error) {
    console.warn('[elu] fetchExperts failed, using mock experts', error);
    return mockExpertsFallback();
  }
}

export async function fetchFeaturedExperts(limit: number = 8) {
  try {
    const data = await backend.experts.findFeatured(limit);
    if (data?.length) return data;
    const all = await mockExpertsFallback();
    return all.filter((e) => e.is_verified).slice(0, limit);
  } catch {
    const all = await mockExpertsFallback();
    return all.filter((e) => e.is_verified).slice(0, limit);
  }
}

export async function fetchExpertById(expertId: string) {
  if (!expertId) return null;
  try {
    const expert = await backend.experts.findById(expertId);
    if (expert) return expert;
  } catch (error) {
    console.warn('[elu] fetchExpertById failed', error);
  }
  const all = await mockExpertsFallback();
  return all.find((e) => e.id === expertId) || null;
}

export async function fetchExpertOffers(expertId: string) {
  try {
    const offers = await backend.experts.findOffers(expertId);
    if (offers?.length) return offers;
  } catch {
    /* fall through */
  }
  const { mockExpertOffers } = await import('./backend/mock/data');
  return mockExpertOffers.filter((o) => o.expert_id === expertId);
}

export async function fetchClientAppointments(userId: string) {
  return backend.appointments.findByClientId(userId);
}

export async function fetchExpertAppointments(expertId: string) {
  return backend.appointments.findByExpertId(expertId);
}

export async function fetchClientProfile(userId: string) {
  return backend.profiles.findById(userId);
}

export async function fetchProviderRooms(providerId: string) {
  return backend.rooms.findByProviderId(providerId);
}

export async function fetchProviderBookings(providerId: string) {
  return backend.bookings.findByProviderId(providerId);
}

export async function fetchAvailableRooms() {
  return backend.rooms.findAll();
}
