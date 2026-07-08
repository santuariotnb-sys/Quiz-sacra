export function Placeholder({ n, ratio, label }: { n: number; ratio: "4/5" | "1/1"; label: string }) {
  return (
    <div className="ph" style={{ aspectRatio: ratio }}>
      <span className="ph-n">IMG #{n}</span>
      <span className="ph-label">{label}</span>
      <span className="ph-ratio">{ratio === "4/5" ? "1080×1350 (4:5)" : "1024×1024 (1:1)"}</span>
    </div>
  );
}
