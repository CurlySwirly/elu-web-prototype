import { supabase } from '@/lib/supabase';

/**
 * Booking Service
 *
 * This service handles all booking-related operations including:
 * - Appointments (Client ↔ Expert sessions)
 * - Room Bookings (Expert ↔ Room Provider)
 * - Cancellations with 24-hour refund policy
 * - Payment tracking
 * - Notifications
 *
 * BACKEND INTEGRATION NOTE:
 * This service currently uses Supabase directly. When migrating to a custom backend:
 * 1. Replace `supabase` imports with backend client
 * 2. Update all supabase.rpc() calls to backend API endpoints
 * 3. Keep the same interface signatures for minimal frontend changes
 * 4. See BACKEND_MIGRATION_GUIDE.md for detailed instructions
 */

export interface Appointment {
  id: string;
  client_id: string;
  expert_id: string;
  offer_id: string;
  room_booking_id?: string;
  start_time: string;
  end_time: string;
  status: 'requested' | 'confirmed' | 'cancelled_by_client' | 'cancelled_by_expert' | 'completed';
  payment_status: 'unpaid' | 'paid' | 'refunded';
  payment_intent_id?: string;
  amount_paid: number;
  total_price: number;
  notes?: string;
  cancelled_at?: string;
  cancelled_by?: string;
  cancellation_reason?: string;
  refund_amount?: number;
  refund_processed_at?: string;
  created_at: string;
}

export interface RoomBooking {
  id: string;
  room_id: string;
  expert_id: string;
  room_provider_id?: string;
  appointment_id?: string;
  start_time: string;
  end_time: string;
  status: 'reserved' | 'paid' | 'cancelled_refunded' | 'cancelled_no_refund' | 'completed';
  payment_status: 'unpaid' | 'paid' | 'refunded';
  payment_intent_id?: string;
  amount_paid: number;
  total_price: number;
  cancelled_at?: string;
  cancellation_reason?: string;
  refund_amount?: number;
  refund_processed_at?: string;
  created_at: string;
}

export interface BookingNotification {
  id: string;
  user_id: string;
  booking_type: 'appointment' | 'room_booking';
  booking_id: string;
  notification_type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export interface CancellationResult {
  success: boolean;
  refund_amount?: number;
  within_window?: boolean;
  new_status?: string;
  error?: string;
}

/**
 * Create a new appointment (session booking)
 */
export async function createAppointment(data: {
  expert_id: string;
  offer_id: string;
  start_time: string;
  end_time: string;
  total_price: number;
  notes?: string;
}): Promise<{ data: Appointment | null; error: any }> {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { data: null, error: { message: 'Not authenticated' } };
  }

  const { data: appointment, error } = await supabase
    .from('appointments')
    .insert({
      client_id: user.id,
      expert_id: data.expert_id,
      offer_id: data.offer_id,
      start_time: data.start_time,
      end_time: data.end_time,
      total_price: data.total_price,
      notes: data.notes || '',
      status: 'requested',
      payment_status: 'unpaid'
    })
    .select()
    .single();

  return { data: appointment, error };
}

/**
 * Mark appointment as paid (after Stripe payment)
 */
export async function markAppointmentAsPaid(
  appointmentId: string,
  paymentIntentId: string,
  amountPaid: number
): Promise<{ success: boolean; error?: any }> {
  const { error } = await supabase
    .from('appointments')
    .update({
      payment_status: 'paid',
      payment_intent_id: paymentIntentId,
      amount_paid: amountPaid
    })
    .eq('id', appointmentId);

  return { success: !error, error };
}

/**
 * Expert confirms appointment
 */
