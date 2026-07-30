/*
  # Direct booking: notify expert on appointment create

  Clients book experts directly (status = confirmed).
  Notify the expert when a new appointment is created.
*/

CREATE OR REPLACE FUNCTION notify_expert_on_appointment_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_expert_user_id uuid;
  v_client_name text;
BEGIN
  SELECT user_id INTO v_expert_user_id
  FROM expert_profiles
  WHERE id = NEW.expert_id;

  SELECT full_name INTO v_client_name
  FROM profiles
  WHERE id = NEW.client_id;

  IF v_expert_user_id IS NOT NULL THEN
    INSERT INTO booking_notifications (
      user_id,
      booking_type,
      booking_id,
      notification_type,
      title,
      message
    ) VALUES (
      v_expert_user_id,
      'appointment',
      NEW.id,
      'booking_created',
      'Neue Buchung',
      COALESCE(v_client_name, 'Ein Client') || ' hat einen Termin bei dir gebucht.'
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_appointment_created_notify_expert ON appointments;

CREATE TRIGGER on_appointment_created_notify_expert
  AFTER INSERT ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION notify_expert_on_appointment_created();
