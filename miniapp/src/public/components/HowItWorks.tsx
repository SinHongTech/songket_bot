
import { useState } from "react";
import {ChevronLeft,ChevronRight,Shield, AlertTriangle,RefreshCw,LogOut,Search,FileText,Link2,LayoutGrid, MessageSquare, History,User,} from "lucide-react";
import logoImg from "../../shared/assets/Logo.svg";

interface HowItWorksProps {
  t: any;
  isKm: boolean;
  bodyFont: string;
  dark: boolean;
}

/* ─── Phone screen content: step 1 ─── */
function ContentAddBot({ isKm }: { isKm: boolean }) {
  return (
    <>
      {/* ── Telegram chat header ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "10px 4px 14px",
          marginBottom: 14,
          borderBottom: "1px solid #0f1a24",
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
          <path d="M15 19l-7-7 7-7" stroke="#6d7f8f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: "50%",
            background: "linear-gradient(135deg, #54a9eb, #2683d1)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 18,
            flexShrink: 0,
          }}
        >
          PG
        </div>
        <div style={{ lineHeight: 1.3 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>Project Next Gen</div>
          <div style={{ fontSize: 10, color: "#6d7f8f" }}>1,240 members, 89 online</div>
        </div>
      </div>

      {/* ── System/service message ── */}
      <div className="msg-in-1" style={{ textAlign: "center", marginBottom: 16 }}>
        <span
          style={{
            fontSize: 12.5,
            color: "#8a97a1",
            background: "rgba(255,255,255,0.06)",
            borderRadius: 12,
            padding: "5px 12px",
          }}
        >
          Admin added @SongketBot
        </span>
      </div>

      {/* ── Sequential group: avatar shown once, both bubbles share the tail column ── */}
      <div style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 4 }}>
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            overflow: "hidden",
            flexShrink: 0,
            marginTop: 2,
            background: "#0e1621",
          }}
        >
          <img
            src={logoImg}
            alt="Songket Bot"
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 3, maxWidth: "78%" }}>
          {/* message 1 */}
          <div className="msg-in-2">
            <div style={{ fontSize: 13, color: "#D4A72C", fontWeight: 600, marginBottom: 2, paddingLeft: 12 }}>
              SongketBot
            </div>
            <div
              style={{
                background: "#182533",
                borderRadius: "4px 12px 12px 12px",
                padding: "10px 12px 8px",
              }}
            >
              <div style={{ fontSize: 14.5, color: "#e8edf1", lineHeight: 1.45 }}>
                {isKm ? "ការស្វាគមន៍! ការការពារឥឡូវសកម្ម!" : "Hello! I'm Songket Bot — protection is now active!"}
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 3, marginTop: 4 }}>
                <span style={{ fontSize: 11, color: "#6d7f8f" }}>10:24 AM</span>
                <svg width="15" height="10" viewBox="0 0 16 11" fill="none">
                  <path d="M1 5.5L4.5 9L11 1.5" stroke="#5eb5f7" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M5 5.5L8.5 9L15 1.5" stroke="#5eb5f7" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </div>
          </div>

          {/* message 2 — no avatar/name repeat, continuation bubble */}
          <div
            className="msg-in-3"
            style={{
              background: "#182533",
              borderRadius: "12px",
              padding: "12px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 10 }}>
              <div className="dot-pulse" style={{ width: 7, height: 7, borderRadius: "50%", background: "#2aaa5a", flexShrink: 0 }} />
              <span style={{ fontSize: 12.5, fontWeight: 600, color: "#2aaa5a", letterSpacing: "0.03em" }}>
                {isKm ? "ការការពារសកម្ម" : "Protection active"}
              </span>
            </div>

            {[
              isKm ? "ការស្កែន URL" : "URL scanning",
              isKm ? "ការស្កែនឯកសារ" : "File scanning",
            ].map((label, i) => (
              <div key={label} className={`check-appear-${i + 1}`} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: i < 2 ? 7 : 0 }}>
                <span style={{ color: "#2aaa5a", fontSize: 14, fontWeight: 700, width: 14, textAlign: "center", flexShrink: 0 }}>✓</span>
                <span style={{ fontSize: 14, color: "#c3ccd3" }}>{label}</span>
              </div>
            ))}

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
              <span style={{ fontSize: 11, color: "#6d7f8f" }}>10:24 AM</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/* ─── Phone screen content: step 2 ─── */

