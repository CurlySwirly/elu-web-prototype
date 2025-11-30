import type {
  IBackendClient,
  IAuthService,
  IExpertRepository,
  IAppointmentRepository,
  IRoomRepository,
  IBookingRepository,
  IProfileRepository,
} from '../types';
import type { SignInData, SignUpData, AuthUser } from '@/lib/types';
import {
  mockExperts,
  mockExpertOffers,
  mockAppointments,
  mockRooms,
  mockRoomBookings,
  mockProfile,
} from './data';

class MockAuthService implements IAuthService {
  private currentUser: AuthUser | null = null;
  private listeners: Array<(user: AuthUser | null) => void> = [];

  async signIn(data: SignInData): Promise<AuthUser> {
    await this.delay(500);

    const user: AuthUser = {
      id: 'mock-user-1',
      email: data.email,
      role: 'client',
    };

    this.currentUser = user;
    this.notifyListeners();
    return user;
  }

  async signUp(data: SignUpData): Promise<AuthUser> {
    await this.delay(500);

    const user: AuthUser = {
      id: `mock-user-${Date.now()}`,
      email: data.email,
      role: data.role,
    };

    this.currentUser = user;
    this.notifyListeners();
    return user;
  }

  async signOut(): Promise<void> {
    await this.delay(300);
    this.currentUser = null;
    this.notifyListeners();
  }

  async getCurrentUser(): Promise<AuthUser | null> {
    await this.delay(100);
    return this.currentUser;
  }

  onAuthStateChange(callback: (user: AuthUser | null) => void): () => void {
    this.listeners.push(callback);

    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.currentUser));
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

class MockExpertRepository implements IExpertRepository {
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async findAll() {
    await this.delay(300);
    return [...mockExperts];
  }

  async findFeatured(limit = 8) {
    await this.delay(300);
    return mockExperts.slice(0, limit);
  }

  async findById(id: string) {
    await this.delay(200);
    return mockExperts.find(e => e.id === id) || null;
  }

  async findOffers(expertId: string) {
    await this.delay(200);
    return mockExpertOffers.filter(o => o.expert_id === expertId);
  }
}

class MockAppointmentRepository implements IAppointmentRepository {
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async findByClientId(userId: string) {
    await this.delay(300);
    return [...mockAppointments];
  }

  async findByExpertId(expertId: string) {
    await this.delay(300);
    return [...mockAppointments];
  }
}

class MockRoomRepository implements IRoomRepository {
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async findAll() {
    await this.delay(300);
    return [...mockRooms];
  }

  async findByProviderId(providerId: string) {
    await this.delay(300);
    return mockRooms.filter(r => r.provider_id === providerId);
  }
}

class MockBookingRepository implements IBookingRepository {
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async findByProviderId(providerId: string) {
    await this.delay(300);
    return [...mockRoomBookings];
  }
}

class MockProfileRepository implements IProfileRepository {
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async findById(userId: string) {
    await this.delay(200);
    return { ...mockProfile, id: userId };
  }
}

export class MockBackendClient implements IBackendClient {
  public auth: IAuthService;
  public experts: IExpertRepository;
  public appointments: IAppointmentRepository;
  public rooms: IRoomRepository;
  public bookings: IBookingRepository;
  public profiles: IProfileRepository;

  constructor() {
    this.auth = new MockAuthService();
    this.experts = new MockExpertRepository();
    this.appointments = new MockAppointmentRepository();
    this.rooms = new MockRoomRepository();
    this.bookings = new MockBookingRepository();
    this.profiles = new MockProfileRepository();
  }
}
