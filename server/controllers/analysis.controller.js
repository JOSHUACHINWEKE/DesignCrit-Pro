import { analyzeDesign } from "../services/ai.service.js";
import { queueAnalysis } from "../middleware/analysisQueue.js";

export async function analyzeDesignController(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "Please upload a design image." });
    }
    const report = await queueAnalysis(() => analyzeDesign({
      imageBuffer: req.file.buffer,
      mimeType: req.file.mimetype,
      designType: req.body.designType || "general",
      targetAudience: req.body.targetAudience || "general",
      feedbackDepth: req.body.feedbackDepth || "beginner"
    }));
    return res.json({ success: true, report });
  } catch (error) {
    console.error("Design analysis error:", error);
    next(error);
  }
}
