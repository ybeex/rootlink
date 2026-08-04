-- DNA matching feature: real segment-based matching against uploaded raw
-- genotype data (23andMe/AncestryDNA/MyHeritage/FTDNA export format), not a
-- wet-lab integration. See the schema.ts comment above dnaKits for the full
-- design rationale and the documented simplifications versus production-
-- grade phased IBD detection.

CREATE TYPE "dna_kit_provider" AS ENUM ('ancestrydna', '23andme', 'myheritage', 'ftdna', 'other');
--> statement-breakpoint
CREATE TYPE "dna_kit_status" AS ENUM ('processing', 'ready', 'failed');
--> statement-breakpoint

CREATE TABLE "dna_kits" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "uploaded_by" uuid NOT NULL,
  "person_id" uuid,
  "tree_id" uuid,
  "label" varchar(200) NOT NULL,
  "provider" "dna_kit_provider" DEFAULT 'other' NOT NULL,
  "status" "dna_kit_status" DEFAULT 'processing' NOT NULL,
  "raw_data_storage_key" varchar(1000) NOT NULL,
  "snp_count" integer,
  "sex" "sex",
  "processing_error" text,
  "uploaded_at" timestamp with time zone DEFAULT now() NOT NULL,
  "processed_at" timestamp with time zone,
  "deleted_at" timestamp with time zone
);
--> statement-breakpoint

ALTER TABLE "dna_kits" ADD CONSTRAINT "dna_kits_uploaded_by_users_id_fk"
  FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "dna_kits" ADD CONSTRAINT "dna_kits_person_id_persons_id_fk"
  FOREIGN KEY ("person_id") REFERENCES "persons"("id") ON DELETE SET NULL;
--> statement-breakpoint
ALTER TABLE "dna_kits" ADD CONSTRAINT "dna_kits_tree_id_trees_id_fk"
  FOREIGN KEY ("tree_id") REFERENCES "trees"("id") ON DELETE SET NULL;
--> statement-breakpoint

CREATE INDEX "dna_kits_uploaded_by_idx" ON "dna_kits" USING btree ("uploaded_by");
--> statement-breakpoint
CREATE INDEX "dna_kits_person_idx" ON "dna_kits" USING btree ("person_id");
--> statement-breakpoint
CREATE INDEX "dna_kits_status_idx" ON "dna_kits" USING btree ("status");
--> statement-breakpoint

-- Deliberately unabridged (one row per SNP call, not downsampled) — see
-- the schema.ts comment for why. A real raw-data file inserts roughly
-- 600,000-950,000 rows here per kit.
CREATE TABLE "dna_genotypes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "kit_id" uuid NOT NULL,
  "chromosome" varchar(2) NOT NULL,
  "position" integer NOT NULL,
  "rsid" varchar(20),
  "genotype" varchar(2) NOT NULL
);
--> statement-breakpoint

ALTER TABLE "dna_genotypes" ADD CONSTRAINT "dna_genotypes_kit_id_dna_kits_id_fk"
  FOREIGN KEY ("kit_id") REFERENCES "dna_kits"("id") ON DELETE CASCADE;
--> statement-breakpoint

CREATE INDEX "dna_genotypes_kit_chr_pos_idx" ON "dna_genotypes" USING btree ("kit_id", "chromosome", "position");
--> statement-breakpoint

CREATE TABLE "dna_matches" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "kit_a_id" uuid NOT NULL,
  "kit_b_id" uuid NOT NULL,
  "total_shared_cm" real NOT NULL,
  "largest_segment_cm" real NOT NULL,
  "segment_count" integer NOT NULL,
  "estimated_relationship" varchar(200) NOT NULL,
  "computed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint

ALTER TABLE "dna_matches" ADD CONSTRAINT "dna_matches_kit_a_id_dna_kits_id_fk"
  FOREIGN KEY ("kit_a_id") REFERENCES "dna_kits"("id") ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "dna_matches" ADD CONSTRAINT "dna_matches_kit_b_id_dna_kits_id_fk"
  FOREIGN KEY ("kit_b_id") REFERENCES "dna_kits"("id") ON DELETE CASCADE;
--> statement-breakpoint

CREATE UNIQUE INDEX "dna_matches_pair_unique" ON "dna_matches" USING btree ("kit_a_id", "kit_b_id");
--> statement-breakpoint
CREATE INDEX "dna_matches_kit_a_idx" ON "dna_matches" USING btree ("kit_a_id");
--> statement-breakpoint
CREATE INDEX "dna_matches_kit_b_idx" ON "dna_matches" USING btree ("kit_b_id");
--> statement-breakpoint

CREATE TABLE "dna_match_segments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "match_id" uuid NOT NULL,
  "chromosome" varchar(2) NOT NULL,
  "start_position" integer NOT NULL,
  "end_position" integer NOT NULL,
  "cm_length" real NOT NULL,
  "snp_count" integer NOT NULL
);
--> statement-breakpoint

ALTER TABLE "dna_match_segments" ADD CONSTRAINT "dna_match_segments_match_id_dna_matches_id_fk"
  FOREIGN KEY ("match_id") REFERENCES "dna_matches"("id") ON DELETE CASCADE;
--> statement-breakpoint

CREATE INDEX "dna_match_segments_match_idx" ON "dna_match_segments" USING btree ("match_id");
