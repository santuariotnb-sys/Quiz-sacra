-- ============================================================
-- Quiz Sacra — Schema standalone
-- Tabelas: leads, quiz_responses, risk_events
-- ============================================================

-- Helper: is_admin (usado nas RLS policies)
CREATE OR REPLACE FUNCTION public.is_admin(uid uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = uid);
$$;

-- Admin users (tabela mínima para RLS)
CREATE TABLE IF NOT EXISTS public.admin_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 1. LEADS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text,
  email text,
  archetype text,
  scores jsonb NOT NULL DEFAULT '{}'::jsonb,
  desire text,
  situation text,
  risk_flag boolean NOT NULL DEFAULT false,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,
  referrer text,
  ip text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT INSERT ON public.leads TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.leads TO authenticated;
GRANT ALL ON public.leads TO service_role;

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon insert leads"
  ON public.leads FOR INSERT TO anon
  WITH CHECK (true);

CREATE POLICY "auth insert leads"
  ON public.leads FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "admins read leads"
  ON public.leads FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "admins update leads"
  ON public.leads FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "admins delete leads"
  ON public.leads FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_leads_created ON public.leads (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_archetype ON public.leads (archetype);
CREATE INDEX IF NOT EXISTS idx_leads_email ON public.leads (lower(email));
CREATE INDEX IF NOT EXISTS idx_leads_utm_source ON public.leads (utm_source);

-- ============================================================
-- 2. QUIZ RESPONSES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.quiz_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES public.leads(id) ON DELETE CASCADE,
  question_key text NOT NULL,
  answer_value text NOT NULL,
  answer_text text NOT NULL DEFAULT '',
  time_to_answer integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT INSERT ON public.quiz_responses TO anon;
GRANT SELECT, INSERT ON public.quiz_responses TO authenticated;
GRANT ALL ON public.quiz_responses TO service_role;

ALTER TABLE public.quiz_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon insert quiz_responses"
  ON public.quiz_responses FOR INSERT TO anon
  WITH CHECK (true);

CREATE POLICY "admins read quiz_responses"
  ON public.quiz_responses FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_quiz_responses_lead ON public.quiz_responses (lead_id, created_at DESC);

-- ============================================================
-- 3. RISK EVENTS (anonimo, sem PII)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.risk_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL DEFAULT 'quiz',
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT INSERT ON public.risk_events TO anon;
GRANT SELECT ON public.risk_events TO authenticated;
GRANT ALL ON public.risk_events TO service_role;

ALTER TABLE public.risk_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon insert risk_events"
  ON public.risk_events FOR INSERT TO anon
  WITH CHECK (true);

CREATE POLICY "admins read risk_events"
  ON public.risk_events FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

-- ============================================================
-- TRIGGERS
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_leads_updated BEFORE UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Segurança: revogar EXECUTE público
REVOKE EXECUTE ON FUNCTION public.is_admin(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated;