function ContentWatchMessages({ isKm }: { isKm: boolean }) {
  return (
    <>
      {/* ── Telegram chat header ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "10px 4px 14px",
          marginBottom: 14,
          borderBottom: "1px solid #0f1a24",
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
          <path d="M15 19l-7-7 7-7" stroke="#6d7f8f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: "50%",
            background: "linear-gradient(135deg, #54a9eb, #2683d1)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 18,
            flexShrink: 0,
          }}
        >
          PG
        </div>
        <div style={{ lineHeight: 1.3 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>Project Next Gen</div>
          <div style={{ fontSize: 10, color: "#6d7f8f" }}>1,240 members, 89 online</div>
        </div>
      </div>

      <div style={{ position: "relative", overflow: "hidden", borderRadius: 10 }}>
        <div className="msg-in-1" style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 12, color: "#2aabee", fontWeight: 600, marginBottom: 4 }}>Dara</div>
          <div style={{ background: "#1e1c14", borderRadius: "7px 15px 15px 15px", padding: "7px 14px", display: "inline-block" }}>
            <span style={{ fontSize: 15, color: "#c8b980" }}>{isKm ? "ហេ មើល link នេះ 🔗" : "Hey check this link 🔗"}</span>
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
        <div className="msg-in-4" style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 12, color: "#7a6830", fontWeight: 600, marginBottom: 4 }}>Sophy</div>
          <div style={{ background: "#1e1c14", borderRadius: "7px 15px 15px 15px", padding: "7px 14px", display: "inline-block" }}>
            <span style={{ fontSize: 15, color: "#c8b980" }}>{isKm ? "ខ្ញុំក៏ទទួលបាន" : "I got that too"}</span>
          </div>
        </div>

        {/* ── Bot scanning response: shared logo avatar + two scan rows ── */}
        <div className="msg-in-5" style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
          <div style={{ width: 28, height: 28, borderRadius: "50%", overflow: "hidden", flexShrink: 0, marginTop: 1, background: "#0e1621" }}>
            <img src={logoImg} alt="Songket Bot" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                background: "#182533",
                borderRadius: 10,
                padding: "7px 9px",
                minWidth: 0,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 5, minWidth: 0 }}>
                  <span style={{ fontSize: 11, color: "#2aabee", fontWeight: 600, flexShrink: 0 }}>Songket Bot</span>
                  <span
                    style={{
                      fontSize: 8.5,
                      fontWeight: 600,
                      color: "#7cd992",
                      background: "rgba(42,170,90,0.15)",
                      borderRadius: 4,
                      padding: "1px 5px",
                      flexShrink: 0,
                    }}
                  >
                    {isKm ? "អ្នកគ្រប់គ្រង" : "admin"}
                  </span>
                </div>
                <span style={{ fontSize: 9.5, color: "#6d7f8f", flexShrink: 0 }}>15:48</span>
              </div>

              <div style={{ fontSize: 12, color: "#9aa7b0", marginTop: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                🔍 {isKm ? "កំពុងស្កែនមាតិកា..." : "Scanning content..."}
              </div>
            </div>
          </div>
        </div>

<div className="scan-sweep" style={{ position: "absolute", left: 0, right: 0, height: 3, background: "linear-gradient(90deg, transparent, rgba(212,167,44,0.7), transparent)", borderRadius: 2, pointerEvents: "none" }} />
      </div>
    </>
  );
}

