import { useState, useEffect } from "react";
import React from "react";
import songketLogo from "@/imports/image-5.png";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

const G = {
  gold: "#D4A72C",
  goldLight: "#f5c842",
  goldSurface: "rgba(212,167,44,0.08)",
  goldBorder: "rgba(212,167,44,0.25)",
  bg: "#0f0c04",
  surface: "#1a1400",
  surface2: "#221b00",
  border: "#2e2400",
  text: "#fffdf7",
  textSec: "#c8b980",
  muted: "#7a6830",
  danger: "#e04040",
  warn: "#d07820",
  safe: "#2aaa5a",
  navy: "#102A38",
};

const monthlyReport = [
  { month: "Mar", blocked: 22, clean: 380 },
  { month: "Apr", blocked: 18, clean: 420 },
  { month: "May", blocked: 31, clean: 510 },
  { month: "Jun", blocked: 14, clean: 390 },
  { month: "Jul", blocked: 27, clean: 460 },
  { month: "Aug", blocked: 41, clean: 580 },
];

const PIE_COLORS = ["#e04040", "#D4A72C", "#d07820", "#7a6830"];

const threats = [
  { id: 1, type: "Phishing Link", content: "kh-bank-verify[.]com", group: "KhmerCrypto", date: "Aug 21 14:02", risk: "high", action: "Deleted + Banned" },
  { id: 2, type: "Malware File", content: "invoice_aug.exe", group: "SEA Web3 DAO", date: "Aug 21 13:47", risk: "critical", action: "Deleted + Banned" },
  { id: 3, type: "Scam Link", content: "free-usdt-claim[.]io", group: "SEA Web3 DAO", date: "Aug 21 13:31", risk: "high", action: "Deleted" },
  { id: 4, type: "Spam", content: "Mass airdrop promo", group: "Phnom Penh Tech", date: "Aug 21 11:20", risk: "medium", action: "Deleted" },
  { id: 5, type: "Phishing", content: "binance-gift[.]xyz", group: "Cambodia Hub", date: "Aug 20 22:10", risk: "high", action: "Deleted + Banned" },
];

const scanHistory = [
  { date: "14:05", group: "KhmerCrypto", content: "Message with link", type: "URL", result: "clean" },
  { date: "14:02", group: "KhmerCrypto", content: "kh-bank-verify[.]com", type: "URL", result: "threat" },
  { date: "13:51", group: "SEA Web3 DAO", content: "invoice_aug.exe", type: "File", result: "threat" },
  { date: "13:45", group: "Phnom Penh Tech", content: "Photo attachment", type: "Media", result: "clean" },
  { date: "13:31", group: "SEA Web3 DAO", content: "free-usdt-claim[.]io", type: "URL", result: "threat" },
  { date: "12:10", group: "Cambodia Hub", content: "Text message", type: "Text", result: "clean" },
  { date: "11:20", group: "Phnom Penh Tech", content: "Airdrop promo", type: "Text", result: "threat" },
];

type Nav = "dashboard" | "groups" | "threats" | "history" | "reports" | "package" | "settings";

// ─── Live API ─────────────────────────────────────────────────────────────────

type DailyRow = { date: string; scanned: number; files: number; urls: number; malicious: number; deleted: number; suspicious: number; errors: number; oversize: number };
type ApiGroup = { id: number; title: string; daily: DailyRow[] };
type ApiUser = { id: number; first_name?: string; username?: string };
type Totals = { scanned: number; files: number; urls: number; malicious: number; deleted: number; suspicious: number; errors: number; oversize: number };
type ApiData = {
  authorized: boolean;
  user?: ApiUser;
  dashboard?: { groups: ApiGroup[]; totals: Totals; days: number };
};

async function fetchDashboard(): Promise<ApiData> {
  const initData = window.Telegram?.WebApp?.initData || "";
  if (!initData) return { authorized: false };
  const r = await fetch("/api/webapp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ initData, days: 7 }),
  });
  return r.json();
}

function groupSum(g: ApiGroup, key: keyof DailyRow): number {
  return g.daily.reduce((a, d) => a + (Number(d[key]) || 0), 0);
}

function dayLabel(iso: string): string {
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][new Date(iso + "T00:00:00").getDay()];
}

