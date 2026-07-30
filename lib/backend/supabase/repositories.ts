import { supabase } from '@/lib/supabase';
import type {
  IExpertRepository,
  IAppointmentRepository,
  IRoomRepository,
  IBookingRepository,
  IProfileRepository,
} from '../types';
import type { Expert, ExpertOffer, Appointment, Room, RoomBooking, UserProfile } from '@/lib/types';

export class SupabaseExpertRepository implements IExpertRepository {
  async findAll(): Promise<Expert[]> {
    const { data, error } = await supabase
      .from('expert_profiles')
      .select(`
        id,
        user_id,
        bio,
        specializations,
        hourly_rate,
        rating,
        total_reviews,
        is_verified,
        city,
        country,
        years_experience,
        availability_status,
        profiles:user_id (
          full_name,
          avatar_url
        )
      `)
      .order('rating', { ascending: false });

    if (error) throw error;

    return data.map((expert: any) => ({
      id: expert.id,
      user_id: expert.user_id,
      full_name: expert.profiles?.full_name || '',
      avatar_url: expert.profiles?.avatar_url || '',
      bio: expert.bio,
      specializations: expert.specializations,
      hourly_rate: expert.hourly_rate,
      rating: expert.rating,
      total_reviews: expert.total_reviews,
      is_verified: expert.is_verified,
      city: expert.city,
      country: expert.country,
      years_experience: expert.years_experience,
      availability_status: expert.availability_status,
    }));
  }

