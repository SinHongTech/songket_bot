import { Send, Shield, Check, X } from "lucide-react";

export default function FlowDiagram({ t }: { t: any }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 0, background: "var(--surface)", borderRadius: 12, border: "1px solid var(--border-gold)", padding: "14px 16px", marginTop: 24, overflowX: "auto" }}>
      <div style={{ flexShrink: 0, textAlign: "center", minWidth: 72 }}>
        <div style={{ width: 42, height: 42, borderRadius: 10, background: "#2aabee", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, margin: "0 auto 6px", boxShadow: "0 2px 8px rgba(42,171,238,0.3)" }}><Send size={20} color="white" /></div>
        <span className="khmer" style={{ fontSize: 10, color: "var(--muted)", fontWeight: 500 }}>{t.flow_msg}</span>
      </div>
      <div style={{ flex: 1, minWidth: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ height: 1, flex: 1, background: "var(--border)" }} />
        <span style={{ color: "var(--gold)", fontSize: 12, margin: "0 2px" }}>›</span>
      </div>
      <div style={{ flexShrink: 0, textAlign: "center", minWidth: 88 }}>
        <div style={{ width: 42, height: 42, borderRadius: 10, background: "var(--gold)", border: "1.5px solid var(--gold)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, margin: "0 auto 6px", boxShadow: "0 0 18px rgba(212,167,44,0.5)" }}><Shield size={20} color="#1a1200" /></div>
        <span className="khmer" style={{ fontSize: 10, color: "var(--gold)", fontWeight: 700 }}>{t.flow_scan}</span>
      </div>
      <div style={{ flex: 1, minWidth: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ color: "var(--gold)", fontSize: 12, margin: "0 2px" }}>›</span>
        <div style={{ height: 1, flex: 1, background: "var(--border)" }} />
      </div>
      <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", gap: 5 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 10px", borderRadius: 7, background: "rgba(26,122,58,0.08)", border: "1px solid rgba(26,122,58,0.22)" }}>
          <Check size={12} color="#1a7a3a" />
          <span className="khmer" style={{ fontSize: 11, fontWeight: 600, color: "#1a7a3a" }}>{t.flow_safe}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 10px", borderRadius: 7, background: "rgba(184,32,32,0.08)", border: "1px solid rgba(184,32,32,0.22)" }}>
          <X size={12} color="#b82020" />
          <span className="khmer" style={{ fontSize: 11, fontWeight: 600, color: "#b82020" }}>{t.flow_danger}</span>
        </div>
      </div>
    </div>
  );
}
