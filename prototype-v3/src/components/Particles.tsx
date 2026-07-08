/** Partículas de luz ambiente — CSS puro, transform only (7 pontos). */
const DOTS = [
  { left: "8%", bottom: "6%", delay: "0s", dur: "9s" },
  { left: "22%", bottom: "0%", delay: "2.2s", dur: "11s" },
  { left: "38%", bottom: "10%", delay: "4.8s", dur: "8.5s" },
  { left: "55%", bottom: "2%", delay: "1.1s", dur: "10s" },
  { left: "68%", bottom: "8%", delay: "3.6s", dur: "9.5s" },
  { left: "82%", bottom: "0%", delay: "5.4s", dur: "12s" },
  { left: "93%", bottom: "12%", delay: "0.7s", dur: "8s" },
];

export function Particles() {
  return (
    <div className="particles" aria-hidden>
      {DOTS.map((d, i) => (
        <span
          key={i}
          className="particle"
          style={{ left: d.left, bottom: d.bottom, animationDelay: d.delay, animationDuration: d.dur }}
        />
      ))}
    </div>
  );
}
