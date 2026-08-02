-- Freely editable professions (plural) + link qualifications to a profession
-- Decision 08.05.: Professions/Specializations frei bearbeitbar;
-- Qualifications werden im Backend zu einer Profession verlinkt.

ALTER TABLE expert_profiles
  ADD COLUMN IF NOT EXISTS professions text[] DEFAULT '{}';

-- Backfill from legacy single profession column when present
UPDATE expert_profiles
SET professions = ARRAY[profession]
WHERE (professions IS NULL OR professions = '{}')
  AND profession IS NOT NULL
  AND btrim(profession) <> '';

ALTER TABLE expert_qualifications
  ADD COLUMN IF NOT EXISTS profession text DEFAULT '';

ALTER TABLE qualification_documents
  ADD COLUMN IF NOT EXISTS profession text DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_expert_qualifications_profession
  ON expert_qualifications (expert_profile_id, profession);

CREATE INDEX IF NOT EXISTS idx_qualification_documents_profession
  ON qualification_documents (expert_profile_id, profession);
