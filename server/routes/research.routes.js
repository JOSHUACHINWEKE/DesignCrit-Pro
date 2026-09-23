import express from "express";

import {
  upload
} from "../middleware/upload.js";

import {
  requireFirebaseAuth,
  requireParticipantOwner
} from "../middleware/firebaseAuth.js";

import {
  startResearch,
  submitPreTest,
  submitPostTest,
  submitQuestionnaire,
  participantDetails
} from "../controllers/research.controller.js";

import {
  getParticipant
} from "../services/research.service.js";


const router =
  express.Router();


// ==========================================
// ALL RESEARCH ROUTES REQUIRE LOGIN
// ==========================================

router.use(
  requireFirebaseAuth
);


// ==========================================
// START NEW RESEARCH SESSION
// ==========================================

router.post(
  "/start",
  startResearch
);


// ==========================================
// PARTICIPANT-SPECIFIC ROUTES
// ==========================================

const participantOwner =
  requireParticipantOwner(
    getParticipant
  );


router.get(
  "/:participantId",
  participantOwner,
  participantDetails
);


router.post(
  "/:participantId/pretest",
  participantOwner,
  upload.single("design"),
  submitPreTest
);


router.post(
  "/:participantId/posttest",
  participantOwner,
  upload.single("design"),
  submitPostTest
);


router.post(
  "/:participantId/questionnaire",
  participantOwner,
  submitQuestionnaire
);


export default router;