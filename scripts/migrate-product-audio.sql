-- ProductAudio collection + products.full_audio relation
-- Safe to re-run (IF NOT EXISTS / ADD COLUMN IF NOT EXISTS)

CREATE TABLE IF NOT EXISTS product_audio (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title character varying,
  prefix character varying,
  updated_at timestamp(3) with time zone NOT NULL DEFAULT now(),
  created_at timestamp(3) with time zone NOT NULL DEFAULT now(),
  url character varying,
  thumbnail_u_r_l character varying,
  filename character varying,
  mime_type character varying,
  filesize numeric,
  width numeric,
  height numeric,
  focal_x numeric,
  focal_y numeric
);

CREATE UNIQUE INDEX IF NOT EXISTS product_audio_filename_idx ON product_audio (filename);
CREATE INDEX IF NOT EXISTS product_audio_created_at_idx ON product_audio (created_at);
CREATE INDEX IF NOT EXISTS product_audio_updated_at_idx ON product_audio (updated_at);

ALTER TABLE media ADD COLUMN IF NOT EXISTS prefix character varying;

ALTER TABLE products ADD COLUMN IF NOT EXISTS full_audio_id uuid;
CREATE INDEX IF NOT EXISTS products_full_audio_idx ON products (full_audio_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'products_full_audio_id_product_audio_id_fk'
  ) THEN
    ALTER TABLE products
      ADD CONSTRAINT products_full_audio_id_product_audio_id_fk
      FOREIGN KEY (full_audio_id) REFERENCES product_audio(id) ON DELETE SET NULL;
  END IF;
END $$;

ALTER TABLE payload_locked_documents_rels
  ADD COLUMN IF NOT EXISTS product_audio_id uuid;

CREATE INDEX IF NOT EXISTS payload_locked_documents_rels_product_audio_id_idx
  ON payload_locked_documents_rels (product_audio_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'payload_locked_documents_rels_product_audio_fk'
  ) THEN
    ALTER TABLE payload_locked_documents_rels
      ADD CONSTRAINT payload_locked_documents_rels_product_audio_fk
      FOREIGN KEY (product_audio_id) REFERENCES product_audio(id) ON DELETE CASCADE;
  END IF;
END $$;

ALTER TABLE payload_preferences_rels
  ADD COLUMN IF NOT EXISTS product_audio_id uuid;

CREATE INDEX IF NOT EXISTS payload_preferences_rels_product_audio_id_idx
  ON payload_preferences_rels (product_audio_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'payload_preferences_rels_product_audio_fk'
  ) THEN
    ALTER TABLE payload_preferences_rels
      ADD CONSTRAINT payload_preferences_rels_product_audio_fk
      FOREIGN KEY (product_audio_id) REFERENCES product_audio(id) ON DELETE CASCADE;
  END IF;
END $$;
