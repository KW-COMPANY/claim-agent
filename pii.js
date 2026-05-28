const PII_RULES = [
  { type: "電話番号", re: /(0\d{1,4}-?\d{1,4}-?\d{3,4}|0[789]0-?\d{4}-?\d{4}|0120-?\d{2,3}-?\d{3,4})/g },
  { type: "メールアドレス", re: /[\w.+-]+@[\w-]+\.[\w.-]+/g },
  { type: "URL", re: /https?:\/\/[^\s]+/g },
  { type: "法人格表記", re: /(株式会社|（株）|\(株\)|有限会社|合同会社|Co\.,?\s?Ltd\.?|Inc\.|Corp\.)/g },
  { type: "氏名・敬称", re: /[一-龥々ァ-ヴA-Za-z]{2,10}(様|さん|氏|部長|課長|社長|取締役|マネージャー|主任|係長)/g },
  { type: "マイナンバー風12桁", re: /\b\d{12}\b/g },
  { type: "カード番号風", re: /\b\d{13,16}\b/g },
];

function detectPIIClient(text) {
  const hits = [];
  for (const r of PII_RULES) {
    const m = text.match(r.re);
    if (m) hits.push({ type: r.type, samples: [...new Set(m)].slice(0, 3) });
  }
  return hits;
}

window.detectPIIClient = detectPIIClient;
