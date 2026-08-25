import { Shield, Zap, Lock } from "lucide-react";

const FEATURE_ICONS: Record<string, React.ReactElement> = {
  shield: <Shield size={22} color="var(--gold)" />,
  link: <Zap size={22} color="var(--gold)" />,
  users: <Lock size={22} color="var(--gold)" />,
};

interface FeaturesProps {
  t: any;
  isKm: boolean;
  bodyFont: string;
}

export default function Features({ t, isKm, bodyFont }: FeaturesProps) {
  return (
    <section style={{ paddingBottom: 40 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 22 }}>
        <span style={{ width: 3, height: 18, background: "var(--gold)", borderRadius: 2, flexShrink: 0 }} />
        <h2 style={{ fontSize: 20, fontWeight: 700, letterSpacing: isKm ? 0 : "-0.01em", fontFamily: bodyFont }}>{t.features_h}</h2>
      </div>
      <div style={{ display: "grid", gap: 10 }}>
        {t.features.map((f: any) => (
          <div key={f.title} style={{ display: "flex", gap: 14, alignItems: "flex-start", padding: "16px 18px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, transition: "border-color 0.2s, box-shadow 0.2s" }} onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = "var(--border-gold)"; el.style.boxShadow = "0 2px 12px rgba(212,167,44,0.12)"; }} onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = "var(--border)"; el.style.boxShadow = "none"; }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, flexShrink: 0, background: "rgba(212,167,44,0.10)", border: "1px solid var(--border-gold)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {FEATURE_ICONS[f.icon] ?? <Shield size={22} color="var(--gold)" />}
            </div>
            <div>
              <p style={{ fontSize: 14, fontWeight: 700, marginBottom: 4, fontFamily: bodyFont }}>{f.title}</p>
              <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6, fontFamily: bodyFont }}>{f.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
