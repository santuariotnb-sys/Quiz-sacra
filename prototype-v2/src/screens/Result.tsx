import { useState } from "react";
import { ARCHETYPES, type Archetype } from "@prod/data/quiz";
import { Placeholder } from "../components/Placeholder";
import { OFERTA_V2 } from "../content";

export function Result({ archetype, name, onDone }: { archetype: Archetype; name: string; onDone: () => void }) {
  const a = ARCHETYPES[archetype];
  const [scene, setScene] = useState(0);
  const next = () => (scene < 2 ? setScene(scene + 1) : onDone());

  return (
    <div className="fade-in" key={scene} onClick={next} style={{ cursor: "pointer" }}>
      <div className="stories-dots">{[0, 1, 2].map((i) => <span key={i} className={i <= scene ? "on" : ""} />)}</div>
      {scene === 0 && (
        <div>
          <p className="eyebrow">Diagnóstico concluído</p>
          <h2 style={{ fontSize: "1.6rem" }}>Seu padrão é <em style={{ color: "var(--terracota)" }}>{a.name}</em></h2>
          <p style={{ margin: "8px 0 16px", color: "var(--grafite-suave)" }}>{a.result.tagline}</p>
          <blockquote className="mirror">“{a.neurofe.espelho}”</blockquote>
          <p style={{ marginTop: 14 }} dangerouslySetInnerHTML={{ __html: a.result.happening }} />
        </div>
      )}
      {scene === 1 && (
        <div>
          <h2 style={{ fontSize: "1.4rem" }}>{a.result.truthTitle} <em style={{ color: "var(--ouro)" }}>{a.result.truthTitleEm}</em></h2>
          <p style={{ margin: "12px 0" }} dangerouslySetInnerHTML={{ __html: a.result.truthBody }} />
          <div className="verse"><span>{a.result.verseRef}</span><em>“{a.result.verseText}”</em></div>
          <p style={{ marginTop: 12, whiteSpace: "pre-line", fontStyle: "italic" }}>{a.result.seal}</p>
        </div>
      )}
      {scene === 2 && (
        <div>
          <h2 style={{ fontSize: "1.35rem", marginBottom: 12 }}>Os 3 passos da NeuroFé</h2>
          {OFERTA_V2.passos.map((p) => (
            <div key={p.n} style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 14 }}>
              <div style={{ width: 88, flexShrink: 0 }}><Placeholder n={p.img} ratio="1/1" label={p.titulo} /></div>
              <div><strong>Passo {p.n} — {p.titulo}</strong><p style={{ fontSize: ".9rem", color: "var(--grafite-suave)" }}>{p.texto}</p></div>
            </div>
          ))}
        </div>
      )}
      <p className="tap-hint">toque para continuar →</p>
    </div>
  );
}
