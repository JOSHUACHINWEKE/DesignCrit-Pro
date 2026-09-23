import {
  admin,
  firebaseReady
} from "../config/firebase.js";


// ==========================================
// VERIFY FIREBASE USER
// ==========================================

export async function requireFirebaseAuth(
  req,
  res,
  next
) {

  try {

    if (
      !firebaseReady ||
      !admin.apps.length
    ) {

      return res
        .status(503)
        .json({
          success: false,
          message:
            "Firebase authentication is not configured on the server."
        });
    }


    const authHeader =
      req.headers.authorization;


    if (
      !authHeader ||
      !authHeader.startsWith(
        "Bearer "
      )
    ) {

      return res
        .status(401)
        .json({
          success: false,
          message:
            "You must be signed in to access the research study."
        });
    }


    const idToken =
      authHeader.substring(7);


    const decodedToken =
      await admin
        .auth()
        .verifyIdToken(
          idToken
        );


    req.user = {
      uid:
        decodedToken.uid,

      email:
        decodedToken.email ||
        null,

      name:
        decodedToken.name ||
        null
    };


    next();

  } catch (error) {

    console.error(
      "Firebase authentication error:",
      error.message
    );


    return res
      .status(401)
      .json({
        success: false,
        message:
          "Your login session is invalid or has expired. Please sign in again."
      });
  }
}


// ==========================================
// VERIFY PARTICIPANT OWNERSHIP
// ==========================================

export function requireParticipantOwner(
  getParticipant
) {

  return async function (
    req,
    res,
    next
  ) {

    try {

      const participant =
        await getParticipant(
          req.params.participantId
        );


      if (!participant) {

        return res
          .status(404)
          .json({
            success: false,
            message:
              "Research participant was not found."
          });
      }


      if (
        participant.userId !==
        req.user.uid
      ) {

        return res
          .status(403)
          .json({
            success: false,
            message:
              "You do not have permission to access this research session."
          });
      }


      req.participant =
        participant;


      next();

    } catch (error) {

      next(error);
    }
  };
}