import { Lock, Zap, Shield } from "lucide-react";
import FlowDiagram from "./FlowDiagram";

interface HeroProps {
  t: any;
  isKm: boolean;
  bodyFont: string;
  onScrollTo: (id: string) => void;
}

export default function Hero({ t, isKm, bodyFont, onScrollTo }: HeroProps) {
  return (
    <section style={{ paddingTop: 36, paddingBottom: 40 }}>
      <h1 style={{ fontSize: isKm ? 28 : 34, fontWeight: 800, lineHeight: 1.2, letterSpacing: isKm ? "0" : "-0.02em", marginBottom: 14, fontFamily: bodyFont }}>
        {t.hero_h1_a}<br />
        <span className="gold-shimmer">{t.hero_h1_b}</span>
      </h1>
      <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 14, fontFamily: isKm ? "'Outfit', sans-serif" : "'Kantumruy Pro', sans-serif" }}>{t.hero_sub}</div>
      <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.7, marginBottom: 24, fontFamily: bodyFont }}>{t.hero_desc}</p>
      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={() => onScrollTo("pricing")} style={{ flex: 1, padding: "13px 0", borderRadius: 10, border: "none", background: "rgb(220,180,82)", color: "#1a1200", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: bodyFont, boxShadow: "0 2px 12px rgba(212,167,44,0.4)", transition: "transform 0.15s, box-shadow 0.15s" }} onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 4px 20px rgba(212,167,44,0.55)"; }} onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "0 2px 12px rgba(212,167,44,0.4)"; }}>
          {t.btn_start}
        </button>
        <button onClick={() => onScrollTo("how")} style={{ flex: 1, padding: "13px 0", borderRadius: 10, background: "transparent", border: "1.5px solid var(--border-gold)", color: "var(--text)", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: bodyFont, transition: "border-color 0.15s, background 0.15s" }} onMouseEnter={e => { e.currentTarget.style.background = "rgba(212,167,44,0.07)"; e.currentTarget.style.borderColor = "var(--gold)"; }} onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "var(--border-gold)"; }}>
          {t.btn_how}
        </button>
      </div>
      <FlowDiagram t={t} />
      <div style={{ display: "flex", gap: 16, marginTop: 18, flexWrap: "wrap" }}>
        {([<Lock size={11} />, <Zap size={11} />, <Shield size={11} />] as const).map((icon, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 5, color: "var(--muted)" }}>
            {icon}
            <span className="khmer" style={{ fontSize: 11, color: "var(--muted)", fontWeight: 500, fontFamily: bodyFont }}>{t.trust[i]}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
