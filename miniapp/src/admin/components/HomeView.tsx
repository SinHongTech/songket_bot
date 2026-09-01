import { useState } from "react";
import { Shield, Search, AlertTriangle, Link as LinkIcon, FileIcon, ChevronRight } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { G, type Lang, type Nav } from "../palette";
import { t as T, kh } from "../i18n";
import type { DashboardData } from "../types";
import { getHourlyTimelineFromDashboard, getTimelineFromDashboard, getThreatBreakdownFromDashboard, getThreatsListFromDashboard, PIE_COLORS } from "../data";
import { StatCard, RiskBadge } from "./Badges";

interface HomeViewProps {
  dashboard: DashboardData | null;
  lang: Lang;
  isMock?: boolean;
  dateFrom: string;
  dateTo: string;
  onDateChange: (from: string, to: string) => void;
  onNavigate: (tab: Nav) => void;
}

export default function HomeView({ dashboard, lang, isMock, dateFrom, dateTo, onDateChange, onNavigate }: HomeViewProps) {
  const tx = T(lang);
  const [expandedThreat, setExpandedThreat] = useState<string | null>(null);

  const allTimelineData = getTimelineFromDashboard(dashboard);
  const timelineData = allTimelineData.filter(item => item.date >= dateFrom && item.date <= dateTo);
  const isSingleDay = dateFrom === dateTo && dateFrom.length > 0;
  const timelineDataForChart = isSingleDay
    ? getHourlyTimelineFromDashboard(dashboard, dateFrom)
    : timelineData;
  const pieData = getThreatBreakdownFromDashboard(dashboard);
  const threatsList = getThreatsListFromDashboard(dashboard);

  // Compute stats
  const groupsCount = dashboard?.groups.length || 0;
  
  // Calculate today's scans
  let scansToday = 0;
  if (dashboard?.groups) {
    dashboard.groups.forEach(g => {
      const todayEntry = g.daily[g.daily.length - 1];
      if (todayEntry) {
        scansToday += todayEntry.scanned;
      }
    });
  }

  const totals = dashboard?.totals || {
    scanned: 0,
    files: 0,
    urls: 0,
    malicious: 0,
    deleted: 0,
    suspicious: 0,
    errors: 0,
    oversize: 0,
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ background: G.surface2, border: `1px solid ${G.goldBorder}`, borderRadius: 14, padding: "18px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 17, fontWeight: 700, color: G.text }}>
            <span className={kh(lang)}>{tx.goodAfternoon}</span>
          </div>
          <div style={{ fontSize: 13, color: G.textSec, marginTop: 4 }}>
            <span className={kh(lang)}>{tx.monitored}</span>
          </div>
        </div>
        {isMock && (
          <span style={{ fontSize: 10, background: "rgba(212,167,44,0.15)", color: G.gold, border: `1px solid ${G.goldBorder}`, padding: "3px 8px", borderRadius: 6, fontWeight: 700 }}>
            {tx.previewBadge}
          </span>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <StatCard
          icon={<Shield size={25} />}
          label={tx.groupsLabel}
          value={groupsCount}
          sub={`${groupsCount} ${tx.planSlots}`}
          lang={lang}
          onClick={() => onNavigate("groups")}
        />
        <StatCard
          icon={<Search size={25} />}
          label={tx.scansToday}
          value={scansToday.toLocaleString()}
          sub={`${totals.scanned.toLocaleString()} total`}
          lang={lang}
          onClick={() => onNavigate("history")}
        />
        <StatCard
          icon={<FileIcon size={25} />}
          label={tx.fileBlocked}
          value={totals.files.toLocaleString()}
          sub={`${totals.files} files`}
          lang={lang}
        />
        <StatCard
          icon={<LinkIcon size={25} />}
          label={tx.urlBlocked}
          value={totals.urls.toLocaleString()}
          sub={`${totals.files} files`}
          lang={lang}
        />
      </div>
      <div style={{ gap: 12 }}>
        <StatCard
          icon={<AlertTriangle size={25} />}
          label={tx.deletedFile}
          value={totals.deleted.toLocaleString()}
          sub={`${totals.malicious} malicious`}
          accent={totals.deleted > 0 ? G.danger : G.text}
          lang={lang}
          onClick={() => onNavigate("threats")}
        />
      </div>

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

      <div style={{ background: G.surface, border: `1px solid ${G.border}`, borderRadius: 14, padding: "16px 14px" }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: G.textSec, marginBottom: 14, display: "flex", justifyContent: "space-between" }}>
          <span className={kh(lang)}>{tx.threatActivity} ({dateFrom} ~ {dateTo})</span>
          <span style={{ fontSize: 11, color: G.gold, fontWeight: 700 }}>{totals.scanned} scans</span>
        </div>
        {timelineDataForChart.length > 0 ? (
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={timelineDataForChart} margin={{ left: -20, right: 4 }}>
              <defs>
                <linearGradient id="tGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={G.danger} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={G.danger} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="sGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={G.gold} stopOpacity={0.2} />
                  <stop offset="95%" stopColor={G.gold} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={G.border} />
              <XAxis dataKey="day" stroke={G.muted} tick={{ fontSize: 10 }} interval={isSingleDay ? 3 : 0} />
              <YAxis stroke={G.muted} tick={{ fontSize: 10 }} />
              <Tooltip 
                contentStyle={{ background: G.surface2, border: `1px solid ${G.goldBorder}`, borderRadius: 8, color: G.text, fontSize: 12 }} 
                labelFormatter={(raw) => {
                  const dayNumber = String(raw ?? '');
                  if (isSingleDay) {
                    const [y, m, d] = dateFrom.split('-').map(Number);
                    const dt = new Date(y, m - 1, d);
                    const hour = parseInt(dayNumber.split(':')[0], 10);
                    const h12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
                    const mm = dayNumber.split(':')[1];

                    if (lang === 'km') {
                      const kmWeekdays = ['អាទិត្យ', 'ចន្ទ', 'អង្គារ', 'ពុធ', 'ព្រហស្បតិ៍', 'សុក្រ', 'សៅរ៍'];
                      const kmMonths = ['មករា', 'កុម្ភៈ', 'មីនា', 'មេសា', 'ឧសភា', 'មិថុនា', 'កក្កដា', 'សីហា', 'កញ្ញា', 'តុលា', 'វិច្ឆិកា', 'ធ្នូ'];
                      const kmPeriod = hour < 12 ? 'ព្រឹក' : 'ល្ងាច';
                      return `${kmWeekdays[dt.getDay()]} ${d} ${kmMonths[m - 1]} ${y} - ${h12}:${mm} ${kmPeriod}`;
                    }

                    const enWeekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                    const enMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                    const enPeriod = hour < 12 ? 'AM' : 'PM';
                    return `${enWeekdays[dt.getDay()]} ${d} ${enMonths[m - 1]} ${y} - ${h12}:${mm} ${enPeriod}`;
                  }

                  const targetDate = new Date();
                  targetDate.setDate(targetDate.getDate() - Number(dayNumber));

                  if (lang === 'km') {
                    const khmerWeekdays = ['ថ្ងៃអាទិត្យ', 'ថ្ងៃចន្ទ', 'ថ្ងៃអង្គារ', 'ថ្ងៃពុធ', 'ថ្ងៃព្រហស្បតិ៍', 'ថ្ងៃសុក្រ', 'ថ្ងៃសៅរ៍'];
                    const khmerMonths = ['មករា', 'កុម្ភៈ', 'មីនា', 'មេសា', 'ឧសភា', 'មិថុនា', 'កក្កដា', 'សីហា', 'កញ្ញា', 'តុលា', 'វិច្ឆិកា', 'ធ្នូ'];
                    const dayName = khmerWeekdays[targetDate.getDay()];
                    const dayIndex = targetDate.getDate();
                    const monthName = khmerMonths[targetDate.getMonth()];
                    const year = targetDate.getFullYear();
                    return `${dayName} ${dayIndex} ${monthName} ${year}`;
                  }

                    const enDay = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][targetDate.getDay()];
                    const enMon = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][targetDate.getMonth()];
                    return `${enDay} ${targetDate.getDate()} ${enMon} ${targetDate.getFullYear()}`;
                }}
              />
              <Area type="monotone" dataKey="scans" stroke={G.gold} strokeWidth={2} fill="url(#sGrad)" name={lang === 'km' ? 'ស្កេន' : 'Scans'} />
              <Area type="monotone" dataKey="threats" stroke={G.danger} strokeWidth={2} fill="url(#tGrad)" name={lang === 'km' ? 'គំរាមគំហែង' : 'Threats'} />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div style={{ textAlign: "center", padding: "40px 0", color: G.muted, fontSize: 12 }}>
            <span className={kh(lang)}>{tx.noResults}</span>
          </div>
        )}
      </div>

      <div style={{ background: G.surface, border: `1px solid ${G.border}`, borderRadius: 14, padding: "16px 14px" }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: G.textSec, marginBottom: 14 }}>
          <span className={kh(lang)}>{tx.threatBreakdown}</span>
        </div>
        <ResponsiveContainer width="100%" height={190}>
          <PieChart>
            <Pie data={pieData} cx="50%" cy="45%" innerRadius={50} outerRadius={75} dataKey="value" paddingAngle={3}>
              {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
            </Pie>
            <Tooltip contentStyle={{ background: G.surface2, border: `1px solid ${G.goldBorder}`, borderRadius: 8, color: G.text, fontSize: 12 }} />
            <Legend iconSize={8} wrapperStyle={{ fontSize: 11, color: G.textSec }} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: G.textSec }}>
            <span className={kh(lang)}>{tx.recentThreats}</span>
          </div>
          <button
            onClick={() => onNavigate("threats")}
            style={{
              background: "transparent",
              border: "none",
              color: G.gold,
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 2,
              padding: 0,
            }}
          >
            <span className={kh(lang)}>{tx.viewMore}</span>
            <ChevronRight size={13} />
          </button>
        </div>
        {threatsList.length === 0 ? (
          <div style={{ background: G.surface, border: `1px solid ${G.border}`, borderRadius: 12, padding: "20px", textAlign: "center", color: G.safe, fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            <Shield size={16} />
            <span className={kh(lang)}>{tx.noThreats}</span>
          </div>
        ) : (
          threatsList.slice(0, 5).map(tr => (
            <div
              key={tr.id}
              style={{ background: G.surface, border: `1px solid ${G.border}`, borderRadius: 12, padding: "12px 14px", marginBottom: 8, cursor: "pointer" }}
              onClick={() => setExpandedThreat(expandedThreat === tr.id ? null : tr.id)}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: G.textSec }}>{tr.type}</span>
                <RiskBadge risk={tr.risk} />
              </div>
              <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11, color: tr.risk === "critical" ? G.danger : G.warn, marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {tr.content}
              </div>
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
          ))
        )}
      </div>
    </div>
  );
}
