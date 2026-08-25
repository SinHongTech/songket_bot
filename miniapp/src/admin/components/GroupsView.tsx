import { useState } from "react";
import { MessageSquare, ArrowRight, ChevronUp, Shield, Check, AlertTriangle } from "lucide-react";
import { G, type Lang } from "../palette";
import { t as T, kh } from "../i18n";
import { groups } from "../data";
import { SectionHeader } from "./Badges";

const GROUP_HISTORY: Record<number, { date: string; type: string; result: string }[]> = {
  1: [{ date: "14:02", type: "URL", result: "threat" }, { date: "13:20", type: "File", result: "clean" }, { date: "12:45", type: "URL", result: "clean" }],
  2: [{ date: "08:10", type: "Text", result: "clean" }],
  3: [],
  4: [{ date: "14:01", type: "File", result: "threat" }, { date: "13:31", type: "URL", result: "threat" }, { date: "11:05", type: "Media", result: "clean" }],
};

export default function GroupsView({ lang }: { lang: Lang }) {
  const tx = T(lang);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [addToast, setAddToast] = useState(false);

  function handleAdd() {
    setAddToast(true);
    setTimeout(() => setAddToast(false), 2500);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {addToast && (
        <div style={{ background: G.surface2, border: `1px solid ${G.goldBorder}`, borderRadius: 10, padding: "12px 16px", fontSize: 13, color: G.textSec, textAlign: "center" }}>
          <span className={kh(lang)}>{tx.comingSoon}</span>
        </div>
      )}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <SectionHeader title={tx.myGroups} sub={tx.planSlots} lang={lang} />
        <button onClick={handleAdd} style={{ background: G.gold, color: "#1a1200", border: "none", borderRadius: 9, padding: "8px 16px", fontWeight: 700, cursor: "pointer", fontSize: 12 }}>
          <span className={kh(lang)}>{tx.addGroup}</span>
        </button>
      </div>
      <div style={{ background: G.surface, border: `1px solid ${G.border}`, borderRadius: 12, padding: "14px 16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
          <span className={kh(lang)} style={{ fontSize: 12, color: G.textSec }}>{tx.planUsage}</span>
          <span style={{ fontSize: 12, color: G.gold, fontWeight: 600 }}>4 / 5</span>
        </div>
        <div style={{ background: G.surface2, borderRadius: 6, height: 7 }}>
          <div style={{ background: G.gold, height: "100%", borderRadius: 6, width: "80%" }} />
        </div>
      </div>
      {groups.map(g => (
        <div key={g.id} style={{ background: G.surface, border: `1px solid ${g.status === "alert" ? "rgba(224,64,64,0.4)" : G.border}`, borderRadius: 14, padding: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 11, background: G.goldSurface, border: `1px solid ${G.goldBorder}`, display: "flex", alignItems: "center", justifyContent: "center", color: G.gold, flexShrink: 0 }}>
              <MessageSquare size={19} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, color: G.text, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{g.name}</div>
              <div style={{ fontSize: 11, color: G.muted, marginTop: 2 }}>{g.members.toLocaleString()} members · {g.lastScan}</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", gap: 16 }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: g.threats > 5 ? G.danger : G.text }}>{g.threats}</div>
                <div style={{ fontSize: 10, color: G.muted }}><span className={kh(lang)}>{lang === "km" ? "គ្រោះថ្នាក់" : "threats"}</span></div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 600, color: g.status === "protected" ? G.safe : G.danger }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: g.status === "protected" ? G.safe : G.danger, display: "inline-block" }} />
                <span className={kh(lang)}>{g.status === "protected" ? (lang === "km" ? "ការពារ" : "Protected") : (lang === "km" ? "ជូនដំណឹង" : "Alert")}</span>
              </div>
            </div>
            <button onClick={() => setExpanded(expanded === g.id ? null : g.id)} style={{ background: "transparent", border: `1px solid ${G.goldBorder}`, color: G.gold, borderRadius: 8, padding: "6px 14px", cursor: "pointer", fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
              <span className={kh(lang)}>{expanded === g.id ? tx.viewHide[1] : tx.viewHide[0]}</span>
              {expanded === g.id ? <ChevronUp size={12} /> : <ArrowRight size={12} />}
            </button>
          </div>
          {expanded === g.id && (
            <div style={{ borderTop: `1px solid ${G.border}`, marginTop: 14, paddingTop: 14 }}>
              <div className={kh(lang)} style={{ fontSize: 11, color: G.muted, fontWeight: 600, marginBottom: 10, letterSpacing: "0.06em" }}>{tx.recentScanHistory}</div>
              {GROUP_HISTORY[g.id]?.length ? GROUP_HISTORY[g.id].map((h, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: i < GROUP_HISTORY[g.id].length - 1 ? `1px solid ${G.border}` : "none" }}>
                  <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 10, color: G.muted }}>{h.date}</span>
                  <span style={{ background: G.goldSurface, color: G.gold, border: `1px solid ${G.goldBorder}`, borderRadius: 5, padding: "1px 7px", fontSize: 10, fontWeight: 600 }}>{h.type}</span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: h.result === "clean" ? G.safe : G.danger }}>{h.result === "clean" ? <><Check size={11} style={{ marginRight: 2 }} /> Clean</> : <><AlertTriangle size={11} style={{ marginRight: 2 }} /> Threat</>}</span>
                </div>
              )) : (
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: G.safe }}>
                  <Shield size={13} /> <span className={kh(lang)}>{tx.noThreats}</span>
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
