import {
  db,
  admin,
  firebaseReady
} from "../config/firebase.js";

import {
  calculateOverallScore,
  calculateImprovement
} from "./scoring.service.js";


// ==========================================
// FIREBASE CHECK
// ==========================================

function assertFirebase() {

  if (
    !firebaseReady ||
    !db
  ) {

    throw new Error(
      "Firebase is not configured. Add Firebase Admin credentials to .env."
    );
  }
}


// ==========================================
// CREATE PARTICIPANT SESSION
// ==========================================

export async function createParticipantSession(
  data
) {

  assertFirebase();


  if (data.consent !== true) {

    throw new Error(
      "Participant consent is required before starting the research session."
    );
  }


  if (!data.userId) {

    throw new Error(
      "An authenticated Firebase user is required before starting the research session."
    );
  }


  const participantId =
    `P${Date.now()
      .toString()
      .slice(-8)}`;


  const session = {

    participantId,

    userId:
      data.userId,

    userEmail:
      data.userEmail ||
      null,

    consentGiven:
      true,

    experience:
      data.experience ||
      "not-specified",

    designType:
      data.designType ||
      "general",

    targetAudience:
      data.targetAudience ||
      "general",

    status:
      "started",

    startedAt:
      admin.firestore
        .FieldValue
        .serverTimestamp()

  };


  await db
    .collection(
      "research_sessions"
    )
    .doc(
      participantId
    )
    .set(
      session
    );


  return {
    ...session,

    startedAt:
      new Date().toISOString()
  };
}


// ==========================================
// GET PARTICIPANT BY ID
// ==========================================

export async function getParticipant(
  participantId
) {

  assertFirebase();


  const snap =
    await db
      .collection(
        "research_sessions"
      )
      .doc(
        participantId
      )
      .get();


  if (!snap.exists) {

    return null;
  }


  return {
    id:
      snap.id,

    ...snap.data()
  };
}


// ==========================================
// FIND LATEST SESSION FOR FIREBASE USER
// ==========================================

export async function getLatestParticipantByUserId(
  userId
) {

  assertFirebase();


  if (!userId) {

    return null;
  }


  const snapshot =
    await db
      .collection(
        "research_sessions"
      )
      .where(
        "userId",
        "==",
        userId
      )
      .get();


  if (snapshot.empty) {

    return null;
  }


  const sessions =
    snapshot.docs.map(
      (doc) => {

        const data =
          doc.data();


        return {
          id:
            doc.id,

          ...data
        };
      }
    );


  // Sort here instead of using Firestore orderBy.
  // This avoids requiring an extra Firestore index.

  sessions.sort(
    (a, b) => {

      const aTime =
        a.startedAt?.toMillis?.() ||
        0;

      const bTime =
        b.startedAt?.toMillis?.() ||
        0;


      return bTime - aTime;
    }
  );


  return sessions[0] ||
    null;
}




// ==========================================
// ABANDON AN UNFINISHED SESSION
// ==========================================

export async function abandonParticipantSession(participantId) {
  assertFirebase();
  if (!participantId) return;

  await db.collection("research_sessions").doc(participantId).set({
    status: "abandoned",
    abandonedAt: admin.firestore.FieldValue.serverTimestamp()
  }, { merge: true });
}


// ==========================================
// SAVE PRE-TEST
// ==========================================

export async function savePreTest(
  participantId,
  report
) {

  assertFirebase();


  const preTest = {

    analysis:
      report,

    overallScore:
      calculateOverallScore(
        report
      ),

    completedAt:
      admin.firestore
        .FieldValue
        .serverTimestamp()

  };


  await db
    .collection(
      "research_sessions"
    )
    .doc(
      participantId
    )
    .update({

      preTest,

      status:
        "pretest_complete"

    });


  return {

    ...preTest,

    completedAt:
      new Date().toISOString()
  };
}


// ==========================================
// SAVE POST-TEST
// ==========================================

export async function savePostTest(
  participantId,
  report
) {

  assertFirebase();


  const ref =
    db
      .collection(
        "research_sessions"
      )
      .doc(
        participantId
      );


  const snap =
    await ref.get();


  if (!snap.exists) {

    throw new Error(
      "Research participant was not found."
    );
  }


  const participant =
    snap.data();


  if (
    !participant.preTest?.analysis
  ) {

    throw new Error(
      "Pre-test must be completed first."
    );
  }


  const improvement =
    calculateImprovement(
      participant.preTest.analysis,
      report
    );


  const postTest = {

    analysis:
      report,

    overallScore:
      calculateOverallScore(
        report
      ),

    completedAt:
      admin.firestore
        .FieldValue
        .serverTimestamp()

  };


  await ref.update({

    postTest,

    improvement,

    status:
      "posttest_complete"

  });


  return {

    postTest: {

      ...postTest,

      completedAt:
        new Date().toISOString()

    },

    improvement
  };
}


// ==========================================
// SAVE QUESTIONNAIRE
// ==========================================

export async function saveQuestionnaire(
  participantId,
  questionnaire
) {

  assertFirebase();


  await db
    .collection(
      "research_sessions"
    )
    .doc(
      participantId
    )
    .update({

      questionnaire,

      status:
        "completed",

      completedAt:
        admin.firestore
          .FieldValue
          .serverTimestamp()

    });
}