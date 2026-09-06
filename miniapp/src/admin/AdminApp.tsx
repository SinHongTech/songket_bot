import React, { useState, useEffect, useLayoutEffect, useCallback } from "react";
import { Link } from "react-router";
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
  Sliders,
  Lock,
  LogOut,
  Bell,
} from "lucide-react";
import LogoMark from "@/shared/components/LogoMark";
import { G, type Nav, type Lang } from "@/admin/palette";
import { t as T, kh } from "@/admin/i18n";
import { fetchDashboardData, setupPin, loginPin, resetPin, resetPinWithTotp, setSessionToken, openTelegramDirect, getTelegramUser, getTelegramWebApp, requestTelegramWriteAccess } from "@/admin/api";
import type { DashboardApiResponse } from "@/admin/types";
import { mockUser, getThreatsListFromDashboard } from "@/admin/data";
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
                  onClick={() => {
                    setSelected(plan.id);
                    openTelegramDirect("Sin_Hong");
                  }}
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
                    {plan.cta} — DM @Sin_Hong
                  </span>
                  <ArrowRight size={13} />
                </button>
              </div>
            ))}
          </div>
          <button
            onClick={() => openTelegramDirect("Sin_Hong")}
            style={{
              background: G.gold,
              color: "#1a1200",
              border: "none",
              borderRadius: 10,
              padding: "12px 0",
              fontWeight: 800,
              cursor: "pointer",
              fontSize: 13,
              width: "100%",
              marginTop: 12,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
            }}
          >
            💬 Contact @Sin_Hong to Upgrade
          </button>
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
              marginTop: 8,
            }}
          >
            <span className={kh(lang)}>{tx.maybeLater}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function PinGate({
  mode,
  locked,
  lang,
  onSuccess,
}: {
  mode: "setup" | "login";
  locked: number;
  lang: Lang;
  onSuccess: () => void;
}) {
  const tx = T(lang);
  const [pin, setPin] = useState("");
  const [confirm, setConfirm] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [remaining, setRemaining] = useState(locked);
  const [currentMode, setCurrentMode] = useState<"setup" | "login">(mode);
  const [showTotpReset, setShowTotpReset] = useState(false);
  const [totpCode, setTotpCode] = useState("");

  const isKm = lang === "km";

  useEffect(() => {
    setCurrentMode(mode);
  }, [mode]);

  useEffect(() => {
    setRemaining(locked);
  }, [locked]);

  useEffect(() => {
    if (remaining <= 0) return;
    const t = setInterval(() => {
      setRemaining(r => {
        if (r <= 1) {
          clearInterval(t);
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [remaining]);

  const fmt = (s: number) => `${Math.floor(s / 60)}m ${s % 60}s`;
  const inputProps = {
    type: "password",
    inputMode: "numeric" as const,
    pattern: "[0-9]*",
    maxLength: 6,
    autoComplete: "one-time-code",
  };

  async function handleResetPin() {
    setErr(null);
    setInfo(null);
    setBusy(true);
    try {
      const res = await resetPin();
      if (res.ok) {
        setPin("");
        setConfirm("");
        setCurrentMode("setup");
        setInfo(isKm ? "កំណត់កូដសម្ងាត់ឡើងវិញជោគជ័យ! សូមបង្កើតកូដសម្ងាត់ ៦ ខ្ទង់ថ្មី។" : "PIN reset! Please create your new 6-digit PIN.");
      } else if (res.totp_required || res.error?.includes("2FA") || res.error?.includes("Authenticator")) {
        setShowTotpReset(true);
      } else {
        setShowTotpReset(true);
      }
    } catch {
      setShowTotpReset(true);
    } finally {
      setBusy(false);
    }
  }

  async function handleTotpResetSubmit() {
    if (!totpCode.trim()) {
      setErr(isKm ? "សូមបញ្ចូលកូដ Authenticator ឬ Backup Code" : "Enter Authenticator or Backup Code");
      return;
    }
    setErr(null);
    setBusy(true);
    try {
      const res = await resetPinWithTotp(totpCode);
      if (res.ok) {
        setShowTotpReset(false);
        setTotpCode("");
        setPin("");
        setConfirm("");
        setCurrentMode("setup");
        setInfo(isKm ? "ផ្ទៀងផ្ទាត់ 2FA ជោគជ័យ! សូមបង្កើតកូដសម្ងាត់ PIN ៦ ខ្ទង់ថ្មី។" : "2FA Verified! Please create your new 6-digit PIN.");
      } else {
        setErr(res.error || (isKm ? "កូដមិនត្រឹមត្រូវ" : "Invalid code"));
      }
    } catch (e: any) {
      setErr(e?.message || "Verification failed");
    } finally {
      setBusy(false);
    }
  }

  async function submit() {
    setErr(null);
    setInfo(null);
    if (pin.length !== 6) {
      setErr(isKm ? "PIN ត្រូវតែមាន ៦ ខ្ទង់" : "PIN must be exactly 6 digits");
      return;
    }
    if (currentMode === "setup" && pin !== confirm) {
      setErr(tx.pinMismatch);
      return;
    }
    setBusy(true);
    try {
      const res = currentMode === "setup" ? await setupPin(pin, confirm) : await loginPin(pin);
      if (res && res.session) {
        setSessionToken(res.session);
        onSuccess();
        return;
      }
      if (res && res.locked) setRemaining(res.locked);
      setErr(res?.error || (currentMode === "setup" ? (isKm ? "ការកំណត់ PIN បរាជ័យ" : "Failed to set PIN") : tx.pinIncorrect));
    } catch (e: any) {
      setErr(e?.message || (currentMode === "setup" ? "Failed to set PIN" : tx.pinIncorrect));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "70dvh", padding: "16px" }}>
      <div style={{ background: G.surface, border: `1px solid ${G.goldBorder}`, borderRadius: 20, padding: "28px 24px", width: "100%", maxWidth: 380, textAlign: "center" }}>
        <LogoMark size={48} />
        <div style={{ fontSize: 18, fontWeight: 800, color: G.gold, marginTop: 12 }}>
          <span className={kh(lang)}>{currentMode === "setup" ? tx.pinSetupTitle : tx.pinLoginTitle}</span>
        </div>
        <div style={{ fontSize: 12, color: G.textSec, lineHeight: 1.5, margin: "8px 0 20px" }}>
          <span className={kh(lang)}>{currentMode === "setup" ? tx.pinSetupDesc : tx.pinLoginDesc}</span>
        </div>

        {remaining > 0 && (
          <div style={{ background: "rgba(224,64,64,0.12)", border: `1px solid ${G.danger}`, color: G.danger, borderRadius: 10, padding: "10px", fontSize: 12, fontWeight: 600, marginBottom: 14 }}>
            <span className={kh(lang)}>{tx.pinLocked}</span> — {fmt(remaining)}
          </div>
        )}

        {info && (
          <div style={{ background: "rgba(34,197,94,0.12)", border: `1px solid ${G.safe}`, color: G.safe, borderRadius: 10, padding: "10px", fontSize: 12, fontWeight: 600, marginBottom: 14 }}>
            <span className={kh(lang)}>{info}</span>
          </div>
        )}

        {showTotpReset ? (
          <div style={{ background: G.surface2, border: `1px solid ${G.goldBorder}`, borderRadius: 14, padding: "16px", marginBottom: 14, textAlign: "left" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: G.gold, marginBottom: 4 }}>
              <span className={kh(lang)}>{isKm ? "ផ្ទៀងផ្ទាត់ជាមួយ Google Authenticator" : "Reset PIN with 2FA"}</span>
            </div>
            <p style={{ fontSize: 11, color: G.textSec, lineHeight: 1.4, margin: "0 0 10px" }}>
              <span className={kh(lang)}>
                {isKm
                  ? "បញ្ចូលកូដ ៦ ខ្ទង់ពី Google Authenticator ឬកូដបម្រុងទុក (Backup Code) ដើម្បីកំណត់ PIN ឡើងវិញ:"
                  : "Enter the 6-digit code from Google Authenticator or your backup code to reset PIN:"}
              </span>
            </p>

            <input
              type="text"
              value={totpCode}
              onChange={e => setTotpCode(e.target.value.toUpperCase())}
              placeholder="000000 / A1B2-C3D4"
              style={{
                width: "100%",
                background: G.surface,
                border: `1px solid ${G.border}`,
                borderRadius: 8,
                padding: "10px 12px",
                color: G.text,
                fontSize: 15,
                letterSpacing: "0.15em",
                textAlign: "center",
                outline: "none",
                marginBottom: 10,
                fontFamily: "JetBrains Mono, monospace",
              }}
            />

            {err && <div style={{ color: G.danger, fontSize: 11, marginBottom: 8, textAlign: "center" }}>{err}</div>}

            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => setShowTotpReset(false)}
                style={{
                  flex: 1,
                  background: "transparent",
                  border: `1px solid ${G.border}`,
                  color: G.muted,
                  borderRadius: 8,
                  padding: "9px 0",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                <span className={kh(lang)}>{isKm ? "ថយក្រោយ" : "Cancel"}</span>
              </button>
              <button
                onClick={handleTotpResetSubmit}
                disabled={busy || !totpCode.trim()}
                style={{
                  flex: 1.5,
                  background: G.gold,
                  color: "#1a1200",
                  border: "none",
                  borderRadius: 8,
                  padding: "9px 0",
                  fontSize: 12,
                  fontWeight: 800,
                  cursor: "pointer",
                  opacity: busy || !totpCode.trim() ? 0.6 : 1,
                }}
              >
                <span className={kh(lang)}>{isKm ? "ផ្ទៀងផ្ទាត់ & កំណត់ឡើងវិញ" : "Verify & Reset"}</span>
              </button>
            </div>
          </div>
        ) : (
          <>
            <input
              {...inputProps}
              value={pin}
              onChange={e => setPin(e.target.value.replace(/\D/g, ""))}
              placeholder={tx.enterPin}
              disabled={remaining > 0}
              style={{ width: "100%", background: G.surface2, border: `1px solid ${G.border}`, borderRadius: 10, padding: "12px 14px", color: G.text, fontSize: 18, letterSpacing: "0.3em", textAlign: "center", outline: "none", marginBottom: 10, fontFamily: "JetBrains Mono, monospace" }}
            />

            {currentMode === "setup" && (
              <input
                {...inputProps}
                value={confirm}
                onChange={e => setConfirm(e.target.value.replace(/\D/g, ""))}
                placeholder={tx.confirmPin}
                disabled={remaining > 0}
                style={{ width: "100%", background: G.surface2, border: `1px solid ${G.border}`, borderRadius: 10, padding: "12px 14px", color: G.text, fontSize: 18, letterSpacing: "0.3em", textAlign: "center", outline: "none", marginBottom: 10, fontFamily: "JetBrains Mono, monospace" }}
              />
            )}

            {err && <div style={{ color: G.danger, fontSize: 12, marginBottom: 12 }}>{err}</div>}

            <button
              onClick={submit}
              disabled={busy || remaining > 0}
              style={{ width: "100%", background: G.gold, color: "#1a1200", border: "none", borderRadius: 10, padding: "13px 0", fontWeight: 800, cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, opacity: busy || remaining > 0 ? 0.6 : 1, marginBottom: 12 }}
            >
              <Lock size={15} />
              <span className={kh(lang)}>{currentMode === "setup" ? tx.setPin : tx.unlock}</span>
            </button>

            {currentMode === "login" && (
              <button
                onClick={handleResetPin}
                disabled={busy}
                style={{ background: "transparent", border: "none", color: G.gold, fontSize: 12, fontWeight: 700, cursor: "pointer", padding: "6px 12px", textDecoration: "underline" }}
              >
                <span className={kh(lang)}>{isKm ? "ភ្លេច / កំណត់កូដសម្ងាត់ឡើងវិញ?" : "Forgot / Reset PIN?"}</span>
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function AdminApp() {
  const [nav, setNav] = useState<Nav>("dashboard");
  const [dark, setDark] = useState<boolean>(() => {
    try {
      const v = localStorage.getItem("songket.admin.dark");
      return v === null ? false : v === "1";
    } catch {
      return false;
    }
  });
  const [lang, setLang] = useState<Lang>(() => {
    try {
      const v = localStorage.getItem("songket.admin.lang");
      return v === "km" || v === "en" ? v : "km";
    } catch {
      return "km";
    }
  });
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  // Helper date functions
  const getDaysAgo = (d: number) => {
    const dt = new Date();
    dt.setDate(dt.getDate() - d);
    return dt.toISOString().split("T")[0];
  };
  const getToday = () => new Date().toISOString().split("T")[0];

  // Dashboard API state
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [apiData, setApiData] = useState<DashboardApiResponse | null>(null);
  const [manageUnlocked, setManageUnlocked] = useState(false);

  // Independent date states for each tab
  const [homeDateFrom, setHomeDateFrom] = useState<string>(() => getDaysAgo(7));
  const [homeDateTo, setHomeDateTo] = useState<string>(() => getToday());

  const [threatsDateFrom, setThreatsDateFrom] = useState<string>(() => getDaysAgo(7));
  const [threatsDateTo, setThreatsDateTo] = useState<string>(() => getToday());

  const [historyDateFrom, setHistoryDateFrom] = useState<string>(() => getDaysAgo(7));
  const [historyDateTo, setHistoryDateTo] = useState<string>(() => getToday());

  const [showNotifications, setShowNotifications] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const [readNotifications, setReadNotifications] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem("songket.admin.readNotifications");
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });

  const tx = T(lang);

  useLayoutEffect(() => {
    document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
  }, [dark]);

  useEffect(() => {
    try {
      localStorage.setItem("songket.admin.dark", dark ? "1" : "0");
    } catch {
      // ignore storage errors
    }
  }, [dark]);

  useEffect(() => {
    try {
      localStorage.setItem("songket.admin.lang", lang);
    } catch {
      // ignore storage errors
    }
  }, [lang]);

  const calcDaysNeeded = useCallback(() => {
    const checkRange = (from: string, to: string) => {
      try {
        const diffMs = new Date(to).getTime() - new Date(from).getTime();
        return Math.max(31, Math.ceil(diffMs / (1000 * 60 * 60 * 24)) + 1);
      } catch {
        return 31;
      }
    };
    return Math.max(
      31,
      checkRange(homeDateFrom, homeDateTo),
      checkRange(threatsDateFrom, threatsDateTo),
      checkRange(historyDateFrom, historyDateTo)
    );
  }, [homeDateFrom, homeDateTo, threatsDateFrom, threatsDateTo, historyDateFrom, historyDateTo]);

  const loadData = useCallback(async (isRefresh = false, queryDays = 31) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const data = await fetchDashboardData(queryDays);
      if (data && data.dashboard) {
        data.dashboard.days = queryDays;
      }
      setApiData(data);
    } catch (err: any) {
      console.error("Dashboard fetch error:", err);
      setError(err?.message || "Failed to load dashboard data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    loadData(false, 31);

    // Auto-retry at 800ms and 2200ms in case Telegram Desktop native webview bridge initialized late
    const t1 = setTimeout(() => {
      if (mounted) loadData(false, 31);
    }, 800);

    const t2 = setTimeout(() => {
      if (mounted) loadData(false, 31);
    }, 2200);

    return () => {
      mounted = false;
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [loadData]);

  // Expand history data if any date filter requires more days than currently loaded
  useEffect(() => {
    const needed = calcDaysNeeded();
    const current = apiData?.dashboard?.days || 0;
    if (needed > current && current > 0) {
      loadData(false, needed);
    }
  }, [calcDaysNeeded, apiData?.dashboard?.days, loadData]);

  const handleLogout = () => {
    setSessionToken("");
    setManageUnlocked(false);
    loadData(false, 31);
  };

  const tg = getTelegramWebApp();
  const user = apiData?.user || getTelegramUser() || tg?.initDataUnsafe?.user || mockUser;
  const isSuperAdmin = apiData?.is_super_admin ?? false;

  const NAV_ITEMS: { id: Nav; icon: React.ReactElement; label: string }[] = [
    { id: "dashboard", icon: <LayoutDashboard size={20} />, label: tx.home },
    { id: "groups", icon: <MessageSquare size={20} />, label: tx.groups },
    { id: "threats", icon: <AlertTriangle size={20} />, label: tx.threats },
    { id: "history", icon: <Clock size={20} />, label: tx.history },
    { id: "manage", icon: <Sliders size={20} />, label: tx.manage },
    { id: "account", icon: <User size={20} />, label: tx.account },
  ];

  const currentLabel = NAV_ITEMS.find(n => n.id === nav)?.label ?? "";
  const dashboard = apiData?.dashboard || null;
  const isMock = apiData?.isMock ?? (!apiData?.authorized);

  const allThreats = getThreatsListFromDashboard(dashboard);
  const unreadThreats = allThreats.filter(t => !readNotifications.has(t.id));
  const threatCount = unreadThreats.length;

  const views: Record<Nav, React.ReactElement> = {
    dashboard: (
      <HomeView
        dashboard={dashboard}
        lang={lang}
        isMock={isMock}
        dateFrom={homeDateFrom}
        dateTo={homeDateTo}
        onDateChange={(from, to) => {
          setHomeDateFrom(from);
          setHomeDateTo(to);
        }}
        onNavigate={tab => setNav(tab)}
      />
    ),
    groups: <GroupsView dashboard={dashboard} lang={lang} />,
    threats: (
      <ThreatsView
        dashboard={dashboard}
        lang={lang}
        dateFrom={threatsDateFrom}
        dateTo={threatsDateTo}
        onDateChange={(from, to) => {
          setThreatsDateFrom(from);
          setThreatsDateTo(to);
        }}
      />
    ),
    history: (
      <HistoryView
        dashboard={dashboard}
        lang={lang}
        dateFrom={historyDateFrom}
        dateTo={historyDateTo}
        onDateChange={(from, to) => {
          setHistoryDateFrom(from);
          setHistoryDateTo(to);
        }}
      />
    ),
    manage: !apiData?.authorized ? (
      <div style={{ background: G.surface, border: `1px solid ${G.goldBorder}`, borderRadius: 16, padding: "28px 20px", textAlign: "center", margin: "20px auto", maxWidth: 400 }}>
        <ShieldAlert size={40} color={G.warn} style={{ marginBottom: 14 }} />
        <div style={{ fontSize: 17, fontWeight: 800, color: G.text, marginBottom: 8 }}>
          <span className={kh(lang)}>{tx.unauthorizedTitle}</span>
        </div>
        <div style={{ fontSize: 13, color: G.textSec, lineHeight: 1.5, marginBottom: 24 }}>
          <span className={kh(lang)}>{tx.unauthorizedDesc}</span>
        </div>

        <button
          onClick={() => openTelegramDirect("Sin_Hong")}
          style={{
            background: G.gold,
            color: "#1a1200",
            border: "none",
            borderRadius: 8,
            padding: "12px 20px",
            fontWeight: 800,
            fontSize: 13,
            cursor: "pointer",
            width: "100%",
          }}
        >
          💬 {lang === "km" ? "ទាក់ទងទៅ @Sin_Hong ដើម្បីបើកដំណើរការ" : "Contact @Sin_Hong to Unlock"}
        </button>
      </div>
    ) : !manageUnlocked ? (
      <PinGate
        mode={apiData?.pin_exists ? "login" : "setup"}
        locked={apiData?.locked || 0}
        lang={lang}
        onSuccess={() => {
          setManageUnlocked(true);
        }}
      />
    ) : (
      <ManageView
        config={apiData?.config}
        plans={apiData?.plans}
        subscriptions={apiData?.subscriptions}
        lang={lang}
        isSuperAdmin={isSuperAdmin}
        onRefresh={() => loadData(true, 31)}
      />
    ),
    account: <AccountView user={user} dashboard={dashboard} dark={dark} setDark={setDark} lang={lang} setLang={setLang} onLogout={handleLogout} />,
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100dvh", background: G.bg, color: G.text, fontFamily: "Outfit, sans-serif" }}>
      {upgradeOpen && <UpgradeModal onClose={() => setUpgradeOpen(false)} lang={lang} />}

      <header style={{ padding: "12px 16px", borderBottom: `1px solid ${G.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", background: G.surface, flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Link to="/?home=1" state={{ fromAdmin: true }} style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, borderRadius: 7, border: `1px solid ${G.border}`, color: G.muted, textDecoration: "none" }} title="Landing Page">
            <ArrowLeft size={13} />
          </Link>
          <LogoMark size={34} />
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontWeight: 800, fontSize: 13, color: G.gold }}>SongKet</span>
              <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 4, background: isMock ? "rgba(224,160,32,0.18)" : "rgba(34,197,94,0.15)", color: isMock ? G.warn : G.safe, fontWeight: 700, letterSpacing: "0.04em" }}>
                {isMock ? "PREVIEW" : "LIVE"}
              </span>
            </div>
            <div style={{ fontSize: 10, color: G.muted, letterSpacing: "0.06em", fontWeight: 600 }}>{currentLabel}</div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            onClick={() => loadData(true, calcDaysNeeded())}
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
            title={tx.refresh}
          >
            <RefreshCw size={13} className={refreshing || loading ? "spin-animation" : ""} />
          </button>

          <button
            onClick={() => setShowNotifications(s => !s)}
            style={{
              background: showNotifications ? "rgba(212,167,44,0.12)" : "transparent",
              border: `1px solid ${showNotifications ? G.goldBorder : G.border}`,
              color: showNotifications ? G.gold : G.textSec,
              borderRadius: 8,
              width: 32,
              height: 32,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
            }}
            title={lang === "km" ? "ជូនដំណឹង" : "Notifications"}
          >
            <Bell size={14} />
            {threatCount > 0 && (
              <span
                style={{
                  position: "absolute",
                  top: -4,
                  right: -4,
                  background: G.danger,
                  color: "#fff",
                  fontSize: 9,
                  fontWeight: 800,
                  borderRadius: 10,
                  minWidth: 16,
                  height: 16,
                  padding: "0 3px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  lineHeight: 1,
                }}
              >
                {threatCount > 99 ? "99+" : threatCount}
              </span>
            )}
          </button>

          {manageUnlocked && (
            <button
              onClick={handleLogout}
              style={{
                background: "transparent",
                border: `1px solid ${G.border}`,
                color: G.danger,
                borderRadius: 8,
                width: 32,
                height: 32,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              title={tx.logout}
            >
              <LogOut size={14} />
            </button>
          )}

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

      {showNotifications && (
        <div
          style={{
            position: "fixed",
            top: 56,
            right: 16,
            width: 300,
            maxHeight: 400,
            overflowY: "auto",
            background: G.surface,
            border: `1px solid ${G.border}`,
            borderRadius: 14,
            boxShadow: "0 12px 40px rgba(0,0,0,0.4)",
            zIndex: 150,
            padding: "12px 0",
          }}
        >
          <div style={{ padding: "0 14px 10px", borderBottom: `1px solid ${G.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: G.text }}>
              <span className={kh(lang)}>{lang === "km" ? "ជូនដំណឹង" : "Notifications"}</span>
            </span>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              {threatCount > 0 && (
                <button
                  onClick={() => {
                    const allIds = allThreats.map(t => t.id);
                    const next = new Set(readNotifications);
                    allIds.forEach(id => next.add(id));
                    setReadNotifications(next);
                    try {
                      localStorage.setItem("songket.admin.readNotifications", JSON.stringify([...next]));
                    } catch {}
                  }}
                  style={{ background: "transparent", border: "none", color: G.gold, cursor: "pointer", fontSize: 10, fontWeight: 600, padding: 0 }}
                >
                  <span className={kh(lang)}>{lang === "km" ? "អានទាំងអស់" : "Mark all read"}</span>
                </button>
              )}
              <button
                onClick={() => setShowNotifications(false)}
                style={{ background: "transparent", border: "none", color: G.muted, cursor: "pointer", padding: 2 }}
              >
                <X size={14} />
              </button>
            </div>
          </div>
          {threatCount === 0 ? (
            <div style={{ padding: "24px 14px", textAlign: "center", color: G.muted, fontSize: 12 }}>
              <span className={kh(lang)}>{lang === "km" ? "គ្មានជូនដំណឹងថ្មី" : "No new notifications"}</span>
            </div>
          ) : (
            unreadThreats.slice(0, 10).map(tr => (
              <div
                key={tr.id}
                style={{ padding: "10px 14px", borderBottom: `1px solid ${G.border}`, cursor: "pointer" }}
                onClick={() => {
                  const next = new Set(readNotifications);
                  next.add(tr.id);
                  setReadNotifications(next);
                  try {
                    localStorage.setItem("songket.admin.readNotifications", JSON.stringify([...next]));
                  } catch {}
                  setShowNotifications(false);
                  setNav("history");
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: tr.risk === "critical" ? G.danger : G.warn }}>{tr.type}</span>
                  <span style={{ fontSize: 9, color: G.muted }}>{tr.date}</span>
                </div>
                <div style={{ fontSize: 11, color: G.textSec, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tr.content}</div>
                <div style={{ fontSize: 10, color: G.muted, marginTop: 2 }}>{tr.group}</div>
              </div>
            ))
          )}
        </div>
      )}

      {apiData && !apiData.authorized && (
        <div style={{ background: "rgba(212,167,44,0.12)", borderBottom: `1px solid ${G.goldBorder}`, padding: "10px 16px", display: "flex", flexDirection: "column", gap: 6, flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <ShieldAlert size={16} color={G.warn} />
              <div style={{ fontSize: 12, color: G.text }}>
                <strong style={{ color: G.gold }}>Preview Mode</strong> — Contact <strong>@Sin_Hong</strong> to enable live protection for your group.
              </div>
            </div>
            <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
              <button
                onClick={async () => {
                  try {
                    const granted = await requestTelegramWriteAccess();
                    if (granted) {
                      loadData(true, 31);
                    } else {
                      openTelegramDirect("Songket_bot");
                    }
                  } catch {
                    openTelegramDirect("Songket_bot");
                  }
                }}
                style={{
                  background: G.gold,
                  color: "#1a1200",
                  border: "none",
                  borderRadius: 6,
                  padding: "5px 12px",
                  fontSize: 11,
                  fontWeight: 800,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                ⚡ {lang === "km" ? "ភ្ជាប់គណនី Telegram" : "Connect Telegram"}
              </button>
              <button
                onClick={() => setShowDebug(s => !s)}
                style={{
                  background: "transparent",
                  border: `1px solid ${G.border}`,
                  color: G.muted,
                  borderRadius: 6,
                  padding: "4px 8px",
                  fontSize: 10,
                  cursor: "pointer",
                }}
              >
                {showDebug ? "Hide Debug" : "🔍 Debug Log"}
              </button>
              <button onClick={() => openTelegramDirect("Sin_Hong")} style={{ background: "transparent", border: `1px solid ${G.goldBorder}`, color: G.gold, borderRadius: 6, padding: "5px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                Contact @Sin_Hong
              </button>
            </div>
          </div>
          {showDebug && (
            <div style={{ background: G.surface, border: `1px solid ${G.border}`, borderRadius: 8, padding: "8px 10px", fontSize: 10, fontFamily: "monospace", color: G.muted, marginTop: 4, wordBreak: "break-all" }}>
              <div><strong>User ID:</strong> {user?.id || "None"} (@{user?.username || "none"})</div>
              <div><strong>API Error:</strong> {apiData.error || "None"}</div>
              <div><strong>InitData cached:</strong> {typeof window !== "undefined" ? (sessionStorage.getItem("songket_init_data") || localStorage.getItem("songket_init_data") ? "Yes (length " + (sessionStorage.getItem("songket_init_data") || localStorage.getItem("songket_init_data") || "").length + ")" : "None") : "SSR"}</div>
              <div><strong>URL:</strong> {typeof window !== "undefined" ? window.location.href : ""}</div>
            </div>
          )}
        </div>
      )}

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
              onClick={() => loadData(false, calcDaysNeeded())}
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
