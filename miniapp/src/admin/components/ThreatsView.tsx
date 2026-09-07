import { useState } from "react";
import { Check, Shield, Download, User, AlertOctagon } from "lucide-react";
import { G, type Lang } from "../palette";
import { t as T, kh } from "../i18n";
import type { DashboardData, ThreatEvent } from "../types";
import { getThreatsListFromDashboard } from "../data";
import { SectionHeader, RiskBadge } from "./Badges";

type RiskFilter = "all" | "critical" | "high" | "medium";

interface ThreatsViewProps {
  dashboard: DashboardData | null;
  threatEvents?: ThreatEvent[];
  isSuperAdmin?: boolean;
  lang: Lang;
  dateFrom: string;
  dateTo: string;
  onDateChange: (from: string, to: string) => void;
}

const RISK_FILTERS: RiskFilter[] = ["all", "critical", "high", "medium"];

export default function ThreatsView({
  dashboard,
  threatEvents,
  isSuperAdmin = false,
  lang,
  dateFrom,
  dateTo,
  onDateChange,
}: ThreatsViewProps) {
  const tx = T(lang);
  const [riskFilter, setRiskFilter] = useState<RiskFilter>("all");

  const riskLabel = (f: RiskFilter): string => {
    if (f === "all") return tx.filterAll;
    return {
      critical: lang === "km" ? "ធ្ងន់ធ្ងរ" : "Critical",
      high: lang === "km" ? "ខ្ពស់" : "High",
      medium: lang === "km" ? "មធ្យម" : "Medium",
    }[f];
  };

  // Combine real threat events from API or fallback to dashboard aggregate threats
  const allEvents: any[] =
    threatEvents && threatEvents.length > 0
      ? threatEvents.map(e => ({
          id: e.id,
          timestamp: e.timestamp,
          date: e.date,
          time: e.time,
          type: e.type.replace(/_/g, " ").toUpperCase(),
          content: e.content,
          sender_name: e.sender_name,
          sender_username: e.sender_username,
          sender_id: e.sender_id,
          group: e.group_title || (e.group_id ? `Group ${e.group_id}` : "Unknown Group"),
          group_title: e.group_title,
          group_id: e.group_id,
          action: e.action_taken ? `Action: ${e.action_taken}` : "Message deleted",
          action_taken: e.action_taken,
          risk: e.risk || "critical",
        }))
      : getThreatsListFromDashboard(dashboard);

  const filtered = allEvents.filter(t => {
    const inDateRange = !t.date || (t.date >= dateFrom && t.date <= dateTo);
    const inRisk = riskFilter === "all" || t.risk === riskFilter;
    return inDateRange && inRisk;
  });

  function handleExportCSV() {
    if (!filtered.length) return;
    const headers = [
      "ID",
      "Date",
      "Time",
      "Threat Type",
      "Risk",
      "Target Content",
      "Sender Name",
      "Sender Username",
      ...(isSuperAdmin ? ["Sender ID"] : []),
      "Group Name",
      ...(isSuperAdmin ? ["Group ID"] : []),
      "Action",
    ];

    const rows = filtered.map(t => [
      t.id || "",
      t.date || "",
      t.time || "",
      `"${(t.type || "").replace(/"/g, '""')}"`,
      t.risk || "",
      `"${(t.content || "").replace(/"/g, '""')}"`,
      `"${(t.sender_name || "").replace(/"/g, '""')}"`,
      t.sender_username ? `@${t.sender_username}` : "",
      ...(isSuperAdmin ? [t.sender_id || ""] : []),
      `"${(t.group_title || t.group || "").replace(/"/g, '""')}"`,
      ...(isSuperAdmin ? [t.group_id || ""] : []),
      `"${(t.action_taken || t.action || "").replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8,\uFEFF" +
      [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `songket_threats_audit_${dateFrom}_${dateTo}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <SectionHeader title={tx.detectedThreats} sub={tx.autoDetected} lang={lang} />
        {filtered.length > 0 && (
          <button
            onClick={handleExportCSV}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: G.goldSurface,
              color: G.gold,
              border: `1px solid ${G.goldBorder}`,
              borderRadius: 8,
              padding: "6px 12px",
              fontSize: 11,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            <Download size={13} />
            <span className={kh(lang)}>{lang === "km" ? "ទាញយក CSV" : "Export CSV"}</span>
          </button>
        )}
      </div>

      {/* Date filter (1-day default) */}
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
        <div
          style={{
            background: G.surface,
            border: `1px solid ${G.border}`,
            borderRadius: 14,
            padding: "32px 20px",
            textAlign: "center",
          }}
        >
          <Shield size={32} color={G.safe} style={{ marginBottom: 12 }} />
          <div style={{ fontSize: 14, fontWeight: 600, color: G.text, marginBottom: 4 }}>
            <span className={kh(lang)}>{tx.noThreatFilter(riskFilter)}</span>
          </div>
          <div style={{ fontSize: 12, color: G.muted }}>
            <span className={kh(lang)}>{tx.noThreats}</span>
          </div>
        </div>
      ) : (
        filtered.map(t => {
          // Format sender label: Username / Name only (no numeric IDs)
          let senderDisplay = "";
          if (t.sender_name || t.sender_username) {
            const uname = t.sender_username ? `@${t.sender_username}` : "";
            const name = t.sender_name || "";
            senderDisplay = uname ? (name && name !== uname ? `${name} (${uname})` : uname) : name;
          }

          // Format group label: Group Name only (no numeric IDs)
          const groupDisplay = t.group_title || t.group || "Group";

          return (
            <div
              key={t.id}
              style={{
                background: G.surface,
                border: `1px solid ${t.risk === "critical" ? "rgba(224,64,64,0.3)" : G.border}`,
                borderRadius: 13,
                padding: "14px 16px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  marginBottom: 8,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <AlertOctagon
                    size={14}
                    color={t.risk === "critical" ? G.danger : G.warn}
                  />
                  <span style={{ fontSize: 13, fontWeight: 700, color: G.textSec }}>
                    {t.type}
                  </span>
                </div>
                <RiskBadge risk={t.risk} />
              </div>

              <div
                style={{
                  fontFamily: "JetBrains Mono, monospace",
                  fontSize: 11,
                  color: t.risk === "critical" ? G.danger : G.warn,
                  marginBottom: 8,
                  wordBreak: "break-all",
                  background: "rgba(0,0,0,0.2)",
                  padding: "6px 8px",
                  borderRadius: 6,
                }}
              >
                {t.content}
              </div>

              {senderDisplay && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    fontSize: 11,
                    color: G.gold,
                    marginBottom: 6,
                    fontWeight: 600,
                  }}
                >
                  <User size={12} />
                  <span>{senderDisplay}</span>
                </div>
              )}

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 11,
                  color: G.muted,
                  marginBottom: 8,
                }}
              >
                <span>👥 {groupDisplay}</span>
                <span>🕒 {t.time ? `${t.date} ${t.time}` : t.date}</span>
              </div>

              <div
                style={{
                  fontSize: 11,
                  color: G.safe,
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <Check size={11} /> {t.action}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

