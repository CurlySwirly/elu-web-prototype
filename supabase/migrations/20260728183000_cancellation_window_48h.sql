/*
  # Update cancellation refund window to 48 hours

  Client cancellations receive a refund only if cancelled
  at least 48 hours before appointment start.
*/

CREATE OR REPLACE FUNCTION is_within_cancellation_window(booking_start timestamptz)
RETURNS boolean
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN now() <= (booking_start - INTERVAL '48 hours');
END;
$$;
