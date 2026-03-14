-- ============================================================
-- PHASE 9: Patient Notification Preferences
-- ============================================================
ALTER TABLE patients
  ADD COLUMN sms_opt_in BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN email_opt_in BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN preferred_notification_channel TEXT NOT NULL DEFAULT 'sms',
  ADD COLUMN notification_preferences JSONB NOT NULL DEFAULT '{
    "prescription_ready": true,
    "refill_reminder": true,
    "adherence": true,
    "health_alert": true
  }'::jsonb,
  ADD COLUMN contact_time_window JSONB NOT NULL DEFAULT '{
    "start": "08:00",
    "end": "21:00"
  }'::jsonb,
  ADD COLUMN sms_opted_out_at TIMESTAMPTZ,
  ADD COLUMN sms_opted_in_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX idx_patients_notification_opt_in
  ON patients (pharmacy_id, sms_opt_in, email_opt_in);
