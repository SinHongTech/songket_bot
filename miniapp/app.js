const tg = window.Telegram?.WebApp;
if (tg) {
  tg.ready();
  tg.expand();
}
const initData = tg?.initData || "";

function esc(v) {
  return String(v ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;",
  }[c]));
}

async function load() {
  if (!initData) return;
  try {
    const r = await fetch("/api/dashboard", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ initData, days: 7 }),
    });
    const d = await r.json();
    if (!d.authorized) return;

    document.getElementById("dashboardNav").style.display = "block";
    document.querySelector(".dashboard").style.display = "block";
    document.getElementById("userLine").textContent =
      `Signed in as ${d.user.username ? "@" + d.user.username : d.user.first_name} • Telegram ID ${d.user.id}`;

    const t = d.dashboard.totals;
    document.getElementById("stats").innerHTML = [
      ["Scanned", t.scanned, ""],
      ["Files", t.files, ""],
      ["URLs", t.urls, ""],
      ["Malicious", t.malicious, "danger"],
      ["Deleted", t.deleted, "danger"],
      ["Suspicious", t.suspicious, ""],
    ].map((x) => `<div class="stat"><strong class="${x[2]}">${x[1]}</strong><span>${x[0]}</span></div>`).join("");

    document.getElementById("groups").innerHTML = d.dashboard.groups.length
      ? d.dashboard.groups.map((g) => `
        <div class="card group">
          <h3><span>${esc(g.title)}</span><small class="muted">${esc(g.id)}</small></h3>
          <div class="tablewrap">
            <table class="table">
              <thead><tr><th>Date</th><th>Scanned</th><th>Files</th><th>URLs</th><th>Malicious</th><th>Deleted</th><th>Suspicious</th></tr></thead>
              <tbody>${g.daily.map((x) => `<tr><td>${x.date}</td><td>${x.scanned}</td><td>${x.files}</td><td>${x.urls}</td><td class="danger">${x.malicious}</td><td class="danger">${x.deleted}</td><td>${x.suspicious}</td></tr>`).join("")}</tbody>
            </table>
          </div>
        </div>`).join("")
      : '<div class="notice">No groups are assigned to this account yet.</div>';
  } catch (e) {
    const el = document.getElementById("dashError");
    el.style.display = "block";
    el.textContent = "Dashboard could not be loaded. Please try again.";
  }
}

load();