export async function confirmAppointment(
  appointmentId: string
): Promise<CancellationResult> {
  const { data, error } = await supabase.rpc('confirm_appointment_by_expert', {
    p_appointment_id: appointmentId
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return data as CancellationResult;
}

/**
 * Client cancels appointment
 */
export async function cancelAppointmentByClient(
  appointmentId: string,
  reason?: string
): Promise<CancellationResult> {
  const { data, error } = await supabase.rpc('cancel_appointment_by_client', {
    p_appointment_id: appointmentId,
    p_reason: reason || ''
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return data as CancellationResult;
}

/**
 * Expert cancels appointment
 */
export async function cancelAppointmentByExpert(
  appointmentId: string,
  reason?: string
): Promise<CancellationResult> {
  const { data, error } = await supabase.rpc('cancel_appointment_by_expert', {
    p_appointment_id: appointmentId,
    p_reason: reason || ''
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return data as CancellationResult;
}

/**
 * Create a room booking
 */
export async function createRoomBooking(data: {
  room_id: string;
  expert_id: string;
  room_provider_id: string;
  start_time: string;
  end_time: string;
  total_price: number;
  appointment_id?: string;
}): Promise<{ data: RoomBooking | null; error: any }> {
  const { data: booking, error } = await supabase
    .from('room_bookings')
    .insert({
      room_id: data.room_id,
      expert_id: data.expert_id,
      room_provider_id: data.room_provider_id,
      start_time: data.start_time,
      end_time: data.end_time,
      total_price: data.total_price,
      appointment_id: data.appointment_id,
      status: 'reserved',
      payment_status: 'unpaid'
    })
    .select()
    .single();

  return { data: booking, error };
}

/**
 * Mark room booking as paid
 */
export async function markRoomBookingAsPaid(
  bookingId: string,
  paymentIntentId: string,
  amountPaid: number
): Promise<{ success: boolean; error?: any }> {
  const { error } = await supabase
    .from('room_bookings')
    .update({
      status: 'paid',
      payment_status: 'paid',
      payment_intent_id: paymentIntentId,
      amount_paid: amountPaid
    })
    .eq('id', bookingId);

  return { success: !error, error };
}

/**
 * Expert cancels room booking
 */
export async function cancelRoomBookingByExpert(
  bookingId: string,
  reason?: string
): Promise<CancellationResult> {
  const { data, error } = await supabase.rpc('cancel_room_booking_by_expert', {
    p_booking_id: bookingId,
    p_reason: reason || ''
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return data as CancellationResult;
}

/**
 * Get appointments for current user (client or expert)
 */
export async function getMyAppointments(
  role: 'client' | 'expert'
): Promise<{ data: Appointment[] | null; error: any }> {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { data: null, error: { message: 'Not authenticated' } };
  }

  let query = supabase.from('appointments').select('*');

  if (role === 'client') {
    query = query.eq('client_id', user.id);
  } else {
    const { data: expertProfile } = await supabase
      .from('expert_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (expertProfile) {
      query = query.eq('expert_id', expertProfile.id);
    }
  }

  const { data, error } = await query.order('start_time', { ascending: false });

  return { data, error };
}

/**
 * Get room bookings for expert
 */
export async function getMyRoomBookings(): Promise<{ data: RoomBooking[] | null; error: any }> {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { data: null, error: { message: 'Not authenticated' } };
  }

  const { data: expertProfile } = await supabase
    .from('expert_profiles')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (!expertProfile) {
    return { data: null, error: { message: 'Expert profile not found' } };
  }

  const { data, error } = await supabase
    .from('room_bookings')
    .select('*')
    .eq('expert_id', expertProfile.id)
    .order('start_time', { ascending: false });

  return { data, error };
}

/**
 * Get notifications for current user
 */
export async function getMyNotifications(): Promise<{ data: BookingNotification[] | null; error: any }> {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { data: null, error: { message: 'Not authenticated' } };
  }

  const { data, error } = await supabase
    .from('booking_notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50);

  return { data, error };
}

/**
 * Mark notification as read
 */
export async function markNotificationAsRead(
  notificationId: string
): Promise<{ success: boolean; error?: any }> {
  const { error } = await supabase
    .from('booking_notifications')
    .update({ is_read: true })
    .eq('id', notificationId);

  return { success: !error, error };
}

/**
 * Check if room is available for booking
 */
export async function checkRoomAvailability(
  roomId: string,
  startTime: string,
  endTime: string
): Promise<{ available: boolean; error?: any }> {
  const { data, error } = await supabase
    .from('room_bookings')
    .select('id')
    .eq('room_id', roomId)
    .in('status', ['reserved', 'paid'])
    .or(`start_time.lte.${endTime},end_time.gte.${startTime}`);

  if (error) {
    return { available: false, error };
  }

  return { available: data.length === 0 };
}

/**
 * Calculate cancellation window (24 hours)
 */
export function isWithinCancellationWindow(startTime: string): boolean {
  const start = new Date(startTime);
  const now = new Date();
  const hoursUntilStart = (start.getTime() - now.getTime()) / (1000 * 60 * 60);
  return hoursUntilStart >= 24;
}

/**
 * Get cancellation info for display
 */
export function getCancellationInfo(
  startTime: string,
  bookingType: 'appointment' | 'room_booking'
): {
  canCancelWithRefund: boolean;
  hoursUntilStart: number;
  message: string;
} {
  const start = new Date(startTime);
  const now = new Date();
  const hoursUntilStart = (start.getTime() - now.getTime()) / (1000 * 60 * 60);
  const canCancelWithRefund = hoursUntilStart >= 24;

  let message = '';
  if (canCancelWithRefund) {
    message = `Kostenlose Stornierung noch ${Math.floor(hoursUntilStart)} Stunden möglich.`;
  } else if (hoursUntilStart > 0) {
    message = bookingType === 'appointment'
      ? 'Stornierung nicht mehr kostenlos möglich.'
      : 'Stornierung nicht mehr kostenlos möglich. Raumkosten werden nicht erstattet.';
  } else {
    message = 'Termin liegt in der Vergangenheit.';
  }

  return {
    canCancelWithRefund,
    hoursUntilStart,
    message
  };
}
