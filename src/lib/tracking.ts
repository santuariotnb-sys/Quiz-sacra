import { getSupabase } from "./supabase";
import { QUIZ_ID, EXTERNAL_ID_PREFIX } from "./quiz-config";

// Chave namespaceada por quiz: mesmo origin serve vários quizzes (paths distintos),
// logo o localStorage colidiria. 'sacra' mantém a chave histórica p/ não regenerar
// o external_id de quem já está no funil.
const EXTERNAL_ID_KEY =
  QUIZ_ID === "sacra" ? "rdp_external_id" : `rdp_external_id_${QUIZ_ID}`;

/**
 * Gera ou recupera external_id único da sessão.
 * Formato: EXTERNAL_ID_PREFIX + UUID (default "qs_"). Persistido em localStorage.
 */
export function getOrCreateExternalId(): string {
  try {
    const stored = localStorage.getItem(EXTERNAL_ID_KEY);
    if (stored) return stored;
  } catch {}
  const id = `${EXTERNAL_ID_PREFIX}${crypto.randomUUID()}`;
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

// ── Meta Click Data (fbclid / _fbc / _fbp) ──────────────────────
// Capturado uma vez na entrada do quiz e persistido em sessionStorage
// para sobreviver entre passos do SPA e o redirect pro checkout.

const META_CLICK_KEY = "rdp_meta_click";

type MetaClickData = {
  fbclid: string | null;
  fbc: string | null;
  fbp: string | null;
};

/**
 * Captura fbclid da URL + cookies _fbc/_fbp e persiste em sessionStorage.
 * Se _fbc não existir mas fbclid sim, constrói no formato oficial Meta:
 *   fb.1.<timestamp_ms>.<fbclid>
 * Chamada uma vez na entrada do quiz.
 */
export function captureMetaClickData(): MetaClickData {
  try {
    const stored = sessionStorage.getItem(META_CLICK_KEY);
    if (stored) return JSON.parse(stored) as MetaClickData;
  } catch {}

  const params = new URLSearchParams(window.location.search);
  const fbclid = params.get("fbclid") || null;
  const { fbp, fbc: cookieFbc } = readFbCookies();

  // Constrói _fbc se o cookie não existir mas o fbclid sim
  let fbc = cookieFbc;
  if (!fbc && fbclid) {
    fbc = `fb.1.${Date.now()}.${fbclid}`;
  }

  const data: MetaClickData = { fbclid, fbc, fbp };
  try {
    sessionStorage.setItem(META_CLICK_KEY, JSON.stringify(data));
  } catch {}
  return data;
}

/**
 * Retorna dados Meta Click da sessão. Nunca inventa valores.
 */
export function getMetaClickData(): MetaClickData {
  try {
    const stored = sessionStorage.getItem(META_CLICK_KEY);
    if (stored) return JSON.parse(stored) as MetaClickData;
  } catch {}
  return { fbclid: null, fbc: null, fbp: null };
}

/**
 * Salva tracking session no Supabase (anon insert).
 * Chamada no mount da LP (camada 1) e reforçada no CTA via sendBeacon (camada 2).
 * Idempotente: upsert por external_id — chamar múltiplas vezes é seguro.
 */
export async function saveTrackingSession(externalId: string): Promise<void> {
  // Domain guard: não salvar sessões de dev/preview
  if (typeof window !== "undefined" &&
      !["sacra.rotinadepaz.com.br", "rotinadepaz.com.br"].includes(window.location.hostname)) {
    return;
  }
  const sb = getSupabase();
  if (!sb) return;

  // Relê _fbp fresco: o pixel pode ter setado o cookie DEPOIS da captura inicial (race). (G2)
  const cached = getMetaClickData();
  const fresh = readFbCookies();
  const fbp = fresh.fbp ?? cached.fbp;
  const fbc = cached.fbc ?? fresh.fbc;
  const fbclid = cached.fbclid;
  const userAgent = navigator.userAgent;

  const { error } = await sb.rpc("upsert_tracking_session", {
    p_external_id: externalId,
    p_fbp: fbp ?? null,
    p_fbc: fbc ?? null,
    p_fbclid: fbclid ?? null,
    p_user_agent: userAgent,
    p_client_ip: null, // client não tem acesso ao IP; resolvido server-side
  });
  // Logar (não engolir): essa sessão alimenta o fbp/fbc do CAPI server. Falha silenciosa
  // aqui degrada o match quality de TODAS as compras sem ninguém perceber.
  if (error) console.error("[tracking] upsert_tracking_session falhou:", error.message);

  // Hardening fbp: o pixel seta o cookie _fbp ~300ms DEPOIS deste write inicial de mount.
  // Se o fbp veio null, reagenda 1 upsert após 2s (COALESCE no RPC preenche sem sobrescrever).
  // Garante fbp mesmo p/ quem não clica no CTA (que dispara o beacon). (G2+)
  if (!fbp) {
    setTimeout(() => {
      const late = readFbCookies();
      if (!late.fbp) return;
      void Promise.resolve(
        sb.rpc("upsert_tracking_session", {
          p_external_id: externalId,
          p_fbp: late.fbp,
          p_fbc: late.fbc ?? fbc ?? null,
          p_fbclid: fbclid ?? null,
          p_user_agent: userAgent,
          p_client_ip: null,
        }),
      ).catch(() => {});
    }, 2000);
  }
}

/**
 * Camada 2: sendBeacon/fetch-keepalive para salvar tracking session antes de redirect.
 * Sobrevive a navegação — não bloqueia. Usa REST direto (não o SDK) porque
 * sendBeacon só aceita plain body, não o protocolo PostgREST/RPC do SDK.
 */
export function sendTrackingBeacon(externalId: string): void {
  if (typeof window === "undefined" ||
      !["sacra.rotinadepaz.com.br", "rotinadepaz.com.br"].includes(window.location.hostname)) {
    return;
  }
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
  if (!url || !anon) return;

  // Relê _fbp fresco: o pixel pode ter setado o cookie DEPOIS da captura inicial (race). (G2)
  const cached = getMetaClickData();
  const fresh = readFbCookies();
  const fbp = fresh.fbp ?? cached.fbp;
  const fbc = cached.fbc ?? fresh.fbc;
  const fbclid = cached.fbclid;
  const body = JSON.stringify({
    p_external_id: externalId,
    p_fbp: fbp ?? null,
    p_fbc: fbc ?? null,
    p_fbclid: fbclid ?? null,
    p_user_agent: navigator.userAgent,
    p_client_ip: null,
  });

  const endpoint = `${url}/rest/v1/rpc/upsert_tracking_session`;
  const headers = {
    "Content-Type": "application/json",
    apikey: anon,
    Authorization: `Bearer ${anon}`,
  };

  // fetch keepalive survives navigation like sendBeacon, but supports custom headers
  // (Supabase REST requires apikey header, so plain sendBeacon won't work)
  try {
    fetch(endpoint, {
      method: "POST",
      headers,
      body,
      keepalive: true, // survives page unload like sendBeacon
    }).catch(() => {});
  } catch {
    // Never block — tracking is secondary to the sale
  }
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
      // Domain guard: não disparar eventos em dev/preview
      if (typeof window !== "undefined" &&
          !["sacra.rotinadepaz.com.br", "rotinadepaz.com.br"].includes(window.location.hostname)) {
        resolve();
        return;
      }
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
        content_ids: ["rotina-de-paz"],
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
