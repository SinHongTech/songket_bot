import { useState } from "react";
import { ChevronLeft, ChevronRight, Shield, AlertTriangle, Trash2 } from "lucide-react";

interface HowItWorksProps {
  t: any;
  isKm: boolean;
  bodyFont: string;
}

/* ─── Phone screen content: step 1 ─── */
function ContentAddBot({ isKm }: { isKm: boolean }) {
  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 17, paddingBottom: 14, borderBottom: "1px solid #1e1c14" }}>
        <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#2aabee", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>✈️</div>
        <div>
          <div style={{ fontSize: 17, fontWeight: 700, color: "#fff" }}>KhmerDev Community</div>
          <div style={{ fontSize: 13, color: "#555" }}>1,240 members</div>
        </div>
      </div>
      <div className="msg-in-1" style={{ textAlign: "center", marginBottom: 14 }}>
        <span style={{ fontSize: 13, color: "#555", background: "#1a1810", borderRadius: 10, padding: "4px 14px" }}>Admin added @SongketBot</span>
      </div>
      <div className="msg-in-2" style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 12, color: "#D4A72C", fontWeight: 600, marginBottom: 4 }}>@SongketBot</div>
        <div style={{ background: "rgba(212,167,44,0.08)", border: "1px solid rgba(212,167,44,0.2)", borderRadius: "7px 15px 15px 15px", padding: "10px 14px", maxWidth: "88%" }}>
          <div style={{ fontSize: 15, color: "#D4A72C", lineHeight: 1.5 }}>
            {isKm ? "🛡️ ករស្វាគមន៍! ការការពារឥឡូវសកម្ម!" : "🛡️ Hello! I'm Songket Bot — protection is now active!"}
          </div>
        </div>
      </div>
      <div className="msg-in-3" style={{ background: "rgba(42,170,90,0.06)", border: "1px solid rgba(42,170,90,0.2)", borderRadius: 15, padding: "14px 17px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <div className="dot-pulse" style={{ width: 8, height: 8, borderRadius: "50%", background: "#2aaa5a", flexShrink: 0 }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: "#2aaa5a", letterSpacing: "0.05em" }}>
            {isKm ? "ការការពារសកម្ម" : "PROTECTION ACTIVE"}
          </span>
        </div>
        <div className="check-appear-1" style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <span style={{ color: "#2aaa5a", fontSize: 15, fontWeight: 700 }}>✓</span>
          <span style={{ fontSize: 15, color: "#c8b980" }}>{isKm ? "ការស្កែន URL" : "URL scanning"}</span>
        </div>
        <div className="check-appear-2" style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <span style={{ color: "#2aaa5a", fontSize: 15, fontWeight: 700 }}>✓</span>
          <span style={{ fontSize: 15, color: "#c8b980" }}>{isKm ? "ការស្កែនឯកសារ" : "File scanning"}</span>
        </div>
        <div className="check-appear-3" style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ color: "#2aaa5a", fontSize: 15, fontWeight: 700 }}>✓</span>
          <span style={{ fontSize: 15, color: "#c8b980" }}>{isKm ? "ការរកឃើញការបោកប្រាស់" : "Scam detection"}</span>
        </div>
      </div>
    </>
  );
}

