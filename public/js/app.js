import {
  createAccount,
  signInUser,
  signInWithGoogle,
  watchAuthState,
  signOutUser,
  resetPassword,
  syncUserProfile,
  getUserProfile
} from "./firebase-auth.js";

import { analyzeDesignAPI } from "./api.js";
import { escapeHtml } from "./utils.js";


// ==========================================
// GENERAL DESIGN ANALYZER
// ==========================================

const form = document.querySelector("#analysis-form");
const input = document.querySelector("#design");
const zone = document.querySelector("#uploadZone");
const choose = document.querySelector("#chooseFile");
const fileMeta = document.querySelector("#fileMeta");
const status = document.querySelector("#status");
const results = document.querySelector("#results");
const button = document.querySelector("#analyzeButton");


function setStatus(message, type = "") {
  status.textContent = message;
  status.className =
    `status-message ${type}`.trim();
}


function showFile(file) {

  if (!file) {
    fileMeta.classList.add("hidden");
    return;
  }

  fileMeta.textContent =
    `${file.name} · ${(file.size / 1024 / 1024).toFixed(2)} MB`;

  fileMeta.classList.remove("hidden");
}


choose.addEventListener(
  "click",
  (event) => {

    event.stopPropagation();

    input.click();
  }
);


zone.addEventListener(
  "click",
  () => input.click()
);


input.addEventListener(
  "change",
  () => showFile(input.files[0])
);


["dragenter", "dragover"].forEach(
  (eventName) => {

    zone.addEventListener(
      eventName,
      (event) => {

        event.preventDefault();

        zone.classList.add(
          "dragover"
        );
      }
    );
  }
);


["dragleave", "drop"].forEach(
  (eventName) => {

    zone.addEventListener(
      eventName,
      (event) => {

        event.preventDefault();

        zone.classList.remove(
          "dragover"
        );
      }
    );
  }
);


zone.addEventListener(
  "drop",
  (event) => {

    const file =
      event.dataTransfer.files[0];

    if (!file) {
      return;
    }

    if (
      ![
        "image/jpeg",
        "image/png",
        "image/webp"
      ].includes(file.type)
    ) {

      setStatus(
        "Please choose a JPG, PNG or WEBP image.",
        "error"
      );

      return;
    }

    const transfer =
      new DataTransfer();

    transfer.items.add(file);

    input.files =
      transfer.files;

    showFile(file);
  }
);


function scoreCard(
  name,
  score,
  icon
) {

  return `
    <div class="result-card slide-up">

      <div class="score-label">
        ${icon} ${escapeHtml(name)}
      </div>

      <div class="score">
        ${Number(score) || 0}
      </div>

      <div class="score-label">
        out of 100
      </div>

    </div>
  `;
}


function renderReport(report) {

  results.innerHTML = `
    <div class="panel fade-in">

      <div class="section-heading">

        <div>

          <span class="kicker">
            02 / Analysis complete
          </span>

          <h2>
            Your design critique
          </h2>

        </div>

        <span class="step-pill">
          Overall
          ${Number(report.overall_score) || 0}/100
        </span>

      </div>


      <div class="grid">

        ${scoreCard(
          "Colour",
          report.colour?.score,
          "🎨"
        )}

        ${scoreCard(
          "Typography",
          report.typography?.score,
          "Aa"
        )}

        ${scoreCard(
          "Layout",
          report.layout?.score,
          "▦"
        )}

        ${scoreCard(
          "Accessibility",
          report.accessibility?.score,
          "◉"
        )}

      </div>


      <div
        class="result-card"
        style="margin-top:16px"
      >

        <span class="kicker">
          Overall summary
        </span>

        <p>
          ${escapeHtml(
            report.overall_summary ||
            "No summary was returned."
          )}
        </p>

      </div>


      <div
        class="result-card"
        style="margin-top:16px"
      >

        <span class="kicker">
          Key improvements
        </span>

        ${
          (report.issues || [])
            .map(
              (issue) => `

                <div class="issue">

                  <strong>
                    ${escapeHtml(
                      issue.problem ||
                      issue.title ||
                      issue.category ||
                      "Design issue"
                    )}
                  </strong>

                  <p>
                    ${escapeHtml(
                      issue.fix ||
                      issue.why_it_matters ||
                      "Review this area and consider a clearer solution."
                    )}
                  </p>

                </div>

              `
            )
            .join("") ||

          `
            <p class="muted">
              No major issues were returned.
            </p>
          `
        }

      </div>

    </div>
  `;


  results.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
}


