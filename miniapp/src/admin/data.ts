import type { DashboardData, DashboardGroup, TelegramUser } from "./types";

export const PIE_COLORS = ["#D4A72C", "#3b82f6", "#e04040", "#d07820"];

export const mockUser: TelegramUser = {
  id: 719283921,
  first_name: "Security Admin",
  username: "khmertech_admin",
};

export function mockDashboardData(days: number = 7): DashboardData {
  const dates: string[] = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    dates.push(d.toISOString().split("T")[0]);
  }

  const group1Daily = dates.map((date, i) => ({
    date,
    scanned: [42, 38, 55, 60, 52, 28, 45][i % 7],
    files: [8, 6, 12, 10, 9, 4, 7][i % 7],
    urls: [34, 32, 43, 50, 43, 24, 38][i % 7],
    malicious: [1, 0, 2, 1, 3, 0, 1][i % 7],
    deleted: [1, 0, 2, 1, 3, 0, 1][i % 7],
    suspicious: [2, 1, 3, 1, 2, 1, 1][i % 7],
    errors: 0,
    oversize: 0,
  }));

  const group2Daily = dates.map((date, i) => ({
    date,
    scanned: [30, 25, 40, 35, 48, 20, 32][i % 7],
    files: [5, 4, 8, 7, 10, 3, 6][i % 7],
    urls: [25, 21, 32, 28, 38, 17, 26][i % 7],
    malicious: [0, 1, 0, 0, 1, 0, 0][i % 7],
    deleted: [0, 1, 0, 0, 1, 0, 0][i % 7],
    suspicious: [1, 0, 1, 2, 0, 0, 1][i % 7],
    errors: 0,
    oversize: 0,
  }));

  const groups: DashboardGroup[] = [
    { id: -1001928374650, title: "KhmerDev Security Hub", daily: group1Daily },
    { id: -1001837465920, title: "Phnom Penh Tech Community", daily: group2Daily },
  ];

  const totals = {
    scanned: 0,
    files: 0,
    urls: 0,
    malicious: 0,
    deleted: 0,
    suspicious: 0,
    errors: 0,
    oversize: 0,
  };

  groups.forEach(g => {
    g.daily.forEach(d => {
      totals.scanned += d.scanned;
      totals.files += d.files;
      totals.urls += d.urls;
      totals.malicious += d.malicious;
      totals.deleted += d.deleted;
      totals.suspicious += d.suspicious;
      totals.errors += d.errors;
      totals.oversize += d.oversize;
    });
  });

  return {
    authorized: true,
    user_id: mockUser.id,
    days,
    groups,
    totals,
  };
}

export function getTimelineFromDashboard(dashboard?: DashboardData | null) {
  if (!dashboard || !dashboard.groups.length) {
    return [];
  }

  const dateMap: Record<string, { date: string; day: string; scans: number; threats: number }> = {};

  dashboard.groups.forEach(group => {
    group.daily.forEach(item => {
      if (!dateMap[item.date]) {
        let dayLabel = item.date;
        try {
          const d = new Date(item.date);
          dayLabel = String(d.getDate());
        } catch {
          // fallback to date
        }
        dateMap[item.date] = {
          date: item.date,
          day: dayLabel,
          scans: 0,
          threats: 0,
        };
      }
      dateMap[item.date].scans += item.scanned;
      dateMap[item.date].threats += (item.malicious + item.suspicious);
    });
  });

  return Object.values(dateMap).sort((a, b) => a.date.localeCompare(b.date));
}

export function getThreatBreakdownFromDashboard(dashboard?: DashboardData | null) {
  if (!dashboard) {
    return [
      { name: "Scanned URLs", value: 1 },
      { name: "Scanned Files", value: 1 },
      { name: "Malicious Blocked", value: 0 },
      { name: "Suspicious Flagged", value: 0 },
    ];
  }

  const t = dashboard.totals;
  return [
    { name: "Scanned URLs", value: t.urls || 0 },
    { name: "Scanned Files", value: t.files || 0 },
    { name: "Malicious Blocked", value: t.malicious || 0 },
    { name: "Suspicious Flagged", value: t.suspicious || 0 },
  ];
}

export function getGroupCardsFromDashboard(dashboard?: DashboardData | null) {
  if (!dashboard || !dashboard.groups.length) return [];

  return dashboard.groups.map(g => {
    let totalScanned = 0;
    let threats = 0;
    let suspicious = 0;

    g.daily.forEach(d => {
      totalScanned += d.scanned;
      threats += d.malicious;
      suspicious += d.suspicious;
    });

    const status = threats > 0 ? "alert" : "protected";

    return {
      id: g.id,
      name: g.title,
      totalScanned,
      threats,
      suspicious,
      status,
      daily: g.daily,
    };
  });
}

export function getThreatsListFromDashboard(dashboard?: DashboardData | null) {
  if (!dashboard || !dashboard.groups.length) return [];

  const list: {
    id: string;
    type: string;
    content: string;
    group: string;
    date: string;
    action: string;
    risk: "critical" | "high" | "medium";
  }[] = [];

  dashboard.groups.forEach(g => {
    g.daily.forEach(d => {
      if (d.malicious > 0) {
        list.push({
          id: `${g.id}-${d.date}-malicious`,
          type: d.files > 0 ? "Malware / Malicious Content" : "Malicious URL",
          content: `${d.malicious} threat(s) detected & auto-removed`,
          group: g.title,
          date: d.date,
          action: `${d.deleted} message(s) deleted`,
          risk: "critical",
        });
      }
      if (d.suspicious > 0) {
        list.push({
          id: `${g.id}-${d.date}-suspicious`,
          type: "Suspicious Content",
          content: `${d.suspicious} suspicious item(s) flagged`,
          group: g.title,
          date: d.date,
          action: "Warning posted",
          risk: "medium",
        });
      }
    });
  });

  return list.sort((a, b) => b.date.localeCompare(a.date));
}

export function getScanHistoryFromDashboard(dashboard?: DashboardData | null) {
  if (!dashboard || !dashboard.groups.length) return [];

  const history: {
    date: string;
    content: string;
    group: string;
    type: "URL" | "File" | "All";
    result: "clean" | "threat";
    scanned: number;
    malicious: number;
  }[] = [];

  dashboard.groups.forEach(g => {
    g.daily.forEach(d => {
      if (d.scanned > 0) {
        const hasThreat = d.malicious > 0;
        const result = hasThreat ? "threat" : "clean";
        if (d.urls > 0) {
          history.push({
            date: d.date,
            content: `${d.urls} URLs scanned`,
            group: g.title,
            type: "URL",
            result,
            scanned: d.urls,
            malicious: d.malicious,
          });
        }
        if (d.files > 0) {
          history.push({
            date: d.date,
            content: `${d.files} files scanned`,
            group: g.title,
            type: "File",
            result,
            scanned: d.files,
            malicious: d.malicious,
          });
        }
      }
    });
  });

  return history.sort((a, b) => b.date.localeCompare(a.date));
}
