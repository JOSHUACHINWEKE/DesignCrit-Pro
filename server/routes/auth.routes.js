import express from "express";
import { requireFirebaseAuth } from "../middleware/firebaseAuth.js";
import { getMyProfile, syncUserProfile } from "../controllers/auth.controller.js";

const router = express.Router();
router.use(requireFirebaseAuth);
router.get("/me", getMyProfile);
router.post("/sync", syncUserProfile);
export default router;
