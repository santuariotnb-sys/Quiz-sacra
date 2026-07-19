import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useState } from "react";
import { ResultScreen } from "@/components/quiz/ResultScreen";
import { OfferScreen } from "@/components/quiz/OfferScreen";
import { ARCHETYPES, type Archetype } from "@/data/quiz";
import { buildKirvanoUrl } from "@/lib/utm";
import {
  getOrCreateExternalId,
  sendTrackingBeacon,
  trackInitiateCheckout,
} from "@/lib/tracking";

// Rota STANDALONE de resultado — para o botão do WhatsApp (mensagem de resultado)
// abrir o resultado bonito do quiz por link, sem refazer o quiz.
//   /sacra/resultado?a=sobrecarga&nome=Ana&desejo=<opcional>&lead=<external_id opcional>
// Reaproveita ResultScreen + OfferScreen do funil. Checkout: caminho Kirvano
// (com arquetipo/nome/UTM). O fluxo pesado de tracking (Checkout Sacra + CAPI)
// continua no quiz; aqui é entrada por link, mais leve.

const KIRVANO_URL =
  (import.meta.env.VITE_KIRVANO_URL as string | undefined) ||
  "https://pay.kirvano.com/sua-oferta";

// Defaults iguais aos do QuizApp (fallback caso o remote pricing não carregue).
const PRICE_CENTS = 4700;
const ANCHOR_CENTS = 19700;
const FREE_INST_COUNT = 3;

const VALID: Archetype[] = ["vigilante", "sobrecarga", "culposa", "antecipatoria"];

function ResultadoStandalone() {
  const p = new URLSearchParams(window.location.search);
  const a = (p.get("a") || p.get("arquetipo") || "").toLowerCase() as Archetype;
  const nome = p.get("nome") || undefined;
  const desire = p.get("desejo") || p.get("desire") || undefined;
  const lead = p.get("lead") || p.get("src") || undefined; // external_id vindo do WhatsApp

  const [stage, setStage] = useState<"result" | "offer">("result");

  if (!a || !VALID.includes(a)) return <Navigate to="/quiz" />;
  const arche = ARCHETYPES[a];

  async function checkout() {
    // external_id do link (lead) ou o do navegador — garante src na Kirvano e
    // semeia tracking_sessions (fbp/fbc/ua) p/ o CAPI Purchase achar o match.
    const eid = lead ?? getOrCreateExternalId();
    sendTrackingBeacon(eid);
    await trackInitiateCheckout(eid, {
      value: PRICE_CENTS / 100,
      contentName: "Rotina de Paz",
    });
    const url = buildKirvanoUrl(KIRVANO_URL, {
      archetype: a,
      name: nome,
      externalId: eid,
    });
    // buildKirvanoUrl já mescla as UTMs capturadas/persistidas (e exclui fbclid de
    // propósito — fbc/fbp reais vão via click-data). Aqui só o default de origem.
    const u = new URL(url);
    if (!u.searchParams.get("utm_source")) u.searchParams.set("utm_source", "whatsapp");
    window.location.href = u.toString();
  }

  if (stage === "result") {
    return (
      <ResultScreen
        key="result"
        archetype={arche}
        name={nome}
        desire={desire}
        onContinue={() => setStage("offer")}
      />
    );
  }
  return (
    <OfferScreen
      key="offer"
      archetype={arche}
      desire={desire}
      leadName={nome}
      priceCents={PRICE_CENTS}
      anchorCents={ANCHOR_CENTS}
      freeInstCount={FREE_INST_COUNT}
      onCheckout={checkout}
      onBack={() => setStage("result")}
    />
  );
}

export const Route = createFileRoute("/resultado")({
  component: ResultadoStandalone,
});
