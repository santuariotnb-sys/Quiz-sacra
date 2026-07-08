import { useLayoutEffect, useRef, useState } from "react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { DICOTOMIA } from "../content";
import { Placeholder } from "../components/Placeholder";

/** MOMENTO WOW — comparador before/after com slider arrastável (useMotionValue + drag).
 *  Transform-only: o lado A é recortado por dois translates opostos (sem width/clip animado).
 *  Fallback: tap no quadro alterna entre os dois lados. */
export function Dicotomia({ name, onAccept }: { name: string; onAccept: () => void }) {
  const frameRef = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(0);
  const x = useMotionValue(0);
  const outerX = useTransform(x, (v) => v - w);
  const innerX = useTransform(x, (v) => w - v);

  useLayoutEffect(() => {
    const measure = () => {
      const el = frameRef.current;
      if (!el) return;
      const width = el.clientWidth;
      setW(width);
      x.set(width / 2);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggle = () => {
    const target = x.get() < w / 2 ? w * 0.88 : w * 0.12;
    animate(x, target, { type: "spring", stiffness: 260, damping: 26 });
  };

  const col = (lado: typeof DICOTOMIA.ladoA, cls: string) => (
    <motion.div
      className={`dico-side ${cls}`}
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ type: "spring", stiffness: 300, damping: 26 }}
    >
      <p className="dico-tag">{lado.emoji} <em>{lado.tag}</em></p>
      <ul className="dico-list">
        {lado.items.map((it) => <li key={it}>{it}</li>)}
      </ul>
    </motion.div>
  );

  return (
    <div>
      <motion.h2
        style={{ fontSize: "1.35rem", textAlign: "center", marginBottom: 6 }}
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {DICOTOMIA.title.replaceAll("{nome}", name)}
      </motion.h2>
      <motion.p
        className="text-suave"
        style={{ textAlign: "center", fontSize: ".8rem", marginBottom: 14 }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        ← arraste a linha dourada →
      </motion.p>

      <motion.div
        ref={frameRef}
        className="dico-frame"
        onClick={toggle}
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 24 }}
      >
        {/* Base: lado B — Filha Cuidada (dourado, quente) */}
        <div className="dico-img dico-img-b">
          <Placeholder n={6} ratio="4/5" label={DICOTOMIA.ladoB.tag} />
        </div>

        {/* Overlay recortado: lado A — Mula de Carga (dessaturado, frio) */}
        <motion.div style={{ position: "absolute", inset: 0, overflow: "hidden", x: outerX }} aria-hidden={w === 0}>
          <motion.div style={{ x: innerX, width: "100%", height: "100%" }}>
            <div className="dico-img dico-img-a">
              <Placeholder n={5} ratio="4/5" label={DICOTOMIA.ladoA.tag} />
            </div>
          </motion.div>
        </motion.div>

        {/* Alça arrastável */}
        {w > 0 && (
          <motion.div
            className="dico-handle"
            style={{ x, left: 0 }}
            drag="x"
            dragConstraints={{ left: w * 0.08, right: w * 0.92 }}
            dragElastic={0.04}
            dragMomentum={false}
            onClick={(e) => e.stopPropagation()}
            whileTap={{ scale: 1.08 }}
          >
            <div className="dico-handle-line" />
            <div className="dico-handle-knob">⇄</div>
          </motion.div>
        )}
      </motion.div>

      {/* Os dois mundos, lado a lado (legível — o slider fica só nas imagens) */}
      <div className="dico-cols">
        {col(DICOTOMIA.ladoA, "dico-side-a")}
        {col(DICOTOMIA.ladoB, "dico-side-b")}
      </div>

      <motion.p
        style={{ textAlign: "center", margin: "22px 0 14px", fontFamily: "var(--serif)", fontSize: "1.15rem", lineHeight: 1.5 }}
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.4 }}
      >
        {DICOTOMIA.fecho.replaceAll("{nome}", name)}
      </motion.p>
      <motion.button className="btn-primary btn" onClick={onAccept} whileTap={{ scale: 0.97 }}>
        {DICOTOMIA.cta}
      </motion.button>
    </div>
  );
}
