import { useState } from "react";
import { MessageSquare, ArrowRight, ChevronUp, Shield } from "lucide-react";
import { G, type Lang } from "../palette";
import { t as T, kh } from "../i18n";
import type { DashboardData } from "../types";
import { getGroupCardsFromDashboard } from "../data";
import { SectionHeader } from "./Badges";

interface GroupsViewProps {
  dashboard: DashboardData | null;
  lang: Lang;
}

export default function GroupsView({ dashboard, lang }: GroupsViewProps) {
  const tx = T(lang);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [addToast, setAddToast] = useState(false);

  const groupCards = getGroupCardsFromDashboard(dashboard);
  const maxGroups = 5;

  function handleAdd() {
    setAddToast(true);
    setTimeout(() => setAddToast(false), 3500);
  }

  const PLACEHOLDER_SENDERS = [
    "alex_songket",
    "dara_phnompenh",
    "sreymom_dev",
    "khmer_user_02",
    "security_alert",
    "visal_kh",
    "chanth_tech",
    "nara_security",
  ];

  function getSenderPlaceholder(idx: number): string {
    return PLACEHOLDER_SENDERS[idx % PLACEHOLDER_SENDERS.length];
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {addToast && (
        <div style={{ background: G.surface2, border: `1px solid ${G.goldBorder}`, borderRadius: 10, padding: "12px 16px", fontSize: 13, color: G.textSec, textAlign: "center" }}>
          <span className={kh(lang)}>{tx.comingSoon}</span>
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <SectionHeader title={tx.myGroups} sub={`${groupCards.length} of ${maxGroups} ${tx.planSlots}`} lang={lang} />
        <button onClick={handleAdd} style={{ background: G.gold, color: "#1a1200", border: "none", borderRadius: 9, padding: "8px 16px", fontWeight: 700, cursor: "pointer", fontSize: 12 }}>
          <span className={kh(lang)}>{tx.addGroup}</span>
        </button>
      </div>

      <div style={{ background: G.surface, border: `1px solid ${G.border}`, borderRadius: 12, padding: "14px 16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
          <span className={kh(lang)} style={{ fontSize: 12, color: G.textSec }}>{tx.planUsage}</span>
          <span style={{ fontSize: 12, color: G.gold, fontWeight: 600 }}>{groupCards.length} / {maxGroups}</span>
        </div>
        <div style={{ background: G.surface2, borderRadius: 6, height: 7 }}>
          <div style={{ background: G.gold, height: "100%", borderRadius: 6, width: `${Math.min(100, (groupCards.length / maxGroups) * 100)}%` }} />
        </div>
      </div>

      {groupCards.length === 0 ? (
        <div style={{ background: G.surface, border: `1px solid ${G.border}`, borderRadius: 14, padding: "32px 20px", textAlign: "center" }}>
          <Shield size={32} color={G.muted} style={{ marginBottom: 12 }} />
          <div style={{ fontSize: 15, fontWeight: 700, color: G.text, marginBottom: 6 }}>
            <span className={kh(lang)}>{tx.noGroupsTitle}</span>
          </div>
          <div style={{ fontSize: 12, color: G.muted, maxWidth: 320, margin: "0 auto", lineHeight: 1.5 }}>
            <span className={kh(lang)}>{tx.noGroupsDesc}</span>
          </div>
        </div>
      ) : (
        groupCards.map(g => (
          <div key={g.id} style={{ background: G.surface, border: `1px solid ${g.status === "alert" ? "rgba(224,64,64,0.4)" : G.border}`, borderRadius: 14, padding: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 11, background: G.goldSurface, border: `1px solid ${G.goldBorder}`, display: "flex", alignItems: "center", justifyContent: "center", color: G.gold, flexShrink: 0 }}>
                <MessageSquare size={19} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, color: G.text, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {g.name}
                </div>
                <div style={{ fontSize: 11, color: G.muted, marginTop: 2 }}>
                  ID: {g.id} · {g.totalScanned} {tx.scanned}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", gap: 16 }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: g.threats > 0 ? G.danger : G.text }}>
                    {g.threats}
                  </div>
                  <div style={{ fontSize: 10, color: G.muted }}>
                    <span className={kh(lang)}>{tx.malicious}</span>
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: g.suspicious > 0 ? G.warn : G.text }}>
                    {g.suspicious}
                  </div>
                  <div style={{ fontSize: 10, color: G.muted }}>
                    <span className={kh(lang)}>{tx.suspicious}</span>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 600, color: g.status === "protected" ? G.safe : G.danger }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: g.status === "protected" ? G.safe : G.danger, display: "inline-block" }} />
                  <span className={kh(lang)}>{g.status === "protected" ? (lang === "km" ? "ការពារ" : "Protected") : (lang === "km" ? "ជូនដំណឹង" : "Alert")}</span>
                </div>
              </div>

              <button
                onClick={() => setExpanded(expanded === g.id ? null : g.id)}
                style={{ background: "transparent", border: `1px solid ${G.goldBorder}`, color: G.gold, borderRadius: 8, padding: "6px 14px", cursor: "pointer", fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}
              >
                <span className={kh(lang)}>{expanded === g.id ? tx.viewHide[1] : tx.viewHide[0]}</span>
                {expanded === g.id ? <ChevronUp size={12} /> : <ArrowRight size={12} />}
              </button>
            </div>

            {expanded === g.id && (
              <div style={{ borderTop: `1px solid ${G.border}`, marginTop: 14, paddingTop: 14 }}>
                <div className={kh(lang)} style={{ fontSize: 11, color: G.muted, fontWeight: 600, marginBottom: 10, letterSpacing: "0.06em" }}>
                  {tx.recentScanHistory}
                </div>
                {g.daily && g.daily.length > 0 ? (
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                      <thead>
                        <tr style={{ color: G.muted, borderBottom: `1px solid ${G.border}`, textAlign: "left" }}>
                          <th style={{ padding: "6px 4px" }}>Date</th>
                          <th style={{ padding: "6px 4px" }}>Sender</th>
                          <th style={{ padding: "6px 4px" }}>Scanned</th>
                          <th style={{ padding: "6px 4px" }}>URLs</th>
                          <th style={{ padding: "6px 4px" }}>Files</th>
                          <th style={{ padding: "6px 4px" }}>Threats</th>
                          <th style={{ padding: "6px 4px" }}>Deleted</th>
                        </tr>
                      </thead>
                      <tbody>
                        {g.daily.map((d, idx) => (
                          <tr key={idx} style={{ borderBottom: idx < g.daily.length - 1 ? `1px solid ${G.surface2}` : "none" }}>
                            <td style={{ padding: "6px 4px", fontFamily: "JetBrains Mono, monospace", color: G.text }}>{d.date}</td>
                            <td style={{ padding: "6px 4px", color: G.muted }}>@{getSenderPlaceholder(idx)}</td>
                            <td style={{ padding: "6px 4px", fontWeight: 600, color: G.text }}>{d.scanned}</td>
                            <td style={{ padding: "6px 4px", color: G.textSec }}>{d.urls}</td>
                            <td style={{ padding: "6px 4px", color: G.textSec }}>{d.files}</td>
                            <td style={{ padding: "6px 4px", color: d.malicious > 0 ? G.danger : G.safe, fontWeight: d.malicious > 0 ? 700 : 400 }}>{d.malicious}</td>
                            <td style={{ padding: "6px 4px", color: d.deleted > 0 ? G.danger : G.textSec }}>{d.deleted}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: G.safe }}>
                    <Shield size={13} /> <span className={kh(lang)}>{tx.noThreats}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}
