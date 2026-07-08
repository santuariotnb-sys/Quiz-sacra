import { useReducer } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { reducer, initialState, computeArchetype, track } from "./state";
import { Hero } from "./screens/Hero";
import { Name } from "./screens/Name";
import { Questions } from "./screens/Questions";
import { WhatsGate } from "./screens/WhatsGate";
import { Loading } from "./screens/Loading";
import { Result } from "./screens/Result";
import { Dicotomia } from "./screens/Dicotomia";
import { Offer } from "./screens/Offer";
import { Checkout } from "./screens/Checkout";

/** Transição entre telas: slide-up + fade (spring suave ~350ms). */
const screenTransition = { type: "spring", stiffness: 340, damping: 30, mass: 0.9 } as const;

export default function App() {
  const [s, dispatch] = useReducer(reducer, initialState, (i) => { track("arrival", ""); return i; });
  const archetype = computeArchetype(s.answers, s.preScore);

  return (
    <div className="shell">
      <AnimatePresence mode="wait">
        <motion.div
          key={s.stage}
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -18 }}
          transition={screenTransition}
        >
          {s.stage === "hero" && <Hero onPick={(dor) => dispatch({ type: "PICK_DOR", dor })} />}
          {s.stage === "name" && s.dor && <Name dor={s.dor} onSubmit={(name) => dispatch({ type: "SET_NAME", name })} />}
          {s.stage === "questions" && <Questions qIndex={s.qIndex} name={s.name} onAnswer={(key, value) => dispatch({ type: "ANSWER", key, value })} />}
          {s.stage === "whatsgate" && <WhatsGate name={s.name} onSubmit={(whats) => dispatch({ type: "SET_WHATS", whats })} />}
          {s.stage === "loading" && <Loading name={s.name} onDone={() => dispatch({ type: "LOADING_DONE" })} />}
          {s.stage === "result" && <Result archetype={archetype} name={s.name} onDone={() => dispatch({ type: "NEXT_STAGE" })} />}
          {s.stage === "dicotomia" && <Dicotomia name={s.name} onAccept={() => dispatch({ type: "NEXT_STAGE" })} />}
          {s.stage === "offer" && <Offer name={s.name} onBuy={() => dispatch({ type: "NEXT_STAGE" })} />}
          {s.stage === "checkout" && <Checkout />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
