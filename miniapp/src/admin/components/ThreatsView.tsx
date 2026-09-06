import { useState } from "react";
import { Check, Shield } from "lucide-react";
import { G, type Lang } from "../palette";
import { t as T, kh } from "../i18n";
import type { DashboardData } from "../types";
import { getThreatsListFromDashboard } from "../data";
import { SectionHeader, RiskBadge } from "./Badges";

type RiskFilter = "all" | "critical" | "high" | "medium";

interface ThreatsViewProps {
  dashboard: DashboardData | null;
  lang: Lang;
  dateFrom: string;
  dateTo: string;
  onDateChange: (from: string, to: string) => void;
}

const RISK_FILTERS: RiskFilter[] = ["all", "critical", "high", "medium"];

export default function ThreatsView({ dashboard, lang, dateFrom, dateTo, onDateChange }: ThreatsViewProps) {
  const tx = T(lang);
  const [riskFilter, setRiskFilter] = useState<RiskFilter>("all");

  const riskLabel = (f: RiskFilter): string => {
    if (f === "all") return tx.filterAll;
    return { critical: lang === "km" ? "ធ្ងន់ធ្ងរ" : "Critical", high: lang === "km" ? "ខ្ពស់" : "High", medium: lang === "km" ? "មធ្យម" : "Medium" }[f];
  };

  const threats = getThreatsListFromDashboard(dashboard);
  const filtered = threats.filter(t => {
    const inDateRange = t.date >= dateFrom && t.date <= dateTo;
    const inRisk = riskFilter === "all" || t.risk === riskFilter;
    return inDateRange && inRisk;
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <SectionHeader title={tx.detectedThreats} sub={tx.autoDetected} lang={lang} />

      {/* Date filter */}
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 3, flex: 1 }}>
          <span style={{ fontSize: 10, fontWeight: 600, color: G.muted }}>
            <span className={kh(lang)}>{tx.fromDate}</span>
          </span>
          <input
            type="date"
            value={dateFrom}
            onChange={e => onDateChange(e.target.value, dateTo)}
            style={{
              padding: "6px 8px",
              borderRadius: 8,
              border: `1px solid ${G.border}`,
              background: G.surface,
              color: G.text,
              fontSize: 12,
              fontFamily: "inherit",
              outline: "none",
            }}
          />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 3, flex: 1 }}>
          <span style={{ fontSize: 10, fontWeight: 600, color: G.muted }}>
            <span className={kh(lang)}>{tx.toDate}</span>
          </span>
          <input
            type="date"
            value={dateTo}
            onChange={e => onDateChange(dateFrom, e.target.value)}
            style={{
              padding: "6px 8px",
              borderRadius: 8,
              border: `1px solid ${G.border}`,
              background: G.surface,
              color: G.text,
              fontSize: 12,
              fontFamily: "inherit",
              outline: "none",
            }}
          />
        </div>
      </div>

      {/* Risk filter */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {RISK_FILTERS.map(f => (
          <button
            key={f}
            onClick={() => setRiskFilter(f)}
            style={{
              padding: "5px 14px",
              borderRadius: 20,
              border: `1.5px solid ${riskFilter === f ? G.gold : G.border}`,
              background: riskFilter === f ? G.goldSurface : "transparent",
              color: riskFilter === f ? G.gold : G.muted,
              cursor: "pointer",
              fontSize: 11,
              fontWeight: 700,
              transition: "all 0.15s",
            }}
          >
            <span className={kh(lang)}>{riskLabel(f)}</span>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div style={{ background: G.surface, border: `1px solid ${G.border}`, borderRadius: 14, padding: "32px 20px", textAlign: "center" }}>
          <Shield size={32} color={G.safe} style={{ marginBottom: 12 }} />
          <div style={{ fontSize: 14, fontWeight: 600, color: G.text, marginBottom: 4 }}>
            <span className={kh(lang)}>{tx.noThreatFilter(riskFilter)}</span>
          </div>
          <div style={{ fontSize: 12, color: G.muted }}>
            <span className={kh(lang)}>{tx.noThreats}</span>
          </div>
        </div>
      ) : (
        filtered.map(t => (
          <div key={t.id} style={{ background: G.surface, border: `1px solid ${G.border}`, borderRadius: 13, padding: "14px 16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: G.textSec }}>{t.type}</span>
              <RiskBadge risk={t.risk} />
            </div>
            <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11, color: t.risk === "critical" ? G.danger : G.warn, marginBottom: 8, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {t.content}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: G.muted, marginBottom: 8 }}>
              <span>{t.group}</span>
              <span>{t.date}</span>
            </div>
            <div style={{ fontSize: 11, color: G.safe, fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
              <Check size={11} /> {t.action}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
