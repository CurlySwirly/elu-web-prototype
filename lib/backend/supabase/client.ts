import type { IBackendClient } from '../types';
import { SupabaseAuthService } from './auth';
import {
  SupabaseExpertRepository,
  SupabaseAppointmentRepository,
  SupabaseRoomRepository,
  SupabaseBookingRepository,
  SupabaseProfileRepository,
} from './repositories';

export class SupabaseBackendClient implements IBackendClient {
  public auth = new SupabaseAuthService();
  public experts = new SupabaseExpertRepository();
  public appointments = new SupabaseAppointmentRepository();
  public rooms = new SupabaseRoomRepository();
  public bookings = new SupabaseBookingRepository();
  public profiles = new SupabaseProfileRepository();
}