/* ─── Phone screen content: step 2 ─── */
function ContentWatchMessages({ isKm }: { isKm: boolean }) {
  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 17, paddingBottom: 14, borderBottom: "1px solid #1e1c14" }}>
        <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#2aabee", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>✈️</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 17, fontWeight: 700, color: "#fff" }}>KhmerDev Community</div>
          <div style={{ fontSize: 13, color: "#555" }}>1,240 members</div>
        </div>
        <Shield size={15} color="#D4A72C" />
      </div>
      <div style={{ position: "relative", overflow: "hidden", borderRadius: 10 }}>
        <div className="msg-in-1" style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 12, color: "#2aabee", fontWeight: 600, marginBottom: 4 }}>Dara</div>
          <div style={{ background: "#1e1c14", borderRadius: "7px 15px 15px 15px", padding: "7px 14px", display: "inline-block" }}>
            <span style={{ fontSize: 15, color: "#c8b980" }}>{isKm ? "ហេ មើល link ABA 🔗" : "Hey check this ABA link 🔗"}</span>
          </div>
        </div>
        <div className="msg-in-2" style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 12, color: "#2aabee", fontWeight: 600, marginBottom: 4 }}>Dara</div>
          <div style={{ background: "#1e1c14", borderRadius: "7px 15px 15px 15px", padding: "7px 14px", display: "inline-block", maxWidth: "92%" }}>
            <span style={{ fontSize: 13, color: "#e04040", fontFamily: "JetBrains Mono, monospace", wordBreak: "break-all" }}>http://aba-bank-verify.xyz</span>
          </div>
        </div>
        <div className="msg-in-3" style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 12, color: "#7a6830", fontWeight: 600, marginBottom: 4 }}>Rith</div>
          <div style={{ background: "#1e1c14", borderRadius: "7px 15px 15px 15px", padding: "7px 14px", display: "inline-block" }}>
            <span style={{ fontSize: 15, color: "#c8b980" }}>{isKm ? "link ណា?" : "Which link?"}</span>
          </div>
        </div>
        <div className="msg-in-4" style={{ marginBottom: 4 }}>
          <div style={{ fontSize: 12, color: "#7a6830", fontWeight: 600, marginBottom: 4 }}>Sophy</div>
          <div style={{ background: "#1e1c14", borderRadius: "7px 15px 15px 15px", padding: "7px 14px", display: "inline-block" }}>
            <span style={{ fontSize: 15, color: "#c8b980" }}>{isKm ? "ខ្ញុំក៏ទទួលបាន" : "I got that too"}</span>
          </div>
        </div>
        <div className="scan-sweep" style={{ position: "absolute", left: 0, right: 0, height: 3, background: "linear-gradient(90deg, transparent, rgba(212,167,44,0.7), transparent)", borderRadius: 2, pointerEvents: "none" }} />
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 14, padding: "8px 14px", background: "rgba(212,167,44,0.06)", border: "1px solid rgba(212,167,44,0.18)", borderRadius: 12 }}>
        <div className="spin" style={{ width: 17, height: 17, borderRadius: "50%", border: "2.5px solid #D4A72C", borderTopColor: "transparent", flexShrink: 0 }} />
        <span style={{ fontSize: 14, color: "#D4A72C" }}>{isKm ? "Songket កំពុងស្កែន…" : "Songket scanning every message…"}</span>
      </div>
    </>
  );
}

