-- ============================================================
-- 002: Campos de contato (WhatsApp + consent) na tabela leads
-- Suporta a captura obrigatória de WhatsApp antes do resultado
-- ============================================================

ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS whatsapp text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS consent_timestamp timestamptz;

CREATE INDEX IF NOT EXISTS idx_leads_whatsapp
  ON public.leads (whatsapp) WHERE whatsapp IS NOT NULL;

-- RPC: save_lead_contact
-- Atualiza email + whatsapp + consent em lead existente.
-- SECURITY DEFINER: permite que anon atualize via ID do lead.
CREATE OR REPLACE FUNCTION public.save_lead_contact(
  p_lead_id uuid,
  p_email text DEFAULT NULL,
  p_whatsapp text DEFAULT NULL,
  p_consent_timestamp timestamptz DEFAULT now()
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.leads
  SET
    email = COALESCE(p_email, email),
    whatsapp = COALESCE(p_whatsapp, whatsapp),
    consent_timestamp = COALESCE(p_consent_timestamp, consent_timestamp),
    updated_at = now()
  WHERE id = p_lead_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.save_lead_contact(uuid, text, text, timestamptz) TO anon;
GRANT EXECUTE ON FUNCTION public.save_lead_contact(uuid, text, text, timestamptz) TO authenticated;
