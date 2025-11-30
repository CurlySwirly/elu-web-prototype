import { backend } from './backend/client';

export type {
  Expert,
  ExpertOffer,
  Appointment,
  Room,
  RoomBooking,
  UserProfile,
} from './types';

export async function fetchExperts() {
  return backend.experts.findAll();
}

export async function fetchFeaturedExperts(limit: number = 8) {
  return backend.experts.findFeatured(limit);
}

export async function fetchExpertById(expertId: string) {
  return backend.experts.findById(expertId);
}

export async function fetchExpertOffers(expertId: string) {
  return backend.experts.findOffers(expertId);
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
