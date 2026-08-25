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

export interface DashboardApiResponse {
  authorized: boolean;
  user?: TelegramUser;
  dashboard?: DashboardData;
  error?: string;
  isMock?: boolean;
}
