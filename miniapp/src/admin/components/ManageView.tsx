import { useState, useEffect } from "react";
import { Users, MessageSquare, Plus, Trash2, Check, ShieldCheck, Loader2, Save, ArrowRight, CreditCard, Tag } from "lucide-react";
import { G, type Lang } from "../palette";
import { t as T, kh } from "../i18n";
import type { SystemConfig, PlanEntry, Subscription } from "../types";
import { saveSystemConfig, savePlans, assignPlan, removePlan } from "../api";
import { SectionHeader } from "./Badges";

interface ManageViewProps {
  config?: SystemConfig | null;
  plans?: Record<string, PlanEntry> | null;
  subscriptions?: Subscription[] | null;
  lang: Lang;
  onRefresh: () => void;
}

export default function ManageView({ config, plans, subscriptions, lang, onRefresh }: ManageViewProps) {
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

  // Plan management state
  const [planCatalog, setPlanCatalog] = useState<Record<string, PlanEntry>>({});
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [assignUserId, setAssignUserId] = useState("");
  const [assignPlanKey, setAssignPlanKey] = useState("");
  const [savingPlans, setSavingPlans] = useState(false);
  const [planToast, setPlanToast] = useState(false);

  useEffect(() => {
    if (config) {
      setWhitelist(config.whitelist_user_ids || []);
      setAllowedGroups(config.allowed_groups || []);
      setGroupHandlers(config.group_handlers || {});
    }
  }, [config]);

  useEffect(() => {
    if (plans) setPlanCatalog(plans);
  }, [plans]);

  useEffect(() => {
    if (subscriptions) setSubs(subscriptions);
  }, [subscriptions]);

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

  function updatePlanField(key: string, field: keyof PlanEntry, value: string) {
    setPlanCatalog(prev => {
      const entry = { ...prev[key] };
      if (field === "name") {
        entry.name = value;
      } else {
        const num = parseFloat(value);
        entry[field] = isNaN(num) ? 0 : num;
      }
      return { ...prev, [key]: entry };
    });
  }

  async function handleSavePlans() {
    setSavingPlans(true);
    setErrorMsg(null);
    try {
      await savePlans(planCatalog);
      setPlanToast(true);
      setTimeout(() => setPlanToast(false), 3000);
      onRefresh();
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to save plans");
    } finally {
      setSavingPlans(false);
    }
  }

  async function handleAssignPlan() {
    const uid = parseInt(assignUserId.trim(), 10);
    if (isNaN(uid) || !assignPlanKey) return;
    setSavingPlans(true);
    setErrorMsg(null);
    try {
      await assignPlan(uid, assignPlanKey);
      setAssignUserId("");
      setAssignPlanKey("");
      setPlanToast(true);
      setTimeout(() => setPlanToast(false), 3000);
      onRefresh();
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to assign plan");
    } finally {
      setSavingPlans(false);
    }
  }

  async function handleRevokePlan(userId: number) {
    setSavingPlans(true);
    try {
      await removePlan(userId);
      onRefresh();
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to revoke plan");
    } finally {
      setSavingPlans(false);
    }
  }

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

      {/* 4. Plans & Pricing */}
      <div style={{ background: G.surface, border: `1px solid ${G.border}`, borderRadius: 14, padding: "18px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <CreditCard size={16} color={G.gold} />
          <div style={{ fontSize: 14, fontWeight: 700, color: G.text }}>
            <span className={kh(lang)}>{tx.plansManagement}</span>
          </div>
        </div>
        <div style={{ fontSize: 11, color: G.muted, marginBottom: 14 }}>
          <span className={kh(lang)}>{tx.plansDesc}</span>
        </div>

        {Object.entries(planCatalog).map(([key, plan]) => (
          <div key={key} style={{ background: G.surface2, border: `1px solid ${G.border}`, borderRadius: 10, padding: "12px", marginBottom: 10 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: G.gold, fontFamily: "JetBrains Mono, monospace" }}>{key}</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <label style={{ display: "flex", flexDirection: "column", gap: 3, fontSize: 10, color: G.muted }}>
                {tx.planName}
                <input value={plan.name} onChange={e => updatePlanField(key, "name", e.target.value)} style={inputStyle} />
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: 3, fontSize: 10, color: G.muted }}>
                {tx.planPrice}
                <input type="number" step="0.01" value={plan.price} onChange={e => updatePlanField(key, "price", e.target.value)} style={inputStyle} />
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: 3, fontSize: 10, color: G.muted }}>
                {tx.planScans}
                <input type="number" value={plan.scans} onChange={e => updatePlanField(key, "scans", e.target.value)} style={inputStyle} />
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: 3, fontSize: 10, color: G.muted }}>
                {tx.planGroups}
                <input type="number" value={plan.groups} onChange={e => updatePlanField(key, "groups", e.target.value)} style={inputStyle} />
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: 3, fontSize: 10, color: G.muted }}>
                {tx.planHistory}
                <input type="number" value={plan.history_days} onChange={e => updatePlanField(key, "history_days", e.target.value)} style={inputStyle} />
              </label>
            </div>
          </div>
        ))}

        <button
          onClick={handleSavePlans}
          disabled={savingPlans}
          style={{ background: G.surface2, color: G.gold, border: `1px solid ${G.goldBorder}`, borderRadius: 8, padding: "10px 0", fontWeight: 700, cursor: "pointer", fontSize: 12, width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
        >
          {savingPlans ? <Loader2 size={14} className="spin-animation" /> : <Save size={14} />}
          <span className={kh(lang)}>{tx.planSave}</span>
        </button>
      </div>

      {/* 5. Assign Plan */}
      <div style={{ background: G.surface, border: `1px solid ${G.border}`, borderRadius: 14, padding: "18px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <Tag size={16} color={G.gold} />
          <div style={{ fontSize: 14, fontWeight: 700, color: G.text }}>
            <span className={kh(lang)}>{tx.assignPlan}</span>
          </div>
        </div>
        <div style={{ fontSize: 11, color: G.muted, marginBottom: 14 }}>
          <span className={kh(lang)}>{tx.assignPlanDesc}</span>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <input value={assignUserId} onChange={e => setAssignUserId(e.target.value)} placeholder={tx.planUserPlaceholder} type="number" style={inputStyle} />
          <select value={assignPlanKey} onChange={e => setAssignPlanKey(e.target.value)} style={{ ...inputStyle, maxWidth: 180 }}>
            <option value="">{tx.planSelect}</option>
            {Object.entries(planCatalog).map(([key, plan]) => (
              <option key={key} value={key}>{plan.name}</option>
            ))}
          </select>
        </div>
        <button
          onClick={handleAssignPlan}
          disabled={savingPlans || !assignPlanKey}
          style={{ background: G.gold, color: "#1a1200", border: "none", borderRadius: 8, padding: "10px 0", fontWeight: 700, cursor: "pointer", fontSize: 12, width: "100%", marginTop: 10, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
        >
          {savingPlans ? <Loader2 size={14} className="spin-animation" /> : <ArrowRight size={14} />}
          <span className={kh(lang)}>{tx.assignPlanBtn}</span>
        </button>
      </div>

      {/* 6. Subscriptions */}
      <div style={{ background: G.surface, border: `1px solid ${G.border}`, borderRadius: 14, padding: "18px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <ShieldCheck size={16} color={G.gold} />
          <div style={{ fontSize: 14, fontWeight: 700, color: G.text }}>
            <span className={kh(lang)}>{tx.subscriptions}</span>
          </div>
        </div>
        <div style={{ fontSize: 11, color: G.muted, marginBottom: 14 }}>
          <span className={kh(lang)}>{tx.subscriptionsDesc}</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {subs.length === 0 ? (
            <div style={{ fontSize: 12, color: G.muted, fontStyle: "italic" }}>
              <span className={kh(lang)}>{tx.noSubscriptions}</span>
            </div>
          ) : (
            subs.map(s => (
              <div key={s.user_id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: G.surface2, border: `1px solid ${G.border}`, borderRadius: 8, padding: "10px 12px" }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: G.text, fontFamily: "JetBrains Mono, monospace" }}>{s.user_id}</div>
                  <div style={{ fontSize: 11, color: G.gold }}>{planCatalog[s.plan]?.name || s.plan}</div>
                </div>
                <button
                  onClick={() => handleRevokePlan(s.user_id)}
                  disabled={savingPlans}
                  style={{ background: "transparent", border: `1px solid ${G.border}`, color: G.danger, borderRadius: 6, padding: "5px 10px", fontSize: 11, fontWeight: 600, cursor: "pointer" }}
                >
                  <span className={kh(lang)}>{tx.revoke}</span>
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {planToast && (
        <div style={{ background: "rgba(42,170,90,0.15)", border: `1px solid ${G.safe}`, color: G.safe, borderRadius: 10, padding: "12px 16px", fontSize: 13, display: "flex", alignItems: "center", gap: 8, fontWeight: 600 }}>
          <Check size={16} />
          <span className={kh(lang)}>{tx.planSaved}</span>
        </div>
      )}

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
