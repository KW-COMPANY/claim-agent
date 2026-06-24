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

  const ids = [
    "byClaimCategory", "byProductCategory", "byAdoptedType",
    "bySeverity", "byUrgency", "bySentiment", "byValueTier", "byChurnRisk",
    "byTenure", "byClaimCount", "byCurrentAmount", "byTotalAmount", "monthly",
  ];
  ids.forEach((id) => {
    document.getElementById(id).innerHTML = bars(d[id]);
  });

  const kw = Object.entries(d.keywords || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .reduce((o, [k, v]) => ((o[k] = v), o), {});
  document.getElementById("keywords").innerHTML = bars(kw);
});

function bars(obj) {
  const entries = Object.entries(obj || {});
  if (!entries.length) return "<p class='no-data'>データなし</p>";
  const max = Math.max(...entries.map(([, v]) => v));
  return entries
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => `
      <div class="bar-row">
        <span class="label">${esc(k)}</span>
        <div class="bar" style="width:${Math.max((v / max) * 70, 4)}%">${v}</div>
      </div>`).join("");
}

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}
