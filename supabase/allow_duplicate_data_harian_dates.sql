-- Align web database behavior with the offline app:
-- allow more than one data_harian row on the same tanggal.

ALTER TABLE data_harian
  DROP CONSTRAINT IF EXISTS data_harian_tanggal_key;

DROP INDEX IF EXISTS data_harian_tanggal_key;

CREATE INDEX IF NOT EXISTS idx_data_harian_tanggal
  ON data_harian (tanggal);
