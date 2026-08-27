import React, { useState, useEffect, useLayoutEffect, useCallback } from "react";
import {
  LayoutDashboard,
  MessageSquare,
  AlertTriangle,
  Clock,
  User,
  ArrowLeft,
  X,
  ArrowRight,
  Check,
  RefreshCw,
  ShieldAlert,
  Loader2,
  Copy,
  Sliders,
} from "lucide-react";
import LogoMark from "@/shared/components/LogoMark";
import { G, type Nav, type Lang } from "@/admin/palette";
import { t as T, kh } from "@/admin/i18n";
import { fetchDashboardData } from "@/admin/api";
import type { DashboardApiResponse } from "@/admin/types";
import HomeView from "@/admin/components/HomeView";
import GroupsView from "@/admin/components/GroupsView";
import ThreatsView from "@/admin/components/ThreatsView";
import HistoryView from "@/admin/components/HistoryView";
import AccountView from "@/admin/components/AccountView";
import ManageView from "@/admin/components/ManageView";

function UpgradeModal({ onClose, lang }: { onClose: () => void; lang: Lang }) {
  const tx = T(lang);
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        background: "rgba(0,0,0,0.72)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px 16px",
      }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: G.surface,
          borderRadius: 20,
          border: `1px solid ${G.goldBorder}`,
          width: "100%",
          maxWidth: 420,
          maxHeight: "90dvh",
          overflowY: "auto",
          boxShadow: "0 24px 80px rgba(0,0,0,0.6)",
        }}
      >
        <div style={{ padding: "20px 20px 0", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <div>
            <div style={{ fontSize: 10, color: G.muted, letterSpacing: "0.12em", fontWeight: 700 }}>
              <span className={kh(lang)}>{tx.currentPlan}</span>
            </div>
            <div style={{ fontSize: 18, fontWeight: 800, color: G.gold, marginTop: 2 }}>
              <span className={kh(lang)}>{tx.professional}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: `1px solid ${G.border}`,
              color: G.muted,
              borderRadius: 8,
              width: 32,
              height: 32,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <X size={14} />
          </button>
        </div>
        <div style={{ padding: "0 20px 20px" }}>
          <div style={{ background: G.surface2, borderRadius: 8, height: 7, margin: "14px 0 18px" }}>
            <div style={{ background: G.gold, height: "100%", borderRadius: 8, width: "80%" }} />
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, color: G.textSec, marginBottom: 14 }}>
            <span className={kh(lang)}>{tx.upgradeTitle}</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {tx.plans.map((plan: any) => (
              <div
                key={plan.id}
                style={{
                  borderRadius: 14,
                  padding: plan.highlight ? "18px" : "16px",
                  background: plan.highlight ? G.surface2 : "transparent",
                  border: `${plan.highlight ? "2px" : "1px"} solid ${plan.highlight ? G.gold : G.border}`,
                  boxShadow: plan.highlight ? "0 4px 20px rgba(212,167,44,0.18)" : "none",
                }}
              >
                {plan.highlight && <div style={{ height: 3, background: G.gold, borderRadius: "2px 2px 0 0", marginBottom: 10 }} />}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                  <div style={{ fontSize: 15, fontWeight: 800, color: plan.highlight ? G.gold : G.text }}>
                    <span className={kh(lang)}>{plan.name}</span>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <span style={{ fontSize: 22, fontWeight: 800, color: plan.highlight ? G.gold : G.text }}>{plan.price}</span>
                    <div style={{ fontSize: 9, color: G.muted }}>
                      <span className={kh(lang)}>{plan.period}</span>
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: 14 }}>
                  {plan.features.map((f: string) => (
                    <div key={f} style={{ display: "flex", alignItems: "center", gap: 7 }}>
                      <span style={{ color: plan.highlight ? G.gold : G.safe, fontSize: 11, fontWeight: 700 }}>
                        <Check size={11} />
                      </span>
                      <span className={kh(lang)} style={{ fontSize: 12, color: G.textSec }}>
                        {f}
                      </span>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => setSelected(plan.id)}
                  style={{
                    width: "100%",
                    padding: "10px 0",
                    borderRadius: 9,
                    cursor: "pointer",
                    fontSize: 13,
                    fontWeight: 700,
                    background: selected === plan.id ? "#1a1200" : plan.highlight ? G.gold : "transparent",
                    color: selected === plan.id ? G.gold : plan.highlight ? "#1a1200" : G.text,
                    border: plan.highlight ? "none" : `1.5px solid ${G.border}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                  }}
                >
                  <span className={kh(lang)}>
                    {selected === plan.id ? (
                      <>
                        <Check size={12} style={{ marginRight: 4 }} /> Selected
                      </>
                    ) : (
                      plan.cta
                    )}
                  </span>
                  {!selected && plan.highlight && <ArrowRight size={13} />}
                </button>
              </div>
            ))}
          </div>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: `1px solid ${G.border}`,
              color: G.muted,
              borderRadius: 10,
              padding: "10px 0",
              fontWeight: 600,
              cursor: "pointer",
              fontSize: 13,
              width: "100%",
              marginTop: 14,
            }}
          >
            <span className={kh(lang)}>{tx.maybeLater}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminApp() {
  const [nav, setNav] = useState<Nav>("dashboard");
  const [dark, setDark] = useState(false);
  const [lang, setLang] = useState<Lang>("km");
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  // Dashboard API state
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [apiData, setApiData] = useState<DashboardApiResponse | null>(null);
  const [days, setDays] = useState(7);

  const tx = T(lang);

  useLayoutEffect(() => {
    document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
  }, [dark]);

  const loadData = useCallback(async (isRefresh = false, queryDays = days) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const data = await fetchDashboardData(queryDays);
      setApiData(data);
    } catch (err: any) {
      console.error("Dashboard fetch error:", err);
      setError(err?.message || "Failed to load dashboard data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [days]);

  useEffect(() => {
    loadData(false, days);
  }, [days, loadData]);

  const handleDaysChange = (newDays: number) => {
    setDays(newDays);
  };

  const handleCopyId = (id: number) => {
    try {
      navigator.clipboard.writeText(String(id));
    } catch {
      const ta = document.createElement("textarea");
      ta.value = String(id);
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isSuperAdmin = apiData?.is_super_admin ?? false;

  const NAV_ITEMS: { id: Nav; icon: React.ReactElement; label: string }[] = [
    { id: "dashboard", icon: <LayoutDashboard size={20} />, label: tx.home },
    { id: "groups", icon: <MessageSquare size={20} />, label: tx.groups },
    { id: "threats", icon: <AlertTriangle size={20} />, label: tx.threats },
    { id: "history", icon: <Clock size={20} />, label: tx.history },
    ...(isSuperAdmin ? [{ id: "manage" as Nav, icon: <Sliders size={20} />, label: tx.manage }] : []),
    { id: "account", icon: <User size={20} />, label: tx.account },
  ];

  const currentLabel = NAV_ITEMS.find(n => n.id === nav)?.label ?? "";
  const dashboard = apiData?.dashboard || null;
  const user = apiData?.user;
  const isMock = apiData?.isMock ?? false;

  const views: Record<Nav, React.ReactElement> = {
    dashboard: <HomeView dashboard={dashboard} lang={lang} isMock={isMock} />,
    groups: <GroupsView dashboard={dashboard} lang={lang} />,
    threats: <ThreatsView dashboard={dashboard} lang={lang} days={days} onDaysChange={handleDaysChange} />,
    history: <HistoryView dashboard={dashboard} lang={lang} days={days} onDaysChange={handleDaysChange} />,
    manage: <ManageView config={apiData?.config} lang={lang} onRefresh={() => loadData(true, days)} />,
    account: <AccountView user={user} dashboard={dashboard} dark={dark} setDark={setDark} lang={lang} setLang={setLang} />,
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100dvh", background: G.bg, color: G.text, fontFamily: "Outfit, sans-serif" }}>
      {upgradeOpen && <UpgradeModal onClose={() => setUpgradeOpen(false)} lang={lang} />}

      <header style={{ padding: "12px 16px", borderBottom: `1px solid ${G.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", background: G.surface, flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <a href="/" style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, borderRadius: 7, border: `1px solid ${G.border}`, color: G.muted, textDecoration: "none" }}>
            <ArrowLeft size={13} />
          </a>
          <LogoMark size={34} />
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontWeight: 800, fontSize: 13, color: G.gold }}>SongKet</span>
              {isSuperAdmin && (
                <span
                  style={{
                    fontSize: 9,
                    fontWeight: 800,
                    padding: "1px 6px",
                    borderRadius: 4,
                    background: "rgba(212,167,44,0.25)",
                    color: G.gold,
                    border: `1px solid ${G.goldBorder}`,
                  }}
                >
                  {tx.superAdmin.toUpperCase()}
                </span>
              )}
              <span
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  padding: "1px 5px",
                  borderRadius: 4,
                  background: isMock ? "rgba(212,167,44,0.15)" : "rgba(42,170,90,0.15)",
                  color: isMock ? G.gold : G.safe,
                  border: `1px solid ${isMock ? G.goldBorder : "rgba(42,170,90,0.3)"}`,
                }}
              >
                {isMock ? tx.previewBadge : tx.liveBadge}
              </span>
            </div>
            <div style={{ fontSize: 9, color: G.muted, letterSpacing: "0.06em" }}>
              <span className={kh(lang)}>{tx.admin}</span> · {currentLabel.toUpperCase()}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            onClick={() => loadData(true, days)}
            disabled={refreshing || loading}
            style={{
              background: "transparent",
              border: `1px solid ${G.border}`,
              color: refreshing ? G.gold : G.muted,
              borderRadius: 8,
              width: 32,
              height: 32,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            title={tx.refresh}
          >
            <RefreshCw size={14} className={refreshing ? "spin-animation" : ""} />
          </button>

          <button
            onClick={() => setUpgradeOpen(true)}
            style={{
              background: G.gold,
              color: "#1a1200",
              border: "none",
              borderRadius: 8,
              padding: "6px 12px",
              fontWeight: 700,
              fontSize: 11,
              cursor: "pointer",
              letterSpacing: "0.02em",
            }}
          >
            <span className={kh(lang)}>{tx.upgrade}</span>
          </button>
        </div>
      </header>

      <main style={{ flex: 1, overflowY: "auto", padding: "16px 16px 24px" }}>
        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "60%", gap: 14, color: G.muted }}>
            <Loader2 size={32} color={G.gold} className="spin-animation" />
            <div style={{ fontSize: 13, fontWeight: 500 }}>
              <span className={kh(lang)}>{tx.loading}</span>
            </div>
          </div>
        ) : error ? (
          <div style={{ background: G.surface, border: `1px solid ${G.danger}`, borderRadius: 14, padding: "24px 18px", textAlign: "center" }}>
            <ShieldAlert size={36} color={G.danger} style={{ marginBottom: 10 }} />
            <div style={{ fontSize: 15, fontWeight: 700, color: G.text, marginBottom: 6 }}>
              <span className={kh(lang)}>{tx.errorLoading}</span>
            </div>
            <div style={{ fontSize: 12, color: G.muted, marginBottom: 16 }}>{error}</div>
            <button
              onClick={() => loadData(false, days)}
              style={{
                background: G.gold,
                color: "#1a1200",
                border: "none",
                borderRadius: 8,
                padding: "8px 18px",
                fontWeight: 700,
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              <span className={kh(lang)}>{tx.retry}</span>
            </button>
          </div>
        ) : apiData && !apiData.authorized ? (
          <div style={{ background: G.surface, border: `1px solid ${G.goldBorder}`, borderRadius: 16, padding: "28px 20px", textAlign: "center" }}>
            <ShieldAlert size={40} color={G.warn} style={{ marginBottom: 14 }} />
            <div style={{ fontSize: 17, fontWeight: 800, color: G.text, marginBottom: 8 }}>
              <span className={kh(lang)}>{tx.unauthorizedTitle}</span>
            </div>
            <div style={{ fontSize: 13, color: G.textSec, lineHeight: 1.5, marginBottom: 20 }}>
              <span className={kh(lang)}>{tx.unauthorizedDesc}</span>
            </div>

            {user?.id && (
              <div style={{ background: G.surface2, border: `1px solid ${G.border}`, borderRadius: 10, padding: "14px", marginBottom: 20, textAlign: "left" }}>
                <div style={{ fontSize: 11, color: G.muted, marginBottom: 6 }}>
                  <span className={kh(lang)}>{tx.whitelistPrompt}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                  <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 14, fontWeight: 700, color: G.gold }}>
                    {user.id}
                  </span>
                  <button
                    onClick={() => handleCopyId(user.id)}
                    style={{
                      background: "transparent",
                      border: `1px solid ${G.goldBorder}`,
                      color: G.gold,
                      borderRadius: 6,
                      padding: "4px 8px",
                      fontSize: 11,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    {copied ? <Check size={12} /> : <Copy size={12} />}
                    {copied ? "Copied" : "Copy"}
                  </button>
                </div>
              </div>
            )}

            <button
              onClick={() => loadData(false, days)}
              style={{
                background: G.gold,
                color: "#1a1200",
                border: "none",
                borderRadius: 8,
                padding: "9px 20px",
                fontWeight: 700,
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              <span className={kh(lang)}>{tx.retry}</span>
            </button>
          </div>
        ) : (
          views[nav]
        )}
      </main>

      <nav style={{ display: "flex", background: G.surface, borderTop: `1px solid ${G.border}`, flexShrink: 0, paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
        {NAV_ITEMS.map(item => {
          const active = nav === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setNav(item.id)}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "9px 4px 8px",
                border: "none",
                background: "transparent",
                cursor: "pointer",
                color: active ? G.gold : G.muted,
                gap: 3,
                borderTop: active ? `2px solid ${G.gold}` : "2px solid transparent",
                transition: "color 0.15s",
                minWidth: 0,
              }}
            >
              <span>{item.icon}</span>
              <span
                className={kh(lang)}
                style={{
                  fontSize: 9,
                  fontWeight: active ? 700 : 400,
                  letterSpacing: "0.02em",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  maxWidth: "100%",
                }}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
