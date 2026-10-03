-- Журнал согласий на заказах и отметки на клиенте.
-- Safe to re-run.

ALTER TABLE orders ADD COLUMN IF NOT EXISTS consent_journal jsonb;
ALTER TABLE personal_orders ADD COLUMN IF NOT EXISTS consent_journal jsonb;

ALTER TABLE customers ADD COLUMN IF NOT EXISTS consent_version varchar;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS marketing_consent boolean DEFAULT false;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS marketing_consent_at timestamp(3) with time zone;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS marketing_consent_version varchar;
