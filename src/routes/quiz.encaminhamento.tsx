import { createFileRoute } from "@tanstack/react-router";
import { GuideAvatar } from "@/components/quiz/Avatar";

export const Route = createFileRoute("/quiz/encaminhamento")({
  component: Encaminhamento,
});

// ZERO tracking aqui. Sem Pixel, sem Supabase com PII, sem CTA comercial.
function Encaminhamento() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col items-center justify-center px-6 py-12 text-center">
      <div className="rdp-shadow-soft w-full rounded-3xl bg-white px-6 py-10 sm:px-10 sm:py-12">
        <div className="mb-6 flex justify-center">
          <GuideAvatar size="corner" />
        </div>

        <p className="font-display text-sm italic tracking-[0.2em] text-[color:var(--gold-warm)]">
          ✦ UMA PAUSA ✦
        </p>
        <h1 className="rdp-title-gradient mt-4 font-display text-4xl leading-tight sm:text-5xl">
          Respira comigo.
        </h1>
        <p className="mt-5 text-lg leading-relaxed text-[color:var(--amethyst)]">
          O que você está sentindo é real — e merece um colo verdadeiro.
          Antes de qualquer passo, faça uma pausa aqui comigo.
        </p>

        <div className="rdp-gradient-soft mt-8 rounded-2xl border border-[color:var(--lavender)]/40 p-6 text-left">
          <p className="text-center text-xs uppercase tracking-[0.22em] text-[color:var(--gold-warm)]">
            Um respiro de 4 tempos
          </p>
          <ol className="mt-4 space-y-2 text-[color:var(--deep-purple)]">
            <li className="flex gap-3"><span className="font-display text-[color:var(--gold-warm)]">1.</span> Inspire pelo nariz contando até 4.</li>
            <li className="flex gap-3"><span className="font-display text-[color:var(--gold-warm)]">2.</span> Segure o ar contando até 4.</li>
            <li className="flex gap-3"><span className="font-display text-[color:var(--gold-warm)]">3.</span> Solte pela boca contando até 6.</li>
            <li className="flex gap-3"><span className="font-display text-[color:var(--gold-warm)]">4.</span> Repita três vezes, sem pressa.</li>
          </ol>

          <div className="mt-6 flex justify-center">
            <a
              href="/quiz"
              className="rdp-gradient-cta inline-flex items-center justify-center rounded-2xl px-6 py-3 font-medium text-[color:var(--deep-purple)] shadow-[0_10px_30px_-12px_rgba(201,168,118,0.55)] transition-transform hover:-translate-y-[1px]"
            >
              Estou pronta para continuar
            </a>
          </div>
        </div>

        <p className="mt-8 font-display text-lg italic text-[color:var(--deep-purple)]">
          "Perto está o Senhor dos que têm o coração quebrantado."
        </p>
        <p className="mt-1 text-sm text-[color:var(--amethyst)]">— Salmos 34:18</p>
      </div>
    </main>
  );
}
