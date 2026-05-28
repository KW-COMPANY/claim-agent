// File: dashboard.js
const API_BASE = "https://claim-agent.gmo-k-watanabe.workers.dev";

const tokenInput = document.getElementById("token");
tokenInput.value = localStorage.getItem("accessToken") || "";
document.getElementById("saveToken").addEventListener("click", () => {
  localStorage.setItem("accessToken", tokenInput.value);
  alert("保存しました");
});
const getToken = () => tokenInput.value || localStorage.getItem("accessToken") || "";

document.getElementById("loadBtn").addEventListener("click", async () => {
  const res = await fetch(`${API_BASE}/api/dashboard`, {
    headers: { "X-Access-Token": getToken() },
  });
  if (!res.ok) return alert("読み込み失敗");
  const d = await res.json();
  document.getElementById("total").textContent = d.total;
  document.getElementById("byCategory").innerHTML = bars(d.byCategory);
  document.getElementById("bySeverity").innerHTML = bars(d.bySeverity);
  document.getElementById("byUrgency").innerHTML = bars(d.byUrgency);
  document.getElementById("bySentiment").innerHTML = bars(d.bySentiment);
  document.getElementById("monthly").innerHTML = bars(d.monthly);

  const kw = Object.entries(d.keywords || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .reduce((o, [k, v]) => ((o[k] = v), o), {});
  document.getElementById("keywords").innerHTML = bars(kw);
});

function bars(obj) {
  const entries = Object.entries(obj || {});
  if (!entries.length) return "<p style='color:#888;'>データなし</p>";
  const max = Math.max(...entries.map(([, v]) => v));
  return entries
    .sort((a, b) => b[1] - a[1])
    .map(
      ([k, v]) => `
    <div class="bar-row">
      <span class="label">${esc(k)}</span>
      <div class="bar" style="width:${(v / max) * 70}%">${v}</div>
    </div>`
    )
    .join("");
}

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}
