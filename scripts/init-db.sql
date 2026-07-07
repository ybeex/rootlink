-- Enable required PostgreSQL extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";      -- Trigram indexes for LIKE search
CREATE EXTENSION IF NOT EXISTS "unaccent";      -- Accent-insensitive search

-- Full-text search vector update trigger for persons
CREATE OR REPLACE FUNCTION persons_update_search_vector()
RETURNS trigger AS $$
BEGIN
  NEW.search_vector := to_tsvector('english',
    coalesce(NEW.first_name,     '') || ' ' ||
    coalesce(NEW.middle_name,    '') || ' ' ||
    coalesce(NEW.last_name,      '') || ' ' ||
    coalesce(NEW.maiden_name,    '') || ' ' ||
    coalesce(NEW.preferred_name, '') || ' ' ||
    coalesce(NEW.biography,      '')
  );
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

-- GIN index for full-text search on persons (created after schema migration)
-- CREATE INDEX IF NOT EXISTS persons_search_vector_gin
--   ON persons USING gin(to_tsvector('english', coalesce(first_name,'') || ' ' || coalesce(last_name,'')));

-- Trigram index for partial name matching
-- CREATE INDEX IF NOT EXISTS persons_first_name_trgm ON persons USING gin(first_name gin_trgm_ops);
-- CREATE INDEX IF NOT EXISTS persons_last_name_trgm  ON persons USING gin(last_name  gin_trgm_ops);

-- Partition audit_logs by month (template — apply after schema migration)
-- CREATE TABLE audit_logs_2026_01 PARTITION OF audit_logs
--   FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');