form.addEventListener(
  "submit",
  async (event) => {

    event.preventDefault();

    const file =
      input.files[0];


    if (!file) {

      setStatus(
        "Please choose a design first.",
        "error"
      );

      return;
    }


    if (
      file.size >
      8 * 1024 * 1024
    ) {

      setStatus(
        "Please choose an image smaller than 8 MB.",
        "error"
      );

      return;
    }


    button.disabled = true;

    button.innerHTML =
      `Analyzing <span class="inline-loader"></span>`;


    setStatus(
      "Reviewing colour, typography, layout and accessibility..."
    );


    results.innerHTML = `
      <div class="panel loading-card fade-in">

        <div class="loader"></div>

        <h3>
          Analyzing your design
        </h3>

        <p class="muted">
          This can take a few moments.
          Please keep this page open.
        </p>

      </div>
    `;


    try {

      const report =
        await analyzeDesignAPI({

          file,

          designType:
            document
              .querySelector("#designType")
              .value,

          targetAudience:
            document
              .querySelector("#targetAudience")
              .value,

          feedbackDepth:
            document
              .querySelector("#feedbackDepth")
              .value

        });


      renderReport(report);


      setStatus(
        "Analysis complete.",
        "success"
      );

    } catch (error) {

      results.innerHTML = "";


      setStatus(
        error.message ||
        "Analysis failed. Please try again.",
        "error"
      );

    } finally {

      button.disabled = false;

      button.innerHTML =
        `Analyze Design <span>→</span>`;
    }
  }
);


// ==========================================
// WELCOME TOUR
// ==========================================

const welcomeTour =
  document.querySelector(
    "#welcomeTour"
  );

const tourNext =
  document.querySelector(
    "#tourNext"
  );

const tourBack =
  document.querySelector(
    "#tourBack"
  );

const tourSkip =
  document.querySelector(
    "#tourSkip"
  );

const tourTitle =
  document.querySelector(
    "#tourTitle"
  );

const tourDescription =
  document.querySelector(
    "#tourDescription"
  );

const tourStepLabel =
  document.querySelector(
    "#tourStepLabel"
  );

const tourIcon =
  document.querySelector(
    "#tourIcon"
  );

const tourDots =
  document.querySelectorAll(
    ".tour-dot"
  );


const tourSteps = [

  {
    label: "WELCOME",
    icon: "✦",
    title: "Meet DesignCrit Pro",

    description:
      "Your AI-powered design learning companion, built to help beginner designers understand what works and what can be improved."
  },

  {
    label: "SMART FEEDBACK",
    icon: "◈",
    title: "Understand your design",

    description:
      "Upload your work and receive structured feedback on colour, typography, layout and accessibility."
  },

  {
    label: "LEARN & IMPROVE",
    icon: "↗",
    title: "Turn feedback into progress",

    description:
      "Review the recommendations, improve your design and upload the revised version to see how your work develops."
  },

  {
    label: "RESEARCH STUDY",
    icon: "✓",
    title: "Help us study design learning",

    description:
      "DesignCrit Pro is part of a research study exploring how automated feedback can support beginner designers. Your participation helps us evaluate the platform."
  }

];


let currentTourStep = 0;


function renderTourStep() {

  const step =
    tourSteps[currentTourStep];


  welcomeTour.classList.remove(
    "tour-changing"
  );


  void welcomeTour.offsetWidth;


  welcomeTour.classList.add(
    "tour-changing"
  );


  tourStepLabel.textContent =
    step.label;

  tourIcon.textContent =
    step.icon;

  tourTitle.textContent =
    step.title;

  tourDescription.textContent =
    step.description;


  tourDots.forEach(
    (dot, index) => {

      dot.classList.toggle(
        "active",
        index === currentTourStep
      );
    }
  );


  tourBack.classList.toggle(
    "hidden",
    currentTourStep === 0
  );


  if (
    currentTourStep ===
    tourSteps.length - 1
  ) {

    tourNext.textContent =
      "Get Started →";

  } else {

    tourNext.textContent =
      "Next →";
  }
}


function openWelcomeTour() {

  currentTourStep = 0;

  renderTourStep();

  welcomeTour.classList.remove(
    "hidden"
  );

  document.body.classList.add(
    "tour-open"
  );
}


function closeWelcomeTour() {

  welcomeTour.classList.add(
    "hidden"
  );

  document.body.classList.remove(
    "tour-open"
  );
}


tourNext.addEventListener(
  "click",
  () => {

    if (
      currentTourStep <
      tourSteps.length - 1
    ) {

      currentTourStep++;

      renderTourStep();

      return;
    }


    closeWelcomeTour();


    setTimeout(
      () => {

        openAuthModal(
          "signup"
        );

      },
      250
    );
  }
);