function buildTimeline(groups: ApiGroup[]) {
  const byDate = new Map<string, { day: string; threats: number; scans: number }>();
  for (const g of groups) {
    for (const d of g.daily) {
      const row = byDate.get(d.date) || { day: dayLabel(d.date), threats: 0, scans: 0 };
      row.threats += d.malicious;
      row.scans += d.scanned;
      byDate.set(d.date, row);
    }
  }
  return [...byDate.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([, v]) => v);
}

function buildBreakdown(totals: Totals) {
  return [
    { name: "Files", value: totals.files },
    { name: "URLs", value: totals.urls },
    { name: "Suspicious", value: totals.suspicious },
    { name: "Oversize", value: totals.oversize },
  ].filter(x => x.value > 0);
}

// ─── Shared components ────────────────────────────────────────────────────────

function StatCard({ icon, label, value, sub, accent }: { icon: string; label: string; value: string | number; sub?: string; accent?: string }) {
  return (
    <div style={{ background: G.surface, border: `1px solid ${G.border}`, borderRadius: 14, padding: "16px 18px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <div style={{ width: 34, height: 34, borderRadius: 9, background: G.goldSurface, border: `1px solid ${G.goldBorder}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>{icon}</div>
        <span style={{ color: G.muted, fontSize: 12, fontWeight: 500 }}>{label}</span>
      </div>
      <div style={{ fontSize: 26, fontWeight: 700, color: accent || G.text, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: G.muted, marginTop: 5 }}>{sub}</div>}
    </div>
  );
}

function RiskBadge({ risk }: { risk: string }) {
  const colors: Record<string, string> = { critical: G.danger, high: "#e06020", medium: G.warn, low: G.muted };
  const c = colors[risk] || G.muted;
  return <span style={{ background: `${c}22`, color: c, border: `1px solid ${c}44`, borderRadius: 6, padding: "2px 8px", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>{risk}</span>;
}

function ResultBadge({ result }: { result: string }) {
  const ok = result === "clean";
  return <span style={{ background: ok ? `${G.safe}22` : `${G.danger}22`, color: ok ? G.safe : G.danger, border: `1px solid ${ok ? G.safe : G.danger}44`, borderRadius: 6, padding: "2px 8px", fontSize: 10, fontWeight: 700, whiteSpace: "nowrap" }}>{ok ? "✓ Clean" : "✗ Threat"}</span>;
}

function SectionHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <div style={{ marginBottom: 4 }}>
      <div style={{ fontSize: 18, fontWeight: 700, color: G.text }}>{title}</div>
      {sub && <div style={{ fontSize: 12, color: G.muted, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

// ─── Views ────────────────────────────────────────────────────────────────────

function DashboardView({ mobile, data }: { mobile: boolean; data: ApiData }) {
  const dash = data.dashboard!;
  const totals = dash.totals;
  const timeline = buildTimeline(dash.groups);
  const breakdown = buildBreakdown(totals);
  const userName = data.user?.first_name || (data.user?.username ? "@" + data.user.username : "Admin");
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {/* Welcome */}
      <div style={{ background: `linear-gradient(135deg, ${G.surface2} 0%, ${G.navy}88 100%)`, border: `1px solid ${G.goldBorder}`, borderRadius: 14, padding: "18px 20px" }}>
        <div style={{ fontSize: 17, fontWeight: 700, color: G.text }}>Welcome back, {userName} 👋</div>
        <div style={{ fontSize: 13, color: G.textSec, marginTop: 4 }}>Your communities are monitored 24/7.</div>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: `${G.safe}18`, border: `1px solid ${G.safe}44`, borderRadius: 8, padding: "6px 12px", marginTop: 12 }}>
          <span>🛡️</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: G.safe }}>Active · All Systems Go</span>
        </div>
      </div>

      {/* Stats 2-col on mobile */}
      <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr 1fr" : "repeat(4,1fr)", gap: 12 }}>
        <StatCard icon="💬" label="Groups" value={dash.groups.length} sub={`connected`} />
        <StatCard icon="🔍" label="Scans" value={totals.scanned.toLocaleString()} sub={`last ${dash.days} days`} />
        <StatCard icon="⚠️" label="Malicious" value={totals.malicious} sub="detected" accent={G.danger} />
        <StatCard icon="🗑️" label="Deleted" value={totals.deleted} sub="threat messages" accent={G.warn} />
      </div>

      {/* Area chart */}
      <div style={{ background: G.surface, border: `1px solid ${G.border}`, borderRadius: 14, padding: "16px 14px" }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: G.textSec, marginBottom: 14 }}>Threat Activity — Last {dash.days} Days</div>
        {timeline.length ? (
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={timeline} margin={{ left: -20, right: 4 }}>
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
              <XAxis dataKey="day" stroke={G.muted} tick={{ fontSize: 10 }} />
              <YAxis stroke={G.muted} tick={{ fontSize: 10 }} allowDecimals={false} />
              <Tooltip contentStyle={{ background: G.surface2, border: `1px solid ${G.goldBorder}`, borderRadius: 8, color: G.text, fontSize: 12 }} />
              <Area type="monotone" dataKey="scans" stroke={G.gold} strokeWidth={2} fill="url(#sGrad)" name="Scans" />
              <Area type="monotone" dataKey="threats" stroke={G.danger} strokeWidth={2} fill="url(#tGrad)" name="Threats" />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div style={{ fontSize: 12, color: G.muted, padding: "40px 0", textAlign: "center" }}>No scan activity yet.</div>
        )}
      </div>

      {/* Pie chart */}
      <div style={{ background: G.surface, border: `1px solid ${G.border}`, borderRadius: 14, padding: "16px 14px" }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: G.textSec, marginBottom: 14 }}>Scan Breakdown</div>
        {breakdown.length ? (
          <ResponsiveContainer width="100%" height={190}>
            <PieChart>
              <Pie data={breakdown} cx="50%" cy="45%" innerRadius={50} outerRadius={75} dataKey="value" paddingAngle={3}>
                {breakdown.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: G.surface2, border: `1px solid ${G.goldBorder}`, borderRadius: 8, color: G.text, fontSize: 12 }} />
              <Legend iconSize={8} wrapperStyle={{ fontSize: 11, color: G.textSec }} />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div style={{ fontSize: 12, color: G.muted, padding: "40px 0", textAlign: "center" }}>Nothing scanned yet.</div>
        )}
      </div>

      {/* Recent threats — card list on mobile */}
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: G.textSec, marginBottom: 8 }}>Recent Threats</div>
        {threats.slice(0, 3).map(t => (
          <div key={t.id} style={{ background: G.surface, border: `1px solid ${G.border}`, borderRadius: 12, padding: "12px 14px", marginBottom: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: G.textSec }}>{t.type}</span>
              <RiskBadge risk={t.risk} />
            </div>
            <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11, color: G.danger, marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.content}</div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: G.muted }}>
              <span>{t.group}</span>
              <span style={{ color: G.safe }}>{t.action}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function GroupsView({ groups }: { groups: ApiGroup[] }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <SectionHeader title="My Groups" sub={`${groups.length} connected group${groups.length === 1 ? "" : "s"}`} />
        <button style={{ background: G.gold, color: "#1a1200", border: "none", borderRadius: 9, padding: "8px 16px", fontWeight: 700, cursor: "pointer", fontSize: 12 }}>+ Add</button>
      </div>

      {!groups.length && (
        <div style={{ background: G.surface, border: `1px solid ${G.border}`, borderRadius: 12, padding: "24px 16px", textAlign: "center" }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>💬</div>
          <div style={{ fontSize: 13, color: G.textSec }}>No groups yet. Add Songket to a Telegram group to protect it.</div>
        </div>
      )}

      {groups.map(g => {
        const threats = groupSum(g, "malicious");
        const scans = groupSum(g, "scanned");
        const lastDay = g.daily[g.daily.length - 1];
        const alert = (lastDay?.malicious || 0) > 0;
        return (
          <div key={g.id} style={{ background: G.surface, border: `1px solid ${alert ? `${G.danger}55` : G.border}`, borderRadius: 14, padding: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 11, background: G.goldSurface, border: `1px solid ${G.goldBorder}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>💬</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, color: G.text, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{g.title}</div>
                <div style={{ fontSize: 11, color: G.muted, marginTop: 2 }}>{scans.toLocaleString()} scans · ID {g.id}</div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", gap: 16 }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: threats > 5 ? G.danger : G.text }}>{threats}</div>
                  <div style={{ fontSize: 10, color: G.muted }}>threats</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 600, color: alert ? G.danger : G.safe }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: alert ? G.danger : G.safe, display: "inline-block" }} />
                  {alert ? "Alert" : "Protected"}
                </div>
              </div>
              <button style={{ background: "transparent", border: `1px solid ${G.goldBorder}`, color: G.gold, borderRadius: 8, padding: "6px 14px", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>View →</button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ThreatsView() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <SectionHeader title="Detected Threats" sub="Auto-detected and actioned by SongKet" />
      {threats.map(t => (
        <div key={t.id} style={{ background: G.surface, border: `1px solid ${G.border}`, borderRadius: 13, padding: "14px 16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: G.textSec }}>{t.type}</span>
            <RiskBadge risk={t.risk} />
          </div>
          <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11, color: G.danger, marginBottom: 8, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.content}</div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: G.muted }}>
            <span>{t.group}</span>
            <span style={{ color: G.muted }}>{t.date}</span>
          </div>
          <div style={{ marginTop: 8, fontSize: 11, color: G.safe, fontWeight: 600 }}>✓ {t.action}</div>
        </div>
      ))}
    </div>
  );
}

function HistoryView() {
  const [query, setQuery] = useState("");
  const filtered = scanHistory.filter(s =>
    s.group.toLowerCase().includes(query.toLowerCase()) ||
    s.content.toLowerCase().includes(query.toLowerCase()) ||
    s.type.toLowerCase().includes(query.toLowerCase())
  );
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <SectionHeader title="Scan History" sub="Every message scanned" />
      <input
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Search group, content, type…"
        style={{ background: G.surface, border: `1px solid ${G.border}`, borderRadius: 8, padding: "10px 14px", color: G.text, fontSize: 13, outline: "none", width: "100%" }}
      />
      {filtered.map((s, i) => (
        <div key={i} style={{ background: G.surface, border: `1px solid ${G.border}`, borderRadius: 12, padding: "12px 14px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 10, color: G.muted }}>{s.date}</span>
            <ResultBadge result={s.result} />
          </div>
          <div style={{ fontSize: 13, color: G.text, marginBottom: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.content}</div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: G.muted }}>
            <span>{s.group}</span>
            <span style={{ background: G.goldSurface, color: G.gold, border: `1px solid ${G.goldBorder}`, borderRadius: 5, padding: "1px 7px", fontSize: 10, fontWeight: 600 }}>{s.type}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function ReportsView() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
        <SectionHeader title="Reports" sub="Monthly summaries" />
        <button style={{ background: G.gold, color: "#1a1200", border: "none", borderRadius: 8, padding: "8px 16px", fontWeight: 700, cursor: "pointer", fontSize: 12 }}>↓ PDF</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {[
          { label: "Total Scans", value: "5,823", icon: "🔍" },
          { label: "Blocked", value: "41", icon: "🚫", accent: G.danger },
          { label: "Clean", value: "5,782", icon: "✅", accent: G.safe },
          { label: "Members", value: "45.8K", icon: "👥" },
        ].map(s => (
          <div key={s.label} style={{ background: G.surface, border: `1px solid ${G.border}`, borderRadius: 12, padding: "14px" }}>
            <div style={{ fontSize: 18, marginBottom: 6 }}>{s.icon}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: s.accent || G.text }}>{s.value}</div>
            <div style={{ fontSize: 11, color: G.muted, marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ background: G.surface, border: `1px solid ${G.border}`, borderRadius: 14, padding: "16px 12px" }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: G.textSec, marginBottom: 14 }}>Blocked vs Clean (6 months)</div>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={monthlyReport} margin={{ left: -20, right: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={G.border} />
            <XAxis dataKey="month" stroke={G.muted} tick={{ fontSize: 10 }} />
            <YAxis stroke={G.muted} tick={{ fontSize: 10 }} />
            <Tooltip contentStyle={{ background: G.surface2, border: `1px solid ${G.goldBorder}`, borderRadius: 8, color: G.text, fontSize: 12 }} />
            <Legend wrapperStyle={{ fontSize: 11, color: G.textSec }} />
            <Bar dataKey="clean" fill={G.gold} radius={[3, 3, 0, 0]} name="Clean" fillOpacity={0.8} />
            <Bar dataKey="blocked" fill={G.danger} radius={[3, 3, 0, 0]} name="Blocked" fillOpacity={0.9} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function PackageView() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <SectionHeader title="Package & Billing" sub="Manage your subscription" />

      <div style={{ background: `linear-gradient(135deg, ${G.surface2}, ${G.navy}88)`, border: `2px solid ${G.goldBorder}`, borderRadius: 16, padding: "22px 20px", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: 14, right: 16, background: G.gold, color: "#1a1200", borderRadius: 7, padding: "3px 12px", fontSize: 10, fontWeight: 700, letterSpacing: "0.06em" }}>CURRENT</div>
        <div style={{ fontSize: 20, fontWeight: 800, color: G.text, marginBottom: 2 }}>Professional</div>
        <div style={{ fontSize: 12, color: G.textSec, marginBottom: 20 }}>Full-spectrum protection for growing communities</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 20 }}>
          {[
            { label: "Groups", value: "5 max" },
            { label: "Scans / day", value: "Unlimited" },
            { label: "Threat types", value: "All" },
            { label: "Renews", value: "Sep 21" },
          ].map(f => (
            <div key={f.label}>
              <div style={{ fontSize: 10, color: G.muted, marginBottom: 3 }}>{f.label}</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: G.text }}>{f.value}</div>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
          <span style={{ fontSize: 12, color: G.textSec }}>Group Slots</span>
          <span style={{ fontSize: 12, color: G.gold, fontWeight: 600 }}>4 / 5</span>
        </div>
        <div style={{ background: `rgba(255,255,255,0.08)`, borderRadius: 8, height: 9 }}>
          <div style={{ background: `linear-gradient(90deg, ${G.gold}, ${G.goldLight})`, height: "100%", borderRadius: 8, width: "80%", boxShadow: `0 0 10px ${G.gold}55` }} />
        </div>
      </div>

      <div style={{ background: G.surface, border: `1px solid ${G.border}`, borderRadius: 14, padding: "18px" }}>
        <div style={{ fontWeight: 700, fontSize: 15, color: G.text, marginBottom: 4 }}>Upgrade to Professional+</div>
        <div style={{ fontSize: 12, color: G.muted, marginBottom: 14 }}>Up to 20 groups, priority support, advanced analytics, API access.</div>
        <button style={{ background: G.gold, color: "#1a1200", border: "none", borderRadius: 10, padding: "11px 0", fontWeight: 700, cursor: "pointer", fontSize: 14, width: "100%" }}>Upgrade Now →</button>
      </div>

      <div style={{ background: G.surface, border: `1px solid ${G.border}`, borderRadius: 14, padding: "18px" }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: G.textSec, marginBottom: 14 }}>Included Features</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
          {["URL & phishing detection", "Malware file scanning", "Auto-delete + auto-ban", "Spam filtering", "Daily threat reports", "Scan history logs", "24/7 bot uptime", "Khmer + English support"].map(f => (
            <div key={f} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: G.textSec }}>
              <span style={{ color: G.safe }}>✓</span> {f}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SettingsView() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <SectionHeader title="Settings" sub="Account and notification preferences" />
      {[
        {
          title: "Account", fields: [
            { label: "Organization", value: "KhmerTech Ltd.", type: "text" },
            { label: "Email", value: "admin@khmertech.io", type: "email" },
            { label: "Telegram", value: "@khmertech_admin", type: "text" },
          ]
        },
        {
          title: "Notifications", fields: [
            { label: "Threat alerts via Telegram", value: "Enabled", type: "toggle" },
            { label: "Daily summary email", value: "Enabled", type: "toggle" },
            { label: "Weekly PDF report", value: "Disabled", type: "toggle" },
          ]
        },
      ].map(section => (
        <div key={section.title} style={{ background: G.surface, border: `1px solid ${G.border}`, borderRadius: 14, padding: "18px" }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: G.textSec, marginBottom: 16 }}>{section.title}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {section.fields.map(f => (
              <div key={f.label}>
                <label style={{ fontSize: 12, color: G.muted, display: "block", marginBottom: 6 }}>{f.label}</label>
                {f.type === "toggle" ? (
                  <div style={{ display: "inline-flex", background: f.value === "Enabled" ? `${G.gold}22` : G.surface2, border: `1px solid ${f.value === "Enabled" ? G.goldBorder : G.border}`, borderRadius: 7, padding: "6px 14px", fontSize: 12, fontWeight: 600, color: f.value === "Enabled" ? G.gold : G.muted, cursor: "pointer" }}>{f.value}</div>
                ) : (
                  <input defaultValue={f.value} style={{ background: G.surface2, border: `1px solid ${G.border}`, borderRadius: 8, padding: "9px 14px", color: G.text, fontSize: 13, outline: "none", width: "100%" }} />
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
      <button style={{ background: G.gold, color: "#1a1200", border: "none", borderRadius: 10, padding: "12px 0", fontWeight: 700, cursor: "pointer", fontSize: 14, width: "100%" }}>Save Changes</button>
    </div>
  );
}

// ─── Nav config ───────────────────────────────────────────────────────────────

const NAV_ITEMS: { id: Nav; icon: string; label: string }[] = [
  { id: "dashboard", icon: "⬡", label: "Home" },
  { id: "groups", icon: "💬", label: "Groups" },
  { id: "threats", icon: "⚠️", label: "Threats" },
  { id: "history", icon: "🕐", label: "History" },
  { id: "reports", icon: "📊", label: "Reports" },
  { id: "package", icon: "📦", label: "Package" },
  { id: "settings", icon: "⚙️", label: "Settings" },
];

// ─── Gate screens ─────────────────────────────────────────────────────────────

function GateScreen({ icon, title, msg, loading }: { icon: string; title: string; msg: string; loading?: boolean }) {
  return (
    <div style={{ minHeight: "100dvh", background: G.bg, color: G.text, fontFamily: "Outfit, sans-serif", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ maxWidth: 340, width: "100%", textAlign: "center" }}>
        <img src={songketLogo} alt="SongKet" style={{ width: 64, height: 64, objectFit: "contain", borderRadius: 14, margin: "0 auto 18px", display: "block" }} />
        <div style={{ fontSize: 40, marginBottom: 10 }}>{icon}</div>
        <div style={{ fontSize: 19, fontWeight: 800, marginBottom: 8 }}>{title}</div>
        <div style={{ fontSize: 13, color: G.textSec, lineHeight: 1.6 }}>{msg}</div>
        {loading && <div className="spin" style={{ width: 26, height: 26, border: `3px solid ${G.goldBorder}`, borderTopColor: G.gold, borderRadius: "50%", margin: "22px auto 0" }} />}
      </div>
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const [nav, setNav] = useState<Nav>("dashboard");
  const [mobile, setMobile] = useState(() => typeof window !== "undefined" && window.innerWidth < 768);
  const [data, setData] = useState<ApiData | null>(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    fetchDashboard().then(setData).catch(() => setLoadError(true));
  }, []);

  useEffect(() => {
    const handler = () => setMobile(window.innerWidth < 768);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  if (loadError) {
    return <GateScreen icon="⚠️" title="Connection problem" msg="Could not reach Songket servers. Please check your connection and reopen the app." />;
  }
  if (!data) {
    return <GateScreen icon="🛡️" title="Loading dashboard…" msg="Verifying your Telegram session." loading />;
  }
  if (!data.authorized) {
    const u = data.user;
    const who = u ? (u.username ? "@" + u.username : u.first_name || "friend") : "";
    return (
      <GateScreen
        icon="🔒"
        title="Access restricted"
        msg={u
          ? `${who}, your Telegram account is not on the authorized list. Ask an admin to add your ID (${u.id}) to the whitelist.`
          : "Open this Mini App from inside Telegram so we can verify your identity."}
      />
    );
  }

  const views: Record<Nav, React.ReactElement> = {
    dashboard: <DashboardView mobile={mobile} data={data} />,
    groups: <GroupsView groups={data.dashboard!.groups} />,
    threats: <ThreatsView />,
    history: <HistoryView />,
    reports: <ReportsView />,
    package: <PackageView />,
    settings: <SettingsView />,
  };

  const currentLabel = NAV_ITEMS.find(n => n.id === nav)?.label ?? "";

  if (mobile) {
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100dvh", background: G.bg, color: G.text, fontFamily: "Outfit, sans-serif" }}>
        {/* Mobile header */}
        <header style={{ padding: "12px 16px", borderBottom: `1px solid ${G.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", background: G.surface, flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <img src={songketLogo} alt="SongKet" style={{ width: 34, height: 34, objectFit: "contain", borderRadius: 8 }} />
            <div>
              <div style={{ fontWeight: 800, fontSize: 13, color: G.gold }}>SongKet</div>
              <div style={{ fontSize: 9, color: G.muted, letterSpacing: "0.08em" }}>ADMIN · {currentLabel.toUpperCase()}</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 7, background: `${G.safe}18`, border: `1px solid ${G.safe}44`, borderRadius: 7, padding: "4px 10px", fontSize: 11, color: G.safe, fontWeight: 600 }}>
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: G.safe, display: "inline-block" }} />
            Active
          </div>
        </header>

        {/* Scrollable content */}
        <main style={{ flex: 1, overflowY: "auto", padding: "16px 16px 24px" }}>
          {views[nav]}
        </main>

        {/* Bottom tab bar */}
        <nav style={{ display: "flex", background: G.surface, borderTop: `1px solid ${G.border}`, flexShrink: 0, paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
          {NAV_ITEMS.map(item => {
            const active = nav === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setNav(item.id)}
                style={{
                  flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                  padding: "9px 4px 8px", border: "none", background: "transparent", cursor: "pointer",
                  color: active ? G.gold : G.muted, fontSize: 18, gap: 2,
                  borderTop: active ? `2px solid ${G.gold}` : "2px solid transparent",
                  transition: "color 0.15s",
                  minWidth: 0,
                }}
              >
                <span style={{ fontSize: 17 }}>{item.icon}</span>
                <span style={{ fontSize: 9, fontWeight: active ? 700 : 400, letterSpacing: "0.02em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "100%" }}>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    );
  }

  // ── Desktop layout ──
  return (
    <div style={{ display: "flex", height: "100vh", background: G.bg, color: G.text, fontFamily: "Outfit, sans-serif", overflow: "hidden" }}>
      <aside style={{ width: 220, minWidth: 220, background: G.surface, borderRight: `1px solid ${G.border}`, display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "18px 20px 14px", borderBottom: `1px solid ${G.border}`, display: "flex", alignItems: "center", gap: 10 }}>
          <img src={songketLogo} alt="SongKet" style={{ width: 38, height: 38, objectFit: "contain", borderRadius: 9, flexShrink: 0 }} />
          <div>
            <div style={{ fontWeight: 800, fontSize: 14, color: G.gold }}>SongKet</div>
            <div style={{ fontSize: 9, color: G.muted, letterSpacing: "0.08em" }}>ADMIN</div>
          </div>
        </div>
        <nav style={{ flex: 1, padding: "10px 8px", display: "flex", flexDirection: "column", gap: 2 }}>
          {NAV_ITEMS.map(item => {
            const active = nav === item.id;
            return (
              <button key={item.id} onClick={() => setNav(item.id)} style={{ display: "flex", alignItems: "center", gap: 11, padding: "9px 12px", borderRadius: 9, border: "none", cursor: "pointer", background: active ? G.goldSurface : "transparent", borderLeft: active ? `3px solid ${G.gold}` : "3px solid transparent", color: active ? G.gold : G.muted, fontSize: 13, fontWeight: active ? 600 : 400, transition: "all 0.15s", width: "100%", textAlign: "left" }}>
                <span style={{ fontSize: 16, flexShrink: 0 }}>{item.icon}</span>
                {item.label}
              </button>
            );
          })}
        </nav>
        <div style={{ padding: "10px 8px", borderTop: `1px solid ${G.border}` }}>
          <a href="/" style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", borderRadius: 9, color: G.muted, fontSize: 13, textDecoration: "none" }}>← Back to site</a>
        </div>
      </aside>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <header style={{ padding: "12px 24px", borderBottom: `1px solid ${G.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", background: G.surface, flexShrink: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: G.text }}>{currentLabel}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, background: `${G.safe}18`, border: `1px solid ${G.safe}44`, borderRadius: 7, padding: "4px 11px", fontSize: 11, color: G.safe, fontWeight: 600 }}>
              <span style={{ width: 5, height: 5, borderRadius: "50%", background: G.safe, display: "inline-block" }} />
              All systems active
            </div>
            <div style={{ width: 32, height: 32, borderRadius: "50%", background: G.goldSurface, border: `1px solid ${G.goldBorder}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, cursor: "pointer" }}>👤</div>
          </div>
        </header>
        <main style={{ flex: 1, overflowY: "auto", padding: "24px 28px" }}>
          {views[nav]}
        </main>
      </div>
    </div>
  );
}