/* ─── Phone screen content: step 3 ─── */
function ContentBlockThreats({ isKm }: { isKm: boolean }) {
  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 17, paddingBottom: 14, borderBottom: "1px solid #1e1c14" }}>
        <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#2aabee", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>✈️</div>
        <div style={{ fontSize: 17, fontWeight: 700, color: "#fff" }}>KhmerDev Community</div>
      </div>
      <div className="threat-slide" style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 12, color: "#2aabee", fontWeight: 600, marginBottom: 4 }}>Dara</div>
        <div style={{ background: "rgba(224,64,64,0.06)", border: "1px solid rgba(224,64,64,0.2)", borderRadius: "7px 15px 15px 15px", padding: "7px 14px", display: "inline-block", maxWidth: "92%" }}>
          <span style={{ fontSize: 13, color: "#e04040", fontFamily: "JetBrains Mono, monospace", wordBreak: "break-all" }}>http://aba-bank-verify.xyz/login</span>
        </div>
      </div>
      <div className="alert-appear" style={{ background: "rgba(224,64,64,0.08)", border: "1px solid rgba(224,64,64,0.35)", borderRadius: 15, padding: "14px 17px", marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 8 }}>
          <AlertTriangle size={17} color="#e04040" />
          <span style={{ fontSize: 14, fontWeight: 700, color: "#e04040", letterSpacing: "0.05em" }}>SONGKET ALERT</span>
        </div>
        <div style={{ fontSize: 15, color: "#c8b980", lineHeight: 1.5, marginBottom: 10 }}>
          {isKm ? "🚨 Phishing URL — ក្លែងក្លាយ ABA Bank!" : "🚨 Phishing URL — impersonating ABA Bank!"}
        </div>
        <div className="deleted-appear" style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <Trash2 size={15} color="#e04040" />
          <span style={{ fontSize: 15, color: "#e04040", fontWeight: 700 }}>{isKm ? "សារត្រូវបានលុប" : "Message deleted"}</span>
        </div>
      </div>
      <div className="deleted-appear">
        <div style={{ fontSize: 12, color: "#D4A72C", fontWeight: 600, marginBottom: 4 }}>@SongketBot</div>
        <div style={{ background: "rgba(212,167,44,0.08)", border: "1px solid rgba(212,167,44,0.2)", borderRadius: "7px 15px 15px 15px", padding: "8px 14px", display: "inline-block", maxWidth: "90%" }}>
          <span style={{ fontSize: 15, color: "#2aaa5a" }}>
            {isKm ? "✅ ក្រុមការពារ — Dara ត្រូវបានព្រមាន" : "✅ Group protected — Dara has been warned"}
          </span>
        </div>
      </div>
    </>
  );
}

/* ─── Phone screen content: step 4 ─── */
function ContentDashboard({ isKm }: { isKm: boolean }) {
  const bars = [
    { cls: "bar-1", label: "M" },
    { cls: "bar-2", label: "T" },
    { cls: "bar-3", label: "W" },
    { cls: "bar-4", label: "T" },
    { cls: "bar-5", label: "F" },
    { cls: "bar-6", label: "S" },
    { cls: "bar-7", label: "S" },
  ];
  return (
    <>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Shield size={18} color="#D4A72C" />
          <span style={{ fontSize: 17, fontWeight: 700, color: "#D4A72C" }}>Songket Admin</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <div className="dot-pulse" style={{ width: 8, height: 8, borderRadius: "50%", background: "#2aaa5a", flexShrink: 0 }} />
          <span style={{ fontSize: 14, color: "#2aaa5a" }}>Live</span>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 20 }}>
        {[
          { cls: "stat-in-1", label: isKm ? "ស្កែន" : "Scans", value: "768", color: "#D4A72C" },
          { cls: "stat-in-2", label: isKm ? "ការគំរាម" : "Threats", value: "41", color: "#e04040" },
          { cls: "stat-in-3", label: isKm ? "បានលុប" : "Deleted", value: "38", color: "#d07820" },
          { cls: "stat-in-4", label: isKm ? "ក្រុម" : "Groups", value: "4/5", color: "#2aaa5a" },
        ].map(s => (
          <div key={s.label} className={s.cls} style={{ background: "#1a1400", border: "1px solid #2e2400", borderRadius: 12, padding: "10px 14px" }}>
            <div style={{ fontSize: 12, color: "#7a6830", marginBottom: 5 }}>{s.label}</div>
            <div style={{ fontSize: 27, fontWeight: 700, color: s.color, lineHeight: 1 }}>{s.value}</div>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 12, color: "#7a6830", fontWeight: 600, letterSpacing: "0.07em", marginBottom: 10 }}>
        {isKm ? "ការស្កែន ៧ ថ្ងៃ" : "7-DAY ACTIVITY"}
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 7, height: 110 }}>
        {bars.map((b, idx) => (
          <div key={idx} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", gap: 5 }}>
            <div className={b.cls} style={{ width: "100%", background: "rgba(212,167,44,0.5)", borderRadius: "3px 3px 0 0", minHeight: 2 }} />
            <span style={{ fontSize: 10, color: "#555", fontFamily: "JetBrains Mono, monospace" }}>{b.label}</span>
          </div>
        ))}
      </div>
    </>
  );
}