tourBack.addEventListener(
  "click",
  () => {

    if (
      currentTourStep > 0
    ) {

      currentTourStep--;

      renderTourStep();
    }
  }
);


tourSkip.addEventListener(
  "click",
  () => {

    closeWelcomeTour();


    setTimeout(
      () => {

        openAuthModal(
          "signup"
        );

      },
      250
    );
  }
);


// ==========================================
// AUTHENTICATION MODAL
// ==========================================

const authModal =
  document.querySelector(
    "#authModal"
  );

const authClose =
  document.querySelector(
    "#authClose"
  );

const signupForm =
  document.querySelector(
    "#signupForm"
  );

const signinForm =
  document.querySelector(
    "#signinForm"
  );

const authTitle =
  document.querySelector(
    "#authTitle"
  );

const authSubtitle =
  document.querySelector(
    "#authSubtitle"
  );

const authSwitchText =
  document.querySelector(
    "#authSwitchText"
  );

const authSwitchButton =
  document.querySelector(
    "#authSwitchButton"
  );

const forgotPassword =
  document.querySelector(
    "#forgotPassword"
  );


let authMode = "signup";


function openAuthModal(
  mode = "signup"
) {

  authMode = mode;

  updateAuthMode();


  authModal.classList.remove(
    "hidden"
  );


  document.body.classList.add(
    "auth-open"
  );
}


function closeAuthModal() {

  authModal.classList.add(
    "hidden"
  );


  document.body.classList.remove(
    "auth-open"
  );
}


function updateAuthMode() {

  const isSignup =
    authMode === "signup";


  signupForm.classList.toggle(
    "hidden",
    !isSignup
  );


  signinForm.classList.toggle(
    "hidden",
    isSignup
  );


  if (isSignup) {

    authTitle.textContent =
      "Create your account";


    authSubtitle.textContent =
      "Create your DesignCrit Pro account to continue.";


    authSwitchText.textContent =
      "Already have an account?";


    authSwitchButton.textContent =
      "Sign in";

  } else {

    authTitle.textContent =
      "Welcome back";


    authSubtitle.textContent =
      "Sign in to continue using DesignCrit Pro.";


    authSwitchText.textContent =
      "Don't have an account?";


    authSwitchButton.textContent =
      "Create account";
  }
}


authSwitchButton.addEventListener(
  "click",
  () => {

    authMode =
      authMode === "signup"
        ? "signin"
        : "signup";


    updateAuthMode();
  }
);


// If the user closes authentication
// before signing in, return them
// to the welcome tour.

authClose.addEventListener(
  "click",
  () => {

    closeAuthModal();


    setTimeout(
      () => {

        openWelcomeTour();

      },
      250
    );
  }
);


// ==========================================
// PASSWORD SHOW / HIDE
// ==========================================

document
  .querySelectorAll(
    ".password-toggle"
  )
  .forEach(
    (passwordButton) => {

      passwordButton.addEventListener(
        "click",
        () => {

          const inputId =
            passwordButton
              .dataset
              .passwordTarget;


          const passwordInput =
            document.getElementById(
              inputId
            );


          const isPassword =
            passwordInput.type ===
            "password";


          passwordInput.type =
            isPassword
              ? "text"
              : "password";


          passwordButton.textContent =
            isPassword
              ? "Hide"
              : "Show";
        }
      );
    }
  );


// ==========================================
// FRIENDLY AUTH ERRORS
// ==========================================

function getFriendlyAuthError(
  error
) {

  switch (error.code) {

    case "auth/email-already-in-use":

      return (
        "An account already exists with this email."
      );


    case "auth/invalid-email":

      return (
        "Please enter a valid email address."
      );


    case "auth/weak-password":

      return (
        "Your password must contain at least 6 characters."
      );


    case "auth/invalid-credential":

      return (
        "The email or password you entered is incorrect."
      );


    case "auth/user-disabled":

      return (
        "This account has been disabled."
      );


    case "auth/too-many-requests":

      return (
        "Too many attempts. Please wait a moment and try again."
      );


    case "auth/network-request-failed":

      return (
        "There seems to be a network problem. Check your connection and try again."
      );


    default:

      return (
        error.message ||
        "Something went wrong. Please try again."
      );
  }
}


// ==========================================
// EMAIL SIGN UP
// ==========================================

