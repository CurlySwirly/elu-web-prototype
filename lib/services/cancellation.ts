import { supabase } from '@/lib/supabase';

export interface CancellationResult {
  success: boolean;
  refundEligible: boolean;
  refundAmount: number;
  message: string;
}

export const cancellationService = {
  canCancelWithRefund(startTime: string): boolean {
    const appointmentTime = new Date(startTime);
    const now = new Date();
    const hoursUntil = (appointmentTime.getTime() - now.getTime()) / (1000 * 60 * 60);

    return hoursUntil >= 48;
  },

  calculateRefund(totalPrice: number, startTime: string): number {
    return this.canCancelWithRefund(startTime) ? totalPrice : 0;
  },

  async cancelAppointment(
    appointmentId: string,
    userId: string,
    reason?: string
  ): Promise<CancellationResult> {
    const { data: appointment, error: fetchError } = await supabase
      .from('appointments')
      .select('start_time, total_price, status')
      .eq('id', appointmentId)
      .single();

    if (fetchError) throw fetchError;

    if (appointment.status === 'cancelled') {
      return {
        success: false,
        refundEligible: false,
        refundAmount: 0,
        message: 'Dieser Termin wurde bereits storniert',
      };
    }

    const refundEligible = this.canCancelWithRefund(appointment.start_time);
    const refundAmount = this.calculateRefund(appointment.total_price, appointment.start_time);

    const { error: updateError } = await supabase
      .from('appointments')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        can_be_cancelled: false,
      })
      .eq('id', appointmentId);

    if (updateError) throw updateError;

    const { error: logError } = await supabase
      .from('cancellations')
      .insert({
        booking_type: 'appointment',
        booking_id: appointmentId,
        cancelled_by: userId,
        reason,
        refund_amount: refundAmount,
        refund_eligible: refundEligible,
      });

    if (logError) throw logError;

    return {
      success: true,
      refundEligible,
      refundAmount,
      message: refundEligible
        ? `Stornierung erfolgreich. Rückerstattung: €${refundAmount.toFixed(2)}`
        : 'Stornierung erfolgreich. Da weniger als 48 Stunden vor dem Termin storniert wurde, wird der Betrag nicht erstattet.',
    };
  },

  async cancelRoomBooking(
    bookingId: string,
    userId: string,
    reason?: string
  ): Promise<CancellationResult> {
    const { data: booking, error: fetchError } = await supabase
      .from('room_bookings')
      .select('start_time, total_price, status')
      .eq('id', bookingId)
      .single();

    if (fetchError) throw fetchError;

    if (booking.status === 'cancelled') {
      return {
        success: false,
        refundEligible: false,
        refundAmount: 0,
        message: 'Diese Raumbuchung wurde bereits storniert',
      };
    }

    const refundEligible = this.canCancelWithRefund(booking.start_time);
    const refundAmount = this.calculateRefund(booking.total_price, booking.start_time);

    const { error: updateError } = await supabase
      .from('room_bookings')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        can_be_cancelled: false,
      })
      .eq('id', bookingId);

    if (updateError) throw updateError;

    const { error: logError } = await supabase
      .from('cancellations')
      .insert({
        booking_type: 'room_booking',
        booking_id: bookingId,
        cancelled_by: userId,
        reason,
        refund_amount: refundAmount,
        refund_eligible: refundEligible,
      });

    if (logError) throw logError;

    return {
      success: true,
      refundEligible,
      refundAmount,
      message: refundEligible
        ? `Stornierung erfolgreich. Rückerstattung: €${refundAmount.toFixed(2)}`
        : 'Stornierung erfolgreich. Da weniger als 48 Stunden vor dem Termin storniert wurde, wird der Betrag nicht erstattet.',
    };
  },

  async checkLinkedRoomBooking(appointmentId: string) {
    const { data: appointment } = await supabase
      .from('appointments')
      .select('start_time, end_time, expert_id')
      .eq('id', appointmentId)
      .single();

    if (!appointment) return null;

    const { data: roomBooking } = await supabase
      .from('room_bookings')
      .select(`
        id,
        start_time,
        total_price,
        status,
        rooms:room_id (
          name
        )
      `)
      .eq('expert_id', appointment.expert_id)
      .eq('start_time', appointment.start_time)
      .neq('status', 'cancelled')
      .maybeSingle();

    return roomBooking;
  },

  getHoursUntil(dateTime: string): number {
    const futureTime = new Date(dateTime);
    const now = new Date();
    return (futureTime.getTime() - now.getTime()) / (1000 * 60 * 60);
  },
};