/* ─── Phone screen content: step 3 ─── */
function ContentBlockThreats({ isKm }: { isKm: boolean }) {
  return (
    <>
      {/* ── Telegram chat header ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "10px 4px 14px",
          marginBottom: 14,
          borderBottom: "1px solid #0f1a24",
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
          <path d="M15 19l-7-7 7-7" stroke="#6d7f8f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: "50%",
            background: "linear-gradient(135deg, #54a9eb, #2683d1)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 18,
            flexShrink: 0,
          }}
        >
          PG
        </div>
        <div style={{ lineHeight: 1.3 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>Project Next Gen</div>
          <div style={{ fontSize: 10, color: "#6d7f8f" }}>1,240 members, 89 online</div>
        </div>
      </div>

      {/* ── Dara sends the file/link (unchanged) ── */}
      <div className="threat-slide" style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 10, color: "#2aabee", fontWeight: 500, marginBottom: 4 }}>Dara</div>
        <div style={{ background: "rgba(224,64,64,0.06)", border: "1px solid rgba(224,64,64,0.2)", borderRadius: "7px 15px 15px 15px", padding: "7px 14px", display: "inline-block", maxWidth: "92%" }}>
          <span style={{ fontSize: 7, color: "#e04040", fontFamily: "JetBrains Mono, monospace", wordBreak: "break-all" }}>http://aba-bank-verify.xyz/login</span>
        </div>
      </div>

      {/* ── Bot detailed threat report ── */}
      <div className="alert-appear" style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", marginBottom: 4 }}>
          <span style={{ fontSize: 10, color: "#D4A72C", fontWeight: 600 }}>Songket Bot</span>
          <span
            style={{
              fontSize: 8,
              fontWeight: 600,
              color: "#7cd992",
              background: "rgba(42,170,90,0.15)",
              borderRadius: 5,
              padding: "1px 7px",
            }}
          >
            {isKm ? "អ្នកគ្រប់គ្រង" : "admin"}
          </span>
        </div>

        <div style={{ background: "#182533", borderRadius: 14, overflow: "hidden", width: "100%" }}>
          <div style={{ padding: "10px 12px 6px" }}>
            {/* Threat Detection header */}
            <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 1 }}>
              <span style={{ fontSize: 10 }}>🔴</span>
              <span style={{ fontSize: 8, fontWeight: 700, color: "#fff" }}>
                {isKm ? "រកឃើញការគំរាមកំហែងថ្មី" : "New Threat Detected"} | {isKm ? "Threat Detection" : "Threat Detection"}
              </span>
            </div>
            {/* Detail rows */}
            <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 2 }}>
              <div style={{ display: "flex", gap: 8, fontSize: 8, lineHeight: 1.4 }}>
                <span style={{ color: "#2aabee", flexShrink: 0 }}>◆</span>
                <span style={{ color: "#e8edf1" }}>
                  <b>{isKm ? "អ្នកផ្ញើ" : "Sender"}</b> ({isKm ? "Sender" : "Sender"}) :{" "}
                  <span style={{ color: "#5eb5f7" }}>@Panhakhonn</span>
                </span>
              </div>
              <div style={{ display: "flex", gap: 8, fontSize: 8, lineHeight: 1.4 }}>
                <span style={{ color: "#2aabee", flexShrink: 0 }}>◆</span>
                <span style={{ color: "#e8edf1" }}>
                  <b>{isKm ? "គោលដៅ" : "Target"}</b> ({isKm ? "Target" : "Target"}) :{" "}
                  <span style={{ color: "#5eb5f7", fontFamily: "JetBrains Mono, monospace" }}>Matlab.exe</span>
                </span>
              </div>
              <div style={{ display: "flex", gap: 8, fontSize: 8, lineHeight: 1.4 }}>
                <span style={{ color: "#2aabee", flexShrink: 0 }}>◆</span>
                <span style={{ color: "#e8edf1" }}>
                  <b>{isKm ? "សកម្មភាព" : "Action"}</b> ({isKm ? "Action" : "Action"}) :{" "}
                  {isKm ? "សារត្រូវបានលុបចោលភ្លាមៗ" : "Message deleted immediately"}
                  {isKm ? " (Message deleted immediately)" : ""}
                </span>
              </div>
            </div>

            {/* What is this */}
            <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 5 }}>
              <span style={{ fontSize: 10 }}>🤔</span>
              <span style={{ fontSize: 8, fontWeight: 700, color: "#fff" }}>
                {isKm ? "តើនេះជាអ្វី?" : "What is this?"} | What is this?
              </span>
            </div>
            <div style={{ display: "flex", gap: 6, fontSize: 8, lineHeight: 1.45, color: "#c3ccd3", marginBottom: 12 }}>
              <span style={{ flexShrink: 0 }}>•</span>
              <span>
                {isKm
                  ? "នេះជាឧបាយកលបោកប្រាស់ ឬមេរោគដែលព្យាយាមលួចគណនី/ពាក្យសម្ងាត់"
                  : "Phishing scam or malware attempting to steal account/passwords."}
              </span>
            </div>

            {/* What to do */}
            <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 5 }}>
              <span style={{ fontSize: 10 }}>🔴</span>
              <span style={{ fontSize: 8, fontWeight: 700, color: "#fff" }}>
                {isKm ? "អ្វីដែលត្រូវធ្វើ" : "What to do"} | What to do:
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 12 }}>
              <div style={{ display: "flex", gap: 7, fontSize: 8, alignItems: "flex-start" }}>
                <span style={{ flexShrink: 0 }}>❌</span>
                <span style={{ color: "#e8edf1" }}>{isKm ? "ហាមចុច ឬបើកឯកសារ" : "Do NOT click or open"}</span>
              </div>
              <div style={{ display: "flex", gap: 7, fontSize: 8, alignItems: "flex-start" }}>
                <span style={{ flexShrink: 0 }}>❌</span>
                <span style={{ color: "#e8edf1" }}>{isKm ? "ហាមផ្តល់លេខកូដ OTP" : "Never share OTP codes"}</span>
              </div>
            </div>

            {/* If already clicked */}
            <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 6 }}>
              <span style={{ fontSize: 10 }}>💡</span>
              <span style={{ fontSize: 8, fontWeight: 700, color: "#fff" }}>
                {isKm ? "បើបានចុចរួចហើយ" : "If already clicked"} | If already clicked:
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ display: "flex", gap: 8, fontSize: 8, alignItems: "flex-start" }}>
                <span
                  style={{
                    width:10,
                    height: 10,
                    borderRadius: "50%",
                    background: "#2aabee",
                    color: "#fff",
                    fontSize: 7,
                    fontWeight: 700,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  1
                </span>
                <span style={{ color: "#e8edf1" }}>
                  {isKm ? "ចូល Settings > Privacy & Security > Active Sessions រួចចុច" : "Go to"} Settings &gt; Privacy &amp; Security &gt; Active Sessions{isKm ? "" : ", then"} Terminate other sessions
                </span>
              </div>
              <div style={{ display: "flex", gap: 8, fontSize: 8, alignItems: "flex-start", justifyContent: "space-between" }}>
                <div style={{ display: "flex", gap: 8 }}>
                  <span
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: "50%",
                      background: "#2aabee",
                      color: "#fff",
                      fontSize: 7,
                      fontWeight: 700,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    2
                  </span>
                  <span style={{ color: "#e8edf1" }}>{isKm ? "បើកកម្មវិធី Two-Step Verification ជាបន្ទាន់" : "Turn on Two-Step Verification"}</span>
                </div>
                <span style={{ fontSize: 8, color: "#6d7f8f", flexShrink: 0, marginLeft: 8 }}>15:51</span>
              </div>
            </div>
          </div>

          {/* Footer strip */}
          <div
            style={{
              borderTop: "1px solid #1e2c3a",
              padding: "9px 14px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
            }}
          >
            <span style={{ fontSize: 13 }}>💡</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: "#5eb5f7" }}>
              {isKm ? "ការណែនាំសុវត្ថិភាព" : "Security Guide"} | Security Guide
            </span>
          </div>
        </div>
      </div>

      {/* ── Grouped avatar for the last bot bubble ── */}
    </>
  );
}

