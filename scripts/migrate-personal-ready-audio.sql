-- Upload field for the finished personal fabula.
-- Safe to re-run.

ALTER TABLE personal_orders ADD COLUMN IF NOT EXISTS ready_audio_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'personal_orders_ready_audio_id_product_audio_id_fk'
  ) THEN
    ALTER TABLE personal_orders
      ADD CONSTRAINT personal_orders_ready_audio_id_product_audio_id_fk
      FOREIGN KEY (ready_audio_id) REFERENCES product_audio(id) ON DELETE SET NULL;
  END IF;
END $$;
