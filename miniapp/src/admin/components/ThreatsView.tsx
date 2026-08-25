import { useState } from "react";
import { Check } from "lucide-react";
import { G, type Lang } from "../palette";
import { t as T, kh } from "../i18n";
import { threats } from "../data";
import { SectionHeader, RiskBadge } from "./Badges";

type RiskFilter = "all" | "critical" | "high" | "medium";
type DateFilter = 0 | 1 | 2 | 3; // Today | 7 Days | 30 Days | All

const RISK_FILTERS: RiskFilter[] = ["all", "critical", "high", "medium"];

export default function ThreatsView({ lang }: { lang: Lang }) {
  const tx = T(lang);
  const [riskFilter, setRiskFilter] = useState<RiskFilter>("all");
  const [dateFilter, setDateFilter] = useState<DateFilter>(3);

  const riskLabel = (f: RiskFilter): string => {
    if (f === "all") return tx.filterAll;
    return { critical: lang === "km" ? "ធ្ងន់ធ្ងរ" : "Critical", high: lang === "km" ? "ខ្ពស់" : "High", medium: lang === "km" ? "មធ្យម" : "Medium" }[f];
  };

  const filtered = threats.filter(t => riskFilter === "all" || t.risk === riskFilter);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <SectionHeader title={tx.detectedThreats} sub={tx.autoDetected} lang={lang} />

      {/* Date filter */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {tx.dateFilters.map((label, i) => (
          <button key={i} onClick={() => setDateFilter(i as DateFilter)} style={{ padding: "5px 12px", borderRadius: 20, border: `1.5px solid ${dateFilter === i ? G.gold : G.border}`, background: dateFilter === i ? G.goldSurface : "transparent", color: dateFilter === i ? G.gold : G.muted, cursor: "pointer", fontSize: 11, fontWeight: 700, transition: "all 0.15s" }}>
            <span className={kh(lang)}>{label}</span>
          </button>
        ))}
      </div>

      {/* Risk filter */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {RISK_FILTERS.map(f => (
          <button key={f} onClick={() => setRiskFilter(f)} style={{ padding: "5px 14px", borderRadius: 20, border: `1.5px solid ${riskFilter === f ? G.gold : G.border}`, background: riskFilter === f ? G.goldSurface : "transparent", color: riskFilter === f ? G.gold : G.muted, cursor: "pointer", fontSize: 11, fontWeight: 700, transition: "all 0.15s" }}>
            <span className={kh(lang)}>{riskLabel(f)}</span>
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <div style={{ textAlign: "center", padding: "32px 0", color: G.muted, fontSize: 13 }}>
          <span className={kh(lang)}>{tx.noThreatFilter(riskFilter)}</span>
        </div>
      )}

      {filtered.map(t => (
        <div key={t.id} style={{ background: G.surface, border: `1px solid ${G.border}`, borderRadius: 13, padding: "14px 16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: G.textSec }}>{t.type}</span>
            <RiskBadge risk={t.risk} />
          </div>
          <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11, color: G.danger, marginBottom: 8, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.content}</div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: G.muted, marginBottom: 8 }}>
            <span>{t.group}</span>
            <span>{t.date}</span>
          </div>
          <div style={{ fontSize: 11, color: G.safe, fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
            <Check size={11} /> {t.action}
          </div>
        </div>
      ))}
    </div>
  );
}
