const API_BASE = "https://claim-agent.gmo-k-watanabe.workers.dev";

const tokenInput = document.getElementById("token");
tokenInput.value = localStorage.getItem("accessToken") || "";
document.getElementById("saveToken").addEventListener("click", () => {
  localStorage.setItem("accessToken", tokenInput.value);
  alert("保存しました");
});
const getToken = () => tokenInput.value || localStorage.getItem("accessToken") || "";

let cache = [];

document.getElementById("loadBtn").addEventListener("click", load);
["fCategory", "fSeverity", "fUrgency", "fKeyword"].forEach((id) =>
  document.getElementById(id).addEventListener("input", render)
);

async function load() {
  const kind = document.getElementById("kind").value;
  const res = await fetch(`${API_BASE}/api/list?kind=${kind}`, {
    headers: { "X-Access-Token": getToken() },
  });
  if (!res.ok) return alert("読み込み失敗");
  const data = await res.json();
  cache = data.items || [];
  render();
}

function render() {
  const fc = document.getElementById("fCategory").value;
  const fs = document.getElementById("fSeverity").value;
  const fu = document.getElementById("fUrgency").value;
  const fk = document.getElementById("fKeyword").value.trim().toLowerCase();

  const items = cache.filter((i) => {
    const a = i.analysis || {};
    if (fc && a.category !== fc) return false;
    if (fs && a.severity !== fs) return false;
    if (fu && a.urgency !== fu) return false;
    if (fk) {
      const blob = [
        i.text, i.customer, i.deal, a.summary,
        (a.keywords || []).join(" "), i.finalReply,
      ].join(" ").toLowerCase();
      if (!blob.includes(fk)) return false;
    }
    return true;
  });

  const area = document.getElementById("listArea");
  area.innerHTML = items.length
    ? items.map(renderItem).join("")
    : "<p style='padding:20px;text-align:center;color:#888;'>該当なし</p>";

  area.querySelectorAll(".del-btn").forEach((b) =>
    b.addEventListener("click", async (e) => {
      if (!confirm("削除しますか？")) return;
      const id = e.target.dataset.id;
      const kind = e.target.dataset.kind;
      await fetch(`${API_BASE}/api/delete`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Access-Token": getToken(),
        },
        body: JSON.stringify({ id, kind }),
      });
      load();
    })
  );
}

function renderItem(i) {
  const a = i.analysis || {};
  const isK = i.type === "knowledge";
  return `
    <div class="item">
      <h3>${esc(a.summary || "(要約なし)")}
        <span class="tag">${isK ? "ナレッジ" : "下書き"}</span>
      </h3>
      <p>
        <span class="tag">${esc(a.category)}</span>
        <span class="tag ${a.severity}">重要度:${a.severity}</span>
        <span class="tag ${a.urgency}">緊急度:${a.urgency}</span>
        <span class="tag ${a.sentiment}">${esc(a.sentiment || "")}</span>
      </p>
      <p><strong>顧客:</strong> ${esc(i.customer || "-")} / 
         <strong>案件:</strong> ${esc(i.deal || "-")} / 
         <strong>担当:</strong> ${esc(i.operator || "-")}</p>
      <details>
        <summary>顧客発言</summary>
        <p>${esc(i.text)}</p>
      </details>
      ${isK
        ? `<details open><summary>採用された対応文（${esc(i.adoptedLabel || "")}）</summary>
            <p>${esc(i.finalReply).replace(/\n/g, "<br>")}</p></details>`
        : ""}
      <small>${esc(i.createdAt)}</small>
      <button class="del-btn" data-id="${esc(i.id)}" data-kind="${isK ? "knowledge" : "draft"}"
        style="float:right;background:#dc2626;">削除</button>
    </div>`;
}

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}