/* ─── Phone screen content: step 4 ─── */

function ContentDashboard({ isKm }: { isKm: boolean }) {
  const iconBtn: React.CSSProperties = {
    width:8,
    height: 8,
    borderRadius: 9,
    border: "1px solid #2e2400",
    background: "#1a1400",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  };

  const stats = [
    {
      cls: "stat-in-1",
      icon: <Shield size={16} color="#D4A72C" />,
      value: "1",
      caption: isKm ? "ក្រុម ១ សកម្ម" : "1 group(s) active",
      label: isKm ? "ក្រុម" : "Groups",
    },
    {
      cls: "stat-in-2",
      icon: <Search size={16} color="#D4A72C" />,
      value: "7",
      caption: isKm ? "សរុប ៦១" : "61 total",
      label: isKm ? "ស្កែនថ្ងៃនេះ" : "Scans Today",
    },
    {
      cls: "stat-in-3",
      icon: <FileText size={16} color="#D4A72C" />,
      value: "57",
      caption: isKm ? "ឯកសារ ៥៧" : "57 files",
      label: isKm ? "ឯកសារបានស្កែន" : "Files Scanned",
    },
    {
      cls: "stat-in-4",
      icon: <Link2 size={16} color="#D4A72C" />,
      value: "3",
      caption: isKm ? "ឯកសារ ៥៧" : "57 files",
      label: isKm ? "URL បានស្កែន" : "URLs Scanned",
    },
  ];

  const navItems = [
    { icon: LayoutGrid, label: isKm ? "ទំព័រដើម" : "Home", active: true },
    { icon: MessageSquare, label: isKm ? "ក្រុម" : "Groups", active: false },
    { icon: AlertTriangle, label: isKm ? "ការគំរាម" : "Threats", active: false },
    { icon: History, label: isKm ? "ប្រវត្តិ" : "History", active: false },
    { icon: User, label: isKm ? "គណនី" : "Account", active: false },
  ];

  return (
    <>
      {/* ── Top bar ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 18 }}>
        <div style={iconBtn}>
          <ChevronLeft size={17} color="#c8b980" />
        </div>

        <div style={{ width: 34, height: 34, borderRadius: 9, overflow: "hidden", flexShrink: 0, background: "#1a1400" }}>
          <img src={logoImg} alt="Songket" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#D4A72C" }}>SongKet</span>
            <span
              style={{
                fontSize: 5,
                fontWeight: 700,
                color: "#7cd992",
                background: "rgba(42,170,90,0.15)",
                border: "1px solid rgba(42,170,90,0.3)",
                borderRadius: 5,
                padding: "1px 6px",
              }}
            >
              {isKm ? "កំពុងដំណើរការ" : "LIVE"}
            </span>
          </div>
          <div style={{ fontSize: 8, color: "#7a6830" }}>{isKm ? "អ្នកគ្រប់គ្រង · ទំព័រដើម" : "Admin · HOME"}</div>
        </div>

        <div style={iconBtn}>
          <RefreshCw size={20} color="#c8b980" />
        </div>
        <div style={iconBtn}>
          <LogOut size={20} color="#c8b980" />
        </div>
        <div
          style={{
            padding: "5px 9px",
            borderRadius: 9,
            background: "#D4A72C",
            fontSize: 6,
            fontWeight: 700,
            color: "#1a1400",
            whiteSpace: "nowrap",
            flexShrink: 0,
          }}
        >
          {isKm ? "ដំឡើងកម្រិត" : "Upgrade"}
        </div>
      </div>

      {/* ── Greeting card ── */}
      <div
        className="stat-in-1"
        style={{
          background: "#1a1400",
          border: "1px solid #2e2400",
          borderRadius: 10,
          padding: "16px 18px",
          marginBottom: 16,
        }}
      >
        <div style={{ fontSize: 14, fontWeight: 700, color: "#fff", marginBottom: 4 }}>
          {isKm ? "រាត្រីសួស្តី" : "Good afternoon"}
        </div>
        <div style={{ fontSize: 9, color: "#c3ccd3" }}>
          {isKm ? "ក្រុមរបស់អ្នកកំពុងត្រូវបានតាមដានក្នុងពេលជាក់ស្តែង។" : "Your groups are being monitored in real time."}
        </div>
      </div>

      {/* ── Stat grid (2x2) ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
        {stats.map((s) => (
          <div
            key={s.label}
            className={s.cls}
            style={{ background: "#1a1400", border: "1px solid #2e2400", borderRadius: 12, padding: "12px 14px" }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <span style={{ fontSize: 18, fontWeight: 800, color: "#fff", lineHeight: 1 }}>{s.value}</span>
              <div style={{ width: 28, height: 28, borderRadius: 8, border: "1px solid #2e2400", background: "rgba(212,167,44,0.08)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                {s.icon}
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginTop: 10 }}>
              <span style={{ fontSize: 9, color: "#7a6830" }}>{s.caption}</span>
              <span style={{ fontSize: 10, color: "#c3ccd3", textAlign: "right" }}>{s.label}</span>
            </div>
          </div>
        ))}
      </div>

      {/* ── Threats Deleted (full width) ── */}
      <div
        className="stat-in-4"
        style={{ background: "rgba(224,64,64,0.06)", border: "1px solid rgba(224,64,64,0.25)", borderRadius: 12, padding: "12px 14px", marginBottom: 18 }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <span style={{ fontSize: 18, fontWeight: 800, color: "#e04040", lineHeight: 1 }}>34</span>
          <div style={{ width: 28, height: 28, borderRadius: 8, border: "1px solid rgba(224,64,64,0.3)", background: "rgba(224,64,64,0.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <AlertTriangle size={16} color="#e04040" />
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginTop: 10 }}>
          <span style={{ fontSize: 9, color: "#b06060" }}>{isKm ? "គំរាម ៣៥" : "35 malicious"}</span>
          <span style={{ fontSize: 10, color: "#c3ccd3" }}>{isKm ? "ការគំរាមបានលុប" : "Threats Deleted"}</span>
        </div>
      </div>

      {/* ── Bottom tab bar ── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          borderTop: "1px solid #2e2400",
          paddingTop: 12,
          marginBottom: 10,
        }}
      >
        {navItems.map(({ icon: Icon, label, active }) => (
          <div key={label} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, flex: 1 }}>
            <Icon size={18} color={active ? "#D4A72C" : "#6d6250"} />
            <span style={{ fontSize: 9.5, fontWeight: active ? 700 : 500, color: active ? "#D4A72C" : "#6d6250" }}>{label}</span>
          </div>
        ))}
      </div>

      {/* ── Bot handle footer ── */}
      <div style={{ textAlign: "center", paddingTop: 10, borderTop: "1px solid #14202b" }}>
        <span style={{ fontSize: 11.5, color: "#6d7f8f" }}>@songket_beyda_bot</span>
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

function CircuitBg({ dark }: { dark: boolean }) {
  const c = dark ? "#D4A72C" : "#b08a20";
  const op1 = dark ? 0.35 : 0.18;
  const op2 = dark ? 0.2 : 0.1;
  const op3 = dark ? 0.15 : 0.08;
  const op4 = dark ? 0.5 : 0.25;
  const op5 = dark ? 0.4 : 0.2;
  const op6 = dark ? 0.3 : 0.15;
  const op7 = dark ? 0.25 : 0.12;
  const op8 = dark ? 0.1 : 0.05;
  return (
    <svg
      viewBox="0 0 480 560"
      xmlns="http://www.w3.org/2000/svg"
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}
    >
      {/* Top-left corner bracket */}
      <polyline points="0,60 0,10 50,10" fill="none" stroke={c} strokeWidth="1" opacity={op1} />
      <polyline points="0,90 0,10 80,10" fill="none" stroke={c} strokeWidth="0.5" opacity={op2} />
      <line x1="50" y1="10" x2="80" y2="10" stroke={c} strokeWidth="0.5" opacity={op2} />
      <line x1="80" y1="10" x2="80" y2="30" stroke={c} strokeWidth="0.5" opacity={op2} />
      <line x1="30" y1="10" x2="30" y2="40" stroke={c} strokeWidth="0.5" opacity={op2} />
      <circle cx="30" cy="40" r="2.5" fill={c} opacity={op4} className="circuit-dot" />
      <circle cx="80" cy="30" r="2" fill={c} opacity={op5} className="circuit-dot-b" />
      <line x1="0" y1="130" x2="40" y2="130" stroke={c} strokeWidth="0.5" opacity={op3} />
      <line x1="40" y1="130" x2="40" y2="110" stroke={c} strokeWidth="0.5" opacity={op3} />
      <circle cx="40" cy="110" r="2" fill={c} opacity={op6} className="circuit-dot-c" />

      {/* Top-right corner bracket */}
      <polyline points="480,60 480,10 430,10" fill="none" stroke={c} strokeWidth="1" opacity={op1} />
      <polyline points="480,90 480,10 400,10" fill="none" stroke={c} strokeWidth="0.5" opacity={op2} />
      <line x1="400" y1="10" x2="400" y2="30" stroke={c} strokeWidth="0.5" opacity={op2} />
      <line x1="450" y1="10" x2="450" y2="40" stroke={c} strokeWidth="0.5" opacity={op2} />
      <circle cx="450" cy="40" r="2.5" fill={c} opacity={op4} className="circuit-dot-b" />
      <circle cx="400" cy="30" r="2" fill={c} opacity={op5} className="circuit-dot" />
      <line x1="480" y1="130" x2="440" y2="130" stroke={c} strokeWidth="0.5" opacity={op3} />
      <line x1="440" y1="130" x2="440" y2="110" stroke={c} strokeWidth="0.5" opacity={op3} />
      <circle cx="440" cy="110" r="2" fill={c} opacity={op6} className="circuit-dot-c" />

      {/* Bottom-left corner bracket */}
      <polyline points="0,500 0,550 50,550" fill="none" stroke={c} strokeWidth="1" opacity={op1} />
      <line x1="30" y1="550" x2="30" y2="520" stroke={c} strokeWidth="0.5" opacity={op2} />
      <circle cx="30" cy="520" r="2.5" fill={c} opacity={op6} className="circuit-dot-c" />
      <line x1="0" y1="430" x2="40" y2="430" stroke={c} strokeWidth="0.5" opacity={op3} />
      <line x1="40" y1="430" x2="40" y2="450" stroke={c} strokeWidth="0.5" opacity={op3} />
      <circle cx="40" cy="450" r="2" fill={c} opacity={op6} className="circuit-dot" />

      {/* Bottom-right corner bracket */}
      <polyline points="480,500 480,550 430,550" fill="none" stroke={c} strokeWidth="1" opacity={op1} />
      <line x1="450" y1="550" x2="450" y2="520" stroke={c} strokeWidth="0.5" opacity={op2} />
      <circle cx="450" cy="520" r="2.5" fill={c} opacity={op4} className="circuit-dot" />
      <line x1="480" y1="430" x2="440" y2="430" stroke={c} strokeWidth="0.5" opacity={op3} />
      <line x1="440" y1="430" x2="440" y2="450" stroke={c} strokeWidth="0.5" opacity={op3} />
      <circle cx="440" cy="450" r="2" fill={c} opacity={op6} className="circuit-dot-b" />

      {/* Mid-left circuit traces */}
      <line x1="0" y1="280" x2="55" y2="280" stroke={c} strokeWidth="0.5" opacity={op8} />
      <line x1="55" y1="280" x2="55" y2="260" stroke={c} strokeWidth="0.5" opacity={op8} />
      <circle cx="55" cy="260" r="2" fill={c} opacity={op6} className="circuit-dot-b" />
      <line x1="0" y1="310" x2="35" y2="310" stroke={c} strokeWidth="0.5" opacity={op8} />

      {/* Mid-right circuit traces */}
      <line x1="480" y1="280" x2="425" y2="280" stroke={c} strokeWidth="0.5" opacity={op8} />
      <line x1="425" y1="280" x2="425" y2="260" stroke={c} strokeWidth="0.5" opacity={op8} />
      <circle cx="425" cy="260" r="2" fill={c} opacity={op6} className="circuit-dot-c" />
      <line x1="480" y1="310" x2="445" y2="310" stroke={c} strokeWidth="0.5" opacity={op8} />

      {/* Scattered micro-dots */}
      <circle cx="100" cy="50" r="1.5" fill={c} opacity={op7} className="circuit-dot-b" />
      <circle cx="380" cy="50" r="1.5" fill={c} opacity={op7} className="circuit-dot" />
      <circle cx="60" cy="200" r="1.5" fill={c} opacity={op7} className="circuit-dot-c" />
      <circle cx="420" cy="200" r="1.5" fill={c} opacity={op7} className="circuit-dot-b" />
      <circle cx="70" cy="380" r="1.5" fill={c} opacity={op7} className="circuit-dot" />
      <circle cx="410" cy="380" r="1.5" fill={c} opacity={op7} className="circuit-dot-c" />
    </svg>
  );
}

export default function HowItWorks({ t, isKm, bodyFont, dark }: HowItWorksProps) {
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
        <CircuitBg dark={dark} />

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
          background: dark
            ? "radial-gradient(ellipse at center, rgba(212,167,44,0.22) 0%, rgba(212,167,44,0.06) 45%, transparent 70%)"
            : "radial-gradient(ellipse at center, rgba(212,167,44,0.15) 0%, rgba(212,167,44,0.04) 45%, transparent 70%)",
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
                  color: isCurrent
                    ? "#D4A72C"
                    : dark ? "rgba(212,167,44,0.5)" : "rgba(180,140,30,0.4)",
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
                    ? dark
                      ? "2px solid rgba(212,167,44,0.75)"
                      : "2px solid rgba(180,140,30,0.6)"
                    : dark
                      ? "1.5px solid rgba(212,167,44,0.18)"
                      : "1.5px solid rgba(180,140,30,0.25)",
                  background: dark ? "#060400" : "#1a1610",
                  boxShadow: isCurrent
                    ? dark
                      ? "0 0 0 1px rgba(212,167,44,0.15), 0 0 50px rgba(212,167,44,0.5), 0 0 100px rgba(212,167,44,0.18), 0 20px 60px rgba(0,0,0,0.6)"
                      : "0 0 0 1px rgba(212,167,44,0.1), 0 0 40px rgba(212,167,44,0.2), 0 12px 40px rgba(0,0,0,0.15)"
                    : dark
                      ? "0 8px 32px rgba(0,0,0,0.7)"
                      : "0 8px 24px rgba(0,0,0,0.12)",
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
              border: dark ? "1.5px solid rgba(212,167,44,0.5)" : "1.5px solid rgba(180,140,30,0.4)",
              background: dark ? "rgba(212,167,44,0.18)" : "rgba(180,140,30,0.1)",
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
                style={{ width: i === active ? 22 : 7, height: 7, borderRadius: 4, border: "none", background: i === active ? "#D4A72C" : dark ? "rgba(212,167,44,0.25)" : "rgba(180,140,30,0.25)", cursor: "pointer", padding: 0 }}
              />
            ))}
          </div>

          <button
            onClick={() => setActive(a => (a + 1) % total)}
            style={{
              width: 44, height: 44, borderRadius: "50%",
              border: dark ? "1.5px solid rgba(212,167,44,0.5)" : "1.5px solid rgba(180,140,30,0.4)",
              background: dark ? "rgba(212,167,44,0.18)" : "rgba(180,140,30,0.1)",
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