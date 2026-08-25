import { useState } from "react";
import { Shield, Search, AlertTriangle, Link } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { G, HEX, type Lang } from "../palette";
import { t as T, kh } from "../i18n";
import { threatTimeline, threatTypes, PIE_COLORS, threats } from "../data";
import { StatCard, RiskBadge } from "./Badges";

export default function HomeView({ lang }: { lang: Lang }) {
  const tx = T(lang);
  const [expandedThreat, setExpandedThreat] = useState<number | null>(null);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ background: G.surface2, border: `1px solid ${G.goldBorder}`, borderRadius: 14, padding: "18px 20px" }}>
        <div style={{ fontSize: 17, fontWeight: 700, color: G.text }}><span className={kh(lang)}>{tx.goodAfternoon}</span></div>
        <div style={{ fontSize: 13, color: G.textSec, marginTop: 4 }}><span className={kh(lang)}>{tx.monitored}</span></div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <StatCard icon={<Shield size={17} />} label={tx.groupsLabel} value={4} sub="4/5" lang={lang} />
        <StatCard icon={<Search size={17} />} label={tx.scansToday} value="768" sub="+12%" lang={lang} />
        <StatCard icon={<AlertTriangle size={17} />} label={tx.deletedFile} value={41} sub="" accent={G.warn} lang={lang} />
        <StatCard icon={<Link size={17} />} label={tx.urlBlocked} value="128" sub="" lang={lang} />
      </div>

      <div style={{ background: G.surface, border: `1px solid ${G.border}`, borderRadius: 14, padding: "16px 14px" }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: G.textSec, marginBottom: 14 }}><span className={kh(lang)}>{tx.threatActivity}</span></div>
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={threatTimeline} margin={{ left: -20, right: 4 }}>
            <defs>
              <linearGradient id="tGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={HEX.danger} stopOpacity={0.3} />
                <stop offset="95%" stopColor={HEX.danger} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="sGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={HEX.gold} stopOpacity={0.2} />
                <stop offset="95%" stopColor={HEX.gold} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={HEX.border} />
            <XAxis dataKey="day" stroke={HEX.muted} tick={{ fontSize: 10 }} />
            <YAxis stroke={HEX.muted} tick={{ fontSize: 10 }} />
            <Tooltip contentStyle={{ background: HEX.surface2, border: `1px solid ${HEX.goldBorder}`, borderRadius: 8, color: HEX.text, fontSize: 12 }} />
            <Area type="monotone" dataKey="scans" stroke={HEX.gold} strokeWidth={2} fill="url(#sGrad)" name="Scans" />
            <Area type="monotone" dataKey="threats" stroke={HEX.danger} strokeWidth={2} fill="url(#tGrad)" name="Threats" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div style={{ background: G.surface, border: `1px solid ${G.border}`, borderRadius: 14, padding: "16px 14px" }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: G.textSec, marginBottom: 14 }}><span className={kh(lang)}>{tx.threatBreakdown}</span></div>
        <ResponsiveContainer width="100%" height={190}>
          <PieChart>
            <Pie data={threatTypes} cx="50%" cy="45%" innerRadius={50} outerRadius={75} dataKey="value" paddingAngle={3}>
              {threatTypes.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
            </Pie>
            <Tooltip contentStyle={{ background: HEX.surface2, border: `1px solid ${HEX.goldBorder}`, borderRadius: 8, color: HEX.text, fontSize: 12 }} />
            <Legend iconSize={8} wrapperStyle={{ fontSize: 11, color: HEX.textSec }} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: G.textSec, marginBottom: 8 }}><span className={kh(lang)}>{tx.recentThreats}</span></div>
        {threats.slice(0, 3).map(tr => (
          <div key={tr.id} style={{ background: G.surface, border: `1px solid ${G.border}`, borderRadius: 12, padding: "12px 14px", marginBottom: 8, cursor: "pointer" }}
            onClick={() => setExpandedThreat(expandedThreat === tr.id ? null : tr.id)}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: G.textSec }}>{tr.type}</span>
              <RiskBadge risk={tr.risk} />
            </div>
            <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11, color: G.danger, marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tr.content}</div>
            {expandedThreat === tr.id ? (
              <div style={{ borderTop: `1px solid ${G.border}`, paddingTop: 10, marginTop: 6, display: "grid", gap: 5 }}>
                {[["group", tr.group], ["time", tr.date], ["action", tr.action]].map(([k, v]) => (
                  <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                    <span className={kh(lang)} style={{ color: G.muted }}>{tx[k as "group" | "time" | "action"]}</span>
                    <span style={{ color: k === "action" ? G.safe : G.text, fontWeight: k === "action" ? 600 : 400 }}>{v}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: G.muted }}>
                <span>{tr.group}</span>
                <span style={{ color: G.safe }}>{tr.action}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