const CONTENTS = [ContentAddBot, ContentWatchMessages, ContentBlockThreats, ContentDashboard];

const STEPS_EN = [
  { label: "Add Songket", desc: "Invite @SongketBot as an admin to any Telegram group and protection starts immediately." },
  { label: "Watch Messages", desc: "Songket scans every message, URL, file, and image automatically in real time." },
  { label: "Block Threats", desc: "Malicious content is deleted instantly and the sender is warned before harm is done." },
  { label: "Stay in Control", desc: "View full scan history, threats, and group status from your Songket Admin dashboard." },
];
const STEPS_KM = [
  { label: "បន្ថែម Songket", desc: "អញ្ជើញ @SongketBot ជាអ្នកគ្រប់គ្រង ក្នុងក្រុម Telegram ណាមួយ ហើយការការពារចាប់ផ្តើមភ្លាមៗ។" },
  { label: "ការតាមដានសារ", desc: "Songket ស្កែនគ្រប់សារ URL ឯកសារ និងរូបភាព ដោយស្វ័យប្រវត្តិ ក្នុងពេលជាក់ស្តែង។" },
  { label: "ការទប់ស្កាត់ការគំរាម", desc: "មាតិកា Malware និង Phishing ត្រូវបានលុបភ្លាមៗ ហើយអ្នកផ្ញើត្រូវបានព្រមាន មុនពេលអ្នកណាត្រូវប៉ះពាល់។" },
  { label: "ការគ្រប់គ្រង", desc: "មើលប្រវត្តិស្កែន ការគំរាម និងស្ថានភាពក្រុម ពីផ្ទាំងគ្រប់គ្រង Songket Admin។" },
];