signupForm.addEventListener(
  "submit",
  async (event) => {

    event.preventDefault();


    const name =
      document
        .querySelector(
          "#signupName"
        )
        .value
        .trim();


    const email =
      document
        .querySelector(
          "#signupEmail"
        )
        .value
        .trim();


    const password =
      document
        .querySelector(
          "#signupPassword"
        )
        .value;


    const submitButton =
      signupForm.querySelector(
        ".auth-submit"
      );


    const originalText =
      submitButton.textContent;


    try {

      submitButton.disabled =
        true;


      submitButton.textContent =
        "Creating account...";


      const user =
        await createAccount(
          name,
          email,
          password
        );


      console.log(
        "Account created:",
        user.uid
      );

      await syncUserProfile(name);

      submitButton.textContent =
        "Account created ✓";


      setTimeout(
        () => {

          closeAuthModal();

          signupForm.reset();


          submitButton.disabled =
            false;


          submitButton.textContent =
            originalText;

          showPageLoader("Opening the research study...");
          window.location.href = "/research";

        },
        700
      );

    } catch (error) {

      console.error(
        "Signup error:",
        error
      );


      submitButton.disabled =
        false;


      submitButton.textContent =
        originalText;


      alert(
        getFriendlyAuthError(
          error
        )
      );
    }
  }
);


// ==========================================
// EMAIL SIGN IN
// ==========================================

signinForm.addEventListener(
  "submit",
  async (event) => {

    event.preventDefault();


    const email =
      document
        .querySelector(
          "#signinEmail"
        )
        .value
        .trim();


    const password =
      document
        .querySelector(
          "#signinPassword"
        )
        .value;


    const submitButton =
      signinForm.querySelector(
        ".auth-submit"
      );


    const originalText =
      submitButton.textContent;


    try {

      submitButton.disabled =
        true;


      submitButton.textContent =
        "Signing in...";


      const user =
        await signInUser(
          email,
          password
        );


      console.log(
        "Signed in:",
        user.uid
      );

      await syncUserProfile(user.displayName || "");

      submitButton.textContent =
        "Signed in ✓";


      setTimeout(
        () => {

          closeAuthModal();

          signinForm.reset();


          submitButton.disabled =
            false;


          submitButton.textContent =
            originalText;

          showPageLoader("Opening the research study...");
          window.location.href = "/research";

        },
        500
      );

    } catch (error) {

      console.error(
        "Signin error:",
        error
      );


      submitButton.disabled =
        false;


      submitButton.textContent =
        originalText;


      alert(
        getFriendlyAuthError(
          error
        )
      );
    }
  }
);


// ==========================================
// FORGOT PASSWORD
// ==========================================

forgotPassword.addEventListener(
  "click",
  async () => {
    const email = document.querySelector("#signinEmail").value.trim();

    try {
      await resetPassword(email);
      alert("Password reset email sent. Check your inbox and spam folder.");
    } catch (error) {
      alert(getFriendlyAuthError(error));
    }
  }
);


// ==========================================
// GOOGLE AUTHENTICATION
// ==========================================

const googleSignupButton =
  document.querySelector(
    "#googleSignupButton"
  );


const googleSigninButton =
  document.querySelector(
    "#googleSigninButton"
  );


async function handleGoogleAuthentication(
  googleButton
) {

  const originalContent =
    googleButton.innerHTML;


  try {

    googleButton.disabled =
      true;


    googleButton.textContent =
      "Connecting to Google...";


    const user =
      await signInWithGoogle();


    console.log(
      "Google authentication successful:",
      user.uid
    );

    await syncUserProfile(user.displayName || "");

    googleButton.textContent =
      "Connected ✓";


    setTimeout(
      () => {

        closeAuthModal();


        googleButton.disabled =
          false;


        googleButton.innerHTML =
          originalContent;

        showPageLoader("Opening the research study...");
        window.location.href = "/research";

      },
      500
    );

  } catch (error) {

    console.error(
      "Google authentication error:",
      error
    );


    googleButton.disabled =
      false;


    googleButton.innerHTML =
      originalContent;


    if (
      error.code ===
      "auth/popup-closed-by-user"
    ) {

      return;
    }


    if (
      error.code ===
      "auth/popup-blocked"
    ) {

      alert(
        "Your browser blocked the Google sign-in window. Please allow popups and try again."
      );

      return;
    }


    alert(
      getFriendlyAuthError(
        error
      )
    );
  }
}


googleSignupButton.addEventListener(
  "click",
  () => {

    handleGoogleAuthentication(
      googleSignupButton
    );
  }
);


googleSigninButton.addEventListener(
  "click",
  () => {

    handleGoogleAuthentication(
      googleSigninButton
    );
  }
);


// ==========================================
// FIREBASE AUTHENTICATION STATE
// ==========================================

// Firebase now decides whether the
// visitor needs onboarding.
//
// Logged out:
// Tour → Authentication
//
// Logged in:
// Normal landing page

