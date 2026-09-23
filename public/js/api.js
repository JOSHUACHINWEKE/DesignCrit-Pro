export async function requestJSON(url, options = {}) {
  const response = await fetch(url, options);
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "Request failed");
  }

  return data;
}

export async function analyzeDesignAPI({
  file,
  designType,
  targetAudience,
  feedbackDepth
}) {
  const formData = new FormData();
  formData.append("design", file);
  formData.append("designType", designType);
  formData.append("targetAudience", targetAudience);
  formData.append("feedbackDepth", feedbackDepth);

  const data = await requestJSON("/api/analysis", {
    method: "POST",
    body: formData
  });

  return data.report;
}
