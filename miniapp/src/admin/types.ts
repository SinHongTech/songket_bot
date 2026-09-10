export interface DailyReport {
  date: string;
  scanned: number;
  files: number;
  urls: number;
  malicious: number;
  deleted: number;
  suspicious: number;
  errors: number;
  oversize: number;
}

export interface DashboardGroup {
  id: number;
  title: string;
  daily: DailyReport[];
}

export interface DashboardTotals {
  scanned: number;
  files: number;
  urls: number;
  malicious: number;
  deleted: number;
  suspicious: number;
  errors: number;
  oversize: number;
}

export interface DashboardData {
  authorized: boolean;
  user_id: number;
  days: number;
  groups: DashboardGroup[];
  totals: DashboardTotals;
}

export interface TelegramUser {
  id: number;
  first_name?: string;
  last_name?: string;
  name?: string;
  username?: string;
  language_code?: string;
}

export interface SystemConfig {
  whitelist_user_ids: number[];
  allowed_groups: number[];
  group_handlers: Record<string, number[]>;
  super_admin_ids: number[];
  primary_admin_ids?: number[];
}

export interface ThreatEvent {
  id: string;
  timestamp: number;
  date: string;
  time: string;
  type: string;
  risk: "critical" | "high" | "medium";
  content: string;
  sender_id?: number | null;
  sender_username?: string;
  sender_name?: string;
  group_id?: number | null;
  group_title?: string;
  action_taken: string;
}

export interface GroupUserEntry {
  user_id: number;
  username?: string;
  name?: string;
  strikes?: number;
  added_at?: number;
  muted_at?: number;
}

export interface GroupFileEntry {
  sha256: string;
  filename?: string;
  added_at?: number;
}

export interface GroupSettings {
  lang?: string;
  safe_timeout?: number;
  show_safe?: boolean;
  link_preview?: boolean;
  admin_chat_id?: string;
}

export interface GroupDetail {
  settings: GroupSettings;
  whitelisted_users: GroupUserEntry[];
  muted_users: GroupUserEntry[];
  whitelisted_files: GroupFileEntry[];
}

export interface KnownUser {
  username?: string;
  name?: string;
  updated_at?: number;
}

export interface CandidateGroup {
  id: number;
  title: string;
}

export interface UserSettings {
  daily_report_enabled?: boolean;
  daily_report_time?: string;
  report_frequency?: "daily" | "weekly" | "monthly";
  report_lang?: "both" | "kh" | "en";
  enabled?: boolean;
  time?: string;
  frequency?: "daily" | "weekly" | "monthly" | string;
  lang?: string;
}

export interface DashboardApiResponse {
  authorized: boolean;
  is_super_admin?: boolean;
  user?: TelegramUser;
  dashboard?: DashboardData;
  candidate_groups?: CandidateGroup[];
  user_settings?: UserSettings;
  threat_events?: ThreatEvent[];
  domain_whitelist?: string[];
  group_details?: Record<string, GroupDetail>;
  known_users?: Record<string, KnownUser>;
  known_groups?: Record<string, string>;
  config?: SystemConfig;
  plans?: Record<string, PlanEntry> | null;
  subscriptions?: Subscription[] | null;
  pin_status?: "setup" | "login";
  pin_exists?: boolean;
  locked?: number;
  attempts?: number;
  session?: string;
  preview?: boolean;
  error?: string;
  isMock?: boolean;
}

export interface PlanEntry {
  name: string;
  price: number;
  scans: number;
  groups: number;
  history_days: number;
}

export interface Subscription {
  user_id: number;
  plan: string;
  expiry: number;
}


