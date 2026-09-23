import express from "express";
import { getDashboardStats } from "../controllers/dashboard.controller.js";
import { requireResearcher } from "../middleware/dashboardAuth.js";

const router = express.Router();
router.get("/stats", requireResearcher, getDashboardStats);
export default router;
