import { createFileRoute, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { OfferPage } from "@/components/funil/OfferPage";
import { UPSELL_CONTENT, DOWNSELL_CONTENT, type OfferContent } from "@/data/funil";
import { fetchProductPrices, formatBRL, formatInstallments } from "@/lib/prices";

export const Route = createFileRoute("/obrigado")({
  validateSearch: (search: Record<string, unknown>) => {
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
  const [content, setContent] = useState<OfferContent>(
    isDownsell ? DOWNSELL_CONTENT : UPSELL_CONTENT,
  );

  useEffect(() => {
    const base = isDownsell ? DOWNSELL_CONTENT : UPSELL_CONTENT;
    const slug = isDownsell ? "chave-da-gratidao-light" : "chave-da-gratidao";

    fetchProductPrices().then((prices) => {
      const p = prices[slug];
      if (!p) return;

      setContent({
        ...base,
        offer: {
          ...base.offer,
          price: formatBRL(p.priceCents),
          priceFrom: p.anchorPriceCents ? formatBRL(p.anchorPriceCents) : base.offer.priceFrom,
          installments: isDownsell
            ? formatInstallments(p.priceCents, 2)
            : formatInstallments(p.priceCents, 6),
        },
      });
    });
  }, [isDownsell]);

  return (
    <OfferPage
      content={content}
      declineTo={
        isDownsell
          ? "https://rotina-de-paz-app.vercel.app/login"
          : "/sacra/obrigado?offer=downsell"
      }
      showProcessing={!isDownsell}
    />
  );
}
