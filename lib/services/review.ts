import { isMockBackend } from '@/lib/backend/mode';
import { supabase } from '@/lib/supabase';

export interface Review {
  id: string;
  appointment_id: string;
  expert_profile_id: string;
  client_id: string;
  rating: number;
  title: string;
  review_text: string;
  helpful_count: number;
  created_at: string;
  client?: {
    full_name: string;
    avatar_url?: string;
  };
  appointment?: {
    start_time: string;
    end_time: string;
    offer?: {
      title: string;
      format?: string;
    };
  };
}

export interface PendingReviewAppointment {
  id: string;
  expert_id: string;
  start_time: string;
  end_time: string;
  total_price: number;
  expert?: {
    full_name: string;
    avatar_url: string;
  };
  offer: {
    title: string;
    format: string;
  };
}

function isMockMode() {
  return isMockBackend();
}

export const reviewService = {
  /** Mark past confirmed sessions as completed and notify clients to review */
  async completeElapsedAppointments() {
    if (isMockMode()) return 0;
    const { data, error } = await supabase.rpc('complete_elapsed_appointments');
    if (error) {
      console.error('complete_elapsed_appointments failed:', error);
      return 0;
    }
    return typeof data === 'number' ? data : 0;
  },

  async getPendingReviewAppointments(userId: string): Promise<PendingReviewAppointment[]> {
    await this.completeElapsedAppointments();

    if (isMockMode()) {
      const {
        mockPendingReviewAppointments,
        mockSubmittedReviewAppointmentIds,
      } = await import('@/lib/backend/mock/data');
      return mockPendingReviewAppointments.filter(
        (apt) => !mockSubmittedReviewAppointmentIds.has(apt.id)
      );
    }

    const { data: completed, error } = await supabase
      .from('appointments')
      .select(`
        id,
        expert_id,
        start_time,
        end_time,
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
      .eq('status', 'completed')
      .order('end_time', { ascending: false });

    if (error || !completed?.length) return [];

    const pending = await Promise.all(
      completed.map(async (apt: any) => {
        const can = await this.canReviewAppointment(apt.id, userId);
        if (!can) return null;

        const expertProfiles = Array.isArray(apt.expert_profiles)
          ? apt.expert_profiles[0]
          : apt.expert_profiles;
        const profile = Array.isArray(expertProfiles?.profiles)
          ? expertProfiles?.profiles[0]
          : expertProfiles?.profiles;

        return {
          id: apt.id,
          expert_id: apt.expert_id,
          start_time: apt.start_time,
          end_time: apt.end_time,
          total_price: Number(apt.total_price) || 0,
          expert: {
            full_name: profile?.full_name || '',
            avatar_url: profile?.avatar_url || '',
          },
          offer: {
            title: apt.expert_offers?.title || 'Session',
            format: apt.expert_offers?.format || '',
          },
        } as PendingReviewAppointment;
      })
    );

    return pending.filter(Boolean) as PendingReviewAppointment[];
  },

  async getExpertReviews(expertProfileId: string) {
    if (isMockMode()) {
      const { mockExpertReviews } = await import('@/lib/backend/mock/data');
      return mockExpertReviews
        .filter((r) => r.expert_profile_id === expertProfileId)
        .sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
    }

    const { data, error } = await supabase
      .from('reviews')
      .select(`
        *,
        client:client_id (
          full_name,
          avatar_url
        ),
        appointments:appointment_id (
          start_time,
          end_time,
          expert_offers:offer_id (
            title,
            format
          )
        )
      `)
      .eq('expert_profile_id', expertProfileId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map((review: any) => ({
      ...review,
      appointment: review.appointments
        ? {
            start_time: review.appointments.start_time,
            end_time: review.appointments.end_time,
            offer: review.appointments.expert_offers
              ? {
                  title: review.appointments.expert_offers.title,
                  format: review.appointments.expert_offers.format,
                }
              : undefined,
          }
        : undefined,
    })) as Review[];
  },

  async getExpertRating(expertProfileId: string) {
    const reviews = await this.getExpertReviews(expertProfileId);

    if (reviews.length === 0) {
      return { average: 0, count: 0 };
    }

    const average = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;

    return {
      average: Number(average.toFixed(1)),
      count: reviews.length,
    };
  },

  async canReviewAppointment(appointmentId: string, userId: string) {
    if (isMockMode()) {
      const {
        mockPendingReviewAppointments,
        mockSubmittedReviewAppointmentIds,
      } = await import('@/lib/backend/mock/data');
      return (
        mockPendingReviewAppointments.some((apt) => apt.id === appointmentId) &&
        !mockSubmittedReviewAppointmentIds.has(appointmentId)
      );
    }

    const { data: appointment } = await supabase
      .from('appointments')
      .select('status, client_id')
      .eq('id', appointmentId)
      .single();

    if (!appointment || appointment.client_id !== userId) {
      return false;
    }

    if (appointment.status !== 'completed') {
      return false;
    }

    const { data: existingReview } = await supabase
      .from('reviews')
      .select('id')
      .eq('appointment_id', appointmentId)
      .eq('client_id', userId)
      .maybeSingle();

    return !existingReview;
  },

  async createReview(
    appointmentId: string,
    expertProfileId: string,
    clientId: string,
    rating: number,
    title: string,
    reviewText: string
  ) {
    if (rating < 1 || rating > 5) {
      throw new Error('Bitte wähle eine Bewertung von 1 bis 5 Sternen');
    }

    if (isMockMode()) {
      const {
        mockPendingReviewAppointments,
        mockSubmittedReviewAppointmentIds,
        mockNotifications,
      } = await import('@/lib/backend/mock/data');

      const canReview =
        mockPendingReviewAppointments.some((apt) => apt.id === appointmentId) &&
        !mockSubmittedReviewAppointmentIds.has(appointmentId);

      if (!canReview) {
        throw new Error('Du kannst diesen Termin nicht bewerten');
      }

      mockSubmittedReviewAppointmentIds.add(appointmentId);
      mockNotifications.forEach((n) => {
        if (n.booking_id === appointmentId && n.notification_type === 'review_request') {
          n.is_read = true;
        }
      });

      return {
        id: `review-${appointmentId}`,
        appointment_id: appointmentId,
        expert_profile_id: expertProfileId,
        client_id: clientId,
        rating,
        title,
        review_text: reviewText,
        helpful_count: 0,
        created_at: new Date().toISOString(),
      } as Review;
    }

    const canReview = await this.canReviewAppointment(appointmentId, clientId);

    if (!canReview) {
      throw new Error('Du kannst diesen Termin nicht bewerten');
    }

    const { data, error } = await supabase
      .from('reviews')
      .insert({
        appointment_id: appointmentId,
        expert_profile_id: expertProfileId,
        client_id: clientId,
        rating,
        title,
        review_text: reviewText,
      })
      .select(`
        *,
        client:client_id (
          full_name,
          avatar_url
        )
      `)
      .single();

    if (error) throw error;

    const ratingData = await this.getExpertRating(expertProfileId);

    await supabase
      .from('expert_profiles')
      .update({
        rating: ratingData.average,
        total_reviews: ratingData.count,
      })
      .eq('id', expertProfileId);

    await supabase
      .from('booking_notifications')
      .update({ is_read: true })
      .eq('booking_id', appointmentId)
      .eq('notification_type', 'review_request')
      .eq('user_id', clientId);

    return data;
  },

  async updateReview(
    reviewId: string,
    userId: string,
    updates: Partial<Pick<Review, 'rating' | 'title' | 'review_text'>>
  ) {
    const { data, error } = await supabase
      .from('reviews')
      .update(updates)
      .eq('id', reviewId)
      .eq('client_id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteReview(reviewId: string, userId: string) {
    const { error } = await supabase
      .from('reviews')
      .delete()
      .eq('id', reviewId)
      .eq('client_id', userId);

    if (error) throw error;
  },

  async incrementHelpfulCount(reviewId: string) {
    const { error } = await supabase.rpc('increment_helpful_count', {
      review_id: reviewId,
    });

    if (error) {
      const { data: review } = await supabase
        .from('reviews')
        .select('helpful_count')
        .eq('id', reviewId)
        .single();

      if (review) {
        await supabase
          .from('reviews')
          .update({ helpful_count: (review.helpful_count || 0) + 1 })
          .eq('id', reviewId);
      }
    }
  },
};
