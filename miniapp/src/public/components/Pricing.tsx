import { useState } from "react";
import { Check } from "lucide-react";

interface PricingProps {
  t: any;
  isKm: boolean;
  bodyFont: string;
}

export default function Pricing({ t, isKm, bodyFont }: PricingProps) {
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [tab, setTab] = useState<"business" | "personal">("business");

  const plans = tab === "business" ? t.businessPlans : t.personalPlans;

  return (
    <section id="pricing" style={{ paddingBottom: 40 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <span style={{ width: 3, height: 18, background: "var(--gold)", borderRadius: 2, flexShrink: 0 }} />
        <h2 style={{ fontSize: 20, fontWeight: 700, letterSpacing: isKm ? 0 : "-0.01em", fontFamily: bodyFont }}>{t.pricing_h}</h2>
      </div>
      <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 20, paddingLeft: 11, fontFamily: bodyFont }}>{t.pricing_sub}</p>
      <div style={{ display: "flex", gap: 6, marginBottom: 16, paddingLeft: 11 }}>
        {([ "business","personal"] as const).map(val => {
          const active = tab === val;
          return (
            <button
              key={val}
              onClick={() => {
                setTab(val);
                setSelectedPlan(null);
              }}
              style={{
                flex: 1,
                padding: "9px 0",
                borderRadius: 10,
                border: `1.5px solid ${active ? "var(--gold)" : "var(--border)"}`,
                background: active ? "rgba(212,167,44,0.12)" : "transparent",
                color: active ? "var(--gold)" : "var(--muted)",
                cursor: "pointer",
                fontSize: 13,
                fontWeight: 700,
                transition: "all 0.2s",
                fontFamily: bodyFont,
              }}
            >
              {val === "business" ? t.pricingTabBusiness : t.pricingTabPersonal}
            </button>
          );
        })}
      </div>
      <div style={{ display: "grid", gap: 12 }}>
        {plans.map((plan: any) => (
          <div key={plan.id} style={{ borderRadius: 14, padding: plan.highlight ? "20px 18px" : "18px 18px", background: plan.highlight ? "var(--surface2)" : "var(--surface)", border: plan.highlight ? "2px solid rgb(220,180,82)" : "1px solid var(--border)", boxShadow: plan.highlight ? "0 4px 24px rgba(212,167,44,0.22)" : "none" }}>
            {plan.highlight && <div style={{ height: 3, background: "var(--gold)", borderRadius: "2px 2px 0 0", marginBottom: 12 }} />}
            {plan.badge && (
              <div style={{ marginBottom: 12 }}>
                <span className="mono" style={{ fontSize: 9, letterSpacing: "0.14em", padding: "3px 10px", borderRadius: 20, fontWeight: 700, background: "rgba(212,167,44,0.18)", color: "var(--gold)", border: "1px solid var(--border-gold)", fontFamily: isKm ? "'Kantumruy Pro', sans-serif" : undefined }}>{plan.badge}</span>
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
              <div>
                <p style={{ fontSize: 18, fontWeight: 800, color: plan.highlight ? "var(--gold)" : "var(--text)", fontFamily: bodyFont }}>{plan.name}</p>
                <p className="mono" style={{ fontSize: 10, color: "var(--muted)", marginTop: 2 }}>{plan.groups}</p>
              </div>
              <div style={{ textAlign: "right" }}>
                <span style={{ fontSize: 28, fontWeight: 800, color: plan.highlight ? "var(--gold)" : "var(--text)" }}>{plan.price}</span>
                <p className="mono" style={{ fontSize: 9, color: "var(--muted)", marginTop: 1 }}>{plan.period}</p>
              </div>
            </div>
            <div style={{ height: 1, marginBottom: 14, background: plan.highlight ? "rgba(212,167,44,0.25)" : "var(--border)" }} />
            <ul style={{ display: "grid", gap: 7, marginBottom: 16 }}>
              {plan.features.map((f: string) => (
                <li key={f} style={{ display: "flex", gap: 9, alignItems: "center" }}>
                  <span style={{ color: plan.highlight ? "var(--gold)" : "var(--safe)", fontSize: 12, flexShrink: 0, fontWeight: 700 }}><Check size={12} /></span>
                  <span style={{ fontSize: 13, color: "var(--text-secondary)", fontFamily: bodyFont }}>{f}</span>
                </li>
              ))}
            </ul>
             <button onClick={() => window.open("https://t.me/Sin_Hong", "_blank")} style={{ width: "100%", padding: "12px 0", borderRadius: 9, cursor: "pointer", fontSize: 14, fontWeight: 700, transition: "all 0.2s", fontFamily: bodyFont, background: plan.highlight ? "var(--gold)" : "transparent", color: plan.highlight ? "#1a1200" : "var(--text)", border: plan.highlight ? "none" : "1.5px solid var(--border)" }} onMouseEnter={e => { e.currentTarget.style.background = plan.highlight ? "#c49424" : "rgba(212,167,44,0.08)"; if (!plan.highlight) e.currentTarget.style.borderColor = "var(--gold)"; }} onMouseLeave={e => { e.currentTarget.style.background = plan.highlight ? "var(--gold)" : "transparent"; if (!plan.highlight) e.currentTarget.style.borderColor = "var(--border)"; }}>
              {plan.cta}
            </button>
          </div>
        ))}
      </div>
      <p style={{ textAlign: "center", fontSize: 11, color: "var(--muted)", marginTop: 14, fontFamily: bodyFont }}>{t.pricing_privacy}</p>
    </section>
  );
}
