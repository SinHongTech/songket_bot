import { Mail, Send, Briefcase, Code, Palette, Lock, Monitor, ClipboardList, Megaphone, Users, Lightbulb, MapPin, ArrowUpRight } from "lucide-react";
import lika from "../assets/SaoSochealika.png";
import gekleang from "../assets/MongGekleang.png";
import smey from "../assets/KongLeakSmey.png";
import pich from "../assets/BetSreypich.jpg";
import neath from "../assets/Chanmonyneath.jpg";
import nuphea from "../assets/ThongNuphea.png";
import hong from "../assets/SinHong.jpg";
import panha from "../assets/panha.jpg"
import { FaLinkedin } from "../assets/FaLinkedin";


interface AboutProps {
  t: any;
  isKm: boolean;
  bodyFont: string;
}

const TEAM = [
  {
    num: "01",
    name: "Sao Sochealika",
    roleEn: "Leader Team",
    roleKm: "អ្នកដឹកនាំ",
    descEn: "Sets Songket's vision and turns Cambodia's scam problem into practical safety products people can use every day.",
    descKm: "កំណត់ទិសដៅរបស់ Songket និងដោះស្រាយបញ្ហាការបន្លំនៅកម្ពុជា។",
    icon: <Briefcase size={28} color="var(--gold)" />,
    img: lika,
    linkedin: "https://linkedin.com/in/sao-sochealika-b41161369",
  },
  {
    num: "02",
    name: "Mong Gekleang",
    roleEn: "Frontend Developer",
    roleKm: "អ្នកអភិវឌ្ឍ Frontend",
    descEn: "Builds the Mini App and admin dashboard  everything users see and interact with daily.",
    descKm: "បង្កើត Mini App និងផ្ទាំងគ្រប់គ្រងដែលអ្នកប្រើប្រាស់ឃើញ។",
    icon: <Code size={28} color="var(--gold)" />,
    img: gekleang,
    linkedin: "https://www.linkedin.com/in/mong-gekleang-1849b5343/",
  },
  {
    num: "03",
    name: "Kong Leak Smey",
    roleEn: "Frontend Developer",
    roleKm: "អ្នករចនា Frontend",
    descEn: "Crafts intuitive interfaces so users of all backgrounds can navigate Songket with confidence.",
    descKm: "រចនាចំណុចប្រទាក់ងាយស្រួលប្រើសម្រាប់អ្នកប្រើប្រាស់គ្រប់រូប។",
    icon: <Palette size={28} color="var(--gold)" />,
    img: smey,
    linkedin: "https://www.linkedin.com/in/kong-leak-smey/",
  },
  {
    num: "04",
    name: "Bet Sreypich",
    roleEn: "UI/UX Designer",
    roleKm: "អ្នករចនា​ UX/UI",
    descEn: "Researches emerging threats and keeps the protection database up to date.",
    descKm: "ស្រាវជ្រាវការគំរាមកំហែងថ្មី និងធ្វើបច្ចុប្បន្នភាពមូលដ្ឋានទិន្នន័យការការពារ។",
    icon: <Lock size={28} color="var(--gold)" />,
    img: pich,
    linkedin: "https://www.linkedin.com/feed/",
  },
  {
    num: "05",
    name: "Sin Hong",
    roleEn: "Backend Developer",
    roleKm: "អ្នកអភិវឌ្ឍ Backend",
    descEn: "Builds Songket's core scanning engine and server infrastructure that keeps groups safe in real time.",
    descKm: "បង្កើតម៉ាស៊ីនស្កែន និងហេដ្ឋារចនាសម្ព័ន្ធស្នូលរបស់ Songket។",
    icon: <Monitor size={28} color="var(--gold)" />,
    img: hong,
    linkedin: "https://www.linkedin.com/feed/",
  },
  {
    num: "06",
    name: "Khorn Panha",
    roleEn: "Product Manager",
    roleKm: "អ្នកគ្រប់គ្រងផលិតផល",
    descEn: "Coordinates the team and ensures every feature shipped delivers real value to communities.",
    descKm: "ធ្វើសមស្របការងារក្រុម និងធានាថា Songket ផ្តល់តម្លៃដល់អ្នកប្រើប្រាស់។",
    icon: <ClipboardList size={28} color="var(--gold)" />,
    img: panha,
    linkedin: "https://www.linkedin.com/feed/",
  },
  {
    num: "07",
    name: "Po Monyneath",
    roleEn: "Marketing & Growth",
    roleKm: "អ្នកទីផ្សារ & ការលូតលាស់",
    descEn: "Spreads the word about Songket and connects the product with communities that need it most.",
    descKm: "រីករាលដាល Songket ទៅកាន់ក្រុម Telegram ដែលត្រូវការការការពារ។",
    icon: <Megaphone size={28} color="var(--gold)" />,
    img: neath,
    linkedin: "https://www.linkedin.com/in/po-chan-monyneath-78b8a7393?utm_source=share_via&utm_content=profile&utm_medium=member_ios",
  },
  {
    num: "08",
    name: "Thong Nuphea",
    roleEn: "Community & Support",
    roleKm: "ជំនួយការសហគមន៍",
    descEn: "Helps users set up Songket, answers questions, and builds a trusted community around the product.",
    descKm: "ជួយអ្នកប្រើប្រាស់ដំឡើង Songket និងឆ្លើយតបនឹងសំណួររបស់ពួកគេ។",
    icon: <Users size={28} color="var(--gold)" />,
    img: nuphea,
    linkedin: "https://www.linkedin.com/in/thong-nuphea-b39216374/",
  },
];

