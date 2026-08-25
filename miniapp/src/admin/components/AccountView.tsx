import { useState } from "react";
import { Moon, Sun, UserCheck } from "lucide-react";
import { G, type Lang } from "../palette";
import { t as T, kh } from "../i18n";
import type { DashboardData, TelegramUser } from "../types";
import { SectionHeader } from "./Badges";

interface AccountViewProps {
  user?: TelegramUser;
  dashboard?: DashboardData | null;
  dark: boolean;
  setDark: (v: boolean) => void;
  lang: Lang;
  setLang: (l: Lang) => void;
}

export default function AccountView({ user, dashboard, dark, setDark, lang, setLang }: AccountViewProps) {
  const tx = T(lang);
  const [org, setOrg] = useState("Group Security Admin");
  const [email, setEmail] = useState("admin@telegram.security");
  const [telegram, setTelegram] = useState(user?.username ? `@${user.username}` : user?.first_name || "@admin");
  const [notifTelegram, setNotifTelegram] = useState(true);
  const [notifEmail, setNotifEmail] = useState(false);
  const [notifPDF, setNotifPDF] = useState(false);
  const [saved, setSaved] = useState(false);

  function handleSave() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

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
      <SectionHeader title={tx.account} sub={tx.accountSub} lang={lang} />

      {/* User Telegram Identity Card */}
      <div style={{ background: G.surface, border: `1px solid ${G.goldBorder}`, borderRadius: 14, padding: "18px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: G.goldSurface, border: `1px solid ${G.goldBorder}`, display: "flex", alignItems: "center", justifyContent: "center", color: G.gold }}>
            <UserCheck size={22} />
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

      <div style={{ background: G.surface, border: `1px solid ${G.border}`, borderRadius: 14, padding: "18px" }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: G.textSec, marginBottom: 16 }}>
          <span className={kh(lang)}>{tx.notifications}</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {[
            { label: tx.notifTelegram, on: notifTelegram, toggle: () => setNotifTelegram(v => !v) },
            { label: tx.notifEmail, on: notifEmail, toggle: () => setNotifEmail(v => !v) },
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
        onClick={handleSave}
        style={{
          background: saved ? G.safe : G.gold,
          color: "#1a1200",
          border: "none",
          borderRadius: 10,
          padding: "12px 0",
          fontWeight: 700,
          cursor: "pointer",
          fontSize: 14,
          width: "100%",
          transition: "background 0.2s",
        }}
      >
        <span className={kh(lang)}>{saved ? tx.saved : tx.save}</span>
      </button>
    </div>
  );
}
