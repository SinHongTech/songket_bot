import { useState, useLayoutEffect, useEffect, useRef } from "react";
import { Sun, Moon, Globe, ChevronDown, LayoutDashboard } from "lucide-react";
import LogoMark from "@/shared/components/LogoMark";
import { T, type Lang } from "@/public/i18n";
import Hero from "@/public/components/Hero";
import Features from "@/public/components/Features";
import HowItWorks from "@/public/components/HowItWorks";
import Pricing from "@/public/components/Pricing";
import About from "@/public/components/About";
import Footer from "@/public/components/Footer";
import LogoSplash from "@/public/components/LogoSplash";
import FAQ from "@/public/components/FAQ";

export default function PublicApp() {
  const [lang, setLang] = useState<Lang>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("songket.lang") === "km" ? "km" : "en";
    }
    return "en";
  });
  const [dark, setDark] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);
  const t = T[lang];
  const isKm = lang === "km";
  const bodyFont = isKm ? "'Kantumruy Pro', sans-serif" : "'Outfit', sans-serif";

  useLayoutEffect(() => {
    document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
  }, [dark]);

  useEffect(() => {
    localStorage.setItem("songket.lang", lang);
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

  function scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
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
          <a href="/dashboard" style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 12px", borderRadius: 8, border: "1.5px solid var(--border-gold)", background: "rgba(212,167,44,0.06)", color: "var(--gold)", fontSize: 11, fontWeight: 700, textDecoration: "none", letterSpacing: "0.04em" }}>
            <LayoutDashboard size={12} />
            Admin
          </a>
          <div ref={settingsRef} style={{ position: "relative" }}>
            <button onClick={() => setSettingsOpen(o => !o)} style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 10px", borderRadius: 8, border: "1.5px solid var(--border-gold)", background: settingsOpen ? "rgba(212,167,44,0.12)" : "rgba(212,167,44,0.06)", cursor: "pointer", color: "var(--gold)" }}>
              <Globe size={13} />
              <ChevronDown size={11} style={{ opacity: 0.7 }} />
            </button>
            {settingsOpen && (
              <div style={{ position: "absolute", right: 0, top: "calc(100% + 8px)", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "10px", minWidth: 180, zIndex: 100, boxShadow: "0 8px 32px rgba(0,0,0,0.4)" }}>
                <div style={{ fontSize: 10, color: "var(--muted)", letterSpacing: "0.08em", fontWeight: 600, marginBottom: 6, paddingLeft: 4 }}>THEME</div>
                <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
                  {(["dark", "light"] as const).map(val => (
                    <button key={val} onClick={() => setDark(val === "dark")} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 5, padding: "7px 0", borderRadius: 8, border: `1.5px solid ${dark === (val === "dark") ? "var(--gold)" : "var(--border)"}`, background: dark === (val === "dark") ? "rgba(212,167,44,0.12)" : "transparent", color: dark === (val === "dark") ? "var(--gold)" : "var(--muted)", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
                      {val === "dark" ? <Moon size={13} /> : <Sun size={13} />}
                      {val === "dark" ? "Dark" : "Light"}
                    </button>
                  ))}
                </div>
                <div style={{ fontSize: 10, color: "var(--muted)", letterSpacing: "0.08em", fontWeight: 600, marginBottom: 6, paddingLeft: 4 }}>LANGUAGE</div>
                <div style={{ display: "flex", gap: 6 }}>
                  {(["en", "km"] as Lang[]).map(l => (
                    <button key={l} onClick={() => setLang(l)} style={{ flex: 1, padding: "7px 0", borderRadius: 8, border: `1.5px solid ${lang === l ? "var(--gold)" : "var(--border)"}`, background: lang === l ? "rgba(212,167,44,0.12)" : "transparent", color: lang === l ? "var(--gold)" : "var(--muted)", cursor: "pointer", fontSize: 12, fontWeight: 700, fontFamily: l === "km" ? "'Kantumruy Pro', sans-serif" : "'Outfit', sans-serif" }}>
                      {l === "en" ? "EN" : "ខ្មែរ"}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </header>
      <div style={{ borderBottom: "1px solid var(--border)", background: "var(--bg)" }}>
        <LogoSplash compact />
      </div>
      <div style={{ maxWidth: 480, margin: "0 auto", padding: "0 18px 60px" }}>
        <Hero t={t} isKm={isKm} bodyFont={bodyFont} onScrollTo={scrollTo} />
        <Features t={t} isKm={isKm} bodyFont={bodyFont} />
        <HowItWorks t={t} isKm={isKm} bodyFont={bodyFont} dark={dark} />
        <Pricing t={t} isKm={isKm} bodyFont={bodyFont} />
        <About t={t} isKm={isKm} bodyFont={bodyFont} />
        <FAQ t={t} isKm={isKm} bodyFont={bodyFont} />
        <section id="privacy" style={{paddingBottom: 32}}>
          <Footer isKm={isKm} bodyFont={bodyFont} />
        </section>
      </div>
    </div>
  );
}
