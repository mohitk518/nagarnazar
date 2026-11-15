-- NagarNazar · RunUp Coders Hackathon 2026 · Feature 1 (ward / zone)
-- Ward the citizen chose in the report form. Nullable free text, so old complaints keep working.
-- The official ward stays in complaints.ward_id and is still set only by the
-- route_new_complaint trigger (locate_point); admins correct it with admin_correct_complaint().
ALTER TABLE public.complaints ADD COLUMN IF NOT EXISTS reported_ward text;

ALTER TABLE public.complaints
  DROP CONSTRAINT IF EXISTS complaints_reported_ward_len;
ALTER TABLE public.complaints
  ADD CONSTRAINT complaints_reported_ward_len CHECK (reported_ward IS NULL OR char_length(reported_ward) <= 120);

-- Non-private column added later: needs explicit column-level grants (see AGENTS.md).
GRANT SELECT (reported_ward) ON public.complaints TO anon, authenticated;
GRANT INSERT (reported_ward) ON public.complaints TO authenticated;

COMMENT ON COLUMN public.complaints.reported_ward IS
  'Ward chosen or typed by the citizen in the report form (may be blank). Official ward = ward_id.';
