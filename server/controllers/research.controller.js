import {
  createParticipantSession,
  savePreTest,
  savePostTest,
  saveQuestionnaire,
  getParticipant,
  getLatestParticipantByUserId,
  abandonParticipantSession
} from "../services/research.service.js";

import {
  analyzeDesign
} from "../services/ai.service.js";


// ==========================================
// CURRENT USER'S RESEARCH SESSION
// ==========================================

export async function currentResearchSession(
  req,
  res,
  next
) {

  try {

    const participant =
      await getLatestParticipantByUserId(
        req.user.uid
      );


    res.json({
      success: true,
      participant:
        participant || null
    });

  } catch (error) {

    next(error);
  }
}


// ==========================================
// START RESEARCH
// ==========================================

export async function startResearch(
  req,
  res,
  next
) {

  try {

    // A refresh/restart must never restore an unfinished attempt.
    // Mark the previous unfinished attempt as abandoned and create a fresh one.
    const existing = await getLatestParticipantByUserId(req.user.uid);

    if (existing?.status === "completed") {
      return res.status(409).json({
        success: false,
        message: "You have already completed this research study."
      });
    }

    if (existing && existing.status !== "abandoned") {
      await abandonParticipantSession(existing.participantId || existing.id);
    }


    const session =
      await createParticipantSession({
        ...req.body,

        userId:
          req.user.uid,

        userEmail:
          req.user.email
      });


    res
      .status(201)
      .json({
        success: true,
        resumed: false,
        session
      });

  } catch (error) {

    next(error);
  }
}


// ==========================================
// PRE-TEST
// ==========================================

export async function submitPreTest(
  req,
  res,
  next
) {

  try {

    if (!req.file) {

      return res
        .status(400)
        .json({
          success: false,
          message:
            "Please upload your pre-test design."
        });
    }


    const participant =
      req.participant ||
      await getParticipant(
        req.params.participantId
      );


    if (!participant) {

      return res
        .status(404)
        .json({
          success: false,
          message:
            "Participant not found."
        });
    }


    const report =
      await analyzeDesign({

        imageBuffer:
          req.file.buffer,

        mimeType:
          req.file.mimetype,

        designType:
          participant.designType,

        targetAudience:
          participant.targetAudience,

        feedbackDepth:
          "beginner"

      });


    const preTest =
      await savePreTest(
        req.params.participantId,
        report
      );


    res.json({
      success: true,
      preTest
    });

  } catch (error) {

    console.error(
      "Pre-test error:",
      error
    );


    next(error);
  }
}


// ==========================================
// POST-TEST
// ==========================================

export async function submitPostTest(
  req,
  res,
  next
) {

  try {

    if (!req.file) {

      return res
        .status(400)
        .json({
          success: false,
          message:
            "Please upload your post-test design."
        });
    }


    const participant =
      req.participant ||
      await getParticipant(
        req.params.participantId
      );


    if (!participant) {

      return res
        .status(404)
        .json({
          success: false,
          message:
            "Participant not found."
        });
    }


    const report =
      await analyzeDesign({

        imageBuffer:
          req.file.buffer,

        mimeType:
          req.file.mimetype,

        designType:
          participant.designType,

        targetAudience:
          participant.targetAudience,

        feedbackDepth:
          "beginner"

      });


    const result =
      await savePostTest(
        req.params.participantId,
        report
      );


    res.json({
      success: true,
      ...result
    });

  } catch (error) {

    console.error(
      "Post-test error:",
      error
    );


    next(error);
  }
}


// ==========================================
// QUESTIONNAIRE
// ==========================================

export async function submitQuestionnaire(
  req,
  res,
  next
) {

  try {

    await saveQuestionnaire(
      req.params.participantId,
      req.body
    );


    res.json({
      success: true,
      message:
        "Research session completed."
    });

  } catch (error) {

    next(error);
  }
}


// ==========================================
// PARTICIPANT DETAILS
// ==========================================

export async function participantDetails(
  req,
  res,
  next
) {

  try {

    const participant =
      req.participant ||
      await getParticipant(
        req.params.participantId
      );


    if (!participant) {

      return res
        .status(404)
        .json({
          success: false,
          message:
            "Participant not found."
        });
    }


    res.json({
      success: true,
      participant
    });

  } catch (error) {

    next(error);
  }
}