export default function About({ isKm, bodyFont }: AboutProps) {
  return (
    <section id="about" style={{ paddingBottom: 40 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 22 }}>
        <span style={{ width: 3, height: 18, background: "var(--gold)", borderRadius: 2, flexShrink: 0 }} />
        <h2 style={{ fontSize: 20, fontWeight: 700, letterSpacing: isKm ? 0 : "-0.01em", fontFamily: bodyFont }}>
          {isKm ? "អំពីយើង" : "About Us"}
        </h2>
      </div>

      <div style={{ borderRadius: 12, padding: "18px", marginBottom: 28, background: "var(--surface)", border: "1px solid var(--border)", borderTop: "3px solid rgb(220,180,82)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <Lightbulb size={16} color="var(--gold)" />
          <p style={{ fontSize: 14, fontWeight: 700, fontFamily: bodyFont }}>{isKm ? "ដំណោះស្រាយ" : "Our Solution"}</p>
        </div>
        <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.7, fontFamily: bodyFont }}>
          {isKm
            ? "Songket គឺជាបូតសុវត្ថិភាព Telegram ដំបូងគេដែលត្រូវបានរចនាឡើងសម្រាប់សហគមន៍កម្ពុជា។"
            : "Songket is the first Telegram security bot built for Cambodian communities. It detects and blocks malicious files, phishing links, and harmful users  automatically, in seconds."}
        </p>
      </div>

      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
          <Code size={16} color="var(--gold)" />
          <p style={{ fontSize: 14, fontWeight: 700, fontFamily: bodyFont }}>{isKm ? "ក្រុមការងាររបស់យើង" : "Who We Are"}</p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr",
            gap: 16,
          }}
        >
          {TEAM.map((m) => (
            <div
              key={m.num}
              style={{
                position: "relative",
                borderRadius: 16,
                overflow: "hidden",
                background: "var(--surface)",
                border: "1px solid var(--border)",
                display: "flex",
                flexDirection: "column",
              }}
            >
              {/* Photo area */}
              <div
                style={{
                  position: "relative",
                  width: "100%",
                  aspectRatio: "3 / 4",
                  background: m.img
                    ? `top center / cover no-repeat url(${m.img})`
                    : "linear-gradient(160deg, var(--surface2), var(--surface))",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {!m.img && (
                  <div
                    style={{
                      width: 64,
                      height: 64,
                      borderRadius: "50%",
                      background: "var(--surface)",
                      border: "1px solid var(--border-gold)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {m.icon}
                  </div>
                )}

                {/* Number badge */}
                <span
                  className="mono"
                  style={{
                    position: "absolute",
                    top: 10,
                    left: 10,
                    fontSize: 10,
                    color: "var(--muted)",
                    background: "rgba(0,0,0,0.45)",
                    padding: "2px 8px",
                    borderRadius: 999,
                  }}
                >
                  {m.num}
                </span>

                {/* Role badge, bottom-left over the fade */}
                <span
                  style={{
                    position: "absolute",
                    bottom: 10,
                    left: 10,
                    fontSize: 11,
                    fontWeight: 600,
                    color: "#fff",
                    background: "rgba(0,0,0,0.55)",
                    padding: "4px 10px",
                    borderRadius: 999,
                    fontFamily: bodyFont,
                  }}
                >
                  {isKm ? m.roleKm : m.roleEn}
                </span>
              </div>

              {/* Info section */}
              <div style={{ padding: "14px 16px 16px", background: "var(--surface)", flex: 1, display: "flex", flexDirection: "column" }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: 6 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text)", fontFamily: bodyFont, lineHeight: 1.3 }}>
                    {m.name}
                  </div>
                  {m.linkedin && (
                    <a
                      href={m.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        flexShrink: 0,
                        width: 26,
                        height: 26,
                        borderRadius: "50%",
                        background: "var(--surface2)",
                        border: "1px solid var(--border)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                  <FaLinkedin size={13} color="var(--gold)" />                    </a>
                  )}
                </div>
                <p style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.55, fontFamily: bodyFont, flex: 1 }}>
                  {isKm ? m.descKm : m.descEn}
                </p>
                {m.linkedin && (
                  <a
                    href={m.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      marginTop: 10,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      fontSize: 11,
                      fontWeight: 600,
                      color: "var(--gold)",
                      textDecoration: "none",
                    }}
                  >
                    LinkedIn <ArrowUpRight size={12} />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div style={{ borderRadius: 12, padding: "16px", background: "var(--surface)", border: "1px solid var(--border)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 10 }}>
            <MapPin size={14} color="var(--gold)" />
            <p style={{ fontSize: 13, fontWeight: 700, fontFamily: bodyFont }}>{isKm ? "ទីតាំង" : "Location"}</p>
          </div>
          <p style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.6, fontFamily: bodyFont, whiteSpace: "pre-line" }}>
            {isKm ? "ភ្នំពេញ\nកម្ពុជា 🇰🇭" : "Phnom Penh,\nCambodia 🇰🇭"}
          </p>
        </div>
        <div style={{ borderRadius: 12, padding: "16px", background: "var(--surface)", border: "1px solid var(--border)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 10 }}>
            <Mail size={14} color="var(--gold)" />
            <p style={{ fontSize: 13, fontWeight: 700, fontFamily: bodyFont }}>{isKm ? "ទំនាក់ទំនង" : "Contact"}</p>
          </div>
          <div style={{ display: "grid", gap: 6 }}>
            {[
              { icon: <Send size={11} color="var(--muted)" />, label: "@songket_beyda_bot" },
              { icon: <Mail size={11} color="var(--muted)" />, label: "team@songket.app" },
            ].map((c) => (
              <div key={c.label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                {c.icon}
                <span className="mono" style={{ fontSize: 10, color: "var(--text-secondary)" }}>
                  {c.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
