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
  mockClientAppointments,
  mockExpertAppointments,
  mockRooms,
  mockRoomBookings,
  mockProfile,
} from './data';

class MockAuthService implements IAuthService {
  private currentUser: AuthUser | null = null;
  private listeners: Array<(user: AuthUser | null) => void> = [];
  private static STORAGE_KEY = 'elu-mock-auth-user';

  constructor() {
    this.currentUser = this.readStoredUser();
  }

  private readStoredUser(): AuthUser | null {
    if (typeof window === 'undefined') return null;
    try {
      const raw = window.sessionStorage.getItem(MockAuthService.STORAGE_KEY);
      return raw ? (JSON.parse(raw) as AuthUser) : null;
    } catch {
      return null;
    }
  }

  private persistUser(user: AuthUser | null) {
    this.currentUser = user;
    if (typeof window === 'undefined') return;
    try {
      if (user) {
        window.sessionStorage.setItem(MockAuthService.STORAGE_KEY, JSON.stringify(user));
      } else {
        window.sessionStorage.removeItem(MockAuthService.STORAGE_KEY);
      }
    } catch {
      // ignore storage errors in private mode
    }
  }

  async signIn(data: SignInData): Promise<AuthUser> {
    await this.delay(500);

    // Development helper: detect role from email pattern
    // - client@test.com or any email -> client
    // - expert@test.com -> verified expert (full data, active Abo, Stripe)
    // - onboarding@test.com -> onboarding demo (wizard / Abo / Stripe open)
    // - admin@test.com -> admin
    const emailLower = data.email.toLowerCase();
    let role: 'client' | 'expert' | 'admin' = 'client';
    let id = 'mock-user-client';
    let fullName = mockProfile.full_name;

    if (emailLower.includes('admin@') || emailLower.startsWith('admin')) {
      role = 'admin';
      id = 'mock-user-admin';
      fullName = 'Admin';
    } else if (
      emailLower.includes('onboarding@') ||
      emailLower.includes('expert-onboarding') ||
      emailLower.startsWith('onboarding')
    ) {
      role = 'expert';
      id = 'mock-user-expert-onboarding';
      fullName = 'Alex Neubeginn';
    } else if (emailLower.includes('expert@') || emailLower.startsWith('expert')) {
      role = 'expert';
      id = 'mock-user-expert';
      fullName = mockExperts[0]?.full_name || 'Sarah Müller';
    }

    const user: AuthUser = {
      id,
      email: data.email,
      role,
      fullName,
    };

    this.persistUser(user);

    if (role === 'expert') {
      const { ensureMockExpertDemoState } = await import('./expert-demo-state');
      ensureMockExpertDemoState(id, {
        forceResetOnboarding: id === 'mock-user-expert-onboarding',
      });
    }

    this.notifyListeners();
    return user;
  }

  async signUp(data: SignUpData): Promise<AuthUser> {
    await this.delay(500);

    // New expert signups use the onboarding demo identity (unverified)
    const id =
      data.role === 'expert'
        ? 'mock-user-expert-onboarding'
        : data.role === 'admin'
          ? 'mock-user-admin'
          : 'mock-user-client';

    const user: AuthUser = {
      id,
      email: data.email,
      role: data.role,
      fullName: data.fullName,
    };

    this.persistUser(user);
    this.notifyListeners();
    return user;
  }

  async signOut(): Promise<void> {
    await this.delay(300);
    this.persistUser(null);
    this.notifyListeners();
  }

  async getCurrentUser(): Promise<AuthUser | null> {
    await this.delay(100);
    if (!this.currentUser) {
      this.currentUser = this.readStoredUser();
    }
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
    return [...mockClientAppointments];
  }

  async findByExpertId(expertId: string) {
    await this.delay(300);
    return [...mockExpertAppointments];
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
