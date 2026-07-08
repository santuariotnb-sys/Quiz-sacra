import { useEffect } from "react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { NEUROFE_OFFER } from "@prod/data/quiz";
import { OFERTA_V2, TESTIMONIALS } from "../content";
import { Placeholder } from "../components/Placeholder";
import { WaApp, WaMessage, WaAudio } from "../components/WhatsApp";

const brl = (c: number) => `R$ ${(c / 100).toFixed(2).replace(".", ",")}`;

const inView = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.15 },
  transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1] },
} as const;

/** Preço com countup reverso: R$228 riscado → contagem descendo até R$47 (1s). */
function PriceReveal() {
  const count = useMotionValue(NEUROFE_OFFER.anchorCents / 100);
  const rounded = useTransform(count, (v) => Math.round(v));

  useEffect(() => {
    const controls = animate(count, 47, { duration: 1, delay: 0.75, ease: "easeOut" });
    return controls.stop;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{ textAlign: "center", margin: "18px 0 4px" }}>
      <span className="price-anchor">
        de R$ {Math.round(NEUROFE_OFFER.anchorCents / 100)}
        <motion.span
          className="price-anchor-line"
          initial={{ scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.35, duration: 0.35, ease: "easeIn" }}
        />
      </span>
      <div className="price-now">
        R$ <motion.span>{rounded}</motion.span>
      </div>
      <p className="text-suave" style={{ fontSize: ".85rem", marginTop: 4 }}>
        ou {NEUROFE_OFFER.installments}× de {brl(NEUROFE_OFFER.installmentCents)}
      </p>
    </div>
  );
}

export function Offer({ name, onBuy }: { name: string; onBuy: () => void }) {
  const total = NEUROFE_OFFER.valueStack.reduce((s, i) => s + i.cents, 0);
  return (
    <div>
      <motion.h2
        style={{ fontSize: "1.45rem", textAlign: "center" }}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 26 }}
      >
        {OFERTA_V2.chamada.replaceAll("{nome}", name)}
      </motion.h2>

      <motion.div style={{ maxWidth: 240, margin: "18px auto" }} {...inView}>
        <Placeholder n={7} ratio="4/5" label="Jaqueline — convite ao colo" />
      </motion.div>

      <motion.h3 style={{ textAlign: "center", marginBottom: 12 }} {...inView}>
        {OFERTA_V2.produto}
      </motion.h3>

      {/* Stack de valor em cascata no scroll */}
      <div className="stack">
        {NEUROFE_OFFER.valueStack.map((i, idx) => (
          <motion.div
            key={i.label}
            className="stack-row"
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ delay: idx * 0.1, type: "spring", stiffness: 300, damping: 26 }}
          >
            <span>{i.label}</span><s>{brl(i.cents)}</s>
          </motion.div>
        ))}
        <motion.div className="stack-row total" {...inView}>
          <span>Valor real</span><s>{brl(total)}</s>
        </motion.div>
      </div>

      <motion.div {...inView}>
        <PriceReveal />
        <p style={{ textAlign: "center", margin: "10px 0 4px", fontSize: ".95rem", lineHeight: 1.5 }}>
          {OFERTA_V2.precoFrase}
        </p>
      </motion.div>

      {/* CTA rosé com pulso respirando */}
      <motion.button
        className="btn-primary btn"
        style={{ margin: "18px 0" }}
        onClick={onBuy}
        animate={{ scale: [1, 1.02, 1] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
        whileTap={{ scale: 0.97 }}
      >
        Quero render o meu plantão →
      </motion.button>

      <motion.h3 style={{ margin: "20px 0 12px" }} {...inView}>
        Quem já rendeu o turno:
      </motion.h3>

      {/* Grupo WhatsApp completo (6 depoimentos + 1 áudio) */}
      <motion.div {...inView}>
        <WaApp>
          {TESTIMONIALS.slice(0, 3).map((t, i) => (
            <WaMessage key={t.name} t={t} delay={i * 0.12} />
          ))}
          <WaAudio name="Jaqueline" time="21:15" duration="1:32" delay={0.36} />
          {TESTIMONIALS.slice(3).map((t, i) => (
            <WaMessage key={t.name} t={t} delay={0.48 + i * 0.12} />
          ))}
        </WaApp>
      </motion.div>

      <motion.div className="guarantee" style={{ margin: "22px 0" }} {...inView}>
        <span>🛡️ GARANTIA DE {OFERTA_V2.garantiaDias} DIAS</span>
        <em>{OFERTA_V2.garantia}</em>
      </motion.div>
    </div>
  );
}
