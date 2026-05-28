const API_BASE = "https://feedback-agent.<あなたのサブドメイン>.workers.dev";

// トークン管理
const tokenInput = document.getElementById("token");
tokenInput.value = localStorage.getItem("accessToken") || "";
document.getElementById("saveToken").addEventListener("click", () => {
  localStorage.setItem("accessToken", tokenInput.value);
  alert("トークンを保存しました");
});
function getToken() {
  return tokenInput.value || localStorage.getItem("accessToken") || "";
}

let currentDraft = null;

document.getElementById("analyzeBtn").addEventListener("click", async () => {
  const text = document.getElementById("text").value.trim();
  if (!text) return alert("本文は必須です");

  const payload = {
    text,
    customer: document.getElementById("customer").value,
    deal: document.getElementById("deal").value,
    channel: document.getElementById("channel").value,
    operator: document.getElementById("operator").value,
  };

  const btn = document.getElementById("analyzeBtn");
  const loading = document.getElementById("loading");
  btn.disabled = true;
  loading.classList.remove("hidden");

  try {
    const res = await fetch(`${API_BASE}/api/analyze`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Access-Token": getToken(),
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "失敗");
    currentDraft = data;
    renderResult(data);
  } catch (e) {
    alert("分析失敗: " + e.message);
  } finally {
    btn.disabled = false;
    loading.classList.add("hidden");
  }
});

function renderResult(d) {
  const a = d.analysis;
  document.getElementById("analysisArea").innerHTML = `
    <p>
      <span class="tag">${esc(a.category)}</span>
      <span class="tag ${a.severity}">重要度:${a.severity}</span>
      <span class="tag ${a.urgency}">緊急度:${a.urgency}</span>
      <span class="tag ${a.sentiment}">${esc(a.sentiment)}</span>
      ${a.escalation_needed ? '<span class="tag 高">要エスカレーション</span>' : ""}
    </p>
    <p><strong>要約:</strong> ${esc(a.summary)}</p>
    <p><strong>根本原因仮説:</strong> ${esc(a.root_cause_hypothesis)}</p>
    <p><strong>キーワード:</strong> ${(a.keywords || []).map(esc).join(", ")}</p>
    <p><strong>初動トーク:</strong> ${esc(d.talk_script || "")}</p>
  `;

  document.getElementById("proposalsArea").innerHTML = (d.proposals || [])
    .map(
      (p, i) => `
    <div class="proposal">
      <h4>${esc(p.label)}
        <button class="copy-btn" data-i="${i}">採用してコピー</button>
      </h4>
      <div class="content">${esc(p.content).replace(/\n/g, "<br>")}</div>
      <div class="pc">
        <div class="pros"><strong>メリット:</strong> ${esc(p.pros || "")}</div>
        <div class="cons"><strong>デメリット:</strong> ${esc(p.cons || "")}</div>
      </div>
    </div>`
    )
    .join("");

  document.querySelectorAll(".copy-btn").forEach((b) =>
    b.addEventListener("click", (e) => {
      const i = +e.target.dataset.i;
      document.getElementById("finalReply").value = d.proposals[i].content;
      document.getElementById("adoptedLabel").value =
        ["A案", "B案", "C案"][i] || "カスタム";
    })
  );

  document.getElementById("actionsArea").innerHTML = (d.next_actions || [])
    .map((a) => `<li>${esc(a)}</li>`)
    .join("");

  document.getElementById("knowledgeArea").innerHTML =
    (d.referencedKnowledge || []).length === 0
      ? "<p>類似ナレッジはまだありません。</p>"
      : d.referencedKnowledge
          .map(
            (k) => `
      <div class="item">
        <h3>${esc(k.summary)} <small>(${esc(k.category)})</small></h3>
        <p>${esc(k.finalReply || "").slice(0, 150)}…</p>
      </div>`
          )
          .join("");

  document.getElementById("result").classList.remove("hidden");
}

document.getElementById("finalizeBtn").addEventListener("click", async () => {
  if (!currentDraft) return;
  const finalReply = document.getElementById("finalReply").value.trim();
  const adoptedLabel = document.getElementById("adoptedLabel").value;
  if (!finalReply) return alert("採用する対応文を入力してください");

  const res = await fetch(`${API_BASE}/api/finalize`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Access-Token": getToken(),
    },
    body: JSON.stringify({
      id: currentDraft.id,
      finalReply,
      adoptedLabel,
      status: "確定",
    }),
  });
  if (res.ok) {
    alert("ナレッジとして保存しました");
    currentDraft = null;
    document.getElementById("result").classList.add("hidden");
    document.getElementById("text").value = "";
  } else {
    alert("保存失敗");
  }
});

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}
