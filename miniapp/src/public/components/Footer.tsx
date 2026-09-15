import LogoMark from "@/shared/components/LogoMark";
import { Send, Mail } from "lucide-react";
import { FaTiktok } from "../assets/FaTiktok";
import { FaFacebook } from "../assets/FaFacebook";

interface FooterProps {
  isKm: boolean;
  bodyFont: string;
}

export default function Footer({ isKm, bodyFont }: FooterProps) {
  return (
    <footer style={{ marginTop: 8 }}>
      <div style={{ borderRadius: "20px 20px 0 0", padding: "28px 24px", background: "var(--gold)" }}>
        <p className="mono" style={{ fontSize: 9, letterSpacing: "0.18em", color: "rgba(26,18,0,0.6)", marginBottom: 8 }}>{isKm ? "ចាប់ផ្តើមថ្ងៃនេះ" : "GET PROTECTED TODAY"}</p>
        <h3 style={{ fontSize: 20, fontWeight: 800, color: "var(--text)", lineHeight: 1.25, marginBottom: 14, fontFamily: bodyFont }}>{isKm ? "ការពារក្រុម Telegram របស់អ្នក\nឥឡូវនេះ" : "Your group deserves\nbetter protection."}</h3> 
        <a href="https://t.me/songket_beyda_bot" target="_blank" rel="noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "11px 20px", borderRadius: 10, background: "var(--text)", color: "var(--gold)", fontSize: 13, fontWeight: 700, textDecoration: "none", fontFamily: bodyFont, transition: "opacity 0.15s" }} onMouseEnter={e => (e.currentTarget.style.opacity = "0.82")} onMouseLeave={e => (e.currentTarget.style.opacity = "1")}>
          <Send size={14} /> {isKm ? "បើក Songket Bot" : "Open Songket Bot"}
        </a>
      </div>
      <div style={{ background: "var(--surface)", padding: "28px 24px 0", borderLeft: "1px solid var(--border)", borderRight: "1px solid var(--border)", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)", borderRadius: "10px 10px 10px 10px"}}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 6 }}>
              <LogoMark size={30} />
              <span style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.01em", color: "var(--gold)" }}>Songket</span>
            </div>
            <span className="khmer" style={{ fontSize: 12, color: "var(--muted)", display: "block" }}>សង្កេត · ការការពារ Telegram</span>
          </div>
        </div>
        <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.7, marginBottom: 20, fontFamily: bodyFont }}>{isKm ? "ជួយខ្មែរ និងអាជីវកម្មធ្វើការសម្រេចចិត្តប្រកបដោយសុវត្ថិភាព ទាក់ទងនឹងសារឌីជីថលគួរឱ្យសង្ស័យ។" : "Helping Cambodians and businesses make safer decisions around suspicious digital messages."}</p>
        <div style={{ display: "flex", gap: 8, marginBottom: 28 }}>
          {[
            {
              label: "Facebook",
              icon: <FaFacebook size={16} color="currentColor" />,
              href: "https://www.facebook.com/profile.php?fb_profile_edit_entry_point=%7B%22click_point%22%3A%22edit_profile_button%22%2C%22feature%22%3A%22profile_header%22%7D&id=61594287183497&sk=about"
            },
            {
              label: "Telegram",
              icon: <Send size={15} />,
              href: "https://t.me/songket_beyda_bot"
            },
            {
              label: "TikTok",
              icon: <FaTiktok size={15} color="currentColor" />,
              href: "https://www.tiktok.com/@songket67?_r=1&_t=ZS-99kLIZCNTOf"
            },
            {
              label: "Gmail",
              icon: <Mail size={15} />,
              href: "https://mail.google.com/mail/?view=cm&fs=1&to=Songketteam@gmail.com"
            }
          ].map(s => (
            <a key={s.label} href={s.href} target="_blank" rel="noreferrer" aria-label={s.label} style={{ width: 40, height: 40, borderRadius: 10, background: "var(--surface2)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", textDecoration: "none", transition: "all 0.18s", color: "var(--text-secondary)" }} onMouseEnter={e => { e.currentTarget.style.background = "var(--gold-surface)"; e.currentTarget.style.borderColor = "var(--border-gold)"; e.currentTarget.style.color = "var(--gold)"; }} onMouseLeave={e => { e.currentTarget.style.background = "var(--surface2)"; e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--text-secondary)"; }}>
              {s.icon}
            </a>
          ))}
        </div>
        <div style={{ height: 1, background: "var(--border)", marginBottom: 24 }} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20, marginBottom: 28 }}>
          {[
            {
              heading: isKm ? "ផលិតផល" : "PRODUCT",
              links: [
                { label: isKm ? "ការស្កែន" : "File Scanning", href: "#features" },
                { label: isKm ? "ការរកឃើញតំណ" : "Link Detection", href: "#features" },
                { label: isKm ? "តម្លៃ" : "Pricing", href: "#pricing" },
                { label: isKm ? "របៀបដំណើរការ" : "How It Works", href: "#how" },
              ],
            },
            {
              heading: isKm ? "ក្រុមហ៊ុន" : "COMPANY",
              links: [
                { label: isKm ? "អំពីយើង" : "About Us", href: "#about" },
                { label: isKm ? "ក្រុមការងារ" : "Our Team", href: "#team" },
                { label: isKm ? "ទំនាក់ទំនង" : "Contact", href: "https://mail.google.com/mail/?view=cm&fs=1&to=Songketteam@gmail.com" },
                { label: isKm ? "សំណួរញឹកញាប់" : "FAQ", href: "#faq" },
              ],
            },
            {
              heading: isKm ? "ច្បាប់" : "LEGAL",
              links: [
                { label: isKm ? "គោលនយោបាយឯកជន" : "Privacy Policy", href: "/privacy-terms#privacy" },
                { label: isKm ? "លក្ខខណ្ឌនៃការប្រើប្រាស់" : "Terms & Conditions", href: "/privacy-terms#terms" },
              ],
            },
          ].map((col) => (
            <div key={col.heading}>
              <p className="mono" style={{ fontSize: 9, fontWeight: 700, color: "var(--muted)", letterSpacing: "0.16em", marginBottom: 14 }}>
                {col.heading}
              </p>
              <div style={{ display: "grid", gap: 11 }}>
                {col.links.map((l) => (
                  <a
                    key={l.label}
                    href={l.href}
                    target={l.href.startsWith("http") ? "_blank" : undefined}
                    rel={l.href.startsWith("http") ? "noreferrer" : undefined}
                    style={{ fontSize: 13, color: "var(--text-secondary)", textDecoration: "none", fontFamily: bodyFont, transition: "color 0.15s" }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = "var(--gold)")}
                    onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-secondary)")}
                  >
                    {l.label}
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ background: "var(--bg)", padding: "24px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <p className="mono" style={{ fontSize: 9, color: "var(--muted)", letterSpacing: "0.1em" }}>© 2026 SONGKET</p>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 11 }}>🇰🇭</span>
          <span className="mono" style={{ fontSize: 9, color: "var(--text-secondary)", letterSpacing: "0.1em" }}>PHNOM PENH</span>
        </div>
      </div>
    </footer>
  );
}
