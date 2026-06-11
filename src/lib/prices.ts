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
let _cacheKey = "";

export async function fetchProductPrices(offerKey?: string): Promise<Record<string, ProductPrice>> {
  const cacheId = offerKey || "__default__";
  if (_cache && _cacheKey === cacheId) return _cache;

  const sb = getSupabase();
  if (!sb) return FALLBACK;

  try {
    // First, get active products to know their IDs
    const { data: products, error: prodErr } = await sb
      .from("products")
      .select("id, slug, price_cents, anchor_price_cents, checkout_role")
      .in("checkout_role", ["main", "upsell", "downsell"])
      .eq("status", "active");

    if (prodErr || !products?.length) return FALLBACK;

    const prices: Record<string, ProductPrice> = {};

    for (const p of products) {
      let priceCents = p.price_cents;
      let anchorCents = p.anchor_price_cents;

      // For main product: try specific offer_key, then default offer
      if (p.checkout_role === "main" && offerKey) {
        const { data: offer } = await sb
          .from("product_offers")
          .select("price_cents, anchor_price_cents")
          .eq("product_id", p.id)
          .eq("offer_key", offerKey)
          .eq("active", true)
          .single();
        if (offer) {
          priceCents = offer.price_cents;
          if (offer.anchor_price_cents != null) anchorCents = offer.anchor_price_cents;
        }
      }

      // If no specific offer matched, try default offer
      if (priceCents === p.price_cents) {
        const { data: defOffer } = await sb
          .from("product_offers")
          .select("price_cents, anchor_price_cents")
          .eq("product_id", p.id)
          .eq("is_default", true)
          .eq("active", true)
          .single();
        if (defOffer) {
          priceCents = defOffer.price_cents;
          if (defOffer.anchor_price_cents != null) anchorCents = defOffer.anchor_price_cents;
        }
      }

      prices[p.slug] = {
        slug: p.slug,
        priceCents,
        anchorPriceCents: anchorCents,
      };
    }

    _cache = prices;
    _cacheKey = cacheId;
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

let _freeCountCache: number | null = null;

export async function fetchInstallmentFreeCount(): Promise<number> {
  if (_freeCountCache !== null) return _freeCountCache;
  const sb = getSupabase();
  if (!sb) return 3; // fallback

  try {
    const { data } = await sb
      .schema("checkout")
      .from("checkout_config")
      .select("value")
      .eq("key", "installment_free_count")
      .single();
    const val = parseInt(typeof data?.value === "string" ? data.value : String(data?.value ?? "3"), 10);
    _freeCountCache = val > 0 ? val : 3;
    return _freeCountCache;
  } catch {
    return 3;
  }
}
