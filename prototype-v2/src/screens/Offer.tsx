import { NEUROFE_OFFER } from "@prod/data/quiz";
import { OFERTA_V2, TESTIMONIALS } from "../content";
import { Placeholder } from "../components/Placeholder";
import { WhatsCard } from "../components/WhatsCard";

const brl = (c: number) => `R$ ${(c / 100).toFixed(2).replace(".", ",")}`;

export function Offer({ name, onBuy }: { name: string; onBuy: () => void }) {
  const total = NEUROFE_OFFER.valueStack.reduce((s, i) => s + i.cents, 0);
  return (
    <div className="fade-in">
      <h2 style={{ fontSize: "1.4rem", textAlign: "center" }}>{OFERTA_V2.chamada.replaceAll("{nome}", name)}</h2>
      <div style={{ maxWidth: 240, margin: "16px auto" }}><Placeholder n={7} ratio="4/5" label="Jaqueline — convite ao colo" /></div>
      <h3 style={{ textAlign: "center", marginBottom: 12 }}>{OFERTA_V2.produto}</h3>
      <div className="stack">
        {NEUROFE_OFFER.valueStack.map((i) => (
          <div key={i.label} className="stack-row"><span>{i.label}</span><s>{brl(i.cents)}</s></div>
        ))}
        <div className="stack-row total"><span>Valor real</span><s>{brl(total)}</s></div>
      </div>
      <p style={{ textAlign: "center", margin: "14px 0 4px", fontSize: "1.05rem" }}>{OFERTA_V2.precoFrase}</p>
      <p style={{ textAlign: "center", fontSize: ".85rem", color: "var(--grafite-suave)" }}>
        ou {NEUROFE_OFFER.installments}× de {brl(NEUROFE_OFFER.installmentCents)}
      </p>
      <button className="btn btn-primary" style={{ margin: "16px 0" }} onClick={onBuy}>Quero render o meu plantão →</button>
      <h3 style={{ margin: "18px 0 10px" }}>Quem já rendeu o turno:</h3>
      <div style={{ display: "grid", gap: 10, justifyItems: "start" }}>
        {TESTIMONIALS.map((t) => <WhatsCard key={t.name} t={t} />)}
      </div>
      <div className="verse" style={{ margin: "20px 0" }}>
        <span>🛡️ GARANTIA DE {OFERTA_V2.garantiaDias} DIAS</span>
        <em>{OFERTA_V2.garantia}</em>
      </div>
    </div>
  );
}