let firstAuthCheck = true;


watchAuthState(
  (user) => {

    if (user) {

      console.log(
        "Authenticated user:",
        user.email
      );


      // User is authenticated.
      // Remove every onboarding overlay.

      welcomeTour.classList.add(
        "hidden"
      );


      authModal.classList.add(
        "hidden"
      );


      document.body.classList.remove(
        "tour-open",
        "auth-open"
      );


      firstAuthCheck = false;

      return;
    }


    console.log(
      "No authenticated user."
    );


    // Only automatically open the tour
    // when Firebase finishes its initial
    // authentication check.
    //
    // This prevents the tour from opening
    // repeatedly during normal auth events.

    if (firstAuthCheck) {

      firstAuthCheck = false;


      setTimeout(
        () => {

          openWelcomeTour();

        },
        650
      );
    }
  }
);


// ==========================================
// TEMPORARY DEVELOPMENT LOGOUT
// ==========================================

// Until we create the Profile / Logout UI,
// you can log out from the browser console:
//
// designCritLogout()

window.designCritLogout =
  async function () {

    try {

      await signOutUser();

      window.location.reload();

    } catch (error) {

      console.error(
        "Logout error:",
        error
      );
    }
  };

// ==========================================
// GLOBAL LOADING SCREEN + NAVIGATION
// ==========================================

const pageLoader = document.querySelector("#pageLoader");

function showPageLoader(message = "Loading...") {
  if (!pageLoader) return;
  const label = pageLoader.querySelector("span");
  if (label) label.textContent = message;
  pageLoader.classList.remove("page-loader-hidden");
}

function hidePageLoader() {
  if (!pageLoader) return;
  pageLoader.classList.add("page-loader-hidden");
}

window.addEventListener("load", () => {
  window.setTimeout(hidePageLoader, 250);
});

document.addEventListener("click", (event) => {
  const link = event.target.closest("a[href]");
  if (!link) return;

  const href = link.getAttribute("href");
  if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:") || link.target === "_blank") {
    return;
  }

  try {
    const destination = new URL(link.href, window.location.href);
    if (destination.origin === window.location.origin && destination.href !== window.location.href) {
      showPageLoader("Loading...");
    }
  } catch (_) {}
});

// ==========================================
// PROFILE
// ==========================================

const profileButton = document.querySelector("#profileButton");
const profileModal = document.querySelector("#profileModal");
const profileClose = document.querySelector("#profileClose");
const profileLogout = document.querySelector("#profileLogout");
const profileName = document.querySelector("#profileName");
const profileEmail = document.querySelector("#profileEmail");
const profileAvatar = document.querySelector("#profileAvatar");
const profileRole = document.querySelector("#profileRole");
const dashboardNavLink = document.querySelector("#dashboardNavLink");

let profileUser = null;

function openProfile() {
  if (!profileUser) {
    openAuthModal("signin");
    return;
  }

  const name = profileUser.displayName || "DesignCrit User";
  profileName.textContent = name;
  profileEmail.textContent = profileUser.email || "Signed in";
  profileAvatar.textContent = name.trim().charAt(0).toUpperCase() || "D";
  profileModal.classList.remove("hidden");
  document.body.classList.add("profile-open");
}

function closeProfile() {
  profileModal.classList.add("hidden");
  document.body.classList.remove("profile-open");
}

profileButton?.addEventListener("click", openProfile);
profileClose?.addEventListener("click", closeProfile);
profileModal?.addEventListener("click", (event) => {
  if (event.target === profileModal) closeProfile();
});

profileLogout?.addEventListener("click", async () => {
  try {
    profileLogout.disabled = true;
    profileLogout.textContent = "Logging out...";
    await signOutUser();
    closeProfile();
    window.location.reload();
  } catch (error) {
    profileLogout.disabled = false;
    profileLogout.textContent = "Log Out";
    alert("Could not log out. Please try again.");
  }
});

watchAuthState(async (user) => {
  profileUser = user || null;

  if (profileButton) {
    profileButton.textContent = user ? (user.displayName?.split(" ")[0] || "Profile") : "Profile";
  }

  dashboardNavLink?.classList.add("hidden");
  profileRole?.classList.add("hidden");

  if (!user) return;

  try {
    const profile = await getUserProfile();
    const isResearcher = profile?.role === "researcher";

    if (isResearcher) {
      dashboardNavLink?.classList.remove("hidden");
    }

    if (profileRole) {
      profileRole.textContent = isResearcher ? "Researcher" : "Participant";
      profileRole.classList.remove("hidden");
    }
  } catch (error) {
    console.error("Profile role error:", error);
  }
});
