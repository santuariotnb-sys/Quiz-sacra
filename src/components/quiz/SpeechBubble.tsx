import { useEffect, useState } from "react";

type Props = {
  text: string;
  /** ms entre cada caractere; default 30 */
  speed?: number;
  /** mostra "digitando..." por essa quantidade de ms antes de iniciar */
  typingDelay?: number;
  onDone?: () => void;
  italic?: boolean;
  /** key extra para resetar typewriter */
  resetKey?: string | number;
  /** mostra o texto pronto (sem digitar), só com o fade da bolha */
  instant?: boolean;
};

export function SpeechBubble({
  text,
  speed = 30,
  typingDelay = 700,
  onDone,
  italic = false,
  resetKey,
  instant = false,
}: Props) {
  // instant: já nasce com o texto pronto (sem piscar). typewriter: começa vazio.
  const [output, setOutput] = useState(instant ? text : "");
  const [typing, setTyping] = useState(!instant && typingDelay > 0);

  useEffect(() => {
    if (instant) {
      setTyping(false);
      setOutput(text);
      onDone?.();
      return;
    }

    let cancelled = false;
    let interval: ReturnType<typeof setInterval> | undefined;

    setOutput("");
    setTyping(typingDelay > 0);

    const t1 = setTimeout(() => {
      if (cancelled) return;
      setTyping(false);
      let i = 0;
      interval = setInterval(() => {
        if (cancelled) return;
        i += 1;
        setOutput(text.slice(0, i));
        if (i >= text.length) {
          if (interval) clearInterval(interval);
          onDone?.();
        }
      }, speed);
    }, typingDelay);

    // Limpa AMBOS (timeout e interval) — evita intervals fantasmas competindo.
    return () => {
      cancelled = true;
      clearTimeout(t1);
      if (interval) clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, resetKey, instant]);

  const display = instant ? text : output;
  const showCursor = !instant && display.length < text.length;

  return (
    <div className="relative max-w-full overflow-hidden">
      <div
        key={`${resetKey}-${text}`}
        className="rdp-bubble-in rdp-shadow-bubble relative rounded-[20px] rounded-tl-md bg-white px-5 py-4 sm:px-6 sm:py-5"
      >
        {/* tail — kept inside bounds; parent clips the overshoot */}
        <span
          aria-hidden
          className="absolute -left-1.5 top-3 h-4 w-4 rotate-45 bg-white"
          style={{ clipPath: "polygon(0 0, 100% 0, 0 100%)" }}
        />
        {typing ? (
          <span className="flex items-center gap-1.5 text-[color:var(--amethyst)]">
            <Dot delay={0} />
            <Dot delay={0.2} />
            <Dot delay={0.4} />
          </span>
        ) : (
          <p
            className={`font-display text-lg leading-snug text-[color:var(--deep-purple)] sm:text-[26px] ${
              italic ? "italic" : ""
            }`}
          >
            {display}
            {showCursor && <span className="opacity-40">▌</span>}
          </p>
        )}
      </div>
    </div>
  );
}

function Dot({ delay }: { delay: number }) {
  return (
    <span
      className="rdp-typing-dot inline-block h-2 w-2 rounded-full bg-[color:var(--lavender)]"
      style={{ animationDelay: `${delay}s` }}
    />
  );
}