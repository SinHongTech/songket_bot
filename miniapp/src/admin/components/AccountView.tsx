import { useState, useEffect } from "react";
import { Moon, Sun, LogOut, ShieldCheck, KeyRound, Clock, BellRing, Check } from "lucide-react";
import { G, type Lang } from "../palette";
import { t as T, kh } from "../i18n";
import type { DashboardData, TelegramUser, UserSettings } from "../types";
import { SectionHeader } from "./Badges";
import TotpModal from "./TotpModal";
import { getTotpStatus, saveUserSettings } from "../api";
import { safeStorage } from "@/shared/storage";

interface AccountViewProps {
  user?: TelegramUser;
  dashboard?: DashboardData | null;
  userSettings?: UserSettings | null;
  dark: boolean;
  setDark: (v: boolean) => void;
  lang: Lang;
  setLang: (l: Lang) => void;
  onLogout: () => void;
  onRefresh?: () => void;
}

export default function AccountView({
  user,
  dashboard,
  userSettings,
  dark,
  setDark,
  lang,
  setLang,
  onLogout,
  onRefresh,
}: AccountViewProps) {
  const tx = T(lang);
  const [dailyReportEnabled, setDailyReportEnabled] = useState<boolean>(() => {
    if (userSettings?.daily_report_enabled !== undefined) return userSettings.daily_report_enabled;
    if (userSettings?.enabled !== undefined) return userSettings.enabled;
    const cached = safeStorage.getItem("songket.daily_report_enabled");
    return cached === null ? true : cached === "1";
  });
  const [dailyReportTime, setDailyReportTime] = useState<string>(() => {
    return userSettings?.daily_report_time || userSettings?.time || safeStorage.getItem("songket.daily_report_time") || "07:00";
  });
  const [customTimeInput, setCustomTimeInput] = useState<string>(() => {
    return userSettings?.daily_report_time || userSettings?.time || safeStorage.getItem("songket.daily_report_time") || "07:00";
  });
  const [, setSavingSettings] = useState(false);
  const [settingsSavedToast, setSettingsSavedToast] = useState(false);

  useEffect(() => {
    if (userSettings) {
      const en = userSettings.daily_report_enabled !== undefined ? userSettings.daily_report_enabled : userSettings.enabled;
      if (en !== undefined) {
        setDailyReportEnabled(en);
        safeStorage.setItem("songket.daily_report_enabled", en ? "1" : "0");
      }
      const tm = userSettings.daily_report_time || userSettings.time;
      if (tm) {
        setDailyReportTime(tm);
        setCustomTimeInput(tm);
        safeStorage.setItem("songket.daily_report_time", tm);
      }
    }
  }, [userSettings]);

  async function handleUpdateDailySettings(newEnabled: boolean, newTime: string) {
    let cleanTime = (newTime || "07:00").trim();
    if (/^([0-9]|0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$/.test(cleanTime)) {
      const [h, m] = cleanTime.split(":");
      cleanTime = `${h.padStart(2, "0")}:${m.padStart(2, "0")}`;
    }
    setDailyReportEnabled(newEnabled);
    setDailyReportTime(cleanTime);
    setCustomTimeInput(cleanTime);
    safeStorage.setItem("songket.daily_report_enabled", newEnabled ? "1" : "0");
    safeStorage.setItem("songket.daily_report_time", cleanTime);
    setSavingSettings(true);
    try {
      await saveUserSettings({
        daily_report_enabled: newEnabled,
        daily_report_time: cleanTime,
      });
      setSettingsSavedToast(true);
      setTimeout(() => setSettingsSavedToast(false), 2500);
      onRefresh?.();
    } catch (e) {
      console.error("Failed to save user daily report settings:", e);
    } finally {
      setSavingSettings(false);
    }
  }
  const [org, setOrg] = useState(() => {
    return safeStorage.getItem("songket.admin.org") || "Group Security Admin";
  });
  const [email, setEmail] = useState(() => {
    return safeStorage.getItem("songket.admin.email") || "admin@telegram.security";
  });
  const [telegram, setTelegram] = useState(() => {
    return (
      safeStorage.getItem("songket.admin.telegram") ||
      (user?.username ? `@${user.username}` : user?.first_name || "@admin")
    );
  });
  const [notifTelegram, setNotifTelegram] = useState(() => {
    const v = safeStorage.getItem("songket.admin.notifTelegram");
    return v === null ? true : v === "1";
  });
  const [notifPDF, setNotifPDF] = useState(() => {
    const v = safeStorage.getItem("songket.admin.notifPDF");
    return v === null ? false : v === "1";
  });
  const [totpEnabled, setTotpEnabled] = useState(false);
  const [totpModalOpen, setTotpModalOpen] = useState(false);
  const [totpModalMode, setTotpModalMode] = useState<"setup" | "disable">("setup");

  const isKm = lang === "km";

  useEffect(() => {
    safeStorage.setItem("songket.admin.org", org);
  }, [org]);

  useEffect(() => {
    safeStorage.setItem("songket.admin.email", email);
  }, [email]);

  useEffect(() => {
    safeStorage.setItem("songket.admin.telegram", telegram);
  }, [telegram]);

  useEffect(() => {
    safeStorage.setItem("songket.admin.notifTelegram", notifTelegram ? "1" : "0");
  }, [notifTelegram]);

  useEffect(() => {
    safeStorage.setItem("songket.admin.notifPDF", notifPDF ? "1" : "0");
  }, [notifPDF]);

  useEffect(() => {
    getTotpStatus().then(res => {
      if (res.ok && res.totp_enabled !== undefined) {
        setTotpEnabled(res.totp_enabled);
      }
    });
  }, []);

  const inputStyle = {
    background: G.surface2,
    border: `1px solid ${G.border}`,
    borderRadius: 8,
    padding: "9px 14px",
    color: G.text,
    fontSize: 13,
    outline: "none",
    width: "100%",
    fontFamily: "Outfit, sans-serif",
  };

  function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
    return (
      <button
        onClick={onToggle}
        style={{
          width: 44,
          height: 24,
          borderRadius: 12,
          border: "none",
          background: on ? G.gold : G.surface2,
          cursor: "pointer",
          position: "relative",
          flexShrink: 0,
          transition: "background 0.2s",
        }}
      >
        <span
          style={{
            position: "absolute",
            top: 3,
            left: on ? 22 : 3,
            width: 18,
            height: 18,
            borderRadius: "50%",
            background: on ? "#1a1200" : G.muted,
            transition: "left 0.2s",
          }}
        />
      </button>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {totpModalOpen && (
        <TotpModal
          mode={totpModalMode}
          lang={lang}
          onClose={() => setTotpModalOpen(false)}
          onSuccess={enabled => {
            setTotpEnabled(enabled);
          }}
        />
      )}

      <SectionHeader title={tx.account} sub={tx.accountSub} lang={lang} />

      {/* User Telegram Identity Card */}
      <div style={{ background: G.surface, border: `1px solid ${G.goldBorder}`, borderRadius: 14, padding: "18px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 44, height: 44, borderRadius: "50%", background: "#3b9eef", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 16, fontWeight: 700, fontFamily: "Outfit, sans-serif" }}>
            {user?.first_name ? user.first_name.charAt(0).toUpperCase() : "A"}{user?.last_name ? user.last_name.charAt(0).toUpperCase() : ""}
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, color: G.text }}>
              {user?.first_name || "Admin User"}
            </div>
            <div style={{ fontSize: 12, color: G.muted, marginTop: 2 }}>
              {user?.username ? `@${user.username} · ` : ""}ID: {user?.id || dashboard?.user_id || "N/A"}
            </div>
          </div>
        </div>
      </div>

      {/* 2FA Security Card */}
      <div style={{ background: G.surface, border: `1px solid ${totpEnabled ? "rgba(34,197,94,0.4)" : G.border}`, borderRadius: 14, padding: "18px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <ShieldCheck size={20} color={totpEnabled ? G.safe : G.muted} />
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: G.text }}>
                <span className={kh(lang)}>{isKm ? "ផ្ទៀងផ្ទាត់ ២ ជាន់ (2FA)" : "Two-Factor Auth (2FA)"}</span>
              </div>
              <div style={{ fontSize: 11, color: G.muted, marginTop: 2 }}>
                <span className={kh(lang)}>{isKm ? "Google Authenticator / RFC 6238" : "Google Authenticator / 1Password"}</span>
              </div>
            </div>
          </div>
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              padding: "3px 8px",
              borderRadius: 6,
              background: totpEnabled ? "rgba(34,197,94,0.15)" : G.surface2,
              color: totpEnabled ? G.safe : G.muted,
              border: `1px solid ${totpEnabled ? G.safe : G.border}`,
            }}
          >
            {totpEnabled ? (isKm ? "🟢 បានភ្ជាប់" : "🟢 Enabled") : (isKm ? "⚪ មិនទាន់ភ្ជាប់" : "⚪ Disabled")}
          </span>
        </div>

        <p style={{ fontSize: 12, color: G.textSec, lineHeight: 1.5, margin: "0 0 14px" }}>
          <span className={kh(lang)}>
            {isKm
              ? "ការពារការកំណត់ PIN ឡើងវិញ និងសុវត្ថិភាពផ្ទាំងគ្រប់គ្រងដោយប្រើកូដ ៦ ខ្ទង់ពីទូរស័ព្ទដៃរបស់អ្នក។"
              : "Protect your PIN resets and admin panel with live 6-digit rolling codes from your physical phone."}
          </span>
        </p>

        {totpEnabled ? (
          <button
            onClick={() => {
              setTotpModalMode("disable");
              setTotpModalOpen(true);
            }}
            style={{
              background: "transparent",
              border: `1px solid ${G.danger}`,
              color: G.danger,
              borderRadius: 8,
              padding: "7px 14px",
              fontSize: 11,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            <span className={kh(lang)}>{isKm ? "បិទដំណើរការ 2FA" : "Disable 2FA"}</span>
          </button>
        ) : (
          <button
            onClick={() => {
              setTotpModalMode("setup");
              setTotpModalOpen(true);
            }}
            style={{
              background: G.gold,
              color: "#1a1200",
              border: "none",
              borderRadius: 8,
              padding: "8px 16px",
              fontSize: 12,
              fontWeight: 800,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <KeyRound size={13} />
            <span className={kh(lang)}>{isKm ? "+ ភ្ជាប់ Google Authenticator" : "+ Enable Google Authenticator"}</span>
          </button>
        )}
      </div>

      <div style={{ background: G.surface, border: `1px solid ${G.border}`, borderRadius: 14, padding: "18px" }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: G.textSec, marginBottom: 14 }}>
          <span className={kh(lang)}>{tx.appearance}</span>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          {(["dark", "light"] as const).map(val => (
            <button
              key={val}
              onClick={() => {
                setDark(val === "dark");
                document.documentElement.setAttribute("data-theme", val);
              }}
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 7,
                padding: "10px 0",
                borderRadius: 10,
                border: `1.5px solid ${dark === (val === "dark") ? G.gold : G.border}`,
                background: dark === (val === "dark") ? G.goldSurface : "transparent",
                color: dark === (val === "dark") ? G.gold : G.muted,
                cursor: "pointer",
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              {val === "dark" ? <Moon size={14} /> : <Sun size={14} />}
              <span className={kh(lang)}>{val === "dark" ? tx.dark : tx.light}</span>
            </button>
          ))}
        </div>
      </div>

      <div style={{ background: G.surface, border: `1px solid ${G.border}`, borderRadius: 14, padding: "18px" }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: G.textSec, marginBottom: 14 }}>
          <span className={kh(lang)}>{tx.language}</span>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={() => setLang("en")}
            style={{
              flex: 1,
              padding: "10px 0",
              borderRadius: 10,
              border: `1.5px solid ${lang === "en" ? G.gold : G.border}`,
              background: lang === "en" ? G.goldSurface : "transparent",
              color: lang === "en" ? G.gold : G.muted,
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 700,
              fontFamily: "Outfit, sans-serif",
            }}
          >
            English
          </button>
          <button
            onClick={() => setLang("km")}
            style={{
              flex: 1,
              padding: "10px 0",
              borderRadius: 10,
              border: `1.5px solid ${lang === "km" ? G.gold : G.border}`,
              background: lang === "km" ? G.goldSurface : "transparent",
              color: lang === "km" ? G.gold : G.muted,
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 700,
              fontFamily: "'Kantumruy Pro', sans-serif",
            }}
          >
            ខ្មែរ
          </button>
        </div>
      </div>

      <div style={{ background: G.surface, border: `1px solid ${G.border}`, borderRadius: 14, padding: "18px" }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: G.textSec, marginBottom: 16 }}>
          <span className={kh(lang)}>{tx.profile}</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {([["org", org, setOrg], ["email", email, setEmail], ["telegram", telegram, setTelegram]] as const).map(([key, val, setter]) => (
            <div key={key}>
              <label style={{ fontSize: 12, color: G.muted, display: "block", marginBottom: 6 }}>
                <span className={kh(lang)}>{tx[key as "org" | "email" | "telegram"]}</span>
              </label>
              <input value={val} onChange={e => (setter as any)(e.target.value)} style={inputStyle} />
            </div>
          ))}
        </div>
      </div>

      {/* ── Daily Security Report DM Scheduler ── */}
      <div style={{ background: G.surface, border: `1px solid ${dailyReportEnabled ? G.goldBorder : G.border}`, borderRadius: 14, padding: "18px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <BellRing size={20} color={dailyReportEnabled ? G.gold : G.muted} />
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: G.text }}>
                <span className={kh(lang)}>
                  {isKm ? "របាយការណ៍សន្តិសុខប្រចាំថ្ងៃ (Daily DM Report)" : "Daily Security Summary (Telegram DM)"}
                </span>
              </div>
              <div style={{ fontSize: 11, color: G.muted, marginTop: 2 }}>
                <span className={kh(lang)}>
                  {isKm
                    ? "Bot នឹងផ្ញើសេចក្តីសង្ខេបស្កេនចូល Telegram DM ដោយស្វ័យប្រវត្តិ"
                    : "Automated scan summary delivered directly to your Telegram chat"}
                </span>
              </div>
            </div>
          </div>
          <Toggle
            on={dailyReportEnabled}
            onToggle={() => handleUpdateDailySettings(!dailyReportEnabled, dailyReportTime)}
          />
        </div>

        {dailyReportEnabled && (
          <div style={{ borderTop: `1px solid ${G.border}`, paddingTop: 14, marginTop: 10 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, color: G.text }}>
                <Clock size={14} color={G.gold} />
                <span className={kh(lang)}>
                  {isKm ? "ម៉ោងផ្ញើប្រចាំថ្ងៃ (Delivery Time - Cambodia GMT+7):" : "Scheduled Time (Asia/Phnom_Penh):"}
                </span>
              </div>
              <span style={{ fontSize: 13, fontWeight: 700, color: G.gold, fontFamily: "monospace" }}>
                {dailyReportTime}
              </span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 12 }}>
              {[
                { time: "07:00", label: "07:00 AM (Default)" },
                { time: "08:00", label: "08:00 AM" },
                { time: "09:00", label: "09:00 AM" },
                { time: "12:00", label: "12:00 PM" },
                { time: "18:00", label: "06:00 PM" },
                { time: "20:00", label: "08:00 PM" },
              ].map(opt => {
                const active = dailyReportTime === opt.time;
                return (
                  <button
                    key={opt.time}
                    onClick={() => handleUpdateDailySettings(true, opt.time)}
                    style={{
                      padding: "8px 4px",
                      borderRadius: 8,
                      border: `1px solid ${active ? G.gold : G.border}`,
                      background: active ? G.goldSurface : G.surface2,
                      color: active ? G.gold : G.textSec,
                      fontSize: 11,
                      fontWeight: active ? 700 : 500,
                      cursor: "pointer",
                      transition: "all 0.15s",
                    }}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <span style={{ fontSize: 11, color: G.muted }}>
                <span className={kh(lang)}>{isKm ? "ម៉ោងផ្ទាល់ខ្លួន (Custom):" : "Custom HH:MM:"}</span>
              </span>
              <input
                type="time"
                value={customTimeInput}
                onChange={(e) => {
                  setCustomTimeInput(e.target.value);
                  if (e.target.value) {
                    handleUpdateDailySettings(true, e.target.value);
                  }
                }}
                style={{
                  background: G.surface2,
                  border: `1px solid ${G.goldBorder}`,
                  borderRadius: 6,
                  color: G.text,
                  padding: "4px 8px",
                  fontSize: 12,
                  outline: "none",
                  fontFamily: "monospace",
                }}
              />
              <button
                onClick={() => handleUpdateDailySettings(true, customTimeInput)}
                style={{
                  background: G.gold,
                  color: "#1a1200",
                  border: "none",
                  borderRadius: 6,
                  padding: "5px 10px",
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                <span className={kh(lang)}>{isKm ? "រក្សាទុកម៉ោង" : "Save Time"}</span>
              </button>
              {settingsSavedToast && (
                <span style={{ fontSize: 11, color: G.safe, display: "flex", alignItems: "center", gap: 4 }}>
                  <Check size={12} /> {isKm ? "បានរក្សាទុក" : "Saved"}
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      <div style={{ background: G.surface, border: `1px solid ${G.border}`, borderRadius: 14, padding: "18px" }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: G.textSec, marginBottom: 16 }}>
          <span className={kh(lang)}>{tx.notifications}</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {[
            { label: tx.notifTelegram, on: notifTelegram, toggle: () => setNotifTelegram(v => !v) },
            { label: tx.notifPDF, on: notifPDF, toggle: () => setNotifPDF(v => !v) },
          ].map(n => (
            <div key={n.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span className={kh(lang)} style={{ fontSize: 13, color: G.textSec, paddingRight: 12 }}>
                {n.label}
              </span>
              <Toggle on={n.on} onToggle={n.toggle} />
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={onLogout}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          background: "transparent",
          border: `1.5px solid ${G.danger}`,
          color: G.danger,
          borderRadius: 10,
          padding: "12px 0",
          fontWeight: 700,
          cursor: "pointer",
          fontSize: 13,
          width: "100%",
          transition: "background 0.2s",
        }}
      >
        <LogOut size={16} />
        <span className={kh(lang)}>{tx.logout}</span>
      </button>
    </div>
  );
}
