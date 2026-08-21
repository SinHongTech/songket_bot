import { useState, useEffect } from "react";
import bunleapPhoto from "@/imports/telegram-cloud-photo-size-5-6070862094975832103-x.jpg";
import songketLogo from "@/imports/image-5.png";

// ─── i18n ─────────────────────────────────────────────────────────────────────

type Lang = "en" | "km";

const T = {
  en: {
    tagline: "TELEGRAM SECURITY BOT",
    hero_h1_a: "Don't click too fast.",
    hero_h1_b: "Let SongKet first.",
    hero_sub: "ការពារសហគមន៍ Telegram របស់អ្នក",
    hero_desc:
      "SongKet turns Telegram groups and channels into safer spaces by detecting threats before they can spread.",
    btn_start: "Get Started",
    btn_how: "See How It Works",
    trust: ["End-to-end encrypted", "Real-time scanning", "Built for Cambodia"],
    flow_msg: "Message",
    flow_scan: "Songket Scan",
    flow_safe: "Safe",
    flow_danger: "Dangerous",
    features_h: "Features",
    features: [
      {
        icon: "🛡️",
        title: "Real-Time Protection",
        desc: "Automatically scan files and links shared in Telegram groups the moment they're posted.",
      },
      {
        icon: "🔗",
        title: "Link & File Detection",
        desc: "Detect suspicious URLs, executable files, images, and documents before members open them.",
      },
      {
        icon: "👥",
        title: "Group Protection",
        desc: "Alert admins instantly and automatically restrict repeat offenders based on your rules.",
      },
    ],
    how_h: "How It Works",
    steps: [
      { num: "01", label: "Connect", desc: "Add Songket to your Telegram group in seconds. No technical setup required." },
      { num: "02", label: "Scan", desc: "Every file and link shared is automatically analyzed against threat databases." },
      { num: "03", label: "Protect", desc: "Dangerous content is detected, blocked, and your admins are alerted instantly." },
    ],
    pricing_h: "Pricing",
    pricing_sub: "Simple pricing. No hidden fees. Cancel anytime.",
    pricing_privacy: "🔒 All scans encrypted · No files stored · Privacy-first",
    plans: [
      {
        id: "free", name: "FREE", price: "$0", period: "/ month", groups: "1 Group",
        highlight: false, badge: null,
        features: ["1 group or channel", "Basic file & link scanning", "Security alerts to admins", "Personal chat scanning"],
        cta: "Start Free",
      },
      {
        id: "pro", name: "PRO", price: "$5", period: "/ month", groups: "Up to 5 Groups",
        highlight: true, badge: "MOST POPULAR",
        features: ["Up to 5 groups", "Advanced threat detection", "Automatic moderation", "Security reports", "Priority alerts", "90-day scan history"],
        cta: "Choose Pro",
      },
      {
        id: "business", name: "BUSINESS", price: "$15", period: "/ month", groups: "Up to 20 Groups",
        highlight: false, badge: null,
        features: ["Up to 20 groups", "Advanced protection suite", "Analytics dashboard", "Priority support", "Custom moderation rules", "Audit logs"],
        cta: "Get Business",
      },
    ],
    cta_h: "Secure your Telegram community with Songket.",
    cta_sub: "Join communities already protected by real-time threat detection.",
    cta_btn: "Protect My Group",
    selected: "✓ Selected",
    footer_copy: "REAL-TIME TELEGRAM SECURITY · 2026",
  },
  km: {
    tagline: "បូតសុវត្ថិភាព TELEGRAM",
    hero_h1_a: "កុំចុចលឿនពេក។",
    hero_h1_b: "ទុក SongKet មុន។",
    hero_sub: "Don't click too fast. Let SongKet first.",
    hero_desc:
      "SongKet ប្រែក្រុម និង channel Telegram ឱ្យក្លាយជាទីកន្លែងសុវត្ថិភាព ដោយរកឃើញការគំរាមកំហែងមុនពេលវាអាចរីករាលដាល។",
    btn_start: "ចាប់ផ្តើម",
    btn_how: "មើលរបៀបដំណើរការ",
    trust: ["គ្រីបគ្រប់បែប", "ស្កែនក្នុងពេលជាក់ស្តែង", "បង្កើតសម្រាប់កម្ពុជា"],
    flow_msg: "សារ",
    flow_scan: "ស្កែន Songket",
    flow_safe: "សុវត្ថិភាព",
    flow_danger: "គ្រោះថ្នាក់",
    features_h: "មុខងារ",
    features: [
      {
        icon: "🛡️",
        title: "ការការពារក្នុងពេលវេលាជាក់ស្តែង",
        desc: "ស្កែនដោយស្វ័យប្រវត្តិនូវឯកសារ និងតំណភ្ជាប់ដែលចែករំលែកក្នុងក្រុម Telegram ភ្លាមៗពេលប្រកាស។",
      },
      {
        icon: "🔗",
        title: "រកឃើញតំណភ្ជាប់ និងឯកសារ",
        desc: "រកឃើញ URL គួរឱ្យសង្ស័យ ឯកសារដែលអាចប្រតិបត្តិបាន រូបភាព និងឯកសារមុនពេលសមាជិករើសយក។",
      },
      {
        icon: "👥",
        title: "ការការពារក្រុម",
        desc: "ជូនដំណឹងដល់អ្នកគ្រប់គ្រងភ្លាមៗ និងដាក់កម្រិតដោយស្វ័យប្រវត្តិដល់អ្នកបំពានម្តងហើយម្តងទៀត។",
      },
    ],
    how_h: "របៀបដំណើរការ",
    steps: [
      { num: "០១", label: "តភ្ជាប់", desc: "បន្ថែម Songket ទៅក្នុងក្រុម Telegram របស់អ្នកក្នុងពេលវិនាទី។ មិនចាំបាច់ដំឡើងបច្ចេកទេស។" },
      { num: "០២", label: "ស្កែន", desc: "ឯកសារ និងតំណភ្ជាប់ដែលចែករំលែកគ្រប់ការ ត្រូវបានវិភាគស្វ័យប្រវត្តិទល់នឹងមូលដ្ឋានទិន្នន័យគំរាមកំហែង។" },
      { num: "០៣", label: "ការពារ", desc: "មាតិកាគ្រោះថ្នាក់ត្រូវបានរកឃើញ ទប់ស្កាត់ ហើយអ្នកគ្រប់គ្រងរបស់អ្នកត្រូវបានជូនដំណឹងភ្លាមៗ។" },
    ],
    pricing_h: "តម្លៃ",
    pricing_sub: "តម្លៃសាមញ្ញ។ គ្មានថ្លៃលាក់។ បោះបង់បានគ្រប់ពេល។",
    pricing_privacy: "🔒 ការស្កែនទាំងអស់ត្រូវបានអ៊ិនគ្រីប · គ្មានឯកសាររក្សាទុក · ឯករាជ្យភាពដំបូង",
    plans: [
      {
        id: "free", name: "ឥតគិតថ្លៃ", price: "$0", period: "/ ខែ", groups: "១ ក្រុម",
        highlight: false, badge: null,
        features: ["១ ក្រុម ឬ channel", "ស្កែនឯកសារ និងតំណភ្ជាប់មូលដ្ឋាន", "ការជូនដំណឹងសុវត្ថិភាព", "ស្កែនការជជែកផ្ទាល់ខ្លួន"],
        cta: "ចាប់ផ្តើមឥតគិតថ្លៃ",
      },
      {
        id: "pro", name: "PRO", price: "$5", period: "/ ខែ", groups: "រហូតដល់ ៥ ក្រុម",
        highlight: true, badge: "ពេញនិយមបំផុត",
        features: ["រហូតដល់ ៥ ក្រុម", "ការរកឃើញគំរាមកំហែងកម្រិតខ្ពស់", "ការគ្រប់គ្រងដោយស្វ័យប្រវត្តិ", "របាយការណ៍សុវត្ថិភាព", "ការជូនដំណឹងអាទិភាព", "ប្រវត្តិស្កែន ៩០ ថ្ងៃ"],
        cta: "ជ្រើសរើស Pro",
      },
      {
        id: "business", name: "អាជីវកម្ម", price: "$15", period: "/ ខែ", groups: "រហូតដល់ ២០ ក្រុម",
        highlight: false, badge: null,
        features: ["រហូតដល់ ២០ ក្រុម", "ការការពារកម្រិតខ្ពស់", "ផ្ទាំងវិភាគ", "ជំនួយអាទិភាព", "វិធានការគ្រប់គ្រងផ្ទាល់ខ្លួន", "កំណត់ហេតុ"],
        cta: "ទទួលយកអាជីវកម្ម",
      },
    ],
    cta_h: "ការពារសហគមន៍ Telegram របស់អ្នកជាមួយ Songket។",
    cta_sub: "ចូលរួមជាមួយសហគមន៍ដែលត្រូវបានការពារដោយការរកឃើញគំរាមកំហែងក្នុងពេលវេលាជាក់ស្តែង។",
    cta_btn: "ការពារក្រុមរបស់ខ្ញុំ",
    selected: "✓ បានជ្រើស",
    footer_copy: "សុវត្ថិភាព TELEGRAM ក្នុងពេលជាក់ស្តែង · ២០២៦",
  },
} as const;

