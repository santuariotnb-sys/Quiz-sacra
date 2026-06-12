-- Track quiz funnel steps for drop-off analysis
-- Aditiva: não altera tabelas existentes

CREATE TABLE IF NOT EXISTS public.quiz_funnel_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL,
  stage text NOT NULL CHECK (stage IN ('arrival', 'question', 'contact', 'result', 'offer', 'cta')),
  question_key text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_qfe_created_at ON public.quiz_funnel_events (created_at);
CREATE INDEX IF NOT EXISTS idx_qfe_stage_qkey ON public.quiz_funnel_events (stage, question_key);

ALTER TABLE public.quiz_funnel_events ENABLE ROW LEVEL SECURITY;
-- No RLS policies: anon/authenticated cannot read/write directly. Only via RPC.

CREATE OR REPLACE FUNCTION public.track_quiz_step(
  p_session_id text,
  p_stage text,
  p_question_key text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Input validation
  IF p_session_id IS NULL OR length(p_session_id) > 100 THEN RETURN; END IF;
  IF p_stage NOT IN ('arrival', 'question', 'contact', 'result', 'offer', 'cta') THEN RETURN; END IF;
  IF p_question_key IS NOT NULL AND length(p_question_key) > 50 THEN RETURN; END IF;

  -- Rate limit: max 200 events per session (anti-flood)
  IF (SELECT count(*) FROM quiz_funnel_events WHERE session_id = p_session_id) >= 200 THEN RETURN; END IF;

  INSERT INTO quiz_funnel_events (session_id, stage, question_key)
  VALUES (p_session_id, p_stage, p_question_key);
END;
$$;

GRANT EXECUTE ON FUNCTION public.track_quiz_step(text, text, text) TO anon;

-- ROLLBACK:
-- DROP FUNCTION IF EXISTS public.track_quiz_step(text, text, text);
-- DROP TABLE IF EXISTS public.quiz_funnel_events;
