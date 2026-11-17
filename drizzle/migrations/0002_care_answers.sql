-- One row per answer a person gives by text, so each person's responses are on record in one place.
-- person_id is who answered. For a reply to "Can you take it?" that is the lead.
CREATE TABLE IF NOT EXISTS public.care_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id text NOT NULL,
  task_id text,
  answer text NOT NULL CHECK (answer IN ('yes', 'pass', 'other')),
  via text NOT NULL CHECK (via IN ('thumb', 'typed', 'choice')),
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS care_answers_person_idx ON public.care_answers (person_id, created_at DESC);
REVOKE ALL ON public.care_answers FROM anon, authenticated;
GRANT ALL ON public.care_answers TO service_role;
ALTER TABLE public.care_answers ENABLE ROW LEVEL SECURITY;
