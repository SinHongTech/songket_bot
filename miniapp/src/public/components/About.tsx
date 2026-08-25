import { Mail, Send, Briefcase, Code, Palette, Lock, Monitor, ClipboardList, Megaphone, Users, Lightbulb, MapPin } from "lucide-react";

interface AboutProps {
  t: any;
  isKm: boolean;
  bodyFont: string;
}

const TEAM = [
  { num: "01", name: "Bunleap Thay", roleEn: "Founder & CEO", roleKm: "ស្ថាបនិក & នាយកប្រតិបត្តិ", descEn: "Sets Songket's vision and turns Cambodia's scam problem into practical safety products people can use every day.", descKm: "កំណត់ទិសដៅរបស់ Songket និងដោះស្រាយបញ្ហាការបន្លំនៅកម្ពុជា។", icon: <Briefcase size={20} color="var(--gold)" /> },
  { num: "02", name: "Panha Meas", roleEn: "Backend Developer", roleKm: "អ្នកអភិវឌ្ឍ Backend", descEn: "Builds Songket's core scanning engine and server infrastructure that keeps groups safe in real time.", descKm: "បង្កើតម៉ាស៊ីនស្កែន និងហេដ្ឋារចនាសម្ព័ន្ធស្នូលរបស់ Songket។", icon: <Code size={20} color="var(--gold)" /> },
  { num: "03", name: "Sreynich Oum", roleEn: "UI/UX Designer", roleKm: "អ្នករចនា UI/UX", descEn: "Crafts intuitive interfaces so users of all backgrounds can navigate Songket with confidence.", descKm: "រចនាចំណុចប្រទាក់ដ៏ស្រស់ស្អាត ដើម្បីឱ្យការប្រើប្រាស់ Songket មានភាពងាយស្រួល។", icon: <Palette size={20} color="var(--gold)" /> },
  { num: "04", name: "Rithy Kong", roleEn: "Security Analyst", roleKm: "អ្នកវិភាគសុវត្ថិភាព", descEn: "Researches emerging threats and keeps Songket's detection database sharp and up to date.", descKm: "ស្រាវជ្រាវការគំរាមកំហែងថ្មី និងធ្វើបច្ចុប្បន្នភាពមូលដ្ឋានទិន្នន័យការការពារ។", icon: <Lock size={20} color="var(--gold)" /> },
  { num: "05", name: "Dara Lim", roleEn: "Frontend Developer", roleKm: "អ្នកអភិវឌ្ឍ Frontend", descEn: "Builds the Mini App and admin dashboard — everything users see and interact with daily.", descKm: "បង្កើត Mini App និងផ្ទាំងគ្រប់គ្រងដែលអ្នកប្រើប្រាស់ឃើញ។", icon: <Monitor size={20} color="var(--gold)" /> },
  { num: "06", name: "Sokunthea Hak", roleEn: "Product Manager", roleKm: "អ្នកគ្រប់គ្រងផលិតផល", descEn: "Coordinates the team and ensures every feature shipped delivers real value to communities.", descKm: "ធ្វើសមស្របការងារក្រុម និងធានាថា Songket ផ្តល់តម្លៃដល់អ្នកប្រើប្រាស់។", icon: <ClipboardList size={20} color="var(--gold)" /> },
  { num: "07", name: "Vicheka Pen", roleEn: "Marketing & Growth", roleKm: "អ្នកទីផ្សារ & ការលូតលាស់", descEn: "Spreads the word about Songket and connects the product with communities that need it most.", descKm: "រីករាលដាល Songket ទៅកាន់ក្រុម Telegram ដែលត្រូវការការការពារ។", icon: <Megaphone size={20} color="var(--gold)" /> },
  { num: "08", name: "Mengly Chan", roleEn: "Community Support", roleKm: "ជំនួយការសហគមន៍", descEn: "Helps users set up Songket, answers questions, and builds a trusted community around the product.", descKm: "ជួយអ្នកប្រើប្រាស់ដំឡើង Songket និងឆ្លើយតបនឹងសំណួររបស់ពួកគេ។", icon: <Users size={20} color="var(--gold)" /> },
];