// ─── Flow Diagram ─────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function FlowDiagram({ t }: { t: any }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 0,
      background: "rgba(255,255,255,0.7)", borderRadius: 12,
      border: "1px solid var(--border-gold)",
      padding: "14px 16px", marginTop: 24,
      backdropFilter: "blur(8px)",
      overflowX: "auto",
    }}>
      <div style={{ flexShrink: 0, textAlign: "center", minWidth: 72 }}>
        <div style={{
          width: 42, height: 42, borderRadius: 10,
          background: "linear-gradient(135deg, #2aabee, #229ed9)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 20, margin: "0 auto 6px",
          boxShadow: "0 2px 8px rgba(42,171,238,0.3)",
        }}>✈️</div>
        <span className="khmer" style={{ fontSize: 10, color: "var(--muted)", fontWeight: 500 }}>{t.flow_msg}</span>
      </div>

      <div style={{ flex: 1, minWidth: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ height: 1, flex: 1, background: "linear-gradient(90deg, var(--border), var(--gold-light))" }} />
        <span style={{ color: "var(--gold)", fontSize: 12, margin: "0 2px" }}>›</span>
      </div>

      <div style={{ flexShrink: 0, textAlign: "center", minWidth: 88 }}>
        <div style={{
          width: 42, height: 42, borderRadius: 10,
          background: "linear-gradient(135deg, #f9e8a0, #e8cd70)",
          border: "1.5px solid var(--gold)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 20, margin: "0 auto 6px",
          boxShadow: "0 2px 12px rgba(212,167,44,0.35)",
          animation: "icon-glow 2.5s ease-in-out infinite",
        }}>🛡️</div>
        <span className="khmer" style={{ fontSize: 10, color: "var(--gold)", fontWeight: 700 }}>{t.flow_scan}</span>
      </div>

      <div style={{ flex: 1, minWidth: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ color: "var(--gold)", fontSize: 12, margin: "0 2px" }}>›</span>
        <div style={{ height: 1, flex: 1, background: "linear-gradient(90deg, var(--gold-light), var(--border))" }} />
      </div>

      <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", gap: 5 }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 6, padding: "5px 10px",
          borderRadius: 7, background: "rgba(26,122,58,0.08)", border: "1px solid rgba(26,122,58,0.22)",
        }}>
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#1a7a3a", flexShrink: 0 }} />
          <span className="khmer" style={{ fontSize: 11, fontWeight: 600, color: "#1a7a3a" }}>{t.flow_safe}</span>
        </div>
        <div style={{
          display: "flex", alignItems: "center", gap: 6, padding: "5px 10px",
          borderRadius: 7, background: "rgba(184,32,32,0.08)", border: "1px solid rgba(184,32,32,0.22)",
        }}>
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#b82020", flexShrink: 0 }} />
          <span className="khmer" style={{ fontSize: 11, fontWeight: 600, color: "#b82020" }}>{t.flow_danger}</span>
        </div>
      </div>
    </div>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  const [lang, setLang] = useState<Lang>("en");
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [dark, setDark] = useState(true);
  const t = T[lang];
  const isKm = lang === "km";

  const bodyFont = isKm ? "'Kantumruy Pro', sans-serif" : "'Outfit', sans-serif";

  // Initialize Telegram Mini App
  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (tg) { tg.ready(); tg.expand(); }
  }, []);

  // Apply theme to <html> on mount and on change
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
  }, [dark]);

  function toggleTheme() {
    const next = !dark;
    setDark(next);
    document.documentElement.setAttribute("data-theme", next ? "dark" : "light");
  }

  function scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <div style={{ minHeight: "100%", background: "var(--bg)", color: "var(--text)", fontFamily: bodyFont }}>

      {/* ── Header ── */}
      <header style={{
        position: "sticky", top: 0, zIndex: 50,
        background: "var(--header-bg)",
        borderBottom: "1px solid var(--border)",
        backdropFilter: "blur(12px)",
        padding: "12px 20px",
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <img src={songketLogo} alt="SongKet logo" style={{ width: 42, height: 42, objectFit: "contain", borderRadius: 10, flexShrink: 0 }} />
          <div>
            <span className="gold-shimmer" style={{ fontSize: 16, fontWeight: 800, letterSpacing: "-0.01em", display: "block", lineHeight: 1 }}>Songket</span>
            <span className="khmer" style={{ fontSize: 10, color: "var(--muted)", lineHeight: 1, display: "block", marginTop: 1 }}>សង្កេត</span>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {/* Live badge */}
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span className="dot-pulse" style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--safe)", flexShrink: 0 }} />
            <span className="mono" style={{ fontSize: 9, color: "var(--safe)", letterSpacing: "0.14em" }}>LIVE</span>
          </div>

          {/* Admin Dashboard link */}
          <a
            href="/dashboard"
            style={{
              display: "flex", alignItems: "center", gap: 5,
              padding: "4px 12px", borderRadius: 8,
              border: "1.5px solid var(--border-gold)",
              background: "rgba(212,167,44,0.06)",
              color: "var(--gold)", fontSize: 11, fontWeight: 700,
              textDecoration: "none", letterSpacing: "0.04em",
            }}
          >
            Admin →
          </a>

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            style={{
              width: 30, height: 30, borderRadius: 8,
              border: "1.5px solid var(--border-gold)",
              background: "rgba(212,167,44,0.06)",
              cursor: "pointer", fontSize: 15,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            {dark ? "☀️" : "🌙"}
          </button>

          {/* Language toggle */}
          <button
            onClick={() => setLang(l => l === "en" ? "km" : "en")}
            style={{
              display: "flex", alignItems: "center", gap: 1,
              padding: "3px 4px", borderRadius: 8,
              border: "1.5px solid var(--border-gold)",
              background: "rgba(212,167,44,0.06)",
              cursor: "pointer", overflow: "hidden",
            }}
          >
            {(["en", "km"] as Lang[]).map(l => (
              <span key={l} style={{
                padding: "3px 8px", borderRadius: 5, fontSize: 10, fontWeight: 700,
                fontFamily: l === "km" ? "'Kantumruy Pro', sans-serif" : "'Outfit', sans-serif",
                letterSpacing: l === "en" ? "0.06em" : 0,
                transition: "all 0.18s",
                background: lang === l ? "var(--gold)" : "transparent",
                color: lang === l ? "#1a1200" : "var(--muted)",
              }}>
                {l === "en" ? "EN" : "ខ្មែរ"}
              </span>
            ))}
          </button>
        </div>
      </header>

      <div style={{ maxWidth: 480, margin: "0 auto", padding: "0 18px 60px" }}>

        {/* ══════════════ HERO ══════════════ */}
        <section style={{ paddingTop: 36, paddingBottom: 40 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
            <div style={{ width: 20, height: 1.5, background: "var(--gold)", borderRadius: 2 }} />
            <span className="mono" style={{ fontSize: 9, letterSpacing: "0.18em", color: "var(--gold)", fontWeight: 600 }}>
              {t.tagline}
            </span>
          </div>

          <h1 style={{
            fontSize: isKm ? 28 : 34, fontWeight: 800, lineHeight: 1.2,
            letterSpacing: isKm ? "0" : "-0.02em", marginBottom: 14,
            fontFamily: bodyFont,
          }}>
            {t.hero_h1_a}<br />
            <span className="gold-shimmer">{t.hero_h1_b}</span>
          </h1>

          <div style={{
            fontSize: 13, color: "var(--muted)", marginBottom: 14,
            fontFamily: isKm ? "'Outfit', sans-serif" : "'Kantumruy Pro', sans-serif",
          }}>
            {t.hero_sub}
          </div>

          <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.7, marginBottom: 24, fontFamily: bodyFont }}>
            {t.hero_desc}
          </p>

          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={() => scrollTo("pricing")}
              style={{
                flex: 1, padding: "13px 0", borderRadius: 10, border: "none",
                background: "rgb(220,180,82)", color: "#1a1200",
                fontSize: 14, fontWeight: 700, cursor: "pointer",
                fontFamily: bodyFont,
                boxShadow: "0 2px 12px rgba(212,167,44,0.4)",
                transition: "transform 0.15s, box-shadow 0.15s",
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 4px 20px rgba(212,167,44,0.55)"; }}
              onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "0 2px 12px rgba(212,167,44,0.4)"; }}
            >
              {t.btn_start}
            </button>
            <button
              onClick={() => scrollTo("how")}
              style={{
                flex: 1, padding: "13px 0", borderRadius: 10,
                background: "transparent", border: "1.5px solid var(--border-gold)",
                color: "var(--text)", fontSize: 14, fontWeight: 600, cursor: "pointer",
                fontFamily: bodyFont,
                transition: "border-color 0.15s, background 0.15s",
              }}
              onMouseEnter={e => { e.currentTarget.style.background = "rgba(212,167,44,0.07)"; e.currentTarget.style.borderColor = "var(--gold)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "var(--border-gold)"; }}
            >
              {t.btn_how}
            </button>
          </div>

          <FlowDiagram t={t} />

          <div style={{ display: "flex", gap: 16, marginTop: 18, flexWrap: "wrap" }}>
            {(["🔒", "⚡", "🇰🇭"] as const).map((icon, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ fontSize: 12 }}>{icon}</span>
                <span className="khmer" style={{ fontSize: 11, color: "var(--muted)", fontWeight: 500, fontFamily: bodyFont }}>{t.trust[i]}</span>
              </div>
            ))}
          </div>
        </section>

        {/* ══════════════ FEATURES ══════════════ */}
        <section style={{ paddingBottom: 40 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 22 }}>
            <span style={{ width: 3, height: 18, background: "var(--gold)", borderRadius: 2, flexShrink: 0 }} />
            <h2 style={{ fontSize: 20, fontWeight: 700, letterSpacing: isKm ? 0 : "-0.01em", fontFamily: bodyFont }}>{t.features_h}</h2>
          </div>

          <div style={{ display: "grid", gap: 10 }}>
            {t.features.map((f) => (
              <div key={f.title} style={{
                display: "flex", gap: 14, alignItems: "flex-start",
                padding: "16px 18px",
                background: "var(--surface)", border: "1px solid var(--border)",
                borderRadius: 12, transition: "border-color 0.2s, box-shadow 0.2s",
              }}
                onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = "var(--border-gold)"; el.style.boxShadow = "0 2px 12px rgba(212,167,44,0.12)"; }}
                onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = "var(--border)"; el.style.boxShadow = "none"; }}
              >
                <div style={{
                  width: 44, height: 44, borderRadius: 10, flexShrink: 0,
                  background: "linear-gradient(135deg, rgba(212,167,44,0.12), rgba(212,167,44,0.05))",
                  border: "1px solid var(--border-gold)",
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20,
                }}>
                  {f.icon}
                </div>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 700, marginBottom: 4, fontFamily: bodyFont }}>{f.title}</p>
                  <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6, fontFamily: bodyFont }}>{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ══════════════ HOW IT WORKS ══════════════ */}
        <section id="how" style={{ paddingBottom: 40 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 22 }}>
            <span style={{ width: 3, height: 18, background: "var(--gold)", borderRadius: 2, flexShrink: 0 }} />
            <h2 style={{ fontSize: 20, fontWeight: 700, letterSpacing: isKm ? 0 : "-0.01em", fontFamily: bodyFont }}>{t.how_h}</h2>
          </div>

          <div style={{ display: "grid", gap: 12 }}>
            {t.steps.map((s, i) => (
              <div key={s.num} style={{
                display: "flex", gap: 16, alignItems: "flex-start",
                padding: "18px 18px", background: "var(--surface)",
                border: "1px solid var(--border)", borderRadius: 12,
                position: "relative", overflow: "hidden",
              }}>
                <div style={{
                  position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)",
                  fontSize: 52, fontWeight: 900, lineHeight: 1,
                  color: "rgba(212,167,44,0.08)", pointerEvents: "none", userSelect: "none",
                  fontFamily: isKm ? "'Kantumruy Pro', sans-serif" : "'Outfit', sans-serif",
                }}>
                  {s.num}
                </div>
                <div style={{
                  flexShrink: 0, width: 36, height: 36, borderRadius: 9,
                  background: i === 0 ? "var(--gold)" : "linear-gradient(135deg, rgba(212,167,44,0.15), rgba(212,167,44,0.06))",
                  border: i === 0 ? "none" : "1px solid var(--border-gold)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <span className="mono" style={{
                    fontSize: 11, fontWeight: 700,
                    color: i === 0 ? "#1a1200" : "var(--gold)",
                    fontFamily: isKm ? "'Kantumruy Pro', sans-serif" : undefined,
                  }}>
                    {s.num}
                  </span>
                </div>
                <div style={{ position: "relative" }}>
                  <p style={{ fontSize: 15, fontWeight: 700, marginBottom: 5, fontFamily: bodyFont }}>{s.label}</p>
                  <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6, fontFamily: bodyFont }}>{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ══════════════ PRICING ══════════════ */}
        <section id="pricing" style={{ paddingBottom: 40 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <span style={{ width: 3, height: 18, background: "var(--gold)", borderRadius: 2, flexShrink: 0 }} />
            <h2 style={{ fontSize: 20, fontWeight: 700, letterSpacing: isKm ? 0 : "-0.01em", fontFamily: bodyFont }}>{t.pricing_h}</h2>
          </div>
          <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 20, paddingLeft: 11, fontFamily: bodyFont }}>{t.pricing_sub}</p>

          <div style={{ display: "grid", gap: 12 }}>
            {t.plans.map(plan => (
              <div key={plan.id} style={{
                borderRadius: 14, position: "relative", overflow: "hidden",
                padding: plan.highlight ? "20px 18px" : "18px 18px",
                background: plan.highlight ? "linear-gradient(145deg, #fffdf0, #fff8d8, #fffdf0)" : "var(--surface)",
                border: plan.highlight ? "2px solid rgb(220,180,82)" : "1px solid var(--border)",
                boxShadow: plan.highlight ? "0 4px 24px rgba(212,167,44,0.22), inset 0 1px 0 rgba(255,255,255,0.8)" : "none",
                transform: plan.highlight ? "scale(1.01)" : "none",
              }}>
                {plan.highlight && (
                  <div style={{
                    position: "absolute", top: 0, left: 0, right: 0, height: 3,
                    background: "linear-gradient(90deg, transparent 0%, var(--gold-light) 30%, var(--gold) 50%, var(--gold-light) 70%, transparent 100%)",
                  }} />
                )}

                {plan.badge && (
                  <div style={{ marginBottom: 12 }}>
                    <span className="mono" style={{
                      fontSize: 9, letterSpacing: "0.14em", padding: "3px 10px",
                      borderRadius: 20, fontWeight: 700,
                      background: "rgba(212,167,44,0.18)", color: "var(--gold)",
                      border: "1px solid var(--border-gold)",
                      fontFamily: isKm ? "'Kantumruy Pro', sans-serif" : undefined,
                    }}>
                      {plan.badge}
                    </span>
                  </div>
                )}

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                  <div>
                    <p style={{ fontSize: 18, fontWeight: 800, color: plan.highlight ? "var(--gold)" : "var(--text)", fontFamily: bodyFont }}>{plan.name}</p>
                    <p className="mono" style={{ fontSize: 10, color: "var(--muted)", marginTop: 2, fontFamily: bodyFont }}>{plan.groups}</p>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <span style={{ fontSize: 28, fontWeight: 800, color: plan.highlight ? "var(--gold)" : "var(--text)" }}>{plan.price}</span>
                    <p className="mono" style={{ fontSize: 9, color: "var(--muted)", marginTop: 1, fontFamily: bodyFont }}>{plan.period}</p>
                  </div>
                </div>

                <div style={{ height: 1, marginBottom: 14, background: plan.highlight ? "rgba(212,167,44,0.25)" : "var(--border)" }} />

                <ul style={{ display: "grid", gap: 7, marginBottom: 16 }}>
                  {plan.features.map(f => (
                    <li key={f} style={{ display: "flex", gap: 9, alignItems: "center" }}>
                      <span style={{ color: plan.highlight ? "var(--gold)" : "var(--safe)", fontSize: 12, flexShrink: 0, fontWeight: 700 }}>✓</span>
                      <span style={{ fontSize: 13, color: "var(--text-secondary)", fontFamily: bodyFont }}>{f}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => setSelectedPlan(plan.id)}
                  style={{
                    width: "100%", padding: "12px 0", borderRadius: 9, cursor: "pointer",
                    fontSize: 14, fontWeight: 700, transition: "all 0.2s",
                    fontFamily: bodyFont,
                    background: selectedPlan === plan.id ? "#1a1200" : plan.highlight ? "var(--gold)" : "transparent",
                    color: selectedPlan === plan.id ? "#f5b800" : plan.highlight ? "#1a1200" : "var(--text)",
                    border: plan.highlight ? "none" : "1.5px solid var(--border)",
                    boxShadow: plan.highlight && selectedPlan !== plan.id ? "0 2px 12px rgba(212,167,44,0.4)" : "none",
                  }}
                  onMouseEnter={e => { if (selectedPlan !== plan.id) { e.currentTarget.style.background = plan.highlight ? "#c49424" : "rgba(212,167,44,0.08)"; if (!plan.highlight) e.currentTarget.style.borderColor = "var(--gold)"; } }}
                  onMouseLeave={e => { if (selectedPlan !== plan.id) { e.currentTarget.style.background = plan.highlight ? "var(--gold)" : "transparent"; if (!plan.highlight) e.currentTarget.style.borderColor = "var(--border)"; } }}
                >
                  {selectedPlan === plan.id ? t.selected : plan.cta}
                </button>
              </div>
            ))}
          </div>

          <p style={{ textAlign: "center", fontSize: 11, color: "var(--muted)", marginTop: 14, fontFamily: bodyFont }}>{t.pricing_privacy}</p>
        </section>

        {/* ══════════════ ABOUT US ══════════════ */}
        <section id="about" style={{ paddingBottom: 40 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 22 }}>
            <span style={{ width: 3, height: 18, background: "var(--gold)", borderRadius: 2, flexShrink: 0 }} />
            <h2 style={{ fontSize: 20, fontWeight: 700, letterSpacing: isKm ? 0 : "-0.01em", fontFamily: bodyFont }}>
              {isKm ? "អំពីយើង" : "About Us"}
            </h2>
          </div>

          {/* Solution */}
          <div style={{
            borderRadius: 12, padding: "18px", marginBottom: 12,
            background: "var(--surface)", border: "1px solid var(--border)",
            borderTop: "3px solid rgb(220,180,82)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <span style={{ fontSize: 18 }}>💡</span>
              <p style={{ fontSize: 14, fontWeight: 700, fontFamily: bodyFont }}>
                {isKm ? "ដំណោះស្រាយ" : "Our Solution"}
              </p>
            </div>
            <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.7, fontFamily: bodyFont }}>
              {isKm
                ? "Songket គឺជាបូតសុវត្ថិភាព Telegram ដំបូងគេដែលត្រូវបានរចនាឡើងសម្រាប់សហគមន៍កម្ពុជា។ វារកឃើញ និងទប់ស្កាត់ឯកសារព្យាបាទ តំណភ្ជាប់បន្លំ និងអ្នកប្រើប្រាស់ដែលមានគ្រោះថ្នាក់ — ដោយស្វ័យប្រវត្តិ ក្នុងពេលវិនាទី។"
                : "Songket is the first Telegram security bot built for Cambodian communities. It detects and blocks malicious files, phishing links, and harmful users — automatically, in seconds. No technical knowledge needed. Just add the bot and your group is protected 24/7."}
            </p>
          </div>

          {/* Team */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <span style={{ fontSize: 18 }}>👨‍💻</span>
              <p style={{ fontSize: 14, fontWeight: 700, fontFamily: bodyFont }}>
                {isKm ? "ក្រុមការងាររបស់យើង" : "Who We Are"}
              </p>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 16 }}>
              {([
                {
                  num: "01", name: "Bunleap Thay",
                  role: isKm ? "ស្ថាបនិក & នាយកប្រតិបត្តិ" : "Founder & CEO",
                  desc: isKm ? "កំណត់ទិសដៅរបស់ Songket និងដោះស្រាយបញ្ហាការបន្លំនៅកម្ពុជា។" : "Sets Songket's vision and turns Cambodia's scam problem into practical safety products people can use every day.",
                  photo: bunleapPhoto,
                  linkedin: "#",
                },
                {
                  num: "02", name: "Panha Meas",
                  role: isKm ? "អ្នកអភិវឌ្ឍ Backend" : "Backend Developer",
                  desc: isKm ? "បង្កើតម៉ាស៊ីនស្កែន និងហេដ្ឋារចនាសម្ព័ន្ធស្នូលរបស់ Songket។" : "Builds Songket's core scanning engine and server infrastructure that keeps groups safe in real time.",
                  photo: null, emoji: "👨‍💻",
                  linkedin: "#",
                },
                {
                  num: "03", name: "Sreynich Oum",
                  role: isKm ? "អ្នករចនា UI/UX" : "UI/UX Designer",
                  desc: isKm ? "រចនាចំណុចប្រទាក់ដ៏ស្រស់ស្អាត ដើម្បីឱ្យការប្រើប្រាស់ Songket មានភាពងាយស្រួល។" : "Crafts intuitive interfaces so users of all backgrounds can navigate Songket with confidence.",
                  photo: null, emoji: "🎨",
                  linkedin: "#",
                },
                {
                  num: "04", name: "Rithy Kong",
                  role: isKm ? "អ្នកវិភាគសុវត្ថិភាព" : "Security Analyst",
                  desc: isKm ? "ស្រាវជ្រាវការគំរាមកំហែងថ្មី និងធ្វើបច្ចុប្បន្នភាពមូលដ្ឋានទិន្នន័យការការពារ។" : "Researches emerging threats and keeps Songket's detection database sharp and up to date.",
                  photo: null, emoji: "🔐",
                  linkedin: "#",
                },
                {
                  num: "05", name: "Dara Lim",
                  role: isKm ? "អ្នកអភិវឌ្ឍ Frontend" : "Frontend Developer",
                  desc: isKm ? "បង្កើត Mini App និងផ្ទាំងគ្រប់គ្រងដែលអ្នកប្រើប្រាស់ឃើញ។" : "Builds the Mini App and admin dashboard — everything users see and interact with daily.",
                  photo: null, emoji: "💻",
                  linkedin: "#",
                },
                {
                  num: "06", name: "Sokunthea Hak",
                  role: isKm ? "អ្នកគ្រប់គ្រងផលិតផល" : "Product Manager",
                  desc: isKm ? "ធ្វើសមស្របការងារក្រុម និងធានាថា Songket ផ្តល់តម្លៃដល់អ្នកប្រើប្រាស់។" : "Coordinates the team and ensures every feature shipped delivers real value to communities.",
                  photo: null, emoji: "📋",
                  linkedin: "#",
                },
                {
                  num: "07", name: "Vicheka Pen",
                  role: isKm ? "អ្នកទីផ្សារ & ការលូតលាស់" : "Marketing & Growth",
                  desc: isKm ? "រីករាលដាល Songket ទៅកាន់ក្រុម Telegram ដែលត្រូវការការការពារ។" : "Spreads the word about Songket and connects the product with communities that need it most.",
                  photo: null, emoji: "📣",
                  linkedin: "#",
                },
                {
                  num: "08", name: "Mengly Chan",
                  role: isKm ? "ជំនួយការសហគមន៍" : "Community Support",
                  desc: isKm ? "ជួយអ្នកប្រើប្រាស់ដំឡើង Songket និងឆ្លើយតបនឹងសំណួររបស់ពួកគេ។" : "Helps users set up Songket, answers questions, and builds a trusted community around the product.",
                  photo: null, emoji: "🤝",
                  linkedin: "#",
                },
              ] as Array<{ num: string; name: string; role: string; desc: string; photo: string | null; emoji?: string; linkedin: string }>).map(m => (
                <div key={m.num} style={{
                  borderRadius: 20, overflow: "hidden",
                  border: "1px solid var(--border)",
                  background: "var(--surface)",
                  boxShadow: "0 4px 24px rgba(0,0,0,0.18)",
                }}>
                  {/* Full-width photo */}
                  <div style={{ position: "relative", width: "100%", aspectRatio: "4/5", background: "var(--surface2)" }}>
                    {m.photo ? (
                      <img src={m.photo} alt={m.name}
                        style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center top", display: "block" }} />
                    ) : (
                      <div style={{
                        width: "100%", height: "100%",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 80,
                        background: "linear-gradient(160deg, var(--surface2) 0%, var(--border) 100%)",
                      }}>{m.emoji}</div>
                    )}

                    {/* Subtle bottom fade */}
                    <div style={{
                      position: "absolute", bottom: 0, left: 0, right: 0, height: "35%",
                      background: "linear-gradient(to top, rgba(10,8,0,0.85) 0%, transparent 100%)",
                      pointerEvents: "none",
                    }} />

                    {/* Number badge — top left */}
                    <div style={{
                      position: "absolute", top: 14, left: 14,
                      background: "rgba(255,255,255,0.18)", backdropFilter: "blur(10px)",
                      borderRadius: 8, padding: "4px 10px",
                      border: "1px solid rgba(255,255,255,0.2)",
                    }}>
                      <span className="mono" style={{ fontSize: 11, fontWeight: 700, color: "#fff", letterSpacing: "0.06em" }}>{m.num}</span>
                    </div>

                    {/* Role pill — bottom left over image */}
                    <div style={{
                      position: "absolute", bottom: 14, left: 14,
                      background: "rgba(20,14,0,0.72)", backdropFilter: "blur(8px)",
                      borderRadius: 8, padding: "5px 12px",
                      border: "1px solid rgba(220,180,82,0.25)",
                    }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: "#fff", fontFamily: bodyFont }}>{m.role}</span>
                    </div>
                  </div>

                  {/* Dark info band */}
                  <div style={{ padding: "16px 18px 18px", background: "var(--surface)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <p style={{ fontSize: 18, fontWeight: 800, color: "var(--text)", fontFamily: bodyFont, letterSpacing: "-0.01em" }}>{m.name}</p>
                      <a href={m.linkedin} target="_blank" rel="noreferrer" style={{
                        width: 34, height: 34, borderRadius: 8, flexShrink: 0,
                        background: "var(--surface2)", border: "1px solid var(--border)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        textDecoration: "none", fontSize: 13, fontWeight: 700,
                        color: "var(--text-secondary)",
                      }}>in</a>
                    </div>
                    <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.65, fontFamily: bodyFont, marginBottom: 12 }}>{m.desc}</p>
                    <a href={m.linkedin} target="_blank" rel="noreferrer"
                      style={{ fontSize: 12, fontWeight: 700, color: "rgb(220,180,82)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4 }}>
                      LinkedIn <span style={{ fontSize: 11 }}>↗</span>
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Location & Contact */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div style={{
              borderRadius: 12, padding: "16px",
              background: "var(--surface)", border: "1px solid var(--border)",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 10 }}>
                <span style={{ fontSize: 16 }}>📍</span>
                <p style={{ fontSize: 13, fontWeight: 700, fontFamily: bodyFont }}>
                  {isKm ? "ទីតាំង" : "Location"}
                </p>
              </div>
              <p style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.6, fontFamily: bodyFont }}>
                {isKm ? "ភ្នំពេញ\nកម្ពុជា 🇰🇭" : "Phnom Penh,\nCambodia 🇰🇭"}
              </p>
            </div>

            <div style={{
              borderRadius: 12, padding: "16px",
              background: "var(--surface)", border: "1px solid var(--border)",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 10 }}>
                <span style={{ fontSize: 16 }}>📬</span>
                <p style={{ fontSize: 13, fontWeight: 700, fontFamily: bodyFont }}>
                  {isKm ? "ទំនាក់ទំនង" : "Contact"}
                </p>
              </div>
              <div style={{ display: "grid", gap: 6 }}>
                {[
                  { icon: "✈️", label: "@SongketBot" },
                  { icon: "📧", label: "team@songket.app" },
                ].map(c => (
                  <div key={c.label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 11 }}>{c.icon}</span>
                    <span className="mono" style={{ fontSize: 10, color: "var(--text-secondary)" }}>{c.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── Footer ── */}
        <footer style={{ marginTop: 8 }}>

          {/* ── Top CTA strip ── */}
          <div style={{
            borderRadius: "20px 20px 0 0",
            padding: "28px 24px",
            background: "rgb(220,180,82)",
            position: "relative", overflow: "hidden",
          }}>
            <div style={{
              position: "absolute", top: -40, right: -40,
              width: 140, height: 140, borderRadius: "50%",
              background: "rgba(255,255,255,0.12)", pointerEvents: "none",
            }} />
            <div style={{
              position: "absolute", bottom: -20, left: -20,
              width: 80, height: 80, borderRadius: "50%",
              background: "rgba(0,0,0,0.06)", pointerEvents: "none",
            }} />
            <p className="mono" style={{ fontSize: 9, letterSpacing: "0.18em", color: "rgba(26,18,0,0.6)", marginBottom: 8 }}>
              {isKm ? "ចាប់ផ្តើមថ្ងៃនេះ" : "GET PROTECTED TODAY"}
            </p>
            <h3 style={{ fontSize: 20, fontWeight: 800, color: "#1a1200", lineHeight: 1.25, marginBottom: 14, fontFamily: bodyFont }}>
              {isKm ? "ការពារក្រុម Telegram របស់អ្នក\nឥឡូវនេះ" : "Your group deserves\nbetter protection."}
            </h3>
            <a href="https://t.me/SongketBot" target="_blank" rel="noreferrer"
              style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                padding: "11px 20px", borderRadius: 10,
                background: "#1a1200", color: "rgb(220,180,82)",
                fontSize: 13, fontWeight: 700, textDecoration: "none",
                fontFamily: bodyFont, transition: "opacity 0.15s",
              }}
              onMouseEnter={e => (e.currentTarget.style.opacity = "0.82")}
              onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
            >
              ✈️ {isKm ? "បើក Songket Bot" : "Open Songket Bot"}
            </a>
          </div>

          {/* ── Main footer body ── */}
          <div style={{
            background: "#111009",
            padding: "28px 24px 0",
            borderLeft: "1px solid #222",
            borderRight: "1px solid #222",
          }}>

            {/* Brand row */}
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 6 }}>
                  <span style={{ fontSize: 22 }}>🛡️</span>
                  <span className="gold-shimmer" style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.01em" }}>Songket</span>
                </div>
                <span className="khmer" style={{ fontSize: 12, color: "#555", display: "block" }}>សង្កេត · ការការពារ Telegram</span>
              </div>
              {/* Live badge */}
              <div style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "6px 12px", borderRadius: 20,
                background: "rgba(57,255,20,0.08)", border: "1px solid rgba(57,255,20,0.2)",
              }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#39ff14", boxShadow: "0 0 6px #39ff14", flexShrink: 0, animation: "dot-pulse 1.6s ease-in-out infinite" }} />
                <span className="mono" style={{ fontSize: 9, color: "#39ff14", letterSpacing: "0.14em" }}>ONLINE</span>
              </div>
            </div>

            {/* Tagline */}
            <p style={{ fontSize: 13, color: "#666", lineHeight: 1.7, marginBottom: 20, fontFamily: bodyFont }}>
              {isKm
                ? "ជួយខ្មែរ និងអាជីវកម្មធ្វើការសម្រេចចិត្តប្រកបដោយសុវត្ថិភាព ទាក់ទងនឹងសារឌីជីថលគួរឱ្យសង្ស័យ។"
                : "Helping Cambodians and businesses make safer decisions around suspicious digital messages."}
            </p>

            {/* Social row */}
            <div style={{ display: "flex", gap: 8, marginBottom: 28 }}>
              {[
                { label: "Facebook", icon: "𝐟", href: "#" },
                { label: "Telegram", icon: "✈️", href: "https://t.me/SongketBot" },
                { label: "TikTok", icon: "♪", href: "#" },
                { label: "Email", icon: "✉️", href: "mailto:team@songket.app" },
              ].map(s => (
                <a key={s.label} href={s.href} target="_blank" rel="noreferrer" aria-label={s.label}
                  style={{
                    width: 40, height: 40, borderRadius: 10,
                    background: "#1c1a14", border: "1px solid #2a2620",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 15, textDecoration: "none", transition: "all 0.18s",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = "rgba(220,180,82,0.12)"; e.currentTarget.style.borderColor = "rgba(220,180,82,0.4)"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "#1c1a14"; e.currentTarget.style.borderColor = "#2a2620"; }}
                >
                  {s.icon}
                </a>
              ))}
            </div>

            {/* Divider */}
            <div style={{ height: 1, background: "linear-gradient(90deg, transparent, #2a2620, transparent)", marginBottom: 24 }} />

            {/* Link grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 28 }}>
              {[
                {
                  heading: isKm ? "ផលិតផល" : "PRODUCT",
                  links: [
                    { label: isKm ? "ការស្កែន" : "File Scanning", href: "#" },
                    { label: isKm ? "ការរកឃើញតំណ" : "Link Detection", href: "#" },
                    { label: isKm ? "តម្លៃ" : "Pricing", href: "#pricing" },
                    { label: isKm ? "ការអាប់ដេត" : "Changelog", href: "#" },
                  ],
                },
                {
                  heading: isKm ? "ក្រុមហ៊ុន" : "COMPANY",
                  links: [
                    { label: isKm ? "អំពីយើង" : "About Us", href: "#about" },
                    { label: isKm ? "ក្រុមការងារ" : "Our Team", href: "#about" },
                    { label: isKm ? "ទំនាក់ទំនង" : "Contact", href: "mailto:team@songket.app" },
                    { label: isKm ? "ភាពឯកជន" : "Privacy Policy", href: "#" },
                  ],
                },
              ].map(col => (
                <div key={col.heading}>
                  <p className="mono" style={{ fontSize: 9, fontWeight: 700, color: "#444", letterSpacing: "0.16em", marginBottom: 14 }}>
                    {col.heading}
                  </p>
                  <div style={{ display: "grid", gap: 11 }}>
                    {col.links.map(l => (
                      <a key={l.label} href={l.href}
                        style={{ fontSize: 13, color: "#777", textDecoration: "none", fontFamily: bodyFont, transition: "color 0.15s", display: "flex", alignItems: "center", gap: 6 }}
                        onMouseEnter={e => (e.currentTarget.style.color = "rgb(220,180,82)")}
                        onMouseLeave={e => (e.currentTarget.style.color = "#777")}
                      >
                        {l.label}
                      </a>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Bottom bar ── */}
          <div style={{
            background: "#0c0a08",
            borderRadius: "0 0 20px 20px",
            border: "1px solid #1a1816",
            borderTop: "1px solid #1e1c18",
            padding: "14px 24px",
            display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8,
          }}>
            <p className="mono" style={{ fontSize: 9, color: "#3a3a3a", letterSpacing: "0.1em" }}>
              © 2026 SONGKET
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 11 }}>🇰🇭</span>
              <span className="mono" style={{ fontSize: 9, color: "#3a3a3a", letterSpacing: "0.1em" }}>PHNOM PENH</span>
            </div>
          </div>

        </footer>
      </div>
    </div>
  );
}
