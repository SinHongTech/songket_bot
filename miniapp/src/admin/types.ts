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
  username?: string;
  language_code?: string;
}

export interface SystemConfig {
  whitelist_user_ids: number[];
  allowed_groups: number[];
  group_handlers: Record<string, number[]>;
  super_admin_ids: number[];
}

export interface DashboardApiResponse {
  authorized: boolean;
  is_super_admin?: boolean;
  user?: TelegramUser;
  dashboard?: DashboardData;
  config?: SystemConfig;
  plans?: Record<string, PlanEntry> | null;
  subscriptions?: Subscription[] | null;
  pin_status?: "setup" | "login";
  locked?: number;
  attempts?: number;
  session?: string;
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
