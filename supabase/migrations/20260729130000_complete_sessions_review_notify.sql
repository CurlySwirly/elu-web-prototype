/*
  # Complete elapsed sessions + ask client for a review

  When a confirmed appointment's end_time is in the past:
  1. Mark status = completed
  2. Notify the client they can leave a review (once per appointment)
*/

CREATE OR REPLACE FUNCTION complete_elapsed_appointments()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  apt RECORD;
  v_expert_name text;
  v_offer_title text;
  v_completed integer := 0;
BEGIN
  FOR apt IN
    SELECT
      a.id,
      a.client_id,
      a.expert_id,
      a.offer_id
    FROM appointments a
    WHERE a.status = 'confirmed'
      AND a.end_time < now()
  LOOP
    UPDATE appointments
    SET status = 'completed'
    WHERE id = apt.id
      AND status = 'confirmed';

    IF NOT FOUND THEN
      CONTINUE;
    END IF;

    v_completed := v_completed + 1;

    SELECT p.full_name INTO v_expert_name
    FROM expert_profiles ep
    JOIN profiles p ON p.id = ep.user_id
    WHERE ep.id = apt.expert_id;

    SELECT eo.title INTO v_offer_title
    FROM expert_offers eo
    WHERE eo.id = apt.offer_id;

    IF NOT EXISTS (
      SELECT 1
      FROM booking_notifications bn
      WHERE bn.booking_id = apt.id
        AND bn.notification_type = 'review_request'
        AND bn.user_id = apt.client_id
    ) THEN
      INSERT INTO booking_notifications (
        user_id,
        booking_type,
        booking_id,
        notification_type,
        title,
        message
      ) VALUES (
        apt.client_id,
        'appointment',
        apt.id,
        'review_request',
        'Bewertung abgeben',
        'Wie war deine Session'
          || CASE WHEN v_expert_name IS NOT NULL THEN ' mit ' || v_expert_name ELSE '' END
          || CASE WHEN v_offer_title IS NOT NULL THEN ' („' || v_offer_title || '“)' ELSE '' END
          || '? Teile kurz deine Erfahrung.'
      );
    END IF;
  END LOOP;

  RETURN v_completed;
END;
$$;

GRANT EXECUTE ON FUNCTION complete_elapsed_appointments() TO authenticated;
GRANT EXECUTE ON FUNCTION complete_elapsed_appointments() TO service_role;
