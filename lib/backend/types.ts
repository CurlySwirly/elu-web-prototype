import type {
  Expert,
  ExpertOffer,
  Appointment,
  Room,
  RoomBooking,
  UserProfile,
  AuthUser,
  SignUpData,
  SignInData,
} from '@/lib/types';

export interface IAuthService {
  signIn(data: SignInData): Promise<AuthUser>;
  signUp(data: SignUpData): Promise<AuthUser>;
  signOut(): Promise<void>;
  getCurrentUser(): Promise<AuthUser | null>;
  onAuthStateChange(callback: (user: AuthUser | null) => void): () => void;
}

export interface IExpertRepository {
  findAll(): Promise<Expert[]>;
  findFeatured(limit?: number): Promise<Expert[]>;
  findById(id: string): Promise<Expert | null>;
  findOffers(expertId: string): Promise<ExpertOffer[]>;
}

export interface IAppointmentRepository {
  findByClientId(userId: string): Promise<Appointment[]>;
  findByExpertId(expertId: string): Promise<Appointment[]>;
}

export interface IRoomRepository {
  findAll(): Promise<Room[]>;
  findByProviderId(providerId: string): Promise<Room[]>;
}

export interface IBookingRepository {
  findByProviderId(providerId: string): Promise<RoomBooking[]>;
}

export interface IProfileRepository {
  findById(userId: string): Promise<UserProfile | null>;
}

export interface IBackendClient {
  auth: IAuthService;
  experts: IExpertRepository;
  appointments: IAppointmentRepository;
  rooms: IRoomRepository;
  bookings: IBookingRepository;
  profiles: IProfileRepository;
}
