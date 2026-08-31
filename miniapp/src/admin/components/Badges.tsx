import React from "react";
import { Check, X } from "lucide-react";
import { G, type Lang } from "../palette";
import { kh } from "../i18n";

function riskColor(risk: string) {
  switch (risk) {
    case "critical": return { hex: "#e04040", label: "var(--danger)" };
    case "high": return { hex: "#e06020", label: "#e06020" };
    case "medium": return { hex: "#d07820", label: "var(--warn)" };
    default: return { hex: "#7a6830", label: "var(--muted)" };
  }
}

export function RiskBadge({ risk }: { risk: string }) {
  const { hex, label } = riskColor(risk);
  return (
    <span style={{ background: `${hex}22`, color: label, border: `1px solid ${hex}44`, borderRadius: 6, padding: "2px 8px", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>
      {risk}
    </span>
  );
}

export function ResultBadge({ result }: { result: string }) {
  const ok = result === "clean";
  return (
    <span style={{ background: ok ? "rgba(42,170,90,0.12)" : "rgba(224,64,64,0.12)", color: ok ? G.safe : G.danger, border: `1px solid ${ok ? "rgba(42,170,90,0.3)" : "rgba(224,64,64,0.3)"}`, borderRadius: 6, padding: "2px 8px", fontSize: 10, fontWeight: 700, whiteSpace: "nowrap", display: "inline-flex", alignItems: "center", gap: 3 }}>
      {ok ? <><Check size={9} /> Clean</> : <><X size={9} /> Threat</>}
    </span>
  );
}

export function SectionHeader({ title, sub, lang }: { title: string; sub?: string; lang?: Lang }) {
  const cls = lang ? kh(lang) : "";
  return (
    <div style={{ marginBottom: 4 }}>
      <div style={{ fontSize: 18, fontWeight: 700, color: G.text }}><span className={cls}>{title}</span></div>
      {sub && <div style={{ fontSize: 12, color: G.muted, marginTop: 2 }}><span className={cls}>{sub}</span></div>}
    </div>
  );
}

export function StatCard({ icon, label, value, sub, accent, lang, onClick }: { icon: React.ReactElement; label: string; value: string | number; sub?: string; accent?: string; lang?: Lang; onClick?: () => void }) {
  const cls = lang ? kh(lang) : "";
  const extraStyle: React.CSSProperties = onClick ? { cursor: "pointer" } : {};
  return (
    // <div style={{ background: G.surface, border: `1px solid ${G.border}`, borderRadius: 14, padding: "16px 18px", display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "12px" }}>
    //   <div style={{ fontSize: 26, fontWeight: 700, color: accent || G.text, lineHeight: 1, textAlign: "right", gridColumn: "span3" }}>{value}</div>
    //   <div style={{ width: 42, height: 42, borderRadius: 9, background: G.goldSurface, border: `1px solid ${G.goldBorder}`, gridColumn: "span", display: "flex", alignItems: "center", justifyContent: "center", color: G.gold, flexShrink: 0 }}>{icon}</div>
    //   <span className={cls} style={{ color: G.muted, fontSize: 12, fontWeight: 500, gridColumn: "span4" }}>{label}</span>
    //   {sub && <div className={cls} style={{ fontSize: 11, color: G.muted }}>{sub}</div>}
    // </div>
    <div onClick={onClick} style={{ background: G.surface, border: `1px solid ${G.border}`, borderRadius: 14, padding: "16px 18px", display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "12px", alignItems: "center", ...extraStyle }}>
  
      {/* Top Left: Big Value Number */}
      <div style={{ fontSize: 26, fontWeight: 700, color: accent || G.text, lineHeight: 1 }}>
        {value}
      </div>

      {/* Top Right: Icon */}
      <div style={{ width: 42, height: 42, borderRadius: 9, background: G.goldSurface, border: `1px solid ${G.goldBorder}`, display: "flex", alignItems: "center", justifyContent: "center", color: G.gold, flexShrink: 0, justifySelf: "end" }}>
        {icon}
      </div>
      
      {/* Bottom Left: Subtext */}
      {sub ? (
        <div className={cls} style={{ fontSize: 11, color: G.muted }}>
          {sub}
        </div>
      ) : (
        <div /> // Keeps the grid cell occupied if sub is missing
      )}

      {/* Bottom Right: Label */}
      <span className={cls} style={{ color: G.muted, fontSize: 12, fontWeight: 500, justifySelf: "end", textAlign: "right" }}>
        {label}
      </span>

    </div>


  );
}
