import { db } from "../config/firebase.js";
import { requireFirebaseAuth } from "./firebaseAuth.js";

export async function requireResearcher(req, res, next) {
  requireFirebaseAuth(req, res, async () => {
    try {
      const snap = await db.collection("users").doc(req.user.uid).get();
      const profile = snap.exists ? snap.data() : null;

      if (!profile || profile.role !== "researcher") {
        return res.status(403).json({
          success: false,
          message: "Researcher access is required."
        });
      }

      req.userProfile = { id: snap.id, ...profile };
      next();
    } catch (error) {
      next(error);
    }
  });
}
