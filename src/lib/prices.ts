/**
 * prices.ts — Fetch product prices from Supabase (fonte única de preço).
 *
 * Retorna preços do DB para que quiz e email não hardcodem valores.
 * Fallback para os valores atuais se o fetch falhar.
 */

import { getSupabase } from "./supabase";

export interface ProductPrice {
  slug: string;
  priceCents: number;
  anchorPriceCents: number | null;
}

const FALLBACK: Record<string, ProductPrice> = {
  "chave-da-gratidao": { slug: "chave-da-gratidao", priceCents: 6700, anchorPriceCents: 19700 },
  "chave-da-gratidao-light": { slug: "chave-da-gratidao-light", priceCents: 3700, anchorPriceCents: 6700 },
  "rotina-de-paz": { slug: "rotina-de-paz", priceCents: 4700, anchorPriceCents: 19700 },
};

let _cache: Record<string, ProductPrice> | null = null;

export async function fetchProductPrices(): Promise<Record<string, ProductPrice>> {
  if (_cache) return _cache;

  const sb = getSupabase();
  if (!sb) return FALLBACK;

  try {
    const { data, error } = await sb
      .from("products")
      .select("slug, price_cents, anchor_price_cents")
      .in("checkout_role", ["main", "upsell", "downsell"])
      .eq("status", "active");

    if (error || !data?.length) return FALLBACK;

    const prices: Record<string, ProductPrice> = {};
    for (const row of data) {
      prices[row.slug] = {
        slug: row.slug,
        priceCents: row.price_cents,
        anchorPriceCents: row.anchor_price_cents,
      };
    }
    _cache = prices;
    return prices;
  } catch {
    return FALLBACK;
  }
}

export function formatBRL(cents: number): string {
  return `R$ ${(cents / 100).toFixed(2).replace(".", ",")}`;
}

export function formatInstallments(cents: number, n: number): string {
  const installment = (cents / n / 100).toFixed(2).replace(".", ",");
  return `ou ${n}x de R$ ${installment} sem juros`;
}