/* ── Decorative circuit-board background ── */
function CircuitBg() {
  return (
    <svg
      viewBox="0 0 480 560"
      xmlns="http://www.w3.org/2000/svg"
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}
    >
      {/* Top-left corner bracket */}
      <polyline points="0,60 0,10 50,10" fill="none" stroke="#D4A72C" strokeWidth="1" opacity="0.35" />
      <polyline points="0,90 0,10 80,10" fill="none" stroke="#D4A72C" strokeWidth="0.5" opacity="0.2" />
      <line x1="50" y1="10" x2="80" y2="10" stroke="#D4A72C" strokeWidth="0.5" opacity="0.2" />
      <line x1="80" y1="10" x2="80" y2="30" stroke="#D4A72C" strokeWidth="0.5" opacity="0.2" />
      <line x1="30" y1="10" x2="30" y2="40" stroke="#D4A72C" strokeWidth="0.5" opacity="0.2" />
      <circle cx="30" cy="40" r="2.5" fill="#D4A72C" opacity="0.5" className="circuit-dot" />
      <circle cx="80" cy="30" r="2" fill="#D4A72C" opacity="0.4" className="circuit-dot-b" />
      <line x1="0" y1="130" x2="40" y2="130" stroke="#D4A72C" strokeWidth="0.5" opacity="0.18" />
      <line x1="40" y1="130" x2="40" y2="110" stroke="#D4A72C" strokeWidth="0.5" opacity="0.18" />
      <circle cx="40" cy="110" r="2" fill="#D4A72C" opacity="0.3" className="circuit-dot-c" />

      {/* Top-right corner bracket */}
      <polyline points="480,60 480,10 430,10" fill="none" stroke="#D4A72C" strokeWidth="1" opacity="0.35" />
      <polyline points="480,90 480,10 400,10" fill="none" stroke="#D4A72C" strokeWidth="0.5" opacity="0.2" />
      <line x1="400" y1="10" x2="400" y2="30" stroke="#D4A72C" strokeWidth="0.5" opacity="0.2" />
      <line x1="450" y1="10" x2="450" y2="40" stroke="#D4A72C" strokeWidth="0.5" opacity="0.2" />
      <circle cx="450" cy="40" r="2.5" fill="#D4A72C" opacity="0.5" className="circuit-dot-b" />
      <circle cx="400" cy="30" r="2" fill="#D4A72C" opacity="0.4" className="circuit-dot" />
      <line x1="480" y1="130" x2="440" y2="130" stroke="#D4A72C" strokeWidth="0.5" opacity="0.18" />
      <line x1="440" y1="130" x2="440" y2="110" stroke="#D4A72C" strokeWidth="0.5" opacity="0.18" />
      <circle cx="440" cy="110" r="2" fill="#D4A72C" opacity="0.3" className="circuit-dot-c" />

      {/* Bottom-left corner bracket */}
      <polyline points="0,500 0,550 50,550" fill="none" stroke="#D4A72C" strokeWidth="1" opacity="0.35" />
      <line x1="30" y1="550" x2="30" y2="520" stroke="#D4A72C" strokeWidth="0.5" opacity="0.2" />
      <circle cx="30" cy="520" r="2.5" fill="#D4A72C" opacity="0.5" className="circuit-dot-c" />
      <line x1="0" y1="430" x2="40" y2="430" stroke="#D4A72C" strokeWidth="0.5" opacity="0.18" />
      <line x1="40" y1="430" x2="40" y2="450" stroke="#D4A72C" strokeWidth="0.5" opacity="0.18" />
      <circle cx="40" cy="450" r="2" fill="#D4A72C" opacity="0.3" className="circuit-dot" />

      {/* Bottom-right corner bracket */}
      <polyline points="480,500 480,550 430,550" fill="none" stroke="#D4A72C" strokeWidth="1" opacity="0.35" />
      <line x1="450" y1="550" x2="450" y2="520" stroke="#D4A72C" strokeWidth="0.5" opacity="0.2" />
      <circle cx="450" cy="520" r="2.5" fill="#D4A72C" opacity="0.5" className="circuit-dot" />
      <line x1="480" y1="430" x2="440" y2="430" stroke="#D4A72C" strokeWidth="0.5" opacity="0.18" />
      <line x1="440" y1="430" x2="440" y2="450" stroke="#D4A72C" strokeWidth="0.5" opacity="0.18" />
      <circle cx="440" cy="450" r="2" fill="#D4A72C" opacity="0.3" className="circuit-dot-b" />

      {/* Mid-left circuit traces */}
      <line x1="0" y1="280" x2="55" y2="280" stroke="#D4A72C" strokeWidth="0.5" opacity="0.15" />
      <line x1="55" y1="280" x2="55" y2="260" stroke="#D4A72C" strokeWidth="0.5" opacity="0.15" />
      <circle cx="55" cy="260" r="2" fill="#D4A72C" opacity="0.3" className="circuit-dot-b" />
      <line x1="0" y1="310" x2="35" y2="310" stroke="#D4A72C" strokeWidth="0.5" opacity="0.1" />

      {/* Mid-right circuit traces */}
      <line x1="480" y1="280" x2="425" y2="280" stroke="#D4A72C" strokeWidth="0.5" opacity="0.15" />
      <line x1="425" y1="280" x2="425" y2="260" stroke="#D4A72C" strokeWidth="0.5" opacity="0.15" />
      <circle cx="425" cy="260" r="2" fill="#D4A72C" opacity="0.3" className="circuit-dot-c" />
      <line x1="480" y1="310" x2="445" y2="310" stroke="#D4A72C" strokeWidth="0.5" opacity="0.1" />

      {/* Scattered micro-dots */}
      <circle cx="100" cy="50" r="1.5" fill="#D4A72C" opacity="0.25" className="circuit-dot-b" />
      <circle cx="380" cy="50" r="1.5" fill="#D4A72C" opacity="0.25" className="circuit-dot" />
      <circle cx="60" cy="200" r="1.5" fill="#D4A72C" opacity="0.2" className="circuit-dot-c" />
      <circle cx="420" cy="200" r="1.5" fill="#D4A72C" opacity="0.2" className="circuit-dot-b" />
      <circle cx="70" cy="380" r="1.5" fill="#D4A72C" opacity="0.2" className="circuit-dot" />
      <circle cx="410" cy="380" r="1.5" fill="#D4A72C" opacity="0.2" className="circuit-dot-c" />
    </svg>
  );
}

