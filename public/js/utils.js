export function escapeHtml(value = "") {
  return String(value).replace(/[&<>'"]/g, c => ({
    "&":"&amp;",
    "<":"&lt;",
    ">":"&gt;",
    "'":"&#39;",
    '"':"&quot;"
  }[c]));
}

export function scoreLabel(score) {
  if (score >= 90) return "Excellent";
  if (score >= 80) return "Very good";
  if (score >= 70) return "Good";
  if (score >= 60) return "Fair";
  if (score >= 50) return "Needs improvement";
  return "Significant problems";
}
