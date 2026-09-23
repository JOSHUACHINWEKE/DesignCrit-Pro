import express from "express";
import { analyzeDesignController } from "../controllers/analysis.controller.js";
import { upload } from "../middleware/upload.js";
import { analysisRateLimit } from "../middleware/rateLimit.js";
const router = express.Router();
router.post("/", analysisRateLimit({ windowMs: 60_000, max: 8 }), upload.single("design"), analyzeDesignController);
export default router;
