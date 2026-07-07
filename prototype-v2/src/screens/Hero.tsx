import { HERO, DORES, type Dor } from "../content";
import { Placeholder } from "../components/Placeholder";

export function Hero({ onPick }: { onPick: (d: Dor) => void }) {
  return (
    <div className="fade-in">
      <div style={{ maxWidth: 220, margin: "0 auto 16px" }}>
        <Placeholder n={1} ratio="4/5" label="Jaqueline — ambiente de paz" />
      </div>
      <h1 style={{ fontSize: "1.7rem", textAlign: "center" }}>{HERO.headline}</h1>
      <p style={{ margin: "12px 0 20px", textAlign: "center", color: "var(--grafite-suave)" }}>{HERO.sub}</p>
      <p style={{ fontWeight: 600, fontSize: ".9rem", textAlign: "center", marginBottom: 10 }}>{HERO.microLabel}</p>
      <div style={{ display: "grid", gap: 10 }}>
        {DORES.map((d) => (
          <button key={d.id} className="btn" onClick={() => onPick(d)}>{d.label}</button>
        ))}
      </div>
    </div>
  );
}
