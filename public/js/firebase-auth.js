import { initializeApp } from
  "https://www.gstatic.com/firebasejs/12.3.0/firebase-app.js";

import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  sendPasswordResetEmail
} from
  "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";

// ==========================================
// FIREBASE CONFIGURATION
// ==========================================

const firebaseConfig = {
  apiKey: "AIzaSyDpHnOkRXCQzLO6Ms0IFcaTKECMSRuXlb8",
  authDomain: "designcrit-pro-research.firebaseapp.com",
  projectId: "designcrit-pro-research",
  storageBucket: "designcrit-pro-research.firebasestorage.app",
  messagingSenderId: "150674511598",
  appId: "1:150674511598:web:3b24c6d3061942587285ff"
};


// ==========================================
// INITIALIZE FIREBASE
// ==========================================

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);


// ==========================================
// CREATE ACCOUNT
// ==========================================

export async function createAccount(
  name,
  email,
  password
) {

  const credential =
    await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );

  await updateProfile(
    credential.user,
    {
      displayName: name
    }
  );

  return credential.user;
}


// ==========================================
// SIGN IN
// ==========================================

export async function signInUser(
  email,
  password
) {

  const credential =
    await signInWithEmailAndPassword(
      auth,
      email,
      password
    );

  return credential.user;
}


// ==========================================
// AUTH STATE
// ==========================================

export function watchAuthState(callback) {

  return onAuthStateChanged(
    auth,
    callback
  );
}

// ==========================================
// GOOGLE SIGN IN
// ==========================================

const googleProvider = new GoogleAuthProvider();

googleProvider.setCustomParameters({
  prompt: "select_account"
});

export async function signInWithGoogle() {

  const credential =
    await signInWithPopup(
      auth,
      googleProvider
    );

  return credential.user;
}


// ==========================================
// PASSWORD RESET
// ==========================================

export async function resetPassword(email) {
  if (!email) {
    throw new Error("Enter your email address first, then choose Forgot password.");
  }

  await sendPasswordResetEmail(auth, email);
}

// ==========================================
// SIGN OUT
// ==========================================

export async function signOutUser() {

  await signOut(auth);

}


// ==========================================
// DESIGNCRIT USER PROFILE / ROLE
// ==========================================

async function profileRequest(path, options = {}) {
  const user = auth.currentUser;
  if (!user) throw new Error("You must be signed in.");

  const token = await user.getIdToken();
  const response = await fetch(path, {
    ...options,
    headers: {
      ...(options.headers || {}),
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    }
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || "Could not load your account profile.");
  return data.profile;
}

export async function syncUserProfile(name = "") {
  return profileRequest("/api/auth/sync", {
    method: "POST",
    body: JSON.stringify({ name })
  });
}

export async function getUserProfile() {
  return profileRequest("/api/auth/me");
}
