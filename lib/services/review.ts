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
}

export const reviewService = {
  async getExpertReviews(expertProfileId: string) {
    const { data, error } = await supabase
      .from('reviews')
      .select(`
        *,
        client:client_id (
          full_name,
          avatar_url
        )
      `)
      .eq('expert_profile_id', expertProfileId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as Review[];
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
        average_rating: ratingData.average,
        total_reviews: ratingData.count,
      })
      .eq('id', expertProfileId);

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
