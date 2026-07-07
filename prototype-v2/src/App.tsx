import { useReducer } from "react";
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

export default function App() {
  const [s, dispatch] = useReducer(reducer, initialState, (i) => { track("arrival", ""); return i; });
  const archetype = computeArchetype(s.answers, s.preScore);

  return (
    <div className="shell">
      {s.stage === "hero" && <Hero onPick={(dor) => dispatch({ type: "PICK_DOR", dor })} />}
      {s.stage === "name" && s.dor && <Name dor={s.dor} onSubmit={(name) => dispatch({ type: "SET_NAME", name })} />}
      {s.stage === "questions" && <Questions qIndex={s.qIndex} name={s.name} onAnswer={(key, value) => dispatch({ type: "ANSWER", key, value })} />}
      {s.stage === "whatsgate" && <WhatsGate name={s.name} onSubmit={(whats) => dispatch({ type: "SET_WHATS", whats })} />}
      {s.stage === "loading" && <Loading name={s.name} onDone={() => dispatch({ type: "LOADING_DONE" })} />}
      {s.stage === "result" && <Result archetype={archetype} name={s.name} onDone={() => dispatch({ type: "NEXT_STAGE" })} />}
      {s.stage === "dicotomia" && <Dicotomia name={s.name} onAccept={() => dispatch({ type: "NEXT_STAGE" })} />}
      {s.stage === "offer" && <Offer name={s.name} onBuy={() => dispatch({ type: "NEXT_STAGE" })} />}
      {s.stage === "checkout" && <Checkout />}
    </div>
  );
}
