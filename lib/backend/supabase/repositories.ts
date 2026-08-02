import { supabase } from '@/lib/supabase';
import type {
  IExpertRepository,
  IAppointmentRepository,
  IRoomRepository,
  IBookingRepository,
  IProfileRepository,
} from '../types';
import type { Expert, ExpertOffer, Appointment, Room, RoomBooking, UserProfile } from '@/lib/types';

function profileRow(profiles: any) {
  if (!profiles) return null;
  return Array.isArray(profiles) ? profiles[0] : profiles;
}

function mapExpert(expert: any): Expert {
  const profile = profileRow(expert.profiles);
  const professionsFromArray = Array.isArray(expert.professions)
    ? expert.professions.filter(Boolean)
    : [];
  const legacyProfession =
    typeof expert.profession === 'string' && expert.profession.trim()
      ? [expert.profession.trim()]
      : [];
  return {
    id: expert.id,
    user_id: expert.user_id,
    full_name: profile?.full_name || '',
    avatar_url: profile?.avatar_url || expert.profile_image_url || '',
    bio: expert.bio || '',
    specializations: expert.specializations || [],
    professions: professionsFromArray.length ? professionsFromArray : legacyProfession,
    verified_professions: expert.verified_professions,
    certifications: expert.certifications || [],
    hourly_rate: Number(expert.hourly_rate) || 0,
    rating: Number(expert.rating) || 0,
    total_reviews: Number(expert.total_reviews) || 0,
    is_verified: Boolean(expert.is_verified) || expert.verification_status === 'verified',
    city: expert.city,
    country: expert.country,
    address: expert.address,
    postal_code: expert.postal_code,
    years_experience: expert.years_experience,
    availability_status: expert.availability_status,
  };
}

const EXPERT_LIST_SELECT = `
  id,
  user_id,
  bio,
  specializations,
  profession,
  professions,
  profile_image_url,
  hourly_rate,
  rating,
  total_reviews,
  is_verified,
  verification_status,
  city,
  country,
  years_experience,
  availability_status,
  profiles:user_id (
    full_name,
    avatar_url
  )
`;

const EXPERT_DETAIL_SELECT = `
  id,
  user_id,
  bio,
  specializations,
  profession,
  professions,
  certifications,
  profile_image_url,
  hourly_rate,
  years_experience,
  rating,
  total_reviews,
  is_verified,
  verification_status,
  address,
  postal_code,
  city,
  country,
  availability_status,
  profiles:user_id (
    full_name,
    avatar_url
  )
`;

export class SupabaseExpertRepository implements IExpertRepository {
  async findAll(): Promise<Expert[]> {
    const { data, error } = await supabase
      .from('expert_profiles')
      .select(EXPERT_LIST_SELECT)
      .or('verification_status.eq.verified,is_verified.eq.true')
      .order('rating', { ascending: false });

    if (error) throw error;

    return (data || []).map(mapExpert);
  }

  async findFeatured(limit = 8): Promise<Expert[]> {
    const { data, error } = await supabase
      .from('expert_profiles')
      .select(EXPERT_LIST_SELECT)
      .or('verification_status.eq.verified,is_verified.eq.true')
      .order('rating', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return (data || []).map(mapExpert);
  }

  async findById(id: string): Promise<Expert | null> {
    if (!id) return null;

    let data: any = null;
    let error: any = null;

    ({ data, error } = await supabase
      .from('expert_profiles')
      .select(EXPERT_DETAIL_SELECT)
      .eq('id', id)
      .maybeSingle());

    // Some older booking rows may store auth user_id instead of expert_profiles.id
    if (!data && !error) {
      ({ data, error } = await supabase
        .from('expert_profiles')
        .select(EXPERT_DETAIL_SELECT)
        .eq('user_id', id)
        .maybeSingle());
    }

    if (error) throw error;
    if (!data) return null;

    let verifiedProfessions: string[] = [];
    try {
      const { data: docs } = await supabase
        .from('qualification_documents')
        .select('profession')
        .eq('expert_profile_id', data.id)
        .eq('status', 'approved');
      verifiedProfessions = Array.from(
        new Set((docs || []).map((d) => (d.profession || '').trim()).filter(Boolean))
      );
    } catch {
      /* column may not exist yet */
    }

    const mapped = mapExpert(data);
    return {
      ...mapped,
      verified_professions: verifiedProfessions,
      phone: mapped.phone || '',
      email: mapped.email || '',
      address: mapped.address || '',
      postal_code: mapped.postal_code || '',
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
        expert_id,
        expert_profiles:expert_id (
          id,
          profile_image_url,
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

    return data.map((apt: any) => {
      const expertProfiles = Array.isArray(apt.expert_profiles)
        ? apt.expert_profiles[0]
        : apt.expert_profiles;
      const expertProfile = Array.isArray(expertProfiles?.profiles)
        ? expertProfiles?.profiles[0]
        : expertProfiles?.profiles;
      const offer = Array.isArray(apt.expert_offers) ? apt.expert_offers[0] : apt.expert_offers;

      return {
        id: apt.id,
        expert: {
          id: expertProfiles?.id || apt.expert_id || '',
          full_name: expertProfile?.full_name || '',
          avatar_url: expertProfile?.avatar_url || expertProfiles?.profile_image_url || '',
        },
        offer: {
          title: offer?.title || '',
          format: offer?.format || '',
        },
        start_time: apt.start_time,
        end_time: apt.end_time,
        status: apt.status,
        total_price: apt.total_price,
      };
    });
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
