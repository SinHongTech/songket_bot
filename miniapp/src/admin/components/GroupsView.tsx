import { useState } from "react";
import { MessageSquare, ArrowRight, ChevronUp, Shield, AlertTriangle, CheckCircle, Plus, ExternalLink, X, Loader2, Trash2 } from "lucide-react";
import { G, type Lang } from "../palette";
import { t as T, kh } from "../i18n";
import type { DashboardData, ThreatEvent, CandidateGroup } from "../types";
import { getGroupCardsFromDashboard } from "../data";
import { addManagedGroup, removeManagedGroup } from "../api";
import { SectionHeader } from "./Badges";

interface GroupsViewProps {
  dashboard: DashboardData | null;
  candidateGroups?: CandidateGroup[] | null;
  threatEvents?: ThreatEvent[] | null;
  isSuperAdmin?: boolean;
  lang: Lang;
  onRefresh?: () => void;
}

export default function GroupsView({
  dashboard,
  candidateGroups,
  threatEvents,
  isSuperAdmin,
  lang,
  onRefresh,
}: GroupsViewProps) {
  const tx = T(lang);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [linkingId, setLinkingId] = useState<number | null>(null);
  const [unlinkingId, setUnlinkingId] = useState<number | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const groupCards = getGroupCardsFromDashboard(dashboard);
  const maxGroups = 5;
  const isKm = lang === "km";

  const candidates = candidateGroups || [];

  async function handleLinkGroup(g: CandidateGroup) {
    setLinkingId(g.id);
    try {
      const res = await addManagedGroup(g.id, g.title);
      if (res && res.ok) {
        setToastMsg(isKm ? `✅ បានភ្ជាប់ក្រុម "${g.title}" ជោគជ័យ!` : `✅ Successfully linked "${g.title}"!`);
        setTimeout(() => setToastMsg(null), 3500);
        setShowAddModal(false);
        onRefresh?.();
      } else {
        setToastMsg(res?.error || (isKm ? "❌ ការភ្ជាប់បានបរាជ័យ" : "❌ Failed to link group"));
        setTimeout(() => setToastMsg(null), 3500);
      }
    } catch (err: any) {
      setToastMsg(err?.message || "❌ Error linking group");
      setTimeout(() => setToastMsg(null), 3500);
    } finally {
      setLinkingId(null);
    }
  }

  async function handleUnlinkGroup(groupId: number, groupTitle: string) {
    const confirmed = window.confirm(
      isKm
        ? `តើអ្នកពិតជាចង់ដកក្រុម "${groupTitle}" ចេញពីការការពារមែនទេ?`
        : `Are you sure you want to unlink and remove protection for "${groupTitle}"?`
    );
    if (!confirmed) return;
    setUnlinkingId(groupId);
    try {
      const res = await removeManagedGroup(groupId);
      if (res && res.ok) {
        setToastMsg(isKm ? `✅ បានដកក្រុម "${groupTitle}" ជោគជ័យ!` : `✅ Successfully unlinked "${groupTitle}"!`);
        setTimeout(() => setToastMsg(null), 3500);
        onRefresh?.();
      } else {
        setToastMsg(res?.error || (isKm ? "❌ ការដកក្រុមបានបរាជ័យ" : "❌ Failed to unlink group"));
        setTimeout(() => setToastMsg(null), 3500);
      }
    } catch (err: any) {
      setToastMsg(err?.message || "❌ Error unlinking group");
      setTimeout(() => setToastMsg(null), 3500);
    } finally {
      setUnlinkingId(null);
    }
  }

  function handleOpenTelegramBot() {
    // Open Telegram add group link
    const botUrl = "https://t.me/songket_beyda_bot?startgroup=link";
    if (typeof window !== "undefined") {
      const tg = (window as any).Telegram?.WebApp;
      if (tg && typeof tg.openTelegramLink === "function") {
        try {
          tg.openTelegramLink(botUrl);
          return;
        } catch {}
      }
      window.open(botUrl, "_blank");
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {toastMsg && (
        <div style={{ background: G.surface2, border: `1px solid ${G.goldBorder}`, borderRadius: 10, padding: "12px 16px", fontSize: 13, color: G.text, textAlign: "center", fontWeight: 600 }}>
          <span className={kh(lang)}>{toastMsg}</span>
        </div>
      )}

      {/* ── Add Group Modal ── */}
      {showAddModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.7)",
            backdropFilter: "blur(4px)",
            zIndex: 999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
        >
          <div
            style={{
              background: G.surface,
              border: `1px solid ${G.goldBorder}`,
              borderRadius: 16,
              maxWidth: 440,
              width: "100%",
              padding: 20,
              display: "flex",
              flexDirection: "column",
              gap: 16,
              boxShadow: "0 20px 50px rgba(0,0,0,0.5)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700, color: G.gold, fontSize: 15 }}>
                <Plus size={18} />
                <span className={kh(lang)}>{isKm ? "ភ្ជាប់ក្រុមថ្មី (Add & Link Group)" : "Link Telegram Group"}</span>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                style={{ background: "transparent", border: "none", color: G.muted, cursor: "pointer", padding: 4 }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Candidate Groups Detected */}
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: G.text, marginBottom: 8 }}>
                <span className={kh(lang)}>
                  {isKm
                    ? `🔍 ក្រុមដែល Bot បានចូលរួម (${candidates.length} ក្រុមត្រូវបានរកឃើញ)`
                    : `🔍 Candidate Groups with Bot Present (${candidates.length} detected)`}
                </span>
              </div>

              {candidates.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 200, overflowY: "auto" }}>
                  {candidates.map((cg) => (
                    <div
                      key={cg.id}
                      style={{
                        background: G.surface2,
                        border: `1px solid ${G.border}`,
                        borderRadius: 10,
                        padding: "10px 12px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 10,
                      }}
                    >
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: G.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          👥 {cg.title}
                        </div>
                      </div>
                      <button
                        onClick={() => handleLinkGroup(cg)}
                        disabled={linkingId === cg.id}
                        style={{
                          background: G.gold,
                          color: "#1a1200",
                          border: "none",
                          borderRadius: 8,
                          padding: "6px 12px",
                          fontWeight: 700,
                          fontSize: 11,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                          flexShrink: 0,
                        }}
                      >
                        {linkingId === cg.id ? (
                          <Loader2 size={13} className="animate-spin" />
                        ) : (
                          <Plus size={13} />
                        )}
                        <span className={kh(lang)}>{isKm ? "ភ្ជាប់" : "Link"}</span>
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div
                  style={{
                    background: G.surface2,
                    border: `1px solid ${G.border}`,
                    borderRadius: 10,
                    padding: "14px",
                    fontSize: 12,
                    color: G.textSec,
                    lineHeight: 1.5,
                  }}
                >
                  <span className={kh(lang)}>
                    {isKm
                      ? "មិនទាន់មានក្រុមថ្មីដែល Bot បានចូលរួមនៅឡើយទេ។ សូម Add Bot ទៅក្នុងក្រុមរបស់អ្នកជា Administrator ជាមុនសិន។"
                      : "No unlinked groups detected. Please add @SongketSecurityBot as an Admin to your Telegram group first."}
                  </span>
                </div>
              )}
            </div>

            {/* Step 2: Add Bot to new Telegram Group */}
            <div style={{ borderTop: `1px solid ${G.border}`, paddingTop: 14 }}>
              <div style={{ fontSize: 11, color: G.muted, marginBottom: 10, lineHeight: 1.4 }}>
                <span className={kh(lang)}>
                  {isKm
                    ? "💡 ដើម្បីការពារក្រុមថ្មី៖ ចុចប៊ូតុងខាងក្រោមដើម្បី Add Bot ទៅកាន់ Telegram Group របស់អ្នកជា Administrator រួចត្រឡប់មកទីនេះវិញ។"
                    : "💡 To protect a new group: Add the bot as Admin to your Telegram group, then return here to link it."}
                </span>
              </div>
              <button
                onClick={handleOpenTelegramBot}
                style={{
                  width: "100%",
                  background: G.surface2,
                  border: `1px solid ${G.goldBorder}`,
                  color: G.gold,
                  borderRadius: 10,
                  padding: "10px 16px",
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                }}
              >
                <ExternalLink size={15} />
                <span className={kh(lang)}>
                  {isKm ? "បន្ថែម Bot ទៅកាន់ Group ថ្មី (Open Telegram)" : "Add Bot to Telegram Group"}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <SectionHeader title={tx.myGroups} sub={`${groupCards.length} of ${maxGroups} ${tx.planSlots}`} lang={lang} />
        <button
          onClick={() => setShowAddModal(true)}
          style={{
            background: G.gold,
            color: "#1a1200",
            border: "none",
            borderRadius: 9,
            padding: "8px 16px",
            fontWeight: 700,
            cursor: "pointer",
            fontSize: 12,
            display: "flex",
            alignItems: "center",
            gap: 5,
          }}
        >
          <Plus size={14} />
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
        groupCards.map(g => {
          // Real threats for this specific group
          const gThreats = (threatEvents || []).filter(
            t => (t.group_id && String(t.group_id) === String(g.id)) || (t.group_title && t.group_title === g.name)
          );

          return (
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
                    {g.totalScanned} {tx.scanned}
                  </div>
                </div>
                <button
                  onClick={() => handleUnlinkGroup(g.id, g.name)}
                  disabled={unlinkingId === g.id}
                  style={{
                    background: "rgba(224,64,64,0.1)",
                    border: "1px solid rgba(224,64,64,0.25)",
                    color: G.danger,
                    borderRadius: 8,
                    padding: "6px 10px",
                    cursor: "pointer",
                    fontSize: 11,
                    fontWeight: 700,
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    flexShrink: 0,
                  }}
                  title={isKm ? "ដកក្រុមចេញ (Unlink Group)" : "Unlink Group"}
                >
                  {unlinkingId === g.id ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <Trash2 size={12} />
                  )}
                  <span className={kh(lang)}>{isKm ? "ដកចេញ" : "Unlink"}</span>
                </button>
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
                <div style={{ borderTop: `1px solid ${G.border}`, marginTop: 14, paddingTop: 14, display: "flex", flexDirection: "column", gap: 14 }}>
                  {/* 1. Real Malicious Scan Logs */}
                  <div>
                    <div className={kh(lang)} style={{ fontSize: 12, color: G.gold, fontWeight: 700, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                      <AlertTriangle size={14} color={G.gold} />
                      <span>{isKm ? "អ្នកប្រើប្រាស់ដែលបានផ្ញើតំណភ្ជាប់/ឯកសារគ្រោះថ្នាក់ (Real Scan Logs)" : "Detected Senders & Malicious Content"}</span>
                    </div>

                    {gThreats.length > 0 ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {gThreats.map((t, tIdx) => {
                          const senderLabel = t.sender_username
                            ? `@${t.sender_username}`
                            : t.sender_name || "User";
                          return (
                            <div
                              key={t.id || tIdx}
                              style={{
                                background: G.surface2,
                                border: `1px solid ${t.risk === "critical" ? "rgba(224,64,64,0.3)" : G.border}`,
                                borderRadius: 8,
                                padding: "8px 12px",
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                flexWrap: "wrap",
                                gap: 6,
                              }}
                            >
                              <div style={{ minWidth: 0 }}>
                                <div style={{ fontSize: 12, fontWeight: 700, color: G.text, display: "flex", alignItems: "center", gap: 6 }}>
                                  <span style={{ color: G.gold }}>{senderLabel}</span>
                                  {isSuperAdmin && t.sender_id && (
                                    <span style={{ fontSize: 10, color: G.muted, fontFamily: "JetBrains Mono, monospace" }}>({t.sender_id})</span>
                                  )}
                                </div>
                                <div style={{ fontSize: 11, color: G.textSec, marginTop: 2, fontFamily: "JetBrains Mono, monospace", wordBreak: "break-all" }}>
                                  {t.content}
                                </div>
                              </div>
                              <div style={{ textAlign: "right", flexShrink: 0 }}>
                                <span
                                  style={{
                                    fontSize: 10,
                                    fontWeight: 700,
                                    padding: "2px 6px",
                                    borderRadius: 4,
                                    background: t.risk === "critical" ? "rgba(224,64,64,0.18)" : "rgba(208,120,32,0.18)",
                                    color: t.risk === "critical" ? G.danger : G.warn,
                                  }}
                                >
                                  {t.risk ? t.risk.toUpperCase() : "ALERT"}
                                </span>
                                <div style={{ fontSize: 9, color: G.muted, marginTop: 2 }}>
                                  {t.date} {t.time || ""}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div style={{ background: G.surface2, border: `1px solid ${G.border}`, borderRadius: 8, padding: "10px 14px", fontSize: 12, color: G.safe, display: "flex", alignItems: "center", gap: 6 }}>
                        <CheckCircle size={14} />
                        <span className={kh(lang)}>{isKm ? "គ្មានសកម្មភាពមេរោគក្នុងក្រុមនេះទេ" : "No malicious threats detected in this group"}</span>
                      </div>
                    )}
                  </div>

                  {/* 2. Daily Scan Activity Table */}
                  <div>
                    <div className={kh(lang)} style={{ fontSize: 11, color: G.muted, fontWeight: 600, marginBottom: 8, letterSpacing: "0.06em" }}>
                      {tx.recentScanHistory}
                    </div>
                    {g.daily && g.daily.length > 0 ? (
                      <div style={{ overflowX: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                          <thead>
                            <tr style={{ color: G.muted, borderBottom: `1px solid ${G.border}`, textAlign: "left" }}>
                              <th style={{ padding: "6px 4px" }}>Date</th>
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
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
