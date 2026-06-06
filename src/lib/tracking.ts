import { getSupabase } from "./supabase";

const EXTERNAL_ID_KEY = "rdp_external_id";

/**
 * Gera ou recupera external_id único da sessão.
 * Formato: "qs_" + UUID. Persistido em localStorage para reuso na sessão.
 */
export function getOrCreateExternalId(): string {
  try {
    const stored = localStorage.getItem(EXTERNAL_ID_KEY);
    if (stored) return stored;
  } catch {}
  const id = `qs_${crypto.randomUUID()}`;
  try {
    localStorage.setItem(EXTERNAL_ID_KEY, id);
  } catch {}
  return id;
}

/**
 * Lê cookies _fbp e _fbc do browser.
 * _fbp é gerado pelo pixel Meta automaticamente.
 * _fbc é gerado quando fbclid está na URL (pode não existir).
 */
export function readFbCookies(): { fbp: string | null; fbc: string | null } {
  try {
    const cookies = document.cookie;
    const fbp = cookies.match(/(?:^|;\s*)_fbp=([^;]+)/)?.[1] ?? null;
    const fbc = cookies.match(/(?:^|;\s*)_fbc=([^;]+)/)?.[1] ?? null;
    return { fbp, fbc };
  } catch {
    return { fbp: null, fbc: null };
  }
}

/**
 * Salva tracking session no Supabase (anon insert).
 * Fire-and-forget: nunca bloqueia o fluxo principal.
 */
export async function saveTrackingSession(externalId: string): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;

  const { fbp, fbc } = readFbCookies();
  const fbclid = new URLSearchParams(window.location.search).get("fbclid");
  const userAgent = navigator.userAgent;

  const { error } = await sb.rpc("upsert_tracking_session", {
    p_external_id: externalId,
    p_fbp: fbp ?? null,
    p_fbc: fbc ?? null,
    p_fbclid: fbclid ?? null,
    p_user_agent: userAgent,
  });
  // Logar (não engolir): essa sessão alimenta o fbp/fbc do CAPI server. Falha silenciosa
  // aqui degrada o match quality de TODAS as compras sem ninguém perceber.
  if (error) console.error("[tracking] upsert_tracking_session falhou:", error.message);
}

/**
 * Dispara InitiateCheckout no pixel Meta.
 * eventID baseado no external_id para correlação.
 * Retorna Promise que resolve após pequeno tick para garantir que o evento
 * é enviado antes de redirect/navegação.
 */
export function trackInitiateCheckout(
  externalId: string,
  extras?: { value?: number; contentName?: string },
): Promise<void> {
  return new Promise((resolve) => {
    try {
      const fbq = (window as any).fbq;
      if (!fbq) {
        resolve();
        return;
      }

      // eventID por ETAPA: separa o IC do principal, upsell e downsell (que têm valores
      // diferentes) em vez de colapsar tudo num único `ic_<externalId>` deduplicado.
      // Cliques repetidos na MESMA etapa ainda deduplicam (mesmo eventID).
      const scope = (extras?.contentName ?? "checkout")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_|_$/g, "")
        .slice(0, 24);
      const eventId = `ic_${externalId}_${scope}`;
      const data: Record<string, any> = {
        content_name: extras?.contentName ?? "Rotina de Paz",
        content_ids: ["rotina_de_paz"],
        currency: "BRL",
      };
      if (extras?.value) {
        data.value = extras.value;
      }

      fbq("track", "InitiateCheckout", data, { eventID: eventId });
    } catch {}

    // Tick de 300ms para o beacon do pixel sair antes do redirect
    setTimeout(resolve, 300);
  });
}
