-- Partner earnings can belong to a catalog order OR a personal order.
-- Safe to re-run.

ALTER TABLE partner_earnings ALTER COLUMN order_id DROP NOT NULL;

ALTER TABLE partner_earnings ADD COLUMN IF NOT EXISTS personal_order_id uuid;

CREATE INDEX IF NOT EXISTS partner_earnings_personal_order_idx
  ON partner_earnings (personal_order_id);

CREATE UNIQUE INDEX IF NOT EXISTS partner_earnings_order_id_unique
  ON partner_earnings (order_id) WHERE order_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS partner_earnings_personal_order_id_unique
  ON partner_earnings (personal_order_id) WHERE personal_order_id IS NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'partner_earnings_personal_order_id_personal_orders_id_fk'
  ) THEN
    ALTER TABLE partner_earnings
      ADD CONSTRAINT partner_earnings_personal_order_id_personal_orders_id_fk
      FOREIGN KEY (personal_order_id) REFERENCES personal_orders(id) ON DELETE SET NULL;
  END IF;
END $$;