export default function About({ isKm, bodyFont }: AboutProps) {
  return (
    <section id="about" style={{ paddingBottom: 40 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 22 }}>
        <span style={{ width: 3, height: 18, background: "var(--gold)", borderRadius: 2, flexShrink: 0 }} />
        <h2 style={{ fontSize: 20, fontWeight: 700, letterSpacing: isKm ? 0 : "-0.01em", fontFamily: bodyFont }}>{isKm ? "អំពីយើង" : "About Us"}</h2>
      </div>
      <div style={{ borderRadius: 12, padding: "18px", marginBottom: 12, background: "var(--surface)", border: "1px solid var(--border)", borderTop: "3px solid rgb(220,180,82)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <span style={{ fontSize: 18 }}><Lightbulb size={16} color="var(--gold)" /></span>
          <p style={{ fontSize: 14, fontWeight: 700, fontFamily: bodyFont }}>{isKm ? "ដំណោះស្រាយ" : "Our Solution"}</p>
        </div>
        <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.7, fontFamily: bodyFont }}>{isKm ? "Songket គឺជាបូតសុវត្ថិភាព Telegram ដំបូងគេដែលត្រូវបានរចនាឡើងសម្រាប់សហគមន៍កម្ពុជា។" : "Songket is the first Telegram security bot built for Cambodian communities. It detects and blocks malicious files, phishing links, and harmful users — automatically, in seconds."}</p>
      </div>
      <div style={{ marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
          <span style={{ fontSize: 18 }}><Code size={16} color="var(--gold)" /></span>
          <p style={{ fontSize: 14, fontWeight: 700, fontFamily: bodyFont }}>{isKm ? "ក្រុមការងាររបស់យើង" : "Who We Are"}</p>
        </div>
        <div style={{ display: "grid", gap: 10 }}>
          {TEAM.map(m => (
            <div key={m.num} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", border: "1px solid var(--border)", borderRadius: 14, background: "var(--surface)" }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: "var(--surface2)", border: "1px solid var(--border-gold)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>{m.icon}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", fontFamily: bodyFont }}>{m.name}</div>
                <div style={{ fontSize: 12, color: "var(--gold)", fontWeight: 600, marginTop: 2, fontFamily: bodyFont }}>{isKm ? m.roleKm : m.roleEn}</div>
                <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 4, lineHeight: 1.5, fontFamily: bodyFont }}>{isKm ? m.descKm : m.descEn}</div>
              </div>
              <span className="mono" style={{ fontSize: 10, color: "var(--muted)", flexShrink: 0 }}>{m.num}</span>
            </div>
          ))}
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div style={{ borderRadius: 12, padding: "16px", background: "var(--surface)", border: "1px solid var(--border)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 10 }}>
            <span style={{ fontSize: 16 }}><MapPin size={14} color="var(--gold)" /></span>
            <p style={{ fontSize: 13, fontWeight: 700, fontFamily: bodyFont }}>{isKm ? "ទីតាំង" : "Location"}</p>
          </div>
          <p style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.6, fontFamily: bodyFont }}>{isKm ? "ភ្នំពេញ\nកម្ពុជា 🇰🇭" : "Phnom Penh,\nCambodia 🇰🇭"}</p>
        </div>
        <div style={{ borderRadius: 12, padding: "16px", background: "var(--surface)", border: "1px solid var(--border)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 10 }}>
            <Mail size={14} color="var(--gold)" />
            <p style={{ fontSize: 13, fontWeight: 700, fontFamily: bodyFont }}>{isKm ? "ទំនាក់ទំនង" : "Contact"}</p>
          </div>
          <div style={{ display: "grid", gap: 6 }}>
            {[{ icon: <Send size={11} color="var(--muted)" />, label: "@songketbbot" }, { icon: <Mail size={11} color="var(--muted)" />, label: "team@songket.app" }].map(c => (
              <div key={c.label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                {c.icon}
                <span className="mono" style={{ fontSize: 10, color: "var(--text-secondary)" }}>{c.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
