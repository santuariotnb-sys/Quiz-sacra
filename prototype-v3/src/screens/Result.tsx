import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ARCHETYPES, type Archetype } from "@prod/data/quiz";
import { Placeholder } from "../components/Placeholder";
import { OFERTA_V2 } from "../content";

const SCENE_MS = 5000;

/** Nome do arquétipo: tracking-in letra a letra + glow. */
function LetterReveal({ text }: { text: string }) {
  return (
    <motion.span
      className="archetype-name"
      initial="hidden"
      animate="show"
      variants={{ hidden: {}, show: { transition: { staggerChildren: 0.055, delayChildren: 0.2 } } }}
      aria-label={text}
    >
      {text.split("").map((ch, i) => (
        <motion.span
          key={i}
          style={{ display: "inline-block" }}
          variants={{
            hidden: { opacity: 0, y: 12, scale: 1.4 },
            show: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 300, damping: 20 } },
          }}
        >
          {ch}
        </motion.span>
      ))}
    </motion.span>
  );
}

export function Result({ archetype, name, onDone }: { archetype: Archetype; name: string; onDone: () => void }) {
  const a = ARCHETYPES[archetype];
  const [scene, setScene] = useState(0);
  const next = () => (scene < 2 ? setScene((s) => s + 1) : onDone());

  // Auto-progresso estilo Instagram: 5s por cena.
  useEffect(() => {
    const t = setTimeout(next, SCENE_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene]);

  return (
    <div onClick={next} style={{ cursor: "pointer" }} role="button" aria-label="Toque para continuar">
      <div className="stories-bars">
        {[0, 1, 2].map((i) => (
          <div key={i} className="stories-bar">
            {i < scene && <div className="stories-bar-fill" />}
            {i === scene && (
              <motion.div
                key={`fill-${scene}`}
                className="stories-bar-fill"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: SCENE_MS / 1000, ease: "linear" }}
              />
            )}
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={scene}
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -14 }}
          transition={{ type: "spring", stiffness: 300, damping: 26 }}
        >
          {scene === 0 && (
            <div>
              <p className="eyebrow">Diagnóstico concluído</p>
              <h2 style={{ fontSize: "1.35rem" }}>{name ? `${name}, seu` : "Seu"} padrão é</h2>
              <LetterReveal text={a.name} />
              <p className="text-suave" style={{ margin: "8px 0 16px" }}>{a.result.tagline}</p>
              <blockquote className="mirror">“{a.neurofe.espelho}”</blockquote>
              <p style={{ marginTop: 14, lineHeight: 1.6 }} dangerouslySetInnerHTML={{ __html: a.result.happening }} />
            </div>
          )}
          {scene === 1 && (
            <div>
              <h2 style={{ fontSize: "1.4rem" }}>{a.result.truthTitle} <em>{a.result.truthTitleEm}</em></h2>
              <p style={{ margin: "14px 0", lineHeight: 1.6 }} dangerouslySetInnerHTML={{ __html: a.result.truthBody }} />
              <div className="verse verse-breathing">
                <span>{a.result.verseRef}</span>
                <em>“{a.result.verseText}”</em>
              </div>
              <p style={{ marginTop: 14, whiteSpace: "pre-line", fontStyle: "italic", color: "var(--ouro)", fontFamily: "var(--serif)" }}>
                {a.result.seal}
              </p>
            </div>
          )}
          {scene === 2 && (
            <div>
              <h2 style={{ fontSize: "1.35rem", marginBottom: 14 }}>Os 3 passos da <em>NeuroFé</em></h2>
              {OFERTA_V2.passos.map((p, i) => (
                <motion.div
                  key={p.n}
                  initial={{ opacity: 0, x: -18 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.15 + i * 0.18, type: "spring", stiffness: 300, damping: 24 }}
                  style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 14 }}
                >
                  <div style={{ width: 88, flexShrink: 0 }}><Placeholder n={p.img} ratio="1/1" label={p.titulo} /></div>
                  <div>
                    <strong style={{ color: "var(--ouro)" }}>Passo {p.n} — {p.titulo}</strong>
                    <p className="text-suave" style={{ fontSize: ".88rem", lineHeight: 1.5 }}>{p.texto}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      <p className="tap-hint">toque para continuar →</p>
    </div>
  );
}
