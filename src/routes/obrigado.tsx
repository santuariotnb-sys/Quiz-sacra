import { createFileRoute, useSearch } from "@tanstack/react-router";
import { OfferPage } from "@/components/funil/OfferPage";
import { UPSELL_CONTENT, DOWNSELL_CONTENT } from "@/data/funil";

export const Route = createFileRoute("/obrigado")({
  validateSearch: (search: Record<string, unknown>) => ({
    offer:
      (search.offer as string) === "downsell"
        ? ("downsell" as const)
        : ("upsell" as const),
  }),
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
      firePurchasePixel={!isDownsell}
    />
  );
}
