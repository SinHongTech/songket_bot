export const threatTimeline = [
  { day: "Mon", scans: 120, threats: 8 },
  { day: "Tue", scans: 98, threats: 5 },
  { day: "Wed", scans: 145, threats: 14 },
  { day: "Thu", scans: 210, threats: 6 },
  { day: "Fri", scans: 178, threats: 11 },
  { day: "Sat", scans: 88, threats: 3 },
  { day: "Sun", scans: 130, threats: 9 },
];

export const monthlyReport = [
  { month: "Mar", scans: 2800, threats: 62 },
  { month: "Apr", scans: 3100, threats: 88 },
  { month: "May", scans: 2600, threats: 45 },
  { month: "Jun", scans: 3400, threats: 71 },
  { month: "Jul", scans: 4200, threats: 94 },
  { month: "Aug", scans: 3900, threats: 81 },
];

export const threatTypes = [
  { name: "Phishing URL", value: 38 },
  { name: "Malware File", value: 27 },
  { name: "Scam Text", value: 21 },
  { name: "Spam Media", value: 14 },
];

export const PIE_COLORS = ["#e04040", "#d07820", "#D4A72C", "#7a6830"];

export const groups = [
  { id: 1, name: "KhmerDev Community", members: 3820, threats: 12, status: "alert", lastScan: "2 min ago" },
  { id: 2, name: "Phnom Penh Startup Hub", members: 1250, threats: 2, status: "protected", lastScan: "5 min ago" },
  { id: 3, name: "Tech Khmer Official", members: 8940, threats: 0, status: "protected", lastScan: "1 min ago" },
  { id: 4, name: "Cambodia Freelancers", members: 560, threats: 9, status: "alert", lastScan: "8 min ago" },
];

export const threats = [
  { id: 1, type: "Phishing URL", content: "http://fake-bcelbank.cc/login?ref=telegram", group: "KhmerDev Community", date: "Today 14:02", action: "Deleted", risk: "critical" },
  { id: 2, type: "Malware File", content: "invoice_july_2025.exe", group: "Cambodia Freelancers", date: "Today 13:31", action: "Quarantined", risk: "high" },
  { id: 3, type: "Scam Text", content: "Win $500 gift card! Click now: t.me/scam_giveaway", group: "KhmerDev Community", date: "Today 12:18", action: "Deleted", risk: "medium" },
  { id: 4, type: "Phishing URL", content: "http://aba-verify.xyz/account/confirm", group: "Cambodia Freelancers", date: "Today 11:45", action: "Deleted", risk: "critical" },
  { id: 5, type: "Spam Media", content: "promo_video_final.mp4 (repeated 12x)", group: "Phnom Penh Startup Hub", date: "Today 10:02", action: "Muted sender", risk: "medium" },
];

export const scanHistory = [
  { date: "2025-07-28 14:02", content: "http://fake-bcelbank.cc/login?ref=telegram", group: "KhmerDev Community", type: "URL", result: "threat" },
  { date: "2025-07-28 13:31", content: "invoice_july_2025.exe", group: "Cambodia Freelancers", type: "File", result: "threat" },
  { date: "2025-07-28 13:20", content: "https://github.com/khmerdev/songket", group: "KhmerDev Community", type: "URL", result: "clean" },
  { date: "2025-07-28 12:45", content: "project_proposal_q3.pdf", group: "KhmerDev Community", type: "File", result: "clean" },
  { date: "2025-07-28 12:18", content: "Win $500 gift card! Click now: t.me/scam_giveaway", group: "KhmerDev Community", type: "Text", result: "threat" },
  { date: "2025-07-28 11:45", content: "http://aba-verify.xyz/account/confirm", group: "Cambodia Freelancers", type: "URL", result: "threat" },
  { date: "2025-07-28 11:05", content: "team_photo_july.jpg", group: "Cambodia Freelancers", type: "Media", result: "clean" },
  { date: "2025-07-28 10:02", content: "promo_video_final.mp4", group: "Phnom Penh Startup Hub", type: "Media", result: "clean" },
  { date: "2025-07-28 09:14", content: "https://docs.google.com/spreadsheets/d/xyz", group: "Tech Khmer Official", type: "URL", result: "clean" },
  { date: "2025-07-27 17:33", content: "free_crypto_bot.apk", group: "KhmerDev Community", type: "File", result: "threat" },
];
