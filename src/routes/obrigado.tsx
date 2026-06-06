import { createFileRoute, useSearch } from "@tanstack/react-router";
import { OfferPage } from "@/components/funil/OfferPage";
import { UPSELL_CONTENT, DOWNSELL_CONTENT } from "@/data/funil";

export const Route = createFileRoute("/obrigado")({
  validateSearch: (search: Record<string, unknown>) => {
    // O upsell.min.js, ao recusar, copia os params da página atual (offer=upsell) e
    // anexa ao refusePageURL (offer=downsell) → a URL fica com offer DUPLICADO, que o
    // router transforma em array (ex: ["downsell","upsell"]). Sem este tratamento,
    // `array === "downsell"` é false e cai no default upsell — fazendo o recusar
    // "voltar" pra página de upsell em vez de ir pro downsell.
    const raw = search.offer;
    const isDownsell = Array.isArray(raw)
      ? raw.includes("downsell")
      : raw === "downsell";
    return { offer: isDownsell ? ("downsell" as const) : ("upsell" as const) };
  },
  component: ObrigadoPage,
});

function ObrigadoPage() {
  const { offer } = useSearch({ from: "/obrigado" });
  const isDownsell = offer === "downsell";

  return (
    <OfferPage
      content={isDownsell ? DOWNSELL_CONTENT : UPSELL_CONTENT}
      declineTo={
        isDownsell
          ? "https://rotina-de-paz-app.vercel.app/login"
          : "/sacra/obrigado?offer=downsell"
      }
      showProcessing={!isDownsell}
    />
  );
}
