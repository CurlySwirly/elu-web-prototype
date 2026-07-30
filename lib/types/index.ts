export interface Expert {
  id: string;
  user_id: string;
  full_name: string;
  avatar_url: string;
  bio: string;
  specializations: string[];
  hourly_rate: number;
  rating: number;
  total_reviews: number;
  is_verified: boolean;
  city?: string;
  country?: string;
  address?: string;
  postal_code?: string;
  phone?: string;
  email?: string;
  certifications?: string[];
  years_experience?: number;
  availability_status?: 'available' | 'busy' | 'unavailable';
}

export interface ExpertFilters {
  location?: string;
  minExperience?: number;
  maxExperience?: number;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  availability?: 'available' | 'busy' | 'unavailable';
  availabilityDays?: string[]; // e.g., ['monday', 'tuesday', 'weekdays', 'weekends']
  availabilityTimePeriods?: string[]; // e.g., ['morning', 'afternoon', 'evening']
  availabilitySpecificTime?: string; // e.g., '14:00'
  specializations?: string[];
  sortBy?: 'earliest_availability' | 'best_rating';
  format?: 'online' | 'in_person';
}

export interface ExpertOffer {
  id: string;
  expert_id: string;
  title: string;
  description: string;
  category: string;
  format: string;
  duration_minutes: number;
  price: number;
  is_active?: boolean;
}

export interface Appointment {
  id: string;
  expert: {
    full_name: string;
    avatar_url: string;
  };
  offer: {
    title: string;
    format: string;
  };
  start_time: string;
  end_time: string;
  status: string;
  total_price: number;
  notes?: string;
}

export interface Room {
  id: string;
  provider_id: string;
  name: string;
  description: string;
  size_sqm: number;
  hourly_rate: number;
  amenities: string[];
  images: string[];
  is_available: boolean;
  provider: {
    business_name: string;
    city: string;
  };
}

export interface RoomBooking {
  id: string;
  room: {
    name: string;
    provider: {
      business_name: string;
    };
  };
  start_time: string;
  end_time: string;
  status: string;
  total_price: number;
}

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: 'client' | 'expert' | 'admin';
  avatar_url?: string;
  phone?: string;
  created_at?: string;
  updated_at?: string;
}

export interface AuthUser {
  id: string;
  email: string;
  role: 'client' | 'expert' | 'admin';
}

export interface SignUpData {
  email: string;
  password: string;
  fullName: string;
  role: 'client' | 'expert' | 'admin';
}

export interface SignInData {
  email: string;
  password: string;
}

export interface PlatformReview {
  id: string;
  expert_id: string;
  expert_name: string;
  expert_avatar_url?: string;
  rating: number;
  title: string;
  review_text: string;
  created_at: string;
  helpful_count?: number;
}
