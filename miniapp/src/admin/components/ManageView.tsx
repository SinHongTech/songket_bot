import { useState, useEffect } from "react";
import { Users, MessageSquare, Plus, Trash2, Check, ShieldCheck, Loader2, Save, ArrowRight } from "lucide-react";
import { G, type Lang } from "../palette";
import { t as T, kh } from "../i18n";
import type { SystemConfig } from "../types";
import { saveSystemConfig } from "../api";
import { SectionHeader } from "./Badges";

interface ManageViewProps {
  config?: SystemConfig | null;
  lang: Lang;
  onRefresh: () => void;
}

export default function ManageView({ config, lang, onRefresh }: ManageViewProps) {
  const tx = T(lang);

  const [whitelist, setWhitelist] = useState<number[]>([]);
  const [allowedGroups, setAllowedGroups] = useState<number[]>([]);
  const [groupHandlers, setGroupHandlers] = useState<Record<string, number[]>>({});

  const [newUserId, setNewUserId] = useState("");
  const [newGroupId, setNewGroupId] = useState("");

  const [handlerAdminId, setHandlerAdminId] = useState("");
  const [handlerGroupId, setHandlerGroupId] = useState("");

  const [saving, setSaving] = useState(false);
  const [savedToast, setSavedToast] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (config) {
      setWhitelist(config.whitelist_user_ids || []);
      setAllowedGroups(config.allowed_groups || []);
      setGroupHandlers(config.group_handlers || {});
    }
  }, [config]);

  // Whitelist operations
  function handleAddWhitelist() {
    const trimmed = newUserId.trim();
    if (!trimmed) return;
    const num = parseInt(trimmed, 10);
    if (isNaN(num)) return;
    if (!whitelist.includes(num)) {
      setWhitelist(prev => [...prev, num]);
    }
    setNewUserId("");
  }

  function handleRemoveWhitelist(id: number) {
    setWhitelist(prev => prev.filter(x => x !== id));
  }

  // Group operations
  function handleAddGroup() {
    const trimmed = newGroupId.trim();
    if (!trimmed) return;
    const num = parseInt(trimmed, 10);
    if (isNaN(num)) return;
    if (!allowedGroups.includes(num)) {
      setAllowedGroups(prev => [...prev, num]);
    }
    setNewGroupId("");
  }

  function handleRemoveGroup(id: number) {
    setAllowedGroups(prev => prev.filter(x => x !== id));
    // Also remove from handlers
    const updated = { ...groupHandlers };
    Object.keys(updated).forEach(k => {
      updated[k] = (updated[k] || []).filter(g => g !== id);
    });
    setGroupHandlers(updated);
  }

  // Handler mapping operations
  function handleAddHandlerMapping() {
    const uid = handlerAdminId.trim();
    const gid = parseInt(handlerGroupId.trim(), 10);
    if (!uid || isNaN(gid)) return;

    setGroupHandlers(prev => {
      const current = prev[uid] || [];
      if (!current.includes(gid)) {
        return { ...prev, [uid]: [...current, gid] };
      }
      return prev;
    });

    setHandlerGroupId("");
  }

  function handleRemoveHandlerMapping(uid: string, gid: number) {
    setGroupHandlers(prev => {
      const current = (prev[uid] || []).filter(x => x !== gid);
      if (current.length === 0) {
        const next = { ...prev };
        delete next[uid];
        return next;
      }
      return { ...prev, [uid]: current };
    });
  }

  // Save all to Redis
  async function handleSaveAll() {
    setSaving(true);
    setErrorMsg(null);

    try {
      await saveSystemConfig({
        whitelist,
        allowed_groups: allowedGroups,
        group_handlers: groupHandlers,
      });

      setSavedToast(true);
      setTimeout(() => setSavedToast(false), 3000);
      onRefresh();
    } catch (err: any) {
      console.error("Save config error:", err);
      setErrorMsg(err?.message || "Failed to save configuration");
    } finally {
      setSaving(false);
    }
  }

  const inputStyle = {
    background: G.surface2,
    border: `1px solid ${G.border}`,
    borderRadius: 8,
    padding: "9px 12px",
    color: G.text,
    fontSize: 13,
    outline: "none",
    flex: 1,
    minWidth: 0,
    fontFamily: "Outfit, sans-serif",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <SectionHeader title={tx.systemManagement} sub={tx.systemManagementSub} lang={lang} />
      </div>

      {savedToast && (
        <div style={{ background: "rgba(42,170,90,0.15)", border: `1px solid ${G.safe}`, color: G.safe, borderRadius: 10, padding: "12px 16px", fontSize: 13, display: "flex", alignItems: "center", gap: 8, fontWeight: 600 }}>
          <Check size={16} />
          <span className={kh(lang)}>{tx.configSaved}</span>
        </div>
      )}

      {errorMsg && (
        <div style={{ background: "rgba(224,64,64,0.15)", border: `1px solid ${G.danger}`, color: G.danger, borderRadius: 10, padding: "12px 16px", fontSize: 13 }}>
          {errorMsg}
        </div>
      )}

      {/* 1. Whitelist Management */}
      <div style={{ background: G.surface, border: `1px solid ${G.border}`, borderRadius: 14, padding: "18px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <Users size={16} color={G.gold} />
          <div style={{ fontSize: 14, fontWeight: 700, color: G.text }}>
            <span className={kh(lang)}>{tx.whitelistManagement}</span>
          </div>
        </div>
        <div style={{ fontSize: 11, color: G.muted, marginBottom: 14 }}>
          <span className={kh(lang)}>{tx.whitelistDesc}</span>
        </div>

        {/* Whitelist Items List */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
          {whitelist.length === 0 ? (
            <div style={{ fontSize: 12, color: G.muted, fontStyle: "italic", padding: "8px 0" }}>
              <span className={kh(lang)}>{tx.noAdminsYet}</span>
            </div>
          ) : (
            whitelist.map(id => (
              <div key={id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: G.surface2, border: `1px solid ${G.border}`, borderRadius: 8, padding: "8px 12px" }}>
                <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 13, color: G.text, fontWeight: 600 }}>
                  {id}
                </span>
                <button
                  onClick={() => handleRemoveWhitelist(id)}
                  style={{ background: "transparent", border: "none", color: G.danger, cursor: "pointer", padding: "4px", display: "flex", alignItems: "center" }}
                  title={tx.remove}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Add Whitelist Form */}
        <div style={{ display: "flex", gap: 8 }}>
          <input
            value={newUserId}
            onChange={e => setNewUserId(e.target.value)}
            placeholder={tx.addUserPlaceholder}
            type="number"
            style={inputStyle}
          />
          <button
            onClick={handleAddWhitelist}
            style={{ background: G.gold, color: "#1a1200", border: "none", borderRadius: 8, padding: "0 14px", fontWeight: 700, cursor: "pointer", fontSize: 12, display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}
          >
            <Plus size={14} />
            <span className={kh(lang)}>{tx.add}</span>
          </button>
        </div>
      </div>

      {/* 2. Monitored Groups Management */}
      <div style={{ background: G.surface, border: `1px solid ${G.border}`, borderRadius: 14, padding: "18px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <MessageSquare size={16} color={G.gold} />
          <div style={{ fontSize: 14, fontWeight: 700, color: G.text }}>
            <span className={kh(lang)}>{tx.groupManagement}</span>
          </div>
        </div>
        <div style={{ fontSize: 11, color: G.muted, marginBottom: 14 }}>
          <span className={kh(lang)}>{tx.groupDesc}</span>
        </div>

        {/* Group Items List */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
          {allowedGroups.length === 0 ? (
            <div style={{ fontSize: 12, color: G.muted, fontStyle: "italic", padding: "8px 0" }}>
              <span className={kh(lang)}>{tx.noGroupsYet}</span>
            </div>
          ) : (
            allowedGroups.map(gid => (
              <div key={gid} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: G.surface2, border: `1px solid ${G.border}`, borderRadius: 8, padding: "8px 12px" }}>
                <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 13, color: G.text, fontWeight: 600 }}>
                  {gid}
                </span>
                <button
                  onClick={() => handleRemoveGroup(gid)}
                  style={{ background: "transparent", border: "none", color: G.danger, cursor: "pointer", padding: "4px", display: "flex", alignItems: "center" }}
                  title={tx.remove}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Add Group Form */}
        <div style={{ display: "flex", gap: 8 }}>
          <input
            value={newGroupId}
            onChange={e => setNewGroupId(e.target.value)}
            placeholder={tx.addGroupPlaceholder}
            type="number"
            style={inputStyle}
          />
          <button
            onClick={handleAddGroup}
            style={{ background: G.gold, color: "#1a1200", border: "none", borderRadius: 8, padding: "0 14px", fontWeight: 700, cursor: "pointer", fontSize: 12, display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}
          >
            <Plus size={14} />
            <span className={kh(lang)}>{tx.add}</span>
          </button>
        </div>
      </div>

      {/* 3. Group Handler Mappings */}
      <div style={{ background: G.surface, border: `1px solid ${G.border}`, borderRadius: 14, padding: "18px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <ShieldCheck size={16} color={G.gold} />
          <div style={{ fontSize: 14, fontWeight: 700, color: G.text }}>
            <span className={kh(lang)}>{tx.handlersManagement}</span>
          </div>
        </div>
        <div style={{ fontSize: 11, color: G.muted, marginBottom: 14 }}>
          <span className={kh(lang)}>{tx.handlersDesc}</span>
        </div>

        {/* Mappings List */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 14 }}>
          {Object.keys(groupHandlers).length === 0 ? (
            <div style={{ fontSize: 12, color: G.muted, fontStyle: "italic" }}>
              All whitelisted admins can monitor all configured groups.
            </div>
          ) : (
            Object.entries(groupHandlers).map(([uid, gids]) => (
              <div key={uid} style={{ background: G.surface2, border: `1px solid ${G.border}`, borderRadius: 8, padding: "10px 12px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: G.gold }}>User ID: {uid}</span>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {(gids || []).map(gid => (
                    <span key={gid} style={{ display: "inline-flex", alignItems: "center", gap: 4, background: G.surface, border: `1px solid ${G.border}`, borderRadius: 6, padding: "3px 8px", fontSize: 11, fontFamily: "JetBrains Mono, monospace" }}>
                      {gid}
                      <button
                        onClick={() => handleRemoveHandlerMapping(uid, gid)}
                        style={{ background: "transparent", border: "none", color: G.danger, cursor: "pointer", padding: "0 2px", display: "flex", alignItems: "center" }}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Add Handler Mapping Form */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              value={handlerAdminId}
              onChange={e => setHandlerAdminId(e.target.value)}
              placeholder="Admin User ID"
              type="number"
              style={inputStyle}
            />
            <input
              value={handlerGroupId}
              onChange={e => setHandlerGroupId(e.target.value)}
              placeholder="Group ID (-100...)"
              type="number"
              style={inputStyle}
            />
          </div>
          <button
            onClick={handleAddHandlerMapping}
            style={{ background: G.surface2, color: G.gold, border: `1px solid ${G.goldBorder}`, borderRadius: 8, padding: "8px 0", fontWeight: 700, cursor: "pointer", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}
          >
            <ArrowRight size={13} />
            <span className={kh(lang)}>{tx.assignGroup}</span>
          </button>
        </div>
      </div>

      {/* Save Button */}
      <button
        onClick={handleSaveAll}
        disabled={saving}
        style={{
          background: G.gold,
          color: "#1a1200",
          border: "none",
          borderRadius: 10,
          padding: "14px 0",
          fontWeight: 800,
          cursor: "pointer",
          fontSize: 14,
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          boxShadow: "0 4px 20px rgba(212,167,44,0.25)",
        }}
      >
        {saving ? <Loader2 size={16} className="spin-animation" /> : <Save size={16} />}
        <span className={kh(lang)}>{saving ? tx.saving : tx.saveConfig}</span>
      </button>
    </div>
  );
}
