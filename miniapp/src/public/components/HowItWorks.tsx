interface HowItWorksProps {
  t: any;
  isKm: boolean;
  bodyFont: string;
}

export default function HowItWorks({ t, isKm, bodyFont }: HowItWorksProps) {
  return (
    <section id="how" style={{ paddingBottom: 40 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 22 }}>
        <span style={{ width: 3, height: 18, background: "var(--gold)", borderRadius: 2, flexShrink: 0 }} />
        <h2 style={{ fontSize: 20, fontWeight: 700, letterSpacing: isKm ? 0 : "-0.01em", fontFamily: bodyFont }}>{t.how_h}</h2>
      </div>
      <div style={{ display: "grid", gap: 12 }}>
        {t.steps.map((s: any, i: number) => (
          <div key={s.num} style={{ display: "flex", gap: 16, alignItems: "flex-start", padding: "18px 18px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12 }}>
            <div style={{ flexShrink: 0, width: 36, height: 36, borderRadius: 9, background: i === 0 ? "var(--gold)" : "rgba(212,167,44,0.10)", border: i === 0 ? "none" : "1px solid var(--border-gold)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span className="mono" style={{ fontSize: 11, fontWeight: 700, color: i === 0 ? "#1a1200" : "var(--gold)" }}>{s.num}</span>
            </div>
            <div>
              <p style={{ fontSize: 15, fontWeight: 700, marginBottom: 5, fontFamily: bodyFont }}>{s.label}</p>
              <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6, fontFamily: bodyFont }}>{s.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
