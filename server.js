import express from "express";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import analysisRoutes from "./server/routes/analysis.routes.js";
import researchRoutes from "./server/routes/research.routes.js";
import dashboardRoutes from "./server/routes/dashboard.routes.js";
import authRoutes from "./server/routes/auth.routes.js";
import errorHandler from "./server/middleware/errorHandler.js";

dotenv.config();

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.set("trust proxy", 1);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Local development static files. On Vercel, public files are served by the CDN.
app.use(express.static(path.join(__dirname, "public")));

app.use("/api/analysis", analysisRoutes);
app.use("/api/research", researchRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/auth", authRoutes);

app.get("/api/health", (req, res) => {
  res.json({ success: true, message: "DesignCrit Pro API is running" });
});

// These routes keep localhost behavior identical. Vercel also maps them in vercel.json.
app.get("/research", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "research.html"));
});

app.get("/dashboard", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "dashboard.html"));
});

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.use(errorHandler);

// Vercel imports the Express app as a serverless function.
// Locally we still start a normal HTTP server.
if (!process.env.VERCEL) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`DesignCrit Pro running on http://localhost:${PORT}`);
  });
}

export default app;
