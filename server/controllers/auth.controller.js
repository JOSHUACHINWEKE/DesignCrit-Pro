import { db, admin, firebaseReady } from "../config/firebase.js";

function assertFirebase() {
  if (!firebaseReady || !db) throw new Error("Firebase is not configured.");
}

export async function syncUserProfile(req, res, next) {
  try {
    assertFirebase();
    const ref = db.collection("users").doc(req.user.uid);
    const snap = await ref.get();

    if (!snap.exists) {
      await ref.set({
        name: req.user.name || req.body?.name || "DesignCrit User",
        email: req.user.email || null,
        role: "participant",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    } else {
      await ref.set({
        name: req.user.name || req.body?.name || snap.data().name || "DesignCrit User",
        email: req.user.email || snap.data().email || null,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
    }

    const updated = await ref.get();
    const data = updated.data();

    res.json({
      success: true,
      profile: {
        uid: req.user.uid,
        name: data.name || req.user.name || "DesignCrit User",
        email: data.email || req.user.email || null,
        role: data.role || "participant"
      }
    });
  } catch (error) {
    next(error);
  }
}

export async function getMyProfile(req, res, next) {
  try {
    assertFirebase();
    const ref = db.collection("users").doc(req.user.uid);
    const snap = await ref.get();

    if (!snap.exists) {
      return syncUserProfile(req, res, next);
    }

    const data = snap.data();
    res.json({
      success: true,
      profile: {
        uid: req.user.uid,
        name: data.name || req.user.name || "DesignCrit User",
        email: data.email || req.user.email || null,
        role: data.role || "participant"
      }
    });
  } catch (error) {
    next(error);
  }
}
