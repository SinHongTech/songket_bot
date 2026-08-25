import LogoMark from "@/shared/components/LogoMark";
import { Send, Mail } from "lucide-react";

interface FooterProps {
  isKm: boolean;
  bodyFont: string;
}

export default function Footer({ isKm, bodyFont }: FooterProps) {
  return (
    <footer style={{ marginTop: 8 }}>
      <div style={{ borderRadius: "20px 20px 0 0", padding: "28px 24px", background: "rgb(220,180,82)" }}>
        <p className="mono" style={{ fontSize: 9, letterSpacing: "0.18em", color: "rgba(26,18,0,0.6)", marginBottom: 8 }}>{isKm ? "ចាប់ផ្តើមថ្ងៃនេះ" : "GET PROTECTED TODAY"}</p>
        <h3 style={{ fontSize: 20, fontWeight: 800, color: "#1a1200", lineHeight: 1.25, marginBottom: 14, fontFamily: bodyFont }}>{isKm ? "ការពារក្រុម Telegram របស់អ្នក\nឥឡូវនេះ" : "Your group deserves\nbetter protection."}</h3>
        <a href="https://t.me/songketbbot" target="_blank" rel="noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "11px 20px", borderRadius: 10, background: "#1a1200", color: "rgb(220,180,82)", fontSize: 13, fontWeight: 700, textDecoration: "none", fontFamily: bodyFont, transition: "opacity 0.15s" }} onMouseEnter={e => (e.currentTarget.style.opacity = "0.82")} onMouseLeave={e => (e.currentTarget.style.opacity = "1")}>
          <Send size={14} /> {isKm ? "បើក Songket Bot" : "Open Songket Bot"}
        </a>
      </div>
      <div style={{ background: "#111009", padding: "28px 24px 0", borderLeft: "1px solid #222", borderRight: "1px solid #222" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 6 }}>
              <LogoMark size={30} />
              <span style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.01em", color: "var(--gold)" }}>Songket</span>
            </div>
            <span className="khmer" style={{ fontSize: 12, color: "#555", display: "block" }}>សង្កេត · ការការពារ Telegram</span>
          </div>
        </div>
        <p style={{ fontSize: 13, color: "#666", lineHeight: 1.7, marginBottom: 20, fontFamily: bodyFont }}>{isKm ? "ជួយខ្មែរ និងអាជីវកម្មធ្វើការសម្រេចចិត្តប្រកបដោយសុវត្ថិភាព ទាក់ទងនឹងសារឌីជីថលគួរឱ្យសង្ស័យ។" : "Helping Cambodians and businesses make safer decisions around suspicious digital messages."}</p>
        <div style={{ display: "flex", gap: 8, marginBottom: 28 }}>
          {[{ label: "Facebook", icon: "𝐟", href: "#" }, { label: "Telegram", icon: <Send size={14} />, href: "https://t.me/songketbbot" }, { label: "TikTok", icon: "♪", href: "#" }, { label: "Email", icon: <Mail size={14} />, href: "mailto:team@songket.app" }].map(s => (
            <a key={s.label} href={s.href} target="_blank" rel="noreferrer" aria-label={s.label} style={{ width: 40, height: 40, borderRadius: 10, background: "#1c1a14", border: "1px solid #2a2620", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, textDecoration: "none", transition: "all 0.18s" }} onMouseEnter={e => { e.currentTarget.style.background = "rgba(220,180,82,0.12)"; e.currentTarget.style.borderColor = "rgba(220,180,82,0.4)"; }} onMouseLeave={e => { e.currentTarget.style.background = "#1c1a14"; e.currentTarget.style.borderColor = "#2a2620"; }}>
              {s.icon}
            </a>
          ))}
        </div>
        <div style={{ height: 1, background: "#2a2620", marginBottom: 24 }} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 28 }}>
          {[
            { heading: isKm ? "ផលិតផល" : "PRODUCT", links: [{ label: isKm ? "ការស្កែន" : "File Scanning", href: "#" }, { label: isKm ? "ការរកឃើញតំណ" : "Link Detection", href: "#" }, { label: isKm ? "តម្លៃ" : "Pricing", href: "#pricing" }, { label: isKm ? "ការអាប់ដេត" : "Changelog", href: "#" }] },
            { heading: isKm ? "ក្រុមហ៊ុន" : "COMPANY", links: [{ label: isKm ? "អំពីយើង" : "About Us", href: "#about" }, { label: isKm ? "ក្រុមការងារ" : "Our Team", href: "#about" }, { label: isKm ? "ទំនាក់ទំនង" : "Contact", href: "mailto:team@songket.app" }, { label: isKm ? "ភាពឯកជន" : "Privacy Policy", href: "#" }] },
          ].map(col => (
            <div key={col.heading}>
              <p className="mono" style={{ fontSize: 9, fontWeight: 700, color: "#444", letterSpacing: "0.16em", marginBottom: 14 }}>{col.heading}</p>
              <div style={{ display: "grid", gap: 11 }}>
                {col.links.map(l => (
                  <a key={l.label} href={l.href} style={{ fontSize: 13, color: "#777", textDecoration: "none", fontFamily: bodyFont, transition: "color 0.15s" }} onMouseEnter={e => (e.currentTarget.style.color = "rgb(220,180,82)")} onMouseLeave={e => (e.currentTarget.style.color = "#777")}>{l.label}</a>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ background: "#0c0a08", borderRadius: "0 0 20px 20px", border: "1px solid #1a1816", borderTop: "1px solid #1e1c18", padding: "14px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <p className="mono" style={{ fontSize: 9, color: "#3a3a3a", letterSpacing: "0.1em" }}>© 2026 SONGKET</p>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 11 }}>🇰🇭</span>
          <span className="mono" style={{ fontSize: 9, color: "#3a3a3a", letterSpacing: "0.1em" }}>PHNOM PENH</span>
        </div>
      </div>
    </footer>
  );
}