  async findFeatured(limit = 8): Promise<Expert[]> {
    const { data, error } = await supabase
      .from('expert_profiles')
      .select(`
        id,
        user_id,
        bio,
        specializations,
        hourly_rate,
        rating,
        total_reviews,
        is_verified,
        city,
        country,
        years_experience,
        availability_status,
        profiles:user_id (
          full_name,
          avatar_url
        )
      `)
      .eq('is_verified', true)
      .order('rating', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return data.map((expert: any) => ({
      id: expert.id,
      user_id: expert.user_id,
      full_name: expert.profiles?.full_name || '',
      avatar_url: expert.profiles?.avatar_url || '',
      bio: expert.bio,
      specializations: expert.specializations,
      hourly_rate: expert.hourly_rate,
      rating: expert.rating,
      total_reviews: expert.total_reviews,
      is_verified: expert.is_verified,
      city: expert.city,
      country: expert.country,
      years_experience: expert.years_experience,
      availability_status: expert.availability_status,
    }));
  }

  async findById(id: string): Promise<Expert | null> {
    const { data, error } = await supabase
      .from('expert_profiles')
      .select(`
        id,
        user_id,
        bio,
        specializations,
        certifications,
        hourly_rate,
        years_experience,
        rating,
        total_reviews,
        is_verified,
        address,
        postal_code,
        city,
        country,
        availability_status,
        profiles:user_id (
          full_name,
          avatar_url,
          phone,
          email
        )
      `)
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    const profile = Array.isArray(data.profiles) ? data.profiles[0] : data.profiles;

    return {
      id: data.id,
      user_id: data.user_id,
      full_name: profile?.full_name || '',
      avatar_url: profile?.avatar_url || '',
      phone: profile?.phone || '',
      email: profile?.email || '',
      bio: data.bio,
      specializations: data.specializations,
      certifications: data.certifications,
      hourly_rate: data.hourly_rate,
      years_experience: data.years_experience,
      rating: data.rating,
      total_reviews: data.total_reviews,
      is_verified: data.is_verified,
      address: data.address || '',
      postal_code: data.postal_code || '',
      city: data.city,
      country: data.country,
      availability_status: data.availability_status,
    };
  }

  async findOffers(expertId: string): Promise<ExpertOffer[]> {
    const { data, error } = await supabase
      .from('expert_offers')
      .select('*')
      .eq('expert_id', expertId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }
}

export class SupabaseAppointmentRepository implements IAppointmentRepository {
  async findByClientId(userId: string): Promise<Appointment[]> {
    const { data, error } = await supabase
      .from('appointments')
      .select(`
        id,
        start_time,
        end_time,
        status,
        total_price,
        expert_profiles:expert_id (
          profiles:user_id (
            full_name,
            avatar_url
          )
        ),
        expert_offers:offer_id (
          title,
          format
        )
      `)
      .eq('client_id', userId)
      .order('start_time', { ascending: false });

    if (error) throw error;

    return data.map((apt: any) => ({
      id: apt.id,
      expert: {
        full_name: apt.expert_profiles?.profiles?.full_name || '',
        avatar_url: apt.expert_profiles?.profiles?.avatar_url || '',
      },
      offer: {
        title: apt.expert_offers?.title || '',
        format: apt.expert_offers?.format || '',
      },
      start_time: apt.start_time,
      end_time: apt.end_time,
      status: apt.status,
      total_price: apt.total_price,
    }));
  }

  async findByExpertId(expertId: string): Promise<Appointment[]> {
    const { data, error } = await supabase
      .from('appointments')
      .select(`
        id,
        start_time,
        end_time,
        status,
        total_price,
        notes,
        profiles:client_id (
          full_name,
          avatar_url,
          phone
        ),
        expert_offers:offer_id (
          title,
          format
        )
      `)
      .eq('expert_id', expertId)
      .order('start_time', { ascending: false });

    if (error) throw error;

    return data.map((apt: any) => ({
      id: apt.id,
      expert: {
        full_name: apt.profiles?.full_name || '',
        avatar_url: apt.profiles?.avatar_url || '',
      },
      offer: {
        title: apt.expert_offers?.title || '',
        format: apt.expert_offers?.format || '',
      },
      start_time: apt.start_time,
      end_time: apt.end_time,
      status: apt.status,
      total_price: apt.total_price,
      notes: apt.notes,
    }));
  }
}

export class SupabaseRoomRepository implements IRoomRepository {
  async findAll(): Promise<Room[]> {
    const { data, error } = await supabase
      .from('rooms')
      .select(`
        id,
        provider_id,
        name,
        description,
        size_sqm,
        hourly_rate,
        amenities,
        images,
        is_available,
        provider_profiles:provider_id (
          business_name,
          city
        )
      `)
      .eq('is_available', true)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return data.map((room: any) => ({
      id: room.id,
      provider_id: room.provider_id,
      name: room.name,
      description: room.description,
      size_sqm: room.size_sqm,
      hourly_rate: room.hourly_rate,
      amenities: room.amenities,
      images: room.images,
      is_available: room.is_available,
      provider: {
        business_name: room.provider_profiles?.business_name || '',
        city: room.provider_profiles?.city || '',
      },
    }));
  }

  async findByProviderId(providerId: string): Promise<Room[]> {
    const { data, error } = await supabase
      .from('rooms')
      .select('*')
      .eq('provider_id', providerId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return data.map((room: any) => ({
      ...room,
      provider: {
        business_name: '',
        city: '',
      },
    }));
  }
}

export class SupabaseBookingRepository implements IBookingRepository {
  async findByProviderId(providerId: string): Promise<RoomBooking[]> {
    const { data: rooms } = await supabase
      .from('rooms')
      .select('id')
      .eq('provider_id', providerId);

    const roomIds = rooms?.map(r => r.id) || [];

    if (roomIds.length === 0) {
      return [];
    }

    const { data, error } = await supabase
      .from('room_bookings')
      .select(`
        id,
        start_time,
        end_time,
        status,
        total_price,
        rooms:room_id (
          name,
          provider_profiles:provider_id (
            business_name
          )
        )
      `)
      .in('room_id', roomIds)
      .order('start_time', { ascending: false });

    if (error) throw error;

    return data.map((booking: any) => ({
      id: booking.id,
      room: {
        name: booking.rooms?.name || '',
        provider: {
          business_name: booking.rooms?.provider_profiles?.business_name || '',
        },
      },
      start_time: booking.start_time,
      end_time: booking.end_time,
      status: booking.status,
      total_price: booking.total_price,
    }));
  }
}

export class SupabaseProfileRepository implements IProfileRepository {
  async findById(userId: string): Promise<UserProfile | null> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) throw error;
    return data;
  }
}