export default function HowItWorks({ t, isKm, bodyFont }: HowItWorksProps) {
  const [active, setActive] = useState(0);
  const steps = isKm ? STEPS_KM : STEPS_EN;
  const total = CONTENTS.length;

  /* Per-offset visual properties */
  const POSITIONS: Record<string, { tx: number; sc: number; opacity: number; blur: number; z: number }> = {
    "-3": { tx: -370, sc: 0.52, opacity: 0.12, blur: 3, z: 5 },
    "-2": { tx: -240, sc: 0.66, opacity: 0.28, blur: 2, z: 10 },
    "-1": { tx: -162, sc: 0.82, opacity: 0.48, blur: 1, z: 15 },
    "0": { tx: 0, sc: 1.0, opacity: 1.0, blur: 0, z: 20 },
    "1": { tx: 162, sc: 0.82, opacity: 0.48, blur: 1, z: 15 },
    "2": { tx: 240, sc: 0.66, opacity: 0.28, blur: 2, z: 10 },
    "3": { tx: 370, sc: 0.52, opacity: 0.12, blur: 3, z: 5 },
  };

  return (
    <section id="how" style={{ paddingBottom: 40 }}>
      {/* Section heading */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 22 }}>
        <span style={{ width: 3, height: 18, background: "var(--gold)", borderRadius: 2, flexShrink: 0 }} />
        <h2 style={{ fontSize: 20, fontWeight: 700, letterSpacing: isKm ? 0 : "-0.01em", fontFamily: bodyFont }}>{t.how_h}</h2>
      </div>

      {/* ── Dark carousel panel ── */}
      <div className="how-panel">

        {/* Circuit board background */}
        <CircuitBg />

        {/* Horizontal scanner line */}
        <div className="how-vscan-line" />

        {/* Radial gold glow behind center phone */}
        <div style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          marginLeft: -160,
          marginTop: -220,
          width: 320,
          height: 440,
          borderRadius: "50%",
          background: "radial-gradient(ellipse at center, rgba(212,167,44,0.22) 0%, rgba(212,167,44,0.06) 45%, transparent 70%)",
          pointerEvents: "none",
          zIndex: 1,
        }} />

        {/* Phone labels row — fixed above phones */}
        <div style={{ display: "flex", justifyContent: "center", paddingTop: 20, marginBottom: 8, position: "relative", zIndex: 25 }}>
          {CONTENTS.map((_, index) => {
            const offset = index - active;
            const pos = POSITIONS[String(offset)] ?? POSITIONS["3"];
            const isCurrent = offset === 0;
            return (
              <div
                key={index}
                className="how-phone-card"
                style={{
                  "--phone-tx": `${pos.tx}px`,
                  "--phone-sc": 1,
                  position: "absolute",
                  textAlign: "center",
                  opacity: pos.opacity,
                  zIndex: pos.z,
                  pointerEvents: "none",
                } as React.CSSProperties}
              >
                <div style={{
                  fontSize: 9,
                  fontWeight: 700,
                  color: isCurrent ? "#D4A72C" : "rgba(212,167,44,0.5)",
                  letterSpacing: "0.1em",
                  fontFamily: bodyFont,
                  whiteSpace: "nowrap",
                }}>
                  {`0${index + 1}`}
                </div>
                {isCurrent && (
                  <div style={{ width: 1, height: 8, background: "#D4A72C", margin: "3px auto 0" }} />
                )}
              </div>
            );
          })}
          <div style={{ height: 28 }} />
        </div>

        {/* Phones */}
        <div style={{ position: "relative", height: 560, display: "flex", justifyContent: "center", alignItems: "center", zIndex: 2 }}>
          {CONTENTS.map((StepContent, index) => {
            const offset = index - active;
            const pos = POSITIONS[String(offset)] ?? { ...POSITIONS["3"], tx: offset > 0 ? 370 : -370 };
            const isCurrent = offset === 0;

            return (
              <div
                key={index}
                onClick={() => !isCurrent && setActive(index)}
                className="how-phone-card"
                style={{
                  "--phone-tx": `${pos.tx}px`,
                  "--phone-sc": pos.sc,
                  position: "absolute",
                  width: 230,
                  borderRadius: 40,
                  border: isCurrent
                    ? "2px solid rgba(212,167,44,0.75)"
                    : "1.5px solid rgba(212,167,44,0.18)",
                  background: "#060400",
                  boxShadow: isCurrent
                    ? "0 0 0 1px rgba(212,167,44,0.15), 0 0 50px rgba(212,167,44,0.5), 0 0 100px rgba(212,167,44,0.18), 0 20px 60px rgba(0,0,0,0.6)"
                    : "0 8px 32px rgba(0,0,0,0.7)",
                  opacity: pos.opacity,
                  zIndex: pos.z,
                  cursor: isCurrent ? "default" : "pointer",
                  overflow: "hidden",
                  filter: pos.blur > 0 ? `blur(${pos.blur}px) brightness(${isCurrent ? 1 : 0.55})` : "none",
                } as React.CSSProperties}
              >
                {/* Dynamic island */}
                <div style={{ height: 30, background: "#030200", display: "flex", alignItems: "center", justifyContent: "center", borderBottom: "1px solid #181408" }}>
                  <div style={{ width: 70, height: 5, borderRadius: 3, background: "#181408" }} />
                </div>
                {/* Screen */}
                <div style={{ background: "#0f0c04", padding: "14px 12px 18px", height: 480, overflow: "hidden" }}>
                  <StepContent isKm={isKm} />
                </div>
                {/* Home bar */}
                <div style={{ height: 22, background: "#030200", display: "flex", alignItems: "center", justifyContent: "center", borderTop: "1px solid #181408" }}>
                  <div style={{ width: 56, height: 3, borderRadius: 2, background: "#2a2010" }} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Navigation controls inside dark panel */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16, padding: "16px 0 22px", position: "relative", zIndex: 25 }}>
          <button
            onClick={() => setActive(a => (a - 1 + total) % total)}
            style={{
              width: 44, height: 44, borderRadius: "50%",
              border: "1.5px solid rgba(212,167,44,0.5)",
              background: "rgba(212,167,44,0.18)",
              color: "#D4A72C",
              cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}
          >
            <ChevronLeft size={20} />
          </button>

          <div style={{ display: "flex", gap: 7 }}>
            {steps.map((_, i) => (
              <button
                key={i}
                onClick={() => setActive(i)}
                style={{ width: i === active ? 22 : 7, height: 7, borderRadius: 4, border: "none", background: i === active ? "#D4A72C" : "rgba(212,167,44,0.25)", cursor: "pointer", padding: 0 }}
              />
            ))}
          </div>

          <button
            onClick={() => setActive(a => (a + 1) % total)}
            style={{
              width: 44, height: 44, borderRadius: "50%",
              border: "1.5px solid rgba(212,167,44,0.5)",
              background: "rgba(212,167,44,0.18)",
              color: "#D4A72C",
              cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>{/* end dark panel */}

      {/* Step description card */}
      <div style={{ marginTop: 20, padding: "14px 16px", background: "var(--surface)", border: "1px solid var(--border)", borderLeft: "3px solid var(--gold)", borderRadius: "0 10px 10px 0" }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: "var(--gold)", letterSpacing: "0.07em", marginBottom: 5 }}>
          0{active + 1}
        </div>
        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text)", marginBottom: 4, fontFamily: bodyFont }}>
          {steps[active].label}
        </div>
        <p className={isKm ? "khmer" : ""} style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.65, fontFamily: bodyFont }}>
          {steps[active].desc}
        </p>
      </div>
    </section>
  );
}