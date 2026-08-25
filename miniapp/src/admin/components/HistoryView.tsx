import { useState } from "react";
import { G, type Lang } from "../palette";
import { t as T, kh } from "../i18n";
import type { DashboardData } from "../types";
import { getScanHistoryFromDashboard } from "../data";
import { SectionHeader, ResultBadge } from "./Badges";

type TypeFilter = "all" | "URL" | "File" | "All";

interface HistoryViewProps {
  dashboard: DashboardData | null;
  lang: Lang;
  days: number;
  onDaysChange: (d: number) => void;
}

const TYPE_FILTERS: TypeFilter[] = ["all", "URL", "File"];
const DAY_OPTIONS = [1, 7, 14, 30];

export default function HistoryView({ dashboard, lang, days, onDaysChange }: HistoryViewProps) {
  const tx = T(lang);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");

  const scanHistory = getScanHistoryFromDashboard(dashboard);

  const filtered = scanHistory.filter(s => {
    const matchText =
      s.group.toLowerCase().includes(query.toLowerCase()) ||
      s.content.toLowerCase().includes(query.toLowerCase()) ||
      s.date.includes(query);
    const matchType = typeFilter === "all" || s.type === typeFilter;
    return matchText && matchType;
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <SectionHeader title={tx.scanHistory} sub={tx.everyMessage} lang={lang} />

      <input
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder={lang === "km" ? "ស្វែងរកក្រុម ឬកាលបរិច្ឆេទ…" : "Search group, date, or content…"}
        style={{
          background: G.surface,
          border: `1px solid ${G.border}`,
          borderRadius: 8,
          padding: "10px 14px",
          color: G.text,
          fontSize: 13,
          outline: "none",
          width: "100%",
          fontFamily: lang === "km" ? "'Kantumruy Pro', sans-serif" : "Outfit, sans-serif",
        }}
      />

      {/* Date filter */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {tx.dateFilters.map((label, i) => {
          const dVal = DAY_OPTIONS[i] || 7;
          const active = days === dVal;
          return (
            <button
              key={i}
              onClick={() => onDaysChange(dVal)}
              style={{
                padding: "5px 12px",
                borderRadius: 20,
                border: `1.5px solid ${active ? G.gold : G.border}`,
                background: active ? G.goldSurface : "transparent",
                color: active ? G.gold : G.muted,
                cursor: "pointer",
                fontSize: 11,
                fontWeight: 700,
                transition: "all 0.15s",
              }}
            >
              <span className={kh(lang)}>{label}</span>
            </button>
          );
        })}
      </div>

      {/* Type filter */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {TYPE_FILTERS.map(f => (
          <button
            key={f}
            onClick={() => setTypeFilter(f)}
            style={{
              padding: "5px 12px",
              borderRadius: 20,
              border: `1.5px solid ${typeFilter === f ? G.gold : G.border}`,
              background: typeFilter === f ? G.goldSurface : "transparent",
              color: typeFilter === f ? G.gold : G.muted,
              cursor: "pointer",
              fontSize: 11,
              fontWeight: 700,
              transition: "all 0.15s",
            }}
          >
            <span className={kh(lang)}>{f === "all" ? tx.filterAll : f}</span>
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <div style={{ textAlign: "center", padding: "24px 0", color: G.muted, fontSize: 13 }}>
          <span className={kh(lang)}>{tx.noResults}</span>
        </div>
      )}

      {filtered.map((s, i) => (
        <div key={i} style={{ background: G.surface, border: `1px solid ${G.border}`, borderRadius: 12, padding: "12px 14px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 10, color: G.muted }}>{s.date}</span>
            <ResultBadge result={s.result} />
          </div>
          <div style={{ fontSize: 13, color: G.text, marginBottom: 3, fontWeight: 500 }}>
            {s.content}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: G.muted }}>
            <span>{s.group}</span>
            <span style={{ background: G.goldSurface, color: G.gold, border: `1px solid ${G.goldBorder}`, borderRadius: 5, padding: "1px 7px", fontSize: 10, fontWeight: 600 }}>
              {s.type}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
