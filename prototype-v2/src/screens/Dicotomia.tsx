import { DICOTOMIA } from "../content";
import { Placeholder } from "../components/Placeholder";

export function Dicotomia({ name, onAccept }: { name: string; onAccept: () => void }) {
  return (
    <div className="fade-in">
      <h2 style={{ fontSize: "1.35rem", textAlign: "center", marginBottom: 16 }}>
        {DICOTOMIA.title.replaceAll("{nome}", name)}
      </h2>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {[DICOTOMIA.ladoA, DICOTOMIA.ladoB].map((lado, i) => (
          <div key={lado.tag} className={i === 1 ? "lado-b" : undefined}>
            <Placeholder n={5 + i} ratio="4/5" label={lado.tag} />
            <p style={{ fontWeight: 600, margin: "8px 0 4px" }}>{lado.emoji} <em>{lado.tag}</em></p>
            <ul style={{ paddingLeft: 16, fontSize: ".82rem", color: "var(--grafite-suave)" }}>
              {lado.items.map((it) => <li key={it}>{it}</li>)}
            </ul>
          </div>
        ))}
      </div>
      <p style={{ textAlign: "center", margin: "20px 0 12px", fontFamily: "var(--serif)", fontSize: "1.15rem" }}>
        {DICOTOMIA.fecho.replaceAll("{nome}", name)}
      </p>
      <button className="btn btn-primary" onClick={onAccept}>{DICOTOMIA.cta}</button>
    </div>
  );
}
