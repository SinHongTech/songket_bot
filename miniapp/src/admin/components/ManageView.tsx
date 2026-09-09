import { useState, useEffect, useMemo } from "react";
import {
  Users,
  MessageSquare,
  Plus,
  Trash2,
  Check,
  ShieldCheck,
  Loader2,
  Save,
  ArrowRight,
  CreditCard,
  Tag,
  Globe,
  Volume2,
  FileText,
  CheckCircle2,
  AlertOctagon,
  Shield,
} from "lucide-react";
import { G, type Lang } from "../palette";
import { t as T, kh } from "../i18n";
import type {
  SystemConfig,
  PlanEntry,
  Subscription,
  GroupDetail,
  KnownUser,
  DashboardGroup,
  GroupUserEntry,
  GroupFileEntry,
  CandidateGroup,
} from "../types";
import {
  saveSystemConfig,
  savePlans,
  saveGroups,
  assignPlan,
  removePlan,
  saveDomainWhitelist,
  saveGroupSettings,
  addGroupWhitelistUser,
  removeGroupWhitelistUser,
  unmuteGroupUser,
  addGroupWhitelistFile,
  removeGroupWhitelistFile,
  addManagedGroup,
} from "../api";
import { SectionHeader } from "./Badges";

interface ManageViewProps {
  config?: SystemConfig | null;
  plans?: Record<string, PlanEntry> | null;
  subscriptions?: Subscription[] | null;
  domainWhitelist?: string[] | null;
  groupDetails?: Record<string, GroupDetail> | null;
  knownUsers?: Record<string, KnownUser> | null;
  knownGroups?: Record<string, string> | null;
  dashboardGroups?: DashboardGroup[] | null;
  candidateGroups?: CandidateGroup[] | null;
  lang: Lang;
  isSuperAdmin: boolean;
  onRefresh: () => void;
}

