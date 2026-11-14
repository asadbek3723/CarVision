-- CarVision: measure how good the AI renders really are
-- Migration: 20261122000000_render_quality.sql   (idempotent)
--
-- render_check: what the second-look vision check said about the delivered picture
--   {"sameView":bool,"sameCar":bool,"keepsRest":bool,"partsComplete":bool,"problem":text,"retried":bool}
--   (NULL when no checker ran, e.g. no Gemini key, or for renders made before this migration).
-- feedback_*: the customer's own "I don't like it" on a finished render, with a reason code and an
--   optional note. Only the server (service role) writes them, through POST /api/v1/generations/feedback,
--   and only for the customer's own render.

ALTER TABLE public.generations ADD COLUMN IF NOT EXISTS render_check JSONB;
ALTER TABLE public.generations ADD COLUMN IF NOT EXISTS feedback TEXT;
ALTER TABLE public.generations ADD COLUMN IF NOT EXISTS feedback_reason TEXT;
ALTER TABLE public.generations ADD COLUMN IF NOT EXISTS feedback_note TEXT;
ALTER TABLE public.generations ADD COLUMN IF NOT EXISTS feedback_at TIMESTAMPTZ;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'generations_render_check_object') THEN
    ALTER TABLE public.generations
      ADD CONSTRAINT generations_render_check_object CHECK (render_check IS NULL OR jsonb_typeof(render_check) = 'object');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'generations_feedback_value') THEN
    ALTER TABLE public.generations
      ADD CONSTRAINT generations_feedback_value CHECK (feedback IS NULL OR feedback = 'bad');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'generations_feedback_reason_value') THEN
    ALTER TABLE public.generations
      ADD CONSTRAINT generations_feedback_reason_value CHECK (
        feedback_reason IS NULL
        OR feedback_reason IN ('wrong_part', 'wrong_color', 'other_car', 'wrong_angle', 'not_realistic', 'other')
      );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'generations_feedback_note_length') THEN
    ALTER TABLE public.generations
      ADD CONSTRAINT generations_feedback_note_length CHECK (feedback_note IS NULL OR char_length(feedback_note) <= 500);
  END IF;
END $$;

-- The admin "disliked renders" list reads the newest feedback first.
CREATE INDEX IF NOT EXISTS generations_feedback_at_idx
  ON public.generations (feedback_at DESC)
  WHERE feedback IS NOT NULL;
