import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useState } from "react";
import { ResultScreen } from "@/components/quiz/ResultScreen";
import { OfferScreen } from "@/components/quiz/OfferScreen";
import { ARCHETYPES, type Archetype } from "@/data/quiz";
import { buildKirvanoUrl, captureUtms } from "@/lib/utm";

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

  function checkout() {
    const url = buildKirvanoUrl(KIRVANO_URL, {
      archetype: a,
      name: nome,
      externalId: lead,
    });
    // preserva UTMs da origem (ex.: utm_source=whatsapp)
    const u = new URL(url);
    for (const [k, v] of Object.entries(captureUtms())) if (v) u.searchParams.set(k, v);
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
