const API_BASE = "https://claim-agent.gmo-k-watanabe.workers.dev";

const tokenInput = document.getElementById("token");
tokenInput.value = localStorage.getItem("accessToken") || "";
document.getElementById("saveToken").addEventListener("click", () => {
  localStorage.setItem("accessToken", tokenInput.value);
  alert("トークンを保存しました");
});
const getToken = () => tokenInput.value || localStorage.getItem("accessToken") || "";

const textArea = document.getElementById("text");
const piiWarn = document.getElementById("piiWarn");
const analyzeBtn = document.getElementById("analyzeBtn");

textArea.addEventListener("input", () => {
  const hits = detectPIIClient(textArea.value);
  if (hits.length > 0) {
    piiWarn.classList.remove("hidden");
    piiWarn.innerHTML =
      "<strong>⛔ センシティブ情報が検出されました。削除してください：</strong><ul>" +
      hits.map((h) => `<li>${h.type}：${h.samples.map(esc).join(", ")}</li>`).join("") +
      "</ul>";
    analyzeBtn.disabled = true;
  } else if (textArea.value.trim().length > 0) {
    piiWarn.classList.add("hidden");
    analyzeBtn.disabled = false;
  } else {
    piiWarn.classList.add("hidden");
    analyzeBtn.disabled = true;
  }
});

const finalReply = document.getElementById("finalReply");
const finalPiiWarn = document.getElementById("finalPiiWarn");
finalReply.addEventListener("input", () => {
  const hits = detectPIIClient(finalReply.value);
  if (hits.length > 0) {
    finalPiiWarn.classList.remove("hidden");
    finalPiiWarn.innerHTML =
      "<strong>⛔ センシティブ情報を含むため保存できません：</strong> " +
      hits.map((h) => h.type).join(", ");
  } else {
    finalPiiWarn.classList.add("hidden");
  }
});

let currentDraft = null;

analyzeBtn.addEventListener("click", async () => {
  const text = textArea.value.trim();
  if (!text) return;

  const required = ["productCategory", "channel", "tenure", "claimCount", "currentAmount", "totalAmount"];
  for (const id of required) {
    if (!document.getElementById(id).value) {
      return alert("すべての属性を選択してください");
    }
  }

  const payload = {
    text,
    productCategory: document.getElementById("productCategory").value,
    channel: document.getElementById("channel").value,
    tenure: document.getElementById("tenure").value,
    claimCount: document.getElementById("claimCount").value,
    currentAmount: document.getElementById("currentAmount").value,
    totalAmount: document.getElementById("totalAmount").value,
  };

  analyzeBtn.disabled = true;
  document.getElementById("loading").classList.remove("hidden");

  try {
    const res = await fetch(`${API_BASE}/api/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Access-Token": getToken() },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      if (data.detected) {
        alert("サーバ側検査でセンシティブ情報が検出されました：" + data.detected.join(", "));
      } else {
        alert("分析失敗: " + data.error);
      }
      return;
    }
    currentDraft = data;
    renderResult(data);
  } catch (e) {
    alert("通信エラー: " + e.message);
  } finally {
    analyzeBtn.disabled = false;
    document.getElementById("loading").classList.add("hidden");
  }
});

function renderResult(d) {
  const a = d.analysis;
  document.getElementById("analysisArea").innerHTML = `
    <p>
      <span class="tag tag-claim">${esc(a.claim_category)}</span>
      <span class="tag ${a.severity}">重要度:${a.severity}</span>
      <span class="tag ${a.urgency}">緊急度:${a.urgency}</span>
      <span class="tag ${a.sentiment}">${esc(a.sentiment)}</span>
      <span class="tag">顧客価値:${esc(a.customer_value_tier)}</span>
      <span class="tag ${a.churn_risk}">解約リスク:${a.churn_risk}</span>
      ${a.escalation_needed ? '<span class="tag 高">要エスカレーション</span>' : ""}
    </p>
    <p><strong>要約:</strong> ${esc(a.summary)}</p>
    <p><strong>根本原因仮説:</strong> ${esc(a.root_cause_hypothesis)}</p>
    <p><strong>キーワード:</strong> ${(a.keywords || []).map(esc).join(", ")}</p>
    <p><strong>初動トーク:</strong> ${esc(d.talk_script || "")}</p>
  `;

  document.getElementById("proposalsArea").innerHTML = (d.proposals || [])
    .map((p, i) => `
      <div class="proposal">
        <h4><span class="tag tag-type">${esc(p.response_type)}</span>
          <button class="copy-btn" data-i="${i}">この型を採用</button>
        </h4>
        <div>${esc(p.content).replace(/\n/g, "<br>")}</div>
        <div class="pc">
          <div class="pros"><strong>メリット:</strong> ${esc(p.pros || "")}</div>
          <div class="cons"><strong>デメリット:</strong> ${esc(p.cons || "")}</div>
        </div>
      </div>`).join("");

  document.querySelectorAll(".copy-btn").forEach((b) =>
    b.addEventListener("click", (e) => {
      const i = +e.target.dataset.i;
      finalReply.value = d.proposals[i].content;
      finalReply.dispatchEvent(new Event("input"));
      document.getElementById("adoptedLabel").value = d.proposals[i].response_type;
    })
  );

  document.getElementById("actionsArea").innerHTML = (d.next_actions || [])
    .map((a) => `<li>${esc(a)}</li>`).join("");

  document.getElementById("knowledgeArea").innerHTML =
    (d.referencedKnowledge || []).length === 0
      ? "<p>類似ナレッジはまだありません。</p>"
      : d.referencedKnowledge.map((k) => `
          <div class="item">
            <h3>${esc(k.summary || "")} 
              <small>(${esc(k.claim_category || "")} / ${esc(k.productCategory || "")} / 採用型:${esc(k.adoptedLabel || "-")})</small>
            </h3>
            <p>${esc((k.finalReply || "").slice(0, 150))}…</p>
          </div>`).join("");

  document.getElementById("result").classList.remove("hidden");
}

document.getElementById("finalizeBtn").addEventListener("click", async () => {
  if (!currentDraft) return;
  const reply = finalReply.value.trim();
  if (!reply) return alert("採用文を入力してください");

  const hits = detectPIIClient(reply);
  if (hits.length > 0) {
    return alert("採用文にセンシティブ情報が含まれています：" + hits.map((h) => h.type).join(", "));
  }

  const res = await fetch(`${API_BASE}/api/finalize`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Access-Token": getToken() },
    body: JSON.stringify({
      id: currentDraft.id,
      finalReply: reply,
      adoptedLabel: document.getElementById("adoptedLabel").value,
      status: "確定",
    }),
  });
  const d = await res.json();
  if (res.ok) {
    alert("ナレッジとして保存しました");
    currentDraft = null;
    document.getElementById("result").classList.add("hidden");
    textArea.value = "";
    analyzeBtn.disabled = true;
  } else {
    alert("保存失敗: " + (d.error || ""));
  }
});

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}
