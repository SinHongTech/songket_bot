import { useState, useEffect } from "react";
import { X, Check, Copy, ShieldCheck, AlertTriangle, Loader2 } from "lucide-react";
import { G, type Lang } from "@/admin/palette";
import { kh } from "@/admin/i18n";
import QRCodeCanvas from "@/shared/components/QRCodeCanvas";
import { setupTotp, confirmSetupTotp, disableTotp } from "@/admin/api";

interface TotpModalProps {
  mode: "setup" | "disable";
  lang: Lang;
  onClose: () => void;
  onSuccess: (totpEnabled: boolean) => void;
}

export default function TotpModal({ mode, lang, onClose, onSuccess }: TotpModalProps) {
  const [loading, setLoading] = useState(mode === "setup");
  const [busy, setBusy] = useState(false);
  const [secret, setSecret] = useState("");
  const [uri, setUri] = useState("");
  const [code, setCode] = useState("");
  const [pin, setPin] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedBackups, setCopiedBackups] = useState(false);
  const [stage, setStage] = useState<"input" | "success">(mode === "setup" ? "input" : "input");

  const isKm = lang === "km";

  useEffect(() => {
    if (mode === "setup") {
      setupTotp()
        .then(res => {
          if (res.ok && res.secret && res.uri) {
            setSecret(res.secret);
            setUri(res.uri);
          } else {
            setErr(res.error || "Failed to initialize 2FA setup");
          }
        })
        .catch(e => setErr(e?.message || "Failed to initialize 2FA"))
        .finally(() => setLoading(false));
    }
  }, [mode]);

  const copySecret = () => {
    try {
      navigator.clipboard.writeText(secret);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    } catch {}
  };

  const copyBackupCodes = () => {
    try {
      navigator.clipboard.writeText(backupCodes.join("\n"));
      setCopiedBackups(true);
      setTimeout(() => setCopiedBackups(false), 2000);
    } catch {}
  };

  const handleConfirmSetup = async () => {
    if (code.length !== 6) {
      setErr(isKm ? "សូមបញ្ចូលកូដ ៦ ខ្ទង់ពី Google Authenticator" : "Enter 6-digit code from Google Authenticator");
      return;
    }
    setErr(null);
    setBusy(true);
    try {
      const res = await confirmSetupTotp(code);
      if (res.ok) {
        setBackupCodes(res.backup_codes || []);
        setStage("success");
      } else {
        setErr(res.error || (isKm ? "កូដមិនត្រឹមត្រូវ" : "Invalid 6-digit code"));
      }
    } catch (e: any) {
      setErr(e?.message || "Verification failed");
    } finally {
      setBusy(false);
    }
  };

  const handleDisable = async () => {
    if (!code && !pin) {
      setErr(isKm ? "សូមបញ្ចូលកូដ Authenticator ឬ PIN" : "Enter your Authenticator code or PIN");
      return;
    }
    setErr(null);
    setBusy(true);
    try {
      const res = await disableTotp(code, pin);
      if (res.ok) {
        onSuccess(false);
        onClose();
      } else {
        setErr(res.error || "Failed to disable 2FA");
      }
    } catch (e: any) {
      setErr(e?.message || "Failed to disable 2FA");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.8)",
        backdropFilter: "blur(6px)",
        zIndex: 200,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
      }}
    >
      <div
        style={{
          background: G.surface,
          border: `1px solid ${G.goldBorder}`,
          borderRadius: 20,
          width: "100%",
          maxWidth: 400,
          padding: "24px 20px",
          position: "relative",
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: 16,
            right: 16,
            background: "transparent",
            border: "none",
            color: G.muted,
            cursor: "pointer",
          }}
        >
          <X size={18} />
        </button>

        {loading ? (
          <div style={{ padding: "40px 0", textAlign: "center", color: G.muted }}>
            <Loader2 size={32} color={G.gold} className="spin-animation" style={{ margin: "0 auto 12px" }} />
            <div>{isKm ? "កំពុងរៀបចំ 2FA..." : "Generating 2FA keys..."}</div>
          </div>
        ) : mode === "setup" && stage === "input" ? (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <ShieldCheck size={22} color={G.gold} />
              <span style={{ fontSize: 16, fontWeight: 800, color: G.text }}>
                <span className={kh(lang)}>{isKm ? "ភ្ជាប់ Google Authenticator" : "Setup Google Authenticator"}</span>
              </span>
            </div>
            <p style={{ fontSize: 12, color: G.textSec, lineHeight: 1.5, margin: "0 0 16px" }}>
              <span className={kh(lang)}>
                {isKm
                  ? "ស្កេន QR Code ខាងក្រោម ឬបញ្ចូលកូដសម្ងាត់ទៅក្នុង Google Authenticator ឬ 1Password:"
                  : "Scan the QR code below or enter the key into Google Authenticator or 1Password:"}
              </span>
            </p>

            {uri && (
              <div style={{ textAlign: "center", margin: "14px 0" }}>
                <QRCodeCanvas value={uri} size={180} />
              </div>
            )}

            {secret && (
              <div
                style={{
                  background: G.surface2,
                  border: `1px solid ${G.border}`,
                  borderRadius: 10,
                  padding: "10px 12px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 16,
                }}
              >
                <div>
                  <div style={{ fontSize: 10, color: G.muted, marginBottom: 2 }}>
                    <span className={kh(lang)}>{isKm ? "កូដសម្ងាត់ (Key)" : "Secret Key"}</span>
                  </div>
                  <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 13, fontWeight: 700, color: G.gold, letterSpacing: "0.08em" }}>
                    {secret.match(/.{1,4}/g)?.join(" ") || secret}
                  </div>
                </div>
                <button
                  onClick={copySecret}
                  style={{
                    background: "transparent",
                    border: `1px solid ${G.goldBorder}`,
                    color: G.gold,
                    borderRadius: 6,
                    padding: "4px 8px",
                    cursor: "pointer",
                    fontSize: 11,
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  {copiedKey ? <Check size={12} /> : <Copy size={12} />}
                  {copiedKey ? (isKm ? "ចម្លងរួច" : "Copied") : (isKm ? "ចម្លង" : "Copy")}
                </button>
              </div>
            )}

            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: G.textSec, display: "block", marginBottom: 6 }}>
                <span className={kh(lang)}>{isKm ? "បញ្ចូលកូដ ៦ ខ្ទង់ពី Authenticator ដើម្បីផ្ទៀងផ្ទាត់:" : "Enter 6-digit code to verify:"}</span>
              </label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={e => setCode(e.target.value.replace(/\D/g, ""))}
                placeholder="000000"
                style={{
                  width: "100%",
                  background: G.surface2,
                  border: `1px solid ${G.goldBorder}`,
                  borderRadius: 10,
                  padding: "12px 14px",
                  color: G.text,
                  fontSize: 20,
                  letterSpacing: "0.3em",
                  textAlign: "center",
                  outline: "none",
                  fontFamily: "JetBrains Mono, monospace",
                }}
              />
            </div>

            {err && (
              <div style={{ color: G.danger, fontSize: 12, marginBottom: 12, textAlign: "center" }}>
                {err}
              </div>
            )}

            <button
              onClick={handleConfirmSetup}
              disabled={busy || code.length !== 6}
              style={{
                width: "100%",
                background: G.gold,
                color: "#1a1200",
                border: "none",
                borderRadius: 10,
                padding: "13px 0",
                fontWeight: 800,
                cursor: "pointer",
                fontSize: 13,
                opacity: busy || code.length !== 6 ? 0.6 : 1,
              }}
            >
              <span className={kh(lang)}>{isKm ? "ផ្ទៀងផ្ទាត់ & បើកដំណើរការ" : "Verify & Activate 2FA"}</span>
            </button>
          </div>
        ) : mode === "setup" && stage === "success" ? (
          <div>
            <div style={{ textAlign: "center", marginBottom: 16 }}>
              <div style={{ width: 48, height: 48, borderRadius: "50%", background: "rgba(34,197,94,0.15)", color: G.safe, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
                <Check size={26} />
              </div>
              <div style={{ fontSize: 17, fontWeight: 800, color: G.text, marginBottom: 6 }}>
                <span className={kh(lang)}>{isKm ? "Google Authenticator ត្រូវបានភ្ជាប់!" : "2FA Activated Successfully!"}</span>
              </div>
              <p style={{ fontSize: 12, color: G.textSec, lineHeight: 1.5, margin: 0 }}>
                <span className={kh(lang)}>
                  {isKm
                    ? "សូមរក្សាទុកកូដបម្រុងទុកទាំង ៣ នេះនៅកន្លែងមានសុវត្ថិភាព។ អ្នកអាចប្រើវាដើម្បីកំណត់ PIN ឡើងវិញប្រសិនបើបាត់ទូរស័ព្ទ:"
                    : "Save these 3 emergency backup codes. You can use them to reset your PIN if you ever lose your phone:"}
                </span>
              </p>
            </div>

            <div style={{ background: G.surface2, border: `1px solid ${G.border}`, borderRadius: 12, padding: "14px", marginBottom: 18 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: G.gold }}>
                  <span className={kh(lang)}>{isKm ? "កូដបម្រុងទុក (Backup Codes)" : "Emergency Backup Codes"}</span>
                </span>
                <button
                  onClick={copyBackupCodes}
                  style={{
                    background: "transparent",
                    border: `1px solid ${G.goldBorder}`,
                    color: G.gold,
                    borderRadius: 6,
                    padding: "3px 8px",
                    cursor: "pointer",
                    fontSize: 10,
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  {copiedBackups ? <Check size={11} /> : <Copy size={11} />}
                  {copiedBackups ? (isKm ? "ចម្លងរួច" : "Copied") : (isKm ? "ចម្លងទាំងអស់" : "Copy All")}
                </button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 6 }}>
                {backupCodes.map((bc, idx) => (
                  <div
                    key={idx}
                    style={{
                      background: G.surface,
                      border: `1px solid ${G.border}`,
                      borderRadius: 6,
                      padding: "8px 12px",
                      fontFamily: "JetBrains Mono, monospace",
                      fontSize: 14,
                      fontWeight: 700,
                      color: G.text,
                      textAlign: "center",
                      letterSpacing: "0.1em",
                    }}
                  >
                    {bc}
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => {
                onSuccess(true);
                onClose();
              }}
              style={{
                width: "100%",
                background: G.gold,
                color: "#1a1200",
                border: "none",
                borderRadius: 10,
                padding: "13px 0",
                fontWeight: 800,
                cursor: "pointer",
                fontSize: 13,
              }}
            >
              <span className={kh(lang)}>{isKm ? "រួចរាល់" : "Done"}</span>
            </button>
          </div>
        ) : (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <AlertTriangle size={22} color={G.warn} />
              <span style={{ fontSize: 16, fontWeight: 800, color: G.text }}>
                <span className={kh(lang)}>{isKm ? "បិទ Google Authenticator" : "Disable Google Authenticator"}</span>
              </span>
            </div>
            <p style={{ fontSize: 12, color: G.textSec, lineHeight: 1.5, margin: "0 0 16px" }}>
              <span className={kh(lang)}>
                {isKm
                  ? "បញ្ចូលកូដ ៦ ខ្ទង់ពី Google Authenticator ឬ PIN របស់អ្នកដើម្បីបិទ 2FA:"
                  : "Enter your 6-digit Authenticator code or PIN to disable 2FA:"}
              </span>
            </p>

            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: G.muted, display: "block", marginBottom: 4 }}>
                <span className={kh(lang)}>{isKm ? "កូដ Authenticator (៦ ខ្ទង់)" : "Authenticator Code (6 digits)"}</span>
              </label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={e => setCode(e.target.value.replace(/\D/g, ""))}
                placeholder="000000"
                style={{
                  width: "100%",
                  background: G.surface2,
                  border: `1px solid ${G.border}`,
                  borderRadius: 10,
                  padding: "11px 14px",
                  color: G.text,
                  fontSize: 16,
                  letterSpacing: "0.2em",
                  textAlign: "center",
                  outline: "none",
                  fontFamily: "JetBrains Mono, monospace",
                }}
              />
            </div>

            <div style={{ textAlign: "center", color: G.muted, fontSize: 11, margin: "8px 0" }}>
              — {isKm ? "ឬ" : "OR"} —
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: G.muted, display: "block", marginBottom: 4 }}>
                <span className={kh(lang)}>{isKm ? "PIN គ្រប់គ្រង (៦ ខ្ទង់)" : "Manage PIN (6 digits)"}</span>
              </label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={6}
                value={pin}
                onChange={e => setPin(e.target.value.replace(/\D/g, ""))}
                placeholder="••••••"
                style={{
                  width: "100%",
                  background: G.surface2,
                  border: `1px solid ${G.border}`,
                  borderRadius: 10,
                  padding: "11px 14px",
                  color: G.text,
                  fontSize: 16,
                  letterSpacing: "0.2em",
                  textAlign: "center",
                  outline: "none",
                  fontFamily: "JetBrains Mono, monospace",
                }}
              />
            </div>

            {err && (
              <div style={{ color: G.danger, fontSize: 12, marginBottom: 12, textAlign: "center" }}>
                {err}
              </div>
            )}

            <button
              onClick={handleDisable}
              disabled={busy || (!code && !pin)}
              style={{
                width: "100%",
                background: G.danger,
                color: "#fff",
                border: "none",
                borderRadius: 10,
                padding: "13px 0",
                fontWeight: 800,
                cursor: "pointer",
                fontSize: 13,
                opacity: busy || (!code && !pin) ? 0.6 : 1,
              }}
            >
              <span className={kh(lang)}>{isKm ? "បញ្ជាក់ការបិទ 2FA" : "Confirm Disable 2FA"}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
