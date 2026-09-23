import { db, firebaseReady } from "../config/firebase.js";

function average(values) {
  const clean = values.map(Number).filter(Number.isFinite);
  if (!clean.length) return 0;
  return Number((clean.reduce((sum, value) => sum + value, 0) / clean.length).toFixed(2));
}

function percentage(value, total) {
  if (!total) return 0;
  return Number(((value / total) * 100).toFixed(1));
}

function safeParticipant(doc) {
  const p = doc.data();
  return {
    id: doc.id,
    participantId: p.participantId || doc.id,
    status: p.status || "started",
    experience: p.experience || "not-specified",
    designType: p.designType || "general",
    targetAudience: p.targetAudience || "general",
    preTest: p.preTest || null,
    postTest: p.postTest || null,
    improvement: p.improvement || null,
    questionnaire: p.questionnaire || null
  };
}

export async function getDashboardStats(req, res, next) {
  try {
    if (!firebaseReady || !db) throw new Error("Firebase is not configured.");

    const snapshot = await db.collection("research_sessions").get();
    const allSessions = snapshot.docs.map(safeParticipant);
    const abandoned = allSessions.filter((p) => p.status === "abandoned");
    const participants = allSessions.filter((p) => p.status !== "abandoned");
    const completed = participants.filter((p) => p.status === "completed");
    const valid = completed.filter((p) => p.preTest && p.postTest && p.improvement);
    const improvedParticipants = valid.filter((p) => Number(p.improvement?.overall) > 0).length;
    const questionnaireParticipants = completed.filter((p) => p.questionnaire);

    const questionnaire = {
      clarity: average(questionnaireParticipants.map((p) => p.questionnaire?.clarity)),
      problemIdentification: average(questionnaireParticipants.map((p) => p.questionnaire?.problemIdentification)),
      usefulness: average(questionnaireParticipants.map((p) => p.questionnaire?.usefulness)),
      learning: average(questionnaireParticipants.map((p) => p.questionnaire?.learning)),
      satisfaction: average(questionnaireParticipants.map((p) => p.questionnaire?.satisfaction)),
      easeOfUse: average(questionnaireParticipants.map((p) => p.questionnaire?.easeOfUse)),
      confidence: average(questionnaireParticipants.map((p) => p.questionnaire?.confidence)),
      feedbackApplied: average(questionnaireParticipants.map((p) => p.questionnaire?.feedbackApplied))
    };

    res.json({
      success: true,
      stats: {
        totalParticipants: participants.length,
        abandonedParticipants: abandoned.length,
        completedParticipants: completed.length,
        validParticipants: valid.length,
        completionRate: percentage(completed.length, participants.length),
        improvedParticipants,
        improvementRate: percentage(improvedParticipants, valid.length),
        averagePreScore: average(valid.map((p) => p.preTest?.overallScore)),
        averagePostScore: average(valid.map((p) => p.postTest?.overallScore)),
        averageImprovement: average(valid.map((p) => p.improvement?.overall)),
        colourImprovement: average(valid.map((p) => p.improvement?.colour)),
        typographyImprovement: average(valid.map((p) => p.improvement?.typography)),
        layoutImprovement: average(valid.map((p) => p.improvement?.layout)),
        accessibilityImprovement: average(valid.map((p) => p.improvement?.accessibility)),
        questionnaire
      },
      participants
    });
  } catch (error) {
    next(error);
  }
}
