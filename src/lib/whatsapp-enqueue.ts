// Fire-and-forget: avisa o backend (rotina-de-paz-app) pra enfileirar a mensagem
// de resultado no WhatsApp. O envio real (com delay de 35s) roda no cron do backend.
const APP_URL = import.meta.env.VITE_APP_URL as string | undefined;
const SECRET = import.meta.env.VITE_WHATSAPP_ENQUEUE_SECRET as string | undefined;

export function enqueueWhatsappResult(leadId: string): void {
  if (!APP_URL || !SECRET || !leadId) return;
  try {
    fetch(`${APP_URL}/api/public/whatsapp/enqueue-result?k=${encodeURIComponent(SECRET)}`, {
      method: "POST",
      keepalive: true, // sobrevive a navegacao/redirect
      // text/plain evita preflight CORS (fetch cross-origin do quiz p/ o app).
      // O endpoint le o body por texto e faz JSON.parse — content-type nao importa la.
      headers: { "content-type": "text/plain" },
      body: JSON.stringify({ lead_id: leadId }),
    }).catch(() => {}); // silencioso: nunca bloqueia o quiz
  } catch {
    /* noop */
  }
}
