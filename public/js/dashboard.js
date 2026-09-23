import { requestJSON } from "./api.js";
import { escapeHtml } from "./utils.js";
import { watchAuthState, signOutUser } from "./firebase-auth.js";

const statsEl = document.querySelector("#stats");
const tbody = document.querySelector("#participantRows");
const pageLoader = document.querySelector("#pageLoader");
const researcherName = document.querySelector("#researcherName");
const logoutButton = document.querySelector("#dashboardLogout");
let currentUser = null;
let dashboardData = null;

function hideLoader() { pageLoader?.classList.add("page-loader-hidden"); }
function showLoader(message = "Loading dashboard...") {
  if (!pageLoader) return;
  const label = pageLoader.querySelector("span");
  if (label) label.textContent = message;
  pageLoader.classList.remove("page-loader-hidden");
}

async function authHeaders() {
  if (!currentUser) throw new Error("You must be signed in.");
  return { Authorization: `Bearer ${await currentUser.getIdToken()}` };
}

function statCard(label, value, delay = 0) {
  return `<div class="stat-card" style="animation-delay:${delay}ms"><small>${escapeHtml(label)}</small><strong>${escapeHtml(value)}</strong></div>`;
}

function renderStats(stats) {
  const cards = [
    ["Research sessions", stats.totalParticipants],
    ["Completed", stats.completedParticipants],
    ["Completion rate", `${stats.completionRate ?? 0}%`],
    ["Abandoned attempts", stats.abandonedParticipants ?? 0],
    ["Participants improved", stats.improvedParticipants],
    ["Improvement rate", `${stats.improvementRate ?? 0}%`],
    ["Average pre-test", stats.averagePreScore],
    ["Average post-test", stats.averagePostScore],
    ["Average improvement", stats.averageImprovement],
    ["Colour gain", stats.colourImprovement],
    ["Typography gain", stats.typographyImprovement],
    ["Layout gain", stats.layoutImprovement],
    ["Accessibility gain", stats.accessibilityImprovement]
  ];
  statsEl.innerHTML = cards.map((c, i) => statCard(c[0], c[1], i * 35)).join("");
}

function renderRows(participants) {
  if (!participants.length) {
    tbody.innerHTML = `<tr><td colspan="11"><div class="empty-state">No research sessions yet.</div></td></tr>`;
    return;
  }
  tbody.innerHTML = participants.map((p) => {
    const gain = p.improvement?.overall;
    const gainClass = gain == null ? "" : Number(gain) >= 0 ? "gain-positive" : "gain-negative";
    return `<tr>
      <td>${escapeHtml(p.participantId || p.id || "-")}</td>
      <td><span class="status-badge">${escapeHtml(p.status || "-")}</span></td>
      <td>${escapeHtml(p.experience || "-")}</td>
      <td>${escapeHtml(p.designType || "-")}</td>
      <td>${p.preTest?.overallScore ?? "-"}</td>
      <td>${p.postTest?.overallScore ?? "-"}</td>
      <td class="${gainClass}">${gain == null ? "-" : `${Number(gain) >= 0 ? "+" : ""}${gain}`}</td>
      <td>${p.improvement?.colour ?? "-"}</td>
      <td>${p.improvement?.typography ?? "-"}</td>
      <td>${p.improvement?.layout ?? "-"}</td>
      <td>${p.improvement?.accessibility ?? "-"}</td>
    </tr>`;
  }).join("");
}

function csvEscape(value) { return `"${String(value ?? "").replaceAll('"', '""')}"`; }

async function loadDashboard() {
  const headers = await authHeaders();
  const profileData = await requestJSON("/api/auth/me", { headers });

  if (profileData.profile?.role !== "researcher") {
    window.location.replace("/?dashboard=denied");
    return null;
  }

  if (researcherName) researcherName.textContent = profileData.profile.name || "Researcher";

  const data = await requestJSON("/api/dashboard/stats", { headers });
  dashboardData = data;
  renderStats(data.stats);
  renderRows(data.participants || []);
  hideLoader();
  return data;
}

watchAuthState(async (user) => {
  if (!user) {
    window.location.replace("/?signin=required");
    return;
  }

  currentUser = user;
  try {
    await loadDashboard();
  } catch (error) {
    console.error("Dashboard error:", error);
    if (/researcher|permission|403/i.test(error.message)) {
      window.location.replace("/?dashboard=denied");
      return;
    }
    statsEl.innerHTML = `<div class="panel"><p class="error">${escapeHtml(error.message)}</p></div>`;
    hideLoader();
  }
});

document.querySelector("#exportCsv")?.addEventListener("click", async () => {
  const data = dashboardData || await loadDashboard();
  if (!data) return;

  const header = [
    "participantId","status","experience","designType","targetAudience",
    "preOverall","postOverall","overallImprovement","colourImprovement",
    "typographyImprovement","layoutImprovement","accessibilityImprovement",
    "clarity","problemIdentification","usefulness","learning","satisfaction",
    "easeOfUse","confidence","feedbackApplied","mostHelpful","improvements"
  ];

  const rows = (data.participants || []).map((p) => [
    p.participantId || p.id, p.status, p.experience, p.designType, p.targetAudience,
    p.preTest?.overallScore, p.postTest?.overallScore, p.improvement?.overall,
    p.improvement?.colour, p.improvement?.typography, p.improvement?.layout,
    p.improvement?.accessibility, p.questionnaire?.clarity,
    p.questionnaire?.problemIdentification, p.questionnaire?.usefulness,
    p.questionnaire?.learning, p.questionnaire?.satisfaction,
    p.questionnaire?.easeOfUse, p.questionnaire?.confidence,
    p.questionnaire?.feedbackApplied, p.questionnaire?.mostHelpful,
    p.questionnaire?.improvements
  ]);

  const csv = [header, ...rows].map((row) => row.map(csvEscape).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = "designcrit-research-data.csv";
  a.click();
  URL.revokeObjectURL(url);
});

logoutButton?.addEventListener("click", async () => {
  showLoader("Signing out...");
  await signOutUser();
  window.location.replace("/");
});