export default function ManageView({
  config,
  plans,
  subscriptions,
  domainWhitelist,
  groupDetails,
  knownUsers,
  knownGroups,
  dashboardGroups,
  candidateGroups,
  lang,
  isSuperAdmin,
  onRefresh,
}: ManageViewProps) {
  const tx = T(lang);
  const isKm = lang === "km";

  type ManageTab = "group" | "super" | "domains" | "plans";
  const [manageTab, setManageTab] = useState<ManageTab>("group");

  // ── Super Admin System State ──────────────────────────────────────────────
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

  // ── Trusted Domain Whitelist State ─────────────────────────────────────────
  const [domains, setDomains] = useState<string[]>([]);
  const [newDomain, setNewDomain] = useState("");
  const [savingDomains, setSavingDomains] = useState(false);
  const [domainToast, setDomainToast] = useState(false);

  // ── Plans & Subscriptions State ───────────────────────────────────────────
  const [planCatalog, setPlanCatalog] = useState<Record<string, PlanEntry>>({});
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [assignUserId, setAssignUserId] = useState("");
  const [assignPlanKey, setAssignPlanKey] = useState("");
  const [savingPlans, setSavingPlans] = useState(false);
  const [planToast, setPlanToast] = useState(false);

  // ── Group Protection & Settings State ─────────────────────────────────────
  // Only display groups that the current user actually handles
  const availableGroupIds = useMemo(() => {
    if (dashboardGroups && dashboardGroups.length > 0) {
      return dashboardGroups.map((g) => g.id).filter(Boolean);
    }
    return [];
  }, [dashboardGroups]);

  const [selectedGid, setSelectedGid] = useState<number>(() => {
    return availableGroupIds[0] || (dashboardGroups?.[0]?.id ?? -1003917025719);
  });

  useEffect(() => {
    if (availableGroupIds.length > 0 && (!selectedGid || !availableGroupIds.includes(selectedGid))) {
      setSelectedGid(availableGroupIds[0]);
    }
  }, [availableGroupIds, selectedGid]);

  // Active group details
  const activeDetail = useMemo<GroupDetail>(() => {
    const key = String(selectedGid);
    if (groupDetails && groupDetails[key]) {
      return groupDetails[key];
    }
    return {
      settings: { lang: "both", safe_timeout: 10, show_safe: true },
      whitelisted_users: [],
      muted_users: [],
      whitelisted_files: [],
    };
  }, [groupDetails, selectedGid]);

  const [groupLang, setGroupLang] = useState<string>("both");
  const [groupSafeTimeout, setGroupSafeTimeout] = useState<number>(10);
  const [groupShowSafe, setGroupShowSafe] = useState<boolean>(true);

  const [groupWlUsers, setGroupWlUsers] = useState<GroupUserEntry[]>([]);
  const [groupMutedUsers, setGroupMutedUsers] = useState<GroupUserEntry[]>([]);
  const [groupWlFiles, setGroupWlFiles] = useState<GroupFileEntry[]>([]);

  // Forms in group tab
  const [newGroupUser, setNewGroupUser] = useState("");
  const [newGroupUserName, setNewGroupUserName] = useState("");
  const [newFileSha, setNewFileSha] = useState("");
  const [newFileName, setNewFileName] = useState("");

  const [showAddGroupModal, setShowAddGroupModal] = useState(false);
  const [addingGroup, setAddingGroup] = useState(false);

  const [savingGroupSettings, setSavingGroupSettings] = useState(false);
  const [groupToast, setGroupToast] = useState<string | null>(null);

  useEffect(() => {
    if (activeDetail) {
      setGroupLang(activeDetail.settings?.lang || "both");
      const timeout = activeDetail.settings?.safe_timeout ?? 10;
      setGroupSafeTimeout(timeout);
      setGroupShowSafe((activeDetail.settings?.show_safe ?? true) && timeout > 0);
      setGroupWlUsers(activeDetail.whitelisted_users || []);
      setGroupMutedUsers(activeDetail.muted_users || []);
      setGroupWlFiles(activeDetail.whitelisted_files || []);
    }
  }, [activeDetail]);

  useEffect(() => {
    if (config) {
      setWhitelist(config.whitelist_user_ids || []);
      setAllowedGroups(config.allowed_groups || []);
      setGroupHandlers(config.group_handlers || {});
    }
  }, [config]);

  useEffect(() => {
    if (domainWhitelist) {
      setDomains(domainWhitelist);
    }
  }, [domainWhitelist]);

  useEffect(() => {
    if (plans) setPlanCatalog(plans);
  }, [plans]);

  useEffect(() => {
    if (subscriptions) setSubs(subscriptions);
  }, [subscriptions]);

  // ── Helper: Format User Display based on Super Admin vs Regular Admin ──────
  function formatUser(
    userId: number | string,
    fallbackUsername?: string,
    fallbackName?: string
  ): { title: string; subtitle?: string } {
    const idStr = String(userId || "").trim();
    const info = knownUsers?.[idStr];
    const uname = fallbackUsername || info?.username || "";
    const dname = fallbackName || info?.name || "";
    const cleanUname = uname ? (uname.startsWith("@") ? uname : `@${uname}`) : "";

    // Privacy standard: Show USERNAME only (or Display Name if no username)
    if (cleanUname) {
      return {
        title: cleanUname,
        subtitle: dname && dname !== cleanUname ? dname : undefined,
      };
    }
    if (dname) {
      return { title: dname };
    }
    return { title: "User" };
  }

  function getGroupTitle(gid: number): string {
    const dg = dashboardGroups?.find((g) => g.id === gid);
    if (dg?.title) return dg.title;
    const kg = knownGroups?.[String(gid)];
    if (kg) return kg;
    return "Group";
  }

  function triggerGroupToast(msg: string) {
    setGroupToast(msg);
    setTimeout(() => setGroupToast(null), 3000);
  }

  // ── Group Language / Safe Message Quick Updates ───────────────────────────
  async function handleSetGroupLang(newLang: string) {
    setGroupLang(newLang);
    setSavingGroupSettings(true);
    try {
      await saveGroupSettings(selectedGid, {
        lang: newLang,
        safe_timeout: groupSafeTimeout,
        show_safe: groupShowSafe,
      });
      triggerGroupToast(isKm ? `បានប្តូរភាសាទៅ ${newLang.toUpperCase()}` : `Language set to ${newLang.toUpperCase()}`);
      onRefresh();
    } catch (e: any) {
      setErrorMsg(e?.message || "Failed to update language");
    } finally {
      setSavingGroupSettings(false);
    }
  }

  async function handleSetGroupTimer(timer: number) {
    setGroupSafeTimeout(timer);
    setGroupShowSafe(timer > 0);
    setSavingGroupSettings(true);
    try {
      await saveGroupSettings(selectedGid, {
        lang: groupLang,
        safe_timeout: timer,
        show_safe: timer > 0,
      });
      triggerGroupToast(
        timer > 0
          ? isKm
            ? `សារសុវត្ថិភាព: ${timer}s`
            : `Safe message timer: ${timer}s`
          : isKm
          ? "បានបិទសារសុវត្ថិភាព"
          : "Safe messages disabled (Off)"
      );
      onRefresh();
    } catch (e: any) {
      setErrorMsg(e?.message || "Failed to update timer");
    } finally {
      setSavingGroupSettings(false);
    }
  }

  // ── Group Whitelist Users Operations (Deduplicated) ──────────────────────
  async function handleAddGroupUser() {
    const raw = newGroupUser.trim();
    if (!raw) return;
    let targetUid = parseInt(raw.replace(/[^\d]/g, ""), 10);
    let targetUname = raw.startsWith("@") ? raw.slice(1) : "";

    if (isNaN(targetUid) && knownUsers) {
      const match = Object.entries(knownUsers).find(
        ([, v]) => v.username?.toLowerCase() === raw.toLowerCase().replace(/^@/, "")
      );
      if (match) {
        targetUid = parseInt(match[0], 10);
        targetUname = match[1].username || "";
      }
    }

    if (isNaN(targetUid) || !targetUid) {
      setErrorMsg(isKm ? "សូមបញ្ចូល User ID ឬ Telegram Username ត្រឹមត្រូវ" : "Enter a valid User ID or Username");
      return;
    }

    // Deduplication check
    if (groupWlUsers.some((u) => u.user_id === targetUid)) {
      triggerGroupToast(isKm ? "អ្នកប្រើប្រាស់នេះមានក្នុងបញ្ជីរួចហើយ" : "User already in whitelist");
      setNewGroupUser("");
      setNewGroupUserName("");
      return;
    }

    const optimistic: GroupUserEntry = {
      user_id: targetUid,
      username: targetUname || undefined,
      name: newGroupUserName.trim() || undefined,
      added_at: Math.floor(Date.now() / 1000),
    };
    setGroupWlUsers((prev) => [...prev.filter((u) => u.user_id !== targetUid), optimistic]);
    setNewGroupUser("");
    setNewGroupUserName("");

    try {
      await addGroupWhitelistUser(selectedGid, targetUid, targetUname, newGroupUserName.trim());
      triggerGroupToast(isKm ? "បានបន្ថែមទៅបញ្ជីសជោគជ័យ" : "User added to group whitelist");
      onRefresh();
    } catch (e: any) {
      setErrorMsg(e?.message || "Failed to add user");
    }
  }

  async function handleRemoveGroupUser(uid: number) {
    setGroupWlUsers((prev) => prev.filter((u) => u.user_id !== uid));
    try {
      await removeGroupWhitelistUser(selectedGid, uid);
      triggerGroupToast(isKm ? "បានលុបចេញពីបញ្ជីស" : "User removed from whitelist");
      onRefresh();
    } catch (e: any) {
      setErrorMsg(e?.message || "Failed to remove user");
    }
  }

  // ── Group Muted Users Operations (Unmute) ─────────────────────────────────
  async function handleUnmuteGroupUser(uid: number) {
    setGroupMutedUsers((prev) => prev.filter((u) => u.user_id !== uid));
    try {
      await unmuteGroupUser(selectedGid, uid);
      triggerGroupToast(isKm ? "បានបើកសិទ្ធិផ្ញើសារ (Unmuted)" : "User unmuted successfully");
      onRefresh();
    } catch (e: any) {
      setErrorMsg(e?.message || "Failed to unmute user");
    }
  }

  // ── Group Whitelisted Files Operations (Deduplicated) ─────────────────────
  async function handleAddGroupFile() {
    const cleanSha = newFileSha.trim().toLowerCase();
    if (!cleanSha || cleanSha.length < 16) {
      setErrorMsg(isKm ? "សូមបញ្ចូល SHA-256 Hash យ៉ាងតិច 16 ខ្ទង់" : "Enter a valid SHA-256 hash");
      return;
    }

    // Deduplication check
    if (groupWlFiles.some((f) => f.sha256.toLowerCase() === cleanSha)) {
      triggerGroupToast(isKm ? "ឯកសារនេះមានក្នុងបញ្ជីរួចហើយ" : "File hash already in whitelist");
      setNewFileSha("");
      setNewFileName("");
      return;
    }

    const optimistic: GroupFileEntry = {
      sha256: cleanSha,
      filename: newFileName.trim() || `file_${cleanSha.slice(0, 8)}`,
      added_at: Math.floor(Date.now() / 1000),
    };
    setGroupWlFiles((prev) => [...prev.filter((f) => f.sha256 !== cleanSha), optimistic]);
    setNewFileSha("");
    setNewFileName("");

    try {
      await addGroupWhitelistFile(selectedGid, cleanSha, newFileName.trim());
      triggerGroupToast(isKm ? "បានអនុម័តឯកសារទៅបញ្ជីស" : "File approved and whitelisted");
      onRefresh();
    } catch (e: any) {
      setErrorMsg(e?.message || "Failed to add file");
    }
  }

  async function handleRemoveGroupFile(sha: string) {
    setGroupWlFiles((prev) => prev.filter((f) => f.sha256 !== sha));
    try {
      await removeGroupWhitelistFile(selectedGid, sha);
      triggerGroupToast(isKm ? "បានលុបឯកសារចេញពីបញ្ជីស" : "File removed from whitelist");
      onRefresh();
    } catch (e: any) {
      setErrorMsg(e?.message || "Failed to remove file");
    }
  }

  // ── Super Admin System Operations ─────────────────────────────────────────
  function handleAddWhitelist() {
    const trimmed = newUserId.trim();
    if (!trimmed) return;
    const num = parseInt(trimmed, 10);
    if (isNaN(num)) return;
    if (!whitelist.includes(num)) {
      setWhitelist((prev) => [...prev, num]);
    }
    setNewUserId("");
  }

  function handleRemoveWhitelist(id: number) {
    setWhitelist((prev) => prev.filter((x) => x !== id));
  }

  function handleAddGroup() {
    const trimmed = newGroupId.trim();
    if (!trimmed) return;
    const num = parseInt(trimmed, 10);
    if (isNaN(num)) return;
    if (!allowedGroups.includes(num)) {
      setAllowedGroups((prev) => [...prev, num]);
    }
    setNewGroupId("");
  }

  function handleRemoveGroup(id: number) {
    setAllowedGroups((prev) => prev.filter((x) => x !== id));
    const updated = { ...groupHandlers };
    Object.keys(updated).forEach((k) => {
      updated[k] = (updated[k] || []).filter((g) => g !== id);
    });
    setGroupHandlers(updated);
  }

  function handleAddHandlerMapping() {
    const uid = handlerAdminId.trim();
    const gid = parseInt(handlerGroupId.trim(), 10);
    if (!uid || isNaN(gid)) return;

    setGroupHandlers((prev) => {
      const current = prev[uid] || [];
      if (!current.includes(gid)) {
        return { ...prev, [uid]: [...current, gid] };
      }
      return prev;
    });
    setHandlerGroupId("");
  }

  function handleRemoveHandlerMapping(uid: string, gid: number) {
    setGroupHandlers((prev) => {
      const current = (prev[uid] || []).filter((x) => x !== gid);
      if (current.length === 0) {
        const next = { ...prev };
        delete next[uid];
        return next;
      }
      return { ...prev, [uid]: current };
    });
  }

  function handleAddDomain() {
    const clean = newDomain.trim().toLowerCase().replace(/^https?:\/\//, "").split("/")[0];
    if (!clean) return;
    if (!domains.includes(clean)) {
      setDomains((prev) => [...prev, clean]);
    }
    setNewDomain("");
  }

  function handleRemoveDomain(dom: string) {
    setDomains((prev) => prev.filter((d) => d !== dom));
  }

  async function handleSaveDomains() {
    setSavingDomains(true);
    try {
      await saveDomainWhitelist(domains);
      setDomainToast(true);
      setTimeout(() => setDomainToast(false), 3000);
      onRefresh();
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to save domains");
    } finally {
      setSavingDomains(false);
    }
  }

  async function handleSaveAll() {
    setSaving(true);
    setErrorMsg(null);
    try {
      if (isSuperAdmin) {
        await saveSystemConfig({
          whitelist,
          allowed_groups: allowedGroups,
          group_handlers: groupHandlers,
        });
      } else {
        await saveGroups(allowedGroups);
      }
      setSavedToast(true);
      setTimeout(() => setSavedToast(false), 3000);
      onRefresh();
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to save configuration");
    } finally {
      setSaving(false);
    }
  }

  function updatePlanField(key: string, field: keyof PlanEntry, value: string) {
    setPlanCatalog((prev) => {
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

  const inputStyle: React.CSSProperties = {
    background: G.surface2,
    border: `1px solid ${G.border}`,
    borderRadius: 8,
    padding: "9px 12px",
    color: G.text,
    fontSize: 13,
    outline: "none",
    width: "100%",
    boxSizing: "border-box",
    minWidth: 0,
    fontFamily: "Outfit, sans-serif",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {/* ── Top Header & Tab Switcher ─────────────────────────────────────── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <SectionHeader
          title={
            manageTab === "group"
              ? isKm
                ? "ការកំណត់សុវត្ថិភាពក្រុម"
                : "Group Settings & Protection"
              : manageTab === "super"
              ? tx.systemManagement
              : manageTab === "domains"
              ? isKm
                ? "បញ្ជីគេហទំព័រសុវត្ថិភាព"
                : "Trusted Domains"
              : tx.plansManagement
          }
          sub={
            manageTab === "group"
              ? isKm
                ? "គ្រប់គ្រងភាសា សារសុវត្ថិភាព សមាជិកអនុញ្ញាត/Mute និងឯកសារ Whitelist"
                : "Configure group language, timers, whitelisted/muted members, and approved files"
              : manageTab === "super"
              ? tx.systemManagementSub
              : manageTab === "domains"
              ? isKm
                ? "តំណភ្ជាប់ដែលរំលងការស្កេនដើម្បីសន្សំកូតា"
                : "Domain whitelist to skip deep scans"
              : tx.plansDesc
          }
          lang={lang}
        />

        {/* Tab Navigation */}
        <div
          style={{
            display: "flex",
            width: "100%",
            background: G.surface2,
            padding: 4,
            borderRadius: 10,
            border: `1px solid ${G.border}`,
            gap: 4,
            overflowX: "auto",
          }}
        >
          {/* Tab 1: Group Protection */}
          <button
            onClick={() => setManageTab("group")}
            style={{
              flex: 1,
              minWidth: 90,
              padding: "8px 10px",
              borderRadius: 7,
              border: "none",
              fontSize: 11,
              fontWeight: 700,
              cursor: "pointer",
              background: manageTab === "group" ? G.gold : "transparent",
              color: manageTab === "group" ? "#1a1200" : G.text,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 5,
              transition: "all 0.2s ease",
              whiteSpace: "nowrap",
            }}
          >
            <Shield size={13} />
            <span className={kh(lang)}>{isKm ? "ក្រុមការពារ" : "Group Security"}</span>
          </button>

          {/* Tab 2: System Config (Super Admin Only) */}
          {isSuperAdmin && (
            <button
              onClick={() => setManageTab("super")}
              style={{
                flex: 1,
                minWidth: 90,
                padding: "8px 10px",
                borderRadius: 7,
                border: "none",
                fontSize: 11,
                fontWeight: 700,
                cursor: "pointer",
                background: manageTab === "super" ? G.gold : "transparent",
                color: manageTab === "super" ? "#1a1200" : G.text,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 5,
                transition: "all 0.2s ease",
                whiteSpace: "nowrap",
              }}
            >
              <ShieldCheck size={13} />
              <span className={kh(lang)}>{tx.superAdminTab}</span>
            </button>
          )}

          {/* Tab 3: Trusted Domains */}
          <button
            onClick={() => setManageTab("domains")}
            style={{
              flex: 1,
              minWidth: 90,
              padding: "8px 10px",
              borderRadius: 7,
              border: "none",
              fontSize: 11,
              fontWeight: 700,
              cursor: "pointer",
              background: manageTab === "domains" ? G.gold : "transparent",
              color: manageTab === "domains" ? "#1a1200" : G.text,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 5,
              transition: "all 0.2s ease",
              whiteSpace: "nowrap",
            }}
          >
            <Globe size={13} />
            <span className={kh(lang)}>{isKm ? "Domains" : "Domains"}</span>
          </button>

          {/* Tab 4: Plans & Pricing (Super Admin Only) */}
          {isSuperAdmin && (
            <button
              onClick={() => setManageTab("plans")}
              style={{
                flex: 1,
                minWidth: 90,
                padding: "8px 10px",
                borderRadius: 7,
                border: "none",
                fontSize: 11,
                fontWeight: 700,
                cursor: "pointer",
                background: manageTab === "plans" ? G.gold : "transparent",
                color: manageTab === "plans" ? "#1a1200" : G.text,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 5,
                transition: "all 0.2s ease",
                whiteSpace: "nowrap",
              }}
            >
              <CreditCard size={13} />
              <span className={kh(lang)}>{isKm ? "គម្រោង" : "Plans"}</span>
            </button>
          )}
        </div>
      </div>

      {/* Global Toast / Error Banners */}
      {savedToast && (
        <div
          style={{
            background: "rgba(42,170,90,0.15)",
            border: `1px solid ${G.safe}`,
            color: G.safe,
            borderRadius: 10,
            padding: "12px 16px",
            fontSize: 13,
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontWeight: 600,
          }}
        >
          <Check size={16} />
          <span className={kh(lang)}>{tx.configSaved}</span>
        </div>
      )}

      {groupToast && (
        <div
          style={{
            background: "rgba(42,170,90,0.15)",
            border: `1px solid ${G.safe}`,
            color: G.safe,
            borderRadius: 10,
            padding: "12px 16px",
            fontSize: 13,
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontWeight: 600,
          }}
        >
          <CheckCircle2 size={16} />
          <span className={kh(lang)}>{groupToast}</span>
        </div>
      )}

      {planToast && (
        <div
          style={{
            background: "rgba(42,170,90,0.15)",
            border: `1px solid ${G.safe}`,
            color: G.safe,
            borderRadius: 10,
            padding: "12px 16px",
            fontSize: 13,
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontWeight: 600,
          }}
        >
          <Check size={16} />
          <span className={kh(lang)}>{tx.planSaved}</span>
        </div>
      )}

      {errorMsg && (
        <div
          style={{
            background: "rgba(224,64,64,0.15)",
            border: `1px solid ${G.danger}`,
            color: G.danger,
            borderRadius: 10,
            padding: "12px 16px",
            fontSize: 13,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <AlertOctagon size={16} />
          <span style={{ flex: 1 }}>{errorMsg}</span>
          <button
            onClick={() => setErrorMsg(null)}
            style={{ background: "transparent", border: "none", color: G.danger, cursor: "pointer", padding: 2 }}
          >
            ×
          </button>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB 1: GROUP SETTINGS & PROTECTION
          ══════════════════════════════════════════════════════════════════════ */}
      {manageTab === "group" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Group Selector Bar */}
          <div style={{ background: G.surface, border: `1px solid ${G.border}`, borderRadius: 14, padding: "14px 16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: G.gold, display: "flex", alignItems: "center", gap: 6 }}>
                <MessageSquare size={15} />
                <span className={kh(lang)}>{isKm ? "ជ្រើសរើសក្រុមគ្រប់គ្រង" : "Select Managed Group"}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 11, color: G.muted }}>
                  {availableGroupIds.length} {isKm ? "ក្រុម" : "group(s)"}
                </span>
                <button
                  onClick={() => setShowAddGroupModal(!showAddGroupModal)}
                  style={{
                    padding: "4px 8px",
                    borderRadius: 6,
                    border: `1px dashed ${G.goldBorder}`,
                    background: showAddGroupModal ? "rgba(212,167,44,0.25)" : "rgba(212,167,44,0.08)",
                    color: G.gold,
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    transition: "all 0.15s ease",
                  }}
                >
                  <Plus size={12} />
                  <span className={kh(lang)}>{isKm ? "ភ្ជាប់ក្រុមថ្មី" : "+ Add Group"}</span>
                </button>
              </div>
            </div>

            {/* Inline Add Group Form */}
            {showAddGroupModal && (
              <div
                style={{
                  background: G.surface2,
                  border: `1px solid ${G.goldBorder}`,
                  borderRadius: 12,
                  padding: "14px 16px",
                  marginBottom: 14,
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 700, color: G.gold, display: "flex", alignItems: "center", gap: 6 }}>
                  <Plus size={15} />
                  <span className={kh(lang)}>{isKm ? "ភ្ជាប់ក្រុមការពារថ្មី (Link Group)" : "Link Telegram Group"}</span>
                </div>

                {/* Candidate Groups Detected */}
                {candidateGroups && candidateGroups.length > 0 ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: G.textSec }}>
                      <span className={kh(lang)}>
                        {isKm ? `🔍 ក្រុមដែលបានរកឃើញ (${candidateGroups.length} ក្រុម)៖` : `🔍 Candidate Groups (${candidateGroups.length} detected):`}
                      </span>
                    </span>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 180, overflowY: "auto" }}>
                      {candidateGroups.map(cg => (
                        <div
                          key={cg.id}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            background: G.surface,
                            padding: "8px 12px",
                            borderRadius: 8,
                            border: `1px solid ${G.border}`,
                          }}
                        >
                          <span style={{ fontSize: 12, fontWeight: 600, color: G.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            👥 {cg.title}
                          </span>
                          <button
                            onClick={async () => {
                              setAddingGroup(true);
                              try {
                                await addManagedGroup(cg.id, cg.title);
                                triggerGroupToast(isKm ? `✅ បានភ្ជាប់ "${cg.title}" ជោគជ័យ!` : `✅ Linked "${cg.title}" successfully!`);
                                setShowAddGroupModal(false);
                                onRefresh();
                              } catch (e: any) {
                                setErrorMsg(e?.message || "Failed to link group");
                              } finally {
                                setAddingGroup(false);
                              }
                            }}
                            disabled={addingGroup}
                            style={{
                              background: G.gold,
                              color: "#1a1200",
                              border: "none",
                              borderRadius: 6,
                              padding: "5px 12px",
                              fontSize: 11,
                              fontWeight: 700,
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              gap: 4,
                              flexShrink: 0,
                            }}
                          >
                            {addingGroup ? <Loader2 size={12} className="spin-animation" /> : <Plus size={12} />}
                            <span className={kh(lang)}>{isKm ? "ភ្ជាប់ភ្លាមៗ" : "Link"}</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div style={{ fontSize: 11, color: G.muted, lineHeight: 1.4 }}>
                    <span className={kh(lang)}>
                      {isKm
                        ? "មិនទាន់មានក្រុមដែល Bot បានចូលរួមនៅឡើយទេ។ សូម Add Bot ទៅកាន់ Telegram Group របស់អ្នកជា Admin រួចត្រឡប់មកទីនេះ។"
                        : "No unlinked groups detected. Please add @SongketSecurityBot as Admin to your Telegram group first."}
                    </span>
                  </div>
                )}

                {/* Direct 1-Click Telegram Group Invite */}
                <button
                  onClick={() => {
                    const botUrl = "https://t.me/songket_beyda_bot?startgroup=link";
                    if (typeof window !== "undefined") {
                      const tg = (window as any).Telegram?.WebApp;
                      if (tg && typeof tg.openTelegramLink === "function") {
                        try {
                          tg.openTelegramLink(botUrl);
                          return;
                        } catch {}
                      }
                      window.open(botUrl, "_blank");
                    }
                  }}
                  style={{
                    background: G.surface,
                    border: `1px solid ${G.goldBorder}`,
                    color: G.gold,
                    borderRadius: 8,
                    padding: "9px 14px",
                    fontWeight: 700,
                    fontSize: 12,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                  }}
                >
                  <Plus size={14} />
                  <span className={kh(lang)}>{isKm ? "➕ បន្ថែម Bot ទៅកាន់ Telegram Group (Open Telegram)" : "➕ Add Bot to Telegram Group"}</span>
                </button>

                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <button
                    onClick={() => setShowAddGroupModal(false)}
                    style={{
                      padding: "4px 10px",
                      borderRadius: 6,
                      border: "none",
                      background: "transparent",
                      color: G.muted,
                      fontSize: 11,
                      cursor: "pointer",
                    }}
                  >
                    <span className={kh(lang)}>{isKm ? "បិទ" : "Close"}</span>
                  </button>
                </div>
              </div>
            )}

            {availableGroupIds.length === 0 ? (
              <div style={{ fontSize: 12, color: G.muted, fontStyle: "italic", padding: "6px 0" }}>
                {isKm ? "មិនទាន់មានក្រុមដែលបានភ្ជាប់ឡើយ" : "No groups linked yet."}
              </div>
            ) : (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {availableGroupIds.map((gid) => {
                  const isSelected = gid === selectedGid;
                  const gTitle = getGroupTitle(gid);
                  return (
                    <button
                      key={gid}
                      onClick={() => setSelectedGid(gid)}
                      style={{
                        padding: "7px 12px",
                        borderRadius: 8,
                        border: `1px solid ${isSelected ? G.goldBorder : G.border}`,
                        background: isSelected ? "rgba(212,167,44,0.18)" : G.surface2,
                        color: isSelected ? G.gold : G.text,
                        fontSize: 12,
                        fontWeight: isSelected ? 700 : 500,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        transition: "all 0.15s ease",
                      }}
                    >
                      <span>{gTitle}</span>
                      {isSuperAdmin && (
                        <span style={{ fontSize: 10, fontFamily: "JetBrains Mono, monospace", opacity: 0.7 }}>
                          ({gid})
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* 1. Group Language & Safe Timer Settings Card */}
          <div style={{ background: G.surface, border: `1px solid ${G.border}`, borderRadius: 14, padding: "18px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: G.text }}>
                  <span className={kh(lang)}>{isKm ? "ការកំណត់ភាសា & សារសុវត្ថិភាព" : "Language & Safe Message"}</span>
                </div>
                <div style={{ fontSize: 11, color: G.muted, marginTop: 2 }}>
                  📌 {getGroupTitle(selectedGid)}
                </div>
              </div>
              {savingGroupSettings && <Loader2 size={15} color={G.gold} className="spin-animation" />}
            </div>

            {/* Language Toggles */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: G.textSec, display: "block", marginBottom: 6 }}>
                <span className={kh(lang)}>{isKm ? "🌐 ភាសាក្នុងក្រុម (Language):" : "🌐 Group Language:"}</span>
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
                {[
                  { id: "both", label: isKm ? "🌐 ទាំងពីរ (Both)" : "🌐 Both (KH+EN)" },
                  { id: "kh", label: "🇰🇭 ភាសាខ្មែរ" },
                  { id: "en", label: "🇬🇧 English" },
                ].map((item) => {
                  const active = groupLang === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleSetGroupLang(item.id)}
                      disabled={savingGroupSettings}
                      style={{
                        padding: "9px 6px",
                        borderRadius: 8,
                        border: `1px solid ${active ? G.goldBorder : G.border}`,
                        background: active ? G.gold : G.surface2,
                        color: active ? "#1a1200" : G.text,
                        fontSize: 11,
                        fontWeight: 700,
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                      }}
                    >
                      <span className={kh(lang)}>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Safe Message Timer Toggles */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: G.textSec, display: "block", marginBottom: 6 }}>
                <span className={kh(lang)}>
                  {isKm
                    ? "⏱️ កម្មវិធីកំណត់សារសុវត្ថិភាព (Safe Message Timer):"
                    : "⏱️ Safe Message Timeout (Auto-delete):"}
                </span>
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 6 }}>
                {[
                  { sec: 10, label: "⏱️ 10s" },
                  { sec: 5, label: "⏱️ 5s" },
                  { sec: 15, label: "⏱️ 15s" },
                  { sec: 0, label: "❌ Off" },
                ].map((item) => {
                  const active = (item.sec === 0 && !groupShowSafe) || (groupShowSafe && groupSafeTimeout === item.sec);
                  return (
                    <button
                      key={item.sec}
                      onClick={() => handleSetGroupTimer(item.sec)}
                      disabled={savingGroupSettings}
                      style={{
                        padding: "9px 4px",
                        borderRadius: 8,
                        border: `1px solid ${active ? G.goldBorder : G.border}`,
                        background: active ? G.gold : G.surface2,
                        color: active ? "#1a1200" : G.text,
                        fontSize: 11,
                        fontWeight: 700,
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                      }}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 2. Group Whitelisted Users Sub-card ("no put duplicate") */}
          <div style={{ background: G.surface, border: `1px solid ${G.border}`, borderRadius: 14, padding: "18px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Users size={16} color={G.gold} />
                <div style={{ fontSize: 14, fontWeight: 700, color: G.text }}>
                  <span className={kh(lang)}>{isKm ? "សមាជិកក្នុងបញ្ជីស (Whitelisted Users)" : "Group Whitelisted Users"}</span>
                </div>
              </div>
              <span style={{ fontSize: 11, color: G.gold, fontWeight: 700, background: "rgba(212,167,44,0.12)", padding: "2px 8px", borderRadius: 10 }}>
                {groupWlUsers.length}
              </span>
            </div>
            <div style={{ fontSize: 11, color: G.muted, marginBottom: 14 }}>
              <span className={kh(lang)}>
                {isKm
                  ? "សមាជិកដែលបានអនុញ្ញាតឱ្យផ្ញើតំណភ្ជាប់ ឬឯកសារក្នុងក្រុមនេះដោយរំលងការទប់ស្កាត់។"
                  : "Members allowed to post links and files in this group without restriction."}
              </span>
            </div>

            {/* List */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
              {groupWlUsers.length === 0 ? (
                <div style={{ fontSize: 12, color: G.muted, fontStyle: "italic", padding: "6px 0" }}>
                  {isKm ? "មិនទាន់មានសមាជិកក្នុងបញ្ជីសឡើយ" : "No whitelisted members in this group."}
                </div>
              ) : (
                groupWlUsers.map((u) => {
                  const formatted = formatUser(u.user_id, u.username, u.name);
                  return (
                    <div
                      key={u.user_id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        background: G.surface2,
                        border: `1px solid ${G.border}`,
                        borderRadius: 8,
                        padding: "8px 12px",
                      }}
                    >
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: G.text }}>{formatted.title}</div>
                        {formatted.subtitle && (
                          <div style={{ fontSize: 10, color: G.muted, fontFamily: "JetBrains Mono, monospace" }}>
                            {formatted.subtitle}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => handleRemoveGroupUser(u.user_id)}
                        style={{ background: "transparent", border: "none", color: G.danger, cursor: "pointer", padding: 4 }}
                        title={tx.remove}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            {/* Add User Form */}
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
              <div style={{ flex: "1 1 120px", minWidth: 0 }}>
                <input
                  value={newGroupUser}
                  onChange={(e) => setNewGroupUser(e.target.value)}
                  placeholder={isKm ? "User ID ឬ @Username" : "User ID or @Username"}
                  style={inputStyle}
                />
              </div>
              <div style={{ flex: "1 1 100px", minWidth: 0 }}>
                <input
                  value={newGroupUserName}
                  onChange={(e) => setNewGroupUserName(e.target.value)}
                  placeholder={isKm ? "ឈ្មោះ (ស្រេចចិត្ត)" : "Name (Optional)"}
                  style={inputStyle}
                />
              </div>
              <button
                onClick={handleAddGroupUser}
                style={{
                  background: G.gold,
                  color: "#1a1200",
                  border: "none",
                  borderRadius: 8,
                  padding: "0 14px",
                  height: 38,
                  fontWeight: 700,
                  cursor: "pointer",
                  fontSize: 12,
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  flexShrink: 0,
                }}
              >
                <Plus size={14} />
                <span className={kh(lang)}>{tx.add}</span>
              </button>
            </div>
          </div>

          {/* 3. Group Muted / Blocklisted Users Sub-card ("no put duplicate") */}
          <div style={{ background: G.surface, border: `1px solid ${G.border}`, borderRadius: 14, padding: "18px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Volume2 size={16} color={G.danger} />
                <div style={{ fontSize: 14, fontWeight: 700, color: G.text }}>
                  <span className={kh(lang)}>{isKm ? "សមាជិកដែលត្រូវ Mute (Muted / Blocklist)" : "Muted / Blocklisted Users"}</span>
                </div>
              </div>
              <span style={{ fontSize: 11, color: G.danger, fontWeight: 700, background: "rgba(224,64,64,0.12)", padding: "2px 8px", borderRadius: 10 }}>
                {groupMutedUsers.length}
              </span>
            </div>
            <div style={{ fontSize: 11, color: G.muted, marginBottom: 14 }}>
              <span className={kh(lang)}>
                {isKm
                  ? "សមាជិកដែលបានបំពានច្បាប់ (ផ្ញើតំណភ្ជាប់/ឯកសារមេរោគ) និងត្រូវបានផ្អាកសិទ្ធិផ្ញើសារ។"
                  : "Members temporarily restricted from sending messages due to threat detections."}
              </span>
            </div>

            {/* List */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {groupMutedUsers.length === 0 ? (
                <div style={{ fontSize: 12, color: G.muted, fontStyle: "italic", padding: "6px 0" }}>
                  {isKm ? "គ្មានសមាជិកដែលត្រូវ Mute ឡើយ" : "No muted members in this group."}
                </div>
              ) : (
                groupMutedUsers.map((u) => {
                  const formatted = formatUser(u.user_id, u.username, u.name);
                  return (
                    <div
                      key={u.user_id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        background: G.surface2,
                        border: `1px solid ${G.border}`,
                        borderRadius: 8,
                        padding: "8px 12px",
                      }}
                    >
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: G.text }}>{formatted.title}</div>
                        <div style={{ fontSize: 10, color: G.warn, display: "flex", gap: 8, marginTop: 2 }}>
                          <span>Strikes: {u.strikes ?? 3}</span>
                          {formatted.subtitle && (
                            <span style={{ color: G.muted, fontFamily: "JetBrains Mono, monospace" }}>
                              {formatted.subtitle}
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => handleUnmuteGroupUser(u.user_id)}
                        style={{
                          background: "rgba(42,170,90,0.15)",
                          border: `1px solid ${G.safe}`,
                          color: G.safe,
                          borderRadius: 6,
                          padding: "6px 10px",
                          fontSize: 11,
                          fontWeight: 700,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        <Volume2 size={12} />
                        <span className={kh(lang)}>{isKm ? "បើកសិទ្ធិ" : "Unmute"}</span>
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* 4. Group Approved / Whitelisted Files Sub-card ("no put duplicate") */}
          <div style={{ background: G.surface, border: `1px solid ${G.border}`, borderRadius: 14, padding: "18px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <FileText size={16} color={G.gold} />
                <div style={{ fontSize: 14, fontWeight: 700, color: G.text }}>
                  <span className={kh(lang)}>{isKm ? "ឯកសារអនុញ្ញាតក្នុងក្រុម (Whitelisted Files)" : "Group Whitelisted Files"}</span>
                </div>
              </div>
              <span style={{ fontSize: 11, color: G.gold, fontWeight: 700, background: "rgba(212,167,44,0.12)", padding: "2px 8px", borderRadius: 10 }}>
                {groupWlFiles.length}
              </span>
            </div>
            <div style={{ fontSize: 11, color: G.muted, marginBottom: 14 }}>
              <span className={kh(lang)}>
                {isKm
                  ? "ឯកសារដែលត្រូវបានអនុម័តដោយ Admin និងរំលងការស្កេនឡើងវិញតាម SHA-256 Hash។"
                  : "Approved file hashes that skip repeat scanning in this group."}
              </span>
            </div>

            {/* List */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
              {groupWlFiles.length === 0 ? (
                <div style={{ fontSize: 12, color: G.muted, fontStyle: "italic", padding: "6px 0" }}>
                  {isKm ? "មិនទាន់មានឯកសារក្នុងបញ្ជីសឡើយ" : "No approved files in this group."}
                </div>
              ) : (
                groupWlFiles.map((f) => (
                  <div
                    key={f.sha256}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      background: G.surface2,
                      border: `1px solid ${G.border}`,
                      borderRadius: 8,
                      padding: "8px 12px",
                    }}
                  >
                    <div style={{ overflow: "hidden", minWidth: 0, paddingRight: 8 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: G.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        📄 {f.filename || "Document"}
                      </div>
                      <div style={{ fontSize: 10, color: G.muted, fontFamily: "JetBrains Mono, monospace" }}>
                        {f.sha256.slice(0, 20)}...
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveGroupFile(f.sha256)}
                      style={{ background: "transparent", border: "none", color: G.danger, cursor: "pointer", padding: 4 }}
                      title={tx.remove}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Add File Form */}
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
              <div style={{ flex: "1 1 140px", minWidth: 0 }}>
                <input
                  value={newFileSha}
                  onChange={(e) => setNewFileSha(e.target.value)}
                  placeholder={isKm ? "SHA-256 Hash (៦៤ ខ្ទង់)" : "SHA-256 Hash (e.g. e3b0c442...)"}
                  style={inputStyle}
                />
              </div>
              <div style={{ flex: "1 1 100px", minWidth: 0 }}>
                <input
                  value={newFileName}
                  onChange={(e) => setNewFileName(e.target.value)}
                  placeholder={isKm ? "ឈ្មោះឯកសារ (ស្រេចចិត្ត)" : "File Name (Optional)"}
                  style={inputStyle}
                />
              </div>
              <button
                onClick={handleAddGroupFile}
                style={{
                  background: G.gold,
                  color: "#1a1200",
                  border: "none",
                  borderRadius: 8,
                  padding: "0 14px",
                  height: 38,
                  fontWeight: 700,
                  cursor: "pointer",
                  fontSize: 12,
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  flexShrink: 0,
                }}
              >
                <Plus size={14} />
                <span className={kh(lang)}>{tx.add}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB 2: SUPER ADMIN SYSTEM CONFIG
          ══════════════════════════════════════════════════════════════════════ */}
      {isSuperAdmin && manageTab === "super" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Whitelist Admins */}
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

            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
              {whitelist.length === 0 ? (
                <div style={{ fontSize: 12, color: G.muted, fontStyle: "italic", padding: "8px 0" }}>
                  <span className={kh(lang)}>{tx.noAdminsYet}</span>
                </div>
              ) : (
                whitelist.map((id) => {
                  const formatted = formatUser(id);
                  return (
                    <div
                      key={id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        background: G.surface2,
                        border: `1px solid ${G.border}`,
                        borderRadius: 8,
                        padding: "8px 12px",
                      }}
                    >
                      <div>
                        <div style={{ fontSize: 13, color: G.text, fontWeight: 700 }}>{formatted.title}</div>
                        {formatted.subtitle && (
                          <div style={{ fontSize: 10, color: G.muted, fontFamily: "JetBrains Mono, monospace" }}>
                            {formatted.subtitle}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => handleRemoveWhitelist(id)}
                        style={{ background: "transparent", border: "none", color: G.danger, cursor: "pointer", padding: "4px", display: "flex", alignItems: "center" }}
                        title={tx.remove}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            <div style={{ display: "flex", gap: 8, width: "100%", alignItems: "center" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <input
                  value={newUserId}
                  onChange={(e) => setNewUserId(e.target.value.replace(/\D/g, ""))}
                  placeholder={tx.addUserPlaceholder}
                  inputMode="numeric"
                  style={inputStyle}
                />
              </div>
              <button
                onClick={handleAddWhitelist}
                style={{
                  background: G.gold,
                  color: "#1a1200",
                  border: "none",
                  borderRadius: 8,
                  padding: "0 14px",
                  height: 38,
                  fontWeight: 700,
                  cursor: "pointer",
                  fontSize: 12,
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  flexShrink: 0,
                }}
              >
                <Plus size={14} />
                <span className={kh(lang)}>{tx.add}</span>
              </button>
            </div>
          </div>

          {/* Monitored Groups */}
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

            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
              {allowedGroups.length === 0 ? (
                <div style={{ fontSize: 12, color: G.muted, fontStyle: "italic", padding: "8px 0" }}>
                  <span className={kh(lang)}>{tx.noGroupsYet}</span>
                </div>
              ) : (
                allowedGroups.map((gid) => (
                  <div
                    key={gid}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      background: G.surface2,
                      border: `1px solid ${G.border}`,
                      borderRadius: 8,
                      padding: "8px 12px",
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: G.text }}>{getGroupTitle(gid)}</div>
                    </div>
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

            <div style={{ display: "flex", gap: 8, width: "100%", alignItems: "center" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <input
                  value={newGroupId}
                  onChange={(e) => setNewGroupId(e.target.value.replace(/[^\d-]/g, ""))}
                  placeholder={tx.addGroupPlaceholder}
                  inputMode="numeric"
                  style={inputStyle}
                />
              </div>
              <button
                onClick={handleAddGroup}
                style={{
                  background: G.gold,
                  color: "#1a1200",
                  border: "none",
                  borderRadius: 8,
                  padding: "0 14px",
                  height: 38,
                  fontWeight: 700,
                  cursor: "pointer",
                  fontSize: 12,
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  flexShrink: 0,
                }}
              >
                <Plus size={14} />
                <span className={kh(lang)}>{tx.add}</span>
              </button>
            </div>
          </div>

          {/* Group Handlers */}
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

            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 14 }}>
              {whitelist.length === 0 ? (
                <div style={{ fontSize: 12, color: G.muted, fontStyle: "italic" }}>
                  No whitelisted admins configured.
                </div>
              ) : (
                whitelist.map((uidNum) => {
                  const uid = String(uidNum);
                  const gids = groupHandlers[uid] || [];
                  const formatted = formatUser(uid);
                  return (
                    <div key={uid} style={{ background: G.surface2, border: `1px solid ${G.border}`, borderRadius: 8, padding: "10px 12px" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: G.gold }}>{formatted.title}</span>
                        {formatted.subtitle && (
                          <span style={{ fontSize: 10, color: G.muted, fontFamily: "JetBrains Mono, monospace" }}>
                            {formatted.subtitle}
                          </span>
                        )}
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
                        {gids.length === 0 ? (
                          <span style={{ fontSize: 11, color: G.muted, fontStyle: "italic" }}>
                            {uid === "1221693150" ? "All Groups (Super Admin)" : "No specific groups assigned"}
                          </span>
                        ) : (
                          gids.map((gid) => (
                            <span
                              key={gid}
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 4,
                                background: G.surface,
                                border: `1px solid ${G.border}`,
                                borderRadius: 6,
                                padding: "3px 8px",
                                fontSize: 11,
                                fontFamily: "JetBrains Mono, monospace",
                              }}
                            >
                              {getGroupTitle(gid)}
                              <button
                                onClick={() => handleRemoveHandlerMapping(uid, gid)}
                                style={{ background: "transparent", border: "none", color: G.danger, cursor: "pointer", padding: "0 2px", display: "flex", alignItems: "center" }}
                              >
                                ×
                              </button>
                            </span>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, width: "100%" }}>
                <input
                  value={handlerAdminId}
                  onChange={(e) => setHandlerAdminId(e.target.value.replace(/\D/g, ""))}
                  placeholder="Admin User ID"
                  inputMode="numeric"
                  style={inputStyle}
                />
                <input
                  value={handlerGroupId}
                  onChange={(e) => setHandlerGroupId(e.target.value.replace(/[^\d-]/g, ""))}
                  placeholder="Group ID (-100...)"
                  inputMode="numeric"
                  style={inputStyle}
                />
              </div>
              <button
                onClick={handleAddHandlerMapping}
                style={{
                  background: G.surface2,
                  color: G.gold,
                  border: `1px solid ${G.goldBorder}`,
                  borderRadius: 8,
                  padding: "9px 0",
                  fontWeight: 700,
                  cursor: "pointer",
                  fontSize: 12,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 4,
                  width: "100%",
                }}
              >
                <ArrowRight size={13} />
                <span className={kh(lang)}>{tx.assignGroup}</span>
              </button>
            </div>
          </div>

          {/* Save All Config Button */}
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
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB 3: TRUSTED DOMAINS
          ══════════════════════════════════════════════════════════════════════ */}
      {manageTab === "domains" && (
        <div style={{ background: G.surface, border: `1px solid ${G.border}`, borderRadius: 14, padding: "18px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Globe size={16} color={G.gold} />
              <div style={{ fontSize: 14, fontWeight: 700, color: G.text }}>
                <span className={kh(lang)}>
                  {isKm ? "បញ្ជីគេហទំព័រសុវត្ថិភាព (Trusted Domains)" : "Trusted Domain Whitelist"}
                </span>
              </div>
            </div>
            {domainToast && (
              <span style={{ fontSize: 11, color: G.safe, fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
                <Check size={12} /> {isKm ? "បានរក្សាទុក" : "Saved"}
              </span>
            )}
          </div>
          <div style={{ fontSize: 11, color: G.muted, marginBottom: 14 }}>
            <span className={kh(lang)}>
              {isKm
                ? "តំណភ្ជាប់ដែលស្ថិតក្នុងបញ្ជីនេះនឹងមិនត្រូវបានកាត់សេចក្តីជាមេរោគឡើយ និងរំលងការស្កេនដើម្បីសន្សំកូតា។"
                : "Links matching these trusted domains will skip deep scanning and won't be flagged."}
            </span>
          </div>

          {/* Domain List */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
            {domains.length === 0 ? (
              <div style={{ fontSize: 12, color: G.muted, fontStyle: "italic", padding: "8px 0" }}>
                <span className={kh(lang)}>{isKm ? "មិនទាន់មានគេហទំព័រ" : "No custom domains added."}</span>
              </div>
            ) : (
              domains.map((dom) => (
                <div
                  key={dom}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    background: G.surface2,
                    border: `1px solid ${G.border}`,
                    borderRadius: 8,
                    padding: "6px 10px",
                  }}
                >
                  <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 12, color: G.text, fontWeight: 600 }}>
                    {dom}
                  </span>
                  <button
                    onClick={() => handleRemoveDomain(dom)}
                    style={{ background: "transparent", border: "none", color: G.danger, cursor: "pointer", padding: "2px", display: "flex", alignItems: "center" }}
                    title={tx.remove}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Add Domain & Save */}
          <div style={{ display: "flex", gap: 8, width: "100%", alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ flex: "1 1 140px", minWidth: 0 }}>
              <input
                value={newDomain}
                onChange={(e) => setNewDomain(e.target.value)}
                placeholder={isKm ? "ឧ. example.com" : "e.g. example.com"}
                style={inputStyle}
              />
            </div>
            <button
              onClick={handleAddDomain}
              style={{
                background: G.surface2,
                color: G.gold,
                border: `1px solid ${G.goldBorder}`,
                borderRadius: 8,
                padding: "0 14px",
                height: 38,
                fontWeight: 700,
                cursor: "pointer",
                fontSize: 12,
                display: "flex",
                alignItems: "center",
                gap: 4,
                flexShrink: 0,
              }}
            >
              <Plus size={14} />
              <span className={kh(lang)}>{tx.add}</span>
            </button>
            <button
              onClick={handleSaveDomains}
              disabled={savingDomains}
              style={{
                background: G.gold,
                color: "#1a1200",
                border: "none",
                borderRadius: 8,
                padding: "0 14px",
                height: 38,
                fontWeight: 700,
                cursor: "pointer",
                fontSize: 12,
                display: "flex",
                alignItems: "center",
                gap: 4,
                flexShrink: 0,
              }}
            >
              {savingDomains ? <Loader2 size={14} className="spin-animation" /> : <Save size={14} />}
              <span className={kh(lang)}>{tx.saveConfig || "Save"}</span>
            </button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB 4: PLANS & PRICING (Super Admin Only)
          ══════════════════════════════════════════════════════════════════════ */}
      {isSuperAdmin && manageTab === "plans" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Plan Catalog */}
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
                  <span style={{ fontSize: 11, fontWeight: 700, color: G.gold, fontFamily: "JetBrains Mono, monospace" }}>
                    {key}
                  </span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 8, width: "100%" }}>
                  <label style={{ display: "flex", flexDirection: "column", gap: 3, fontSize: 10, color: G.muted }}>
                    {tx.planName}
                    <input value={plan.name} onChange={(e) => updatePlanField(key, "name", e.target.value)} style={inputStyle} />
                  </label>
                  <label style={{ display: "flex", flexDirection: "column", gap: 3, fontSize: 10, color: G.muted }}>
                    {tx.planPrice}
                    <input
                      inputMode="decimal"
                      value={plan.price}
                      onChange={(e) => updatePlanField(key, "price", e.target.value.replace(/[^\d.]/g, ""))}
                      style={inputStyle}
                    />
                  </label>
                  <label style={{ display: "flex", flexDirection: "column", gap: 3, fontSize: 10, color: G.muted }}>
                    {tx.planScans}
                    <input
                      inputMode="numeric"
                      value={plan.scans}
                      onChange={(e) => updatePlanField(key, "scans", e.target.value.replace(/\D/g, ""))}
                      style={inputStyle}
                    />
                  </label>
                  <label style={{ display: "flex", flexDirection: "column", gap: 3, fontSize: 10, color: G.muted }}>
                    {tx.planGroups}
                    <input
                      inputMode="numeric"
                      value={plan.groups}
                      onChange={(e) => updatePlanField(key, "groups", e.target.value.replace(/\D/g, ""))}
                      style={inputStyle}
                    />
                  </label>
                  <label style={{ display: "flex", flexDirection: "column", gap: 3, fontSize: 10, color: G.muted }}>
                    {tx.planHistory}
                    <input
                      inputMode="numeric"
                      value={plan.history_days}
                      onChange={(e) => updatePlanField(key, "history_days", e.target.value.replace(/\D/g, ""))}
                      style={inputStyle}
                    />
                  </label>
                </div>
              </div>
            ))}

            <button
              onClick={handleSavePlans}
              disabled={savingPlans}
              style={{
                background: G.surface2,
                color: G.gold,
                border: `1px solid ${G.goldBorder}`,
                borderRadius: 8,
                padding: "10px 0",
                fontWeight: 700,
                cursor: "pointer",
                fontSize: 12,
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
              }}
            >
              {savingPlans ? <Loader2 size={14} className="spin-animation" /> : <Save size={14} />}
              <span className={kh(lang)}>{tx.planSave}</span>
            </button>
          </div>

          {/* Assign Plan */}
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

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, width: "100%" }}>
              <input
                value={assignUserId}
                onChange={(e) => setAssignUserId(e.target.value.replace(/\D/g, ""))}
                placeholder={tx.planUserPlaceholder}
                inputMode="numeric"
                style={inputStyle}
              />
              <select
                value={assignPlanKey}
                onChange={(e) => setAssignPlanKey(e.target.value)}
                style={{ ...inputStyle, width: "100%", background: G.surface2 }}
              >
                <option value="">{tx.planSelect}</option>
                {Object.entries(planCatalog).map(([key, plan]) => (
                  <option key={key} value={key}>
                    {plan.name}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={handleAssignPlan}
              disabled={savingPlans || !assignPlanKey}
              style={{
                background: G.gold,
                color: "#1a1200",
                border: "none",
                borderRadius: 8,
                padding: "10px 0",
                fontWeight: 700,
                cursor: "pointer",
                fontSize: 12,
                width: "100%",
                marginTop: 10,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
              }}
            >
              {savingPlans ? <Loader2 size={14} className="spin-animation" /> : <ArrowRight size={14} />}
              <span className={kh(lang)}>{tx.assignPlanBtn}</span>
            </button>
          </div>

          {/* Subscriptions List */}
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
                subs.map((s) => {
                  const formatted = formatUser(s.user_id);
                  return (
                    <div
                      key={s.user_id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        background: G.surface2,
                        border: `1px solid ${G.border}`,
                        borderRadius: 8,
                        padding: "10px 12px",
                      }}
                    >
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: G.text }}>{formatted.title}</div>
                        <div style={{ fontSize: 11, color: G.gold }}>{planCatalog[s.plan]?.name || s.plan}</div>
                        {formatted.subtitle && (
                          <div style={{ fontSize: 10, color: G.muted, fontFamily: "JetBrains Mono, monospace" }}>
                            {formatted.subtitle}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => handleRevokePlan(s.user_id)}
                        disabled={savingPlans}
                        style={{
                          background: "transparent",
                          border: `1px solid ${G.border}`,
                          color: G.danger,
                          borderRadius: 6,
                          padding: "5px 10px",
                          fontSize: 11,
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                      >
                        <span className={kh(lang)}>{tx.revoke}</span>
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
