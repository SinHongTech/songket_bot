import { useState, useLayoutEffect, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router";
import { Sun, Moon, Globe, ChevronDown, LayoutDashboard } from "lucide-react";
import LogoMark from "@/shared/components/LogoMark";
import { T, type Lang } from "@/public/i18n";
import { getTelegramWebApp, getInitData } from "@/admin/api";
import { safeStorage } from "@/shared/storage";
import Hero from "@/public/components/Hero";
import Features from "@/public/components/Features";
import HowItWorks from "@/public/components/HowItWorks";
import Pricing from "@/public/components/Pricing";
import About from "@/public/components/About";
import Footer from "@/public/components/Footer";
import LogoSplash from "@/public/components/LogoSplash";
import FAQ from "@/public/components/FAQ";

export default function PublicApp() {
  const navigate = useNavigate();
  const [lang, setLang] = useState<Lang>(() => {
    return safeStorage.getItem("songket.lang") === "km" ? "km" : "en";
  });
  const [dark, setDark] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);
  const [showSplash, setShowSplash] = useState(false);

  // Auto-redirect to live dashboard when opened directly inside Telegram WebApp
  useEffect(() => {
    if (typeof window === "undefined") return;
    const search = window.location.search || "";
    if (search.includes("home=1") || search.includes("preview=1")) {
      return;
    }

    const checkAndRedirect = () => {
      const tg = getTelegramWebApp();
      const initData = getInitData();
      const hash = window.location.hash || "";
      const isTgClient = Boolean(
        initData ||
        tg?.initData ||
        tg?.initDataUnsafe?.user?.id ||
        (tg as any)?.platform ||
        (window as any).TelegramWebviewProxy ||
        hash.includes("tgWebAppData=") ||
        search.includes("tgWebAppData=")
      );

      if (isTgClient) {
        navigate(
          {
            pathname: "/dashboard",
            search: window.location.search,
            hash: window.location.hash,
          },
          { replace: true }
        );
        return true;
      }
      return false;
    };

    if (checkAndRedirect()) return;

    // Listen for late-arriving Telegram Desktop setup event
    const handleMsg = (e: MessageEvent) => {
      try {
        let d = e.data;
        if (typeof d === "string") {
          try { d = JSON.parse(d); } catch {}
        }
        if (d && d.eventType === "web_app_setup_data") {
          checkAndRedirect();
        }
      } catch {}
    };
    window.addEventListener("message", handleMsg);

    // Short polling interval for desktop webview handshake
    const interval = setInterval(() => {
      if (checkAndRedirect()) {
        clearInterval(interval);
      }
    }, 150);

    const timer = setTimeout(() => clearInterval(interval), 3000);

    return () => {
      window.removeEventListener("message", handleMsg);
      clearInterval(interval);
      clearTimeout(timer);
    };
  }, [navigate]);

  useLayoutEffect(() => {
    document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
  }, [dark]);

  useEffect(() => {
    safeStorage.setItem("songket.lang", lang);
  }, [lang]);

  useLayoutEffect(() => {
    function handleClick(e: MouseEvent) {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setSettingsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const t = T[lang];
  const isKm = lang === "km";
  const bodyFont = isKm ? "'Kantumruy Pro', sans-serif" : "'Outfit', sans-serif";

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  if (showSplash) {
    return <LogoSplash onFinish={() => setShowSplash(false)} />;
  }

  return (
    <div style={{ minHeight: "100%", background: "var(--bg)", color: "var(--text)", fontFamily: bodyFont }}>
      <header style={{ position: "sticky", top: 0, zIndex: 50, background: "var(--surface)", borderBottom: "1px solid var(--border)", padding: "12px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <LogoMark size={40} />
          <div>
            <span className="gold-shimmer" style={{ fontSize: 16, fontWeight: 800, letterSpacing: "-0.01em", display: "block", lineHeight: 1 }}>Songket</span>
            <span className="khmer" style={{ fontSize: 10, color: "var(--muted)", lineHeight: 1, display: "block", marginTop: 1 }}>សង្កេត</span>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Link
            to={{
              pathname: "/dashboard",
              search: typeof window !== "undefined" ? window.location.search : "",
              hash: typeof window !== "undefined" ? window.location.hash : "",
            }}
            style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 12px", borderRadius: 8, border: "1.5px solid var(--border-gold)", background: "rgba(212,167,44,0.06)", color: "var(--gold)", fontSize: 11, fontWeight: 700, textDecoration: "none", letterSpacing: "0.04em" }}
          >
            <LayoutDashboard size={12} />
            Admin
          </Link>
          <div ref={settingsRef} style={{ position: "relative" }}>
            <button onClick={() => setSettingsOpen(o => !o)} style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 10px", borderRadius: 8, border: "1.5px solid var(--border-gold)", background: settingsOpen ? "rgba(212,167,44,0.12)" : "rgba(212,167,44,0.06)", cursor: "pointer", color: "var(--gold)" }}>
              <Globe size={13} />
              <ChevronDown size={11} style={{ opacity: 0.7 }} />
            </button>
            {settingsOpen && (
              <div style={{ position: "absolute", right: 0, top: "calc(100% + 8px)", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "10px", minWidth: 180, zIndex: 100, boxShadow: "0 8px 32px rgba(0,0,0,0.4)" }}>
                <div style={{ fontSize: 10, color: "var(--muted)", letterSpacing: "0.08em", fontWeight: 600, marginBottom: 6, paddingLeft: 4 }}>THEME</div>
                <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
                  <button onClick={() => setDark(false)} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "7px 0", borderRadius: 8, border: !dark ? "1.5px solid var(--gold)" : "1px solid var(--border)", background: !dark ? "rgba(212,167,44,0.1)" : "var(--surface2)", color: !dark ? "var(--gold)" : "var(--muted)", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
                    <Sun size={13} /> Light
                  </button>
                  <button onClick={() => setDark(true)} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "7px 0", borderRadius: 8, border: dark ? "1.5px solid var(--gold)" : "1px solid var(--border)", background: dark ? "rgba(212,167,44,0.1)" : "var(--surface2)", color: dark ? "var(--gold)" : "var(--muted)", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
                    <Moon size={13} /> Dark
                  </button>
                </div>
                <div style={{ fontSize: 10, color: "var(--muted)", letterSpacing: "0.08em", fontWeight: 600, marginBottom: 6, paddingLeft: 4 }}>LANGUAGE</div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={() => setLang("en")} style={{ flex: 1, padding: "7px 0", borderRadius: 8, border: lang === "en" ? "1.5px solid var(--gold)" : "1px solid var(--border)", background: lang === "en" ? "rgba(212,167,44,0.1)" : "var(--surface2)", color: lang === "en" ? "var(--gold)" : "var(--muted)", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
                    EN
                  </button>
                  <button onClick={() => setLang("km")} style={{ flex: 1, padding: "7px 0", borderRadius: 8, border: lang === "km" ? "1.5px solid var(--gold)" : "1px solid var(--border)", background: lang === "km" ? "rgba(212,167,44,0.1)" : "var(--surface2)", color: lang === "km" ? "var(--gold)" : "var(--muted)", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
                    ខ្មែរ
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>
      <div style={{ maxWidth: 480, margin: "0 auto", padding: "0 18px 60px" }}>
        <Hero t={t} isKm={isKm} bodyFont={bodyFont} onScrollTo={scrollTo} />
        <Features t={t} isKm={isKm} bodyFont={bodyFont} />
        <HowItWorks t={t} isKm={isKm} bodyFont={bodyFont} dark={dark} />
        <Pricing t={t} isKm={isKm} bodyFont={bodyFont} />
        <About t={t} isKm={isKm} bodyFont={bodyFont} />
        <FAQ t={t} isKm={isKm} bodyFont={bodyFont} />
        <section id="privacy" style={{ paddingBottom: 32 }}>
          <Footer isKm={isKm} bodyFont={bodyFont} />
        </section>
      </div>
    </div>
  );
}
