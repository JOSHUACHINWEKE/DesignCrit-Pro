import {
  requestJSON
} from "./api.js";

import {
  escapeHtml
} from "./utils.js";

import {
  watchAuthState
} from "./firebase-auth.js";


// ==========================================
// PAGE ELEMENTS
// ==========================================

const stages = [
  ...document.querySelectorAll(".stage")
];

const progressItems = [
  ...document.querySelectorAll(".progress span")
];

const participantBadge =
  document.querySelector("#participant-badge");

const participantForm =
  document.querySelector("#participant-form");

const feedbackReviewArea =
  document.querySelector("#feedback-review-area");

const feedbackReviewed =
  document.querySelector("#feedback-reviewed");

const toPostButton =
  document.querySelector("#to-post");

const toSurveyButton =
  document.querySelector("#to-survey");

const preResults =
  document.querySelector("#pre-results");

const postResults =
  document.querySelector("#post-results");

const comparison =
  document.querySelector("#comparison");


let participantId = null;
let currentUser = null;


// ==========================================
// PAGE LOADER
// ==========================================

const pageLoader =
  document.querySelector("#pageLoader");


function showPageLoader(
  message = "Loading..."
) {

  if (!pageLoader) return;

  const label =
    pageLoader.querySelector("span");

  if (label) {
    label.textContent = message;
  }

  pageLoader.classList.remove(
    "page-loader-hidden"
  );
}


function hidePageLoader() {

  if (!pageLoader) return;

  pageLoader.classList.add(
    "page-loader-hidden"
  );
}


// ==========================================
// AUTH TOKEN
// ==========================================

async function getAuthHeaders() {

  if (!currentUser) {

    throw new Error(
      "You must be signed in to participate in the research study."
    );
  }

  const token =
    await currentUser.getIdToken();

  return {
    Authorization: `Bearer ${token}`
  };
}


// ==========================================
// STAGE MANAGEMENT
// ==========================================

function showStage(
  index,
  scroll = true
) {

  stages.forEach(
    (stage, i) => {

      stage.classList.toggle(
        "active",
        i === index
      );
    }
  );


  progressItems.forEach(
    (item, i) => {

      item.classList.toggle(
        "active",
        i === index
      );
    }
  );


  if (scroll) {

    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  }
}


// ==========================================
// PARTICIPANT ID
// ==========================================

function setParticipant(id) {

  participantId = id;


  if (!id) {

    sessionStorage.removeItem(
      "participantId"
    );

    if (participantBadge) {

      participantBadge.textContent =
        "No participant yet";
    }

    return;
  }


  sessionStorage.setItem(
    "participantId",
    id
  );


  if (participantBadge) {

    participantBadge.textContent =
      `Participant ${id}`;
  }
}


// ==========================================
// REPORT MARKUP
// ==========================================

function reportMarkup(
  report,
  title = "Automated feedback"
) {

  if (!report) {
    return "";
  }


  const categories = [

    [
      "Colour",
      report.colour,
      "🎨"
    ],

    [
      "Typography",
      report.typography,
      "Aa"
    ],

    [
      "Layout",
      report.layout,
      "▦"
    ],

    [
      "Accessibility",
      report.accessibility,
      "◉"
    ]

  ];


  return `
    <div class="fade-in">

      <div class="section-heading">

        <div>

          <span class="kicker">
            AI review
          </span>

          <h2>
            ${escapeHtml(title)}
          </h2>

        </div>

        <span class="step-pill">
          Overall
          ${Number(
            report.overall_score
          ) || 0}/100
        </span>

      </div>


      <div class="grid">

        ${categories
          .map(
            ([name, item, icon]) => `

              <div class="result-card slide-up">

                <div class="score-label">
                  ${icon}
                  ${escapeHtml(name)}
                </div>

                <div class="score">
                  ${Number(
                    item?.score
                  ) || 0}
                </div>

                <p class="muted">
                  ${escapeHtml(
                    item?.summary ||
                    "Feedback available below."
                  )}
                </p>

              </div>

            `
          )
          .join("")}

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
            ""
          )}
        </p>

      </div>


      <div
        class="result-card"
        style="margin-top:16px"
      >

        <span class="kicker">
          Key issues and fixes
        </span>

        ${
          (report.issues || [])
            .map(
              (item) => `

                <div class="issue">

                  <strong>
                    ${escapeHtml(
                      item.problem ||
                      item.title ||
                      item.category ||
                      "Design issue"
                    )}
                  </strong>

                  <p>
                    ${escapeHtml(
                      item.why_it_matters ||
                      ""
                    )}
                  </p>

                  <p>
                    <strong>
                      Fix:
                    </strong>

                    ${escapeHtml(
                      item.fix ||
                      ""
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
}


// ==========================================
// COMPARISON MARKUP
// ==========================================

function renderComparison(
  improvement
) {

  if (!comparison) return;


  if (!improvement) {

    comparison.innerHTML = "";

    return;
  }


  const items = [

    [
      "Colour",
      improvement.colour
    ],

    [
      "Typography",
      improvement.typography
    ],

    [
      "Layout",
      improvement.layout
    ],

    [
      "Accessibility",
      improvement.accessibility
    ],

    [
      "Overall",
      improvement.overall
    ]

  ];


  comparison.innerHTML =
    items
      .map(
        ([name, value]) => {

          const numericValue =
            Number(value) || 0;


          return `

            <div class="result-card comparison-card slide-up">

              <div class="muted">
                ${escapeHtml(name)}
              </div>

              <div class="delta">
                ${
                  numericValue >= 0
                    ? "+"
                    : ""
                }

                ${numericValue}
              </div>

              <div class="bar">

                <span
                  style="
                    width:
                    ${Math.min(
                      100,
                      Math.max(
                        0,
                        50 +
                        numericValue * 5
                      )
                    )}%
                  "
                ></span>

              </div>

            </div>

          `;
        }
      )
      .join("");
}


// ==========================================
// RESET RESEARCH PAGE
// ==========================================

function resetResearchPage() {

  // Forget participant from this browser session.

  setParticipant(null);


  // Clear previous AI results.

  if (preResults) {

    preResults.innerHTML = "";
  }


  if (postResults) {

    postResults.innerHTML = "";
  }


  if (comparison) {

    comparison.innerHTML = "";
  }


  // Hide feedback review section.

  if (feedbackReviewArea) {

    feedbackReviewArea
      .classList
      .add("hidden");
  }


  if (feedbackReviewed) {

    feedbackReviewed.checked =
      false;
  }


  if (toPostButton) {

    toPostButton.disabled =
      true;
  }


  if (toSurveyButton) {

    toSurveyButton
      .classList
      .add("hidden");
  }


  // Reset file inputs.

  const preDesign =
    document.querySelector(
      "#preDesign"
    );

  const postDesign =
    document.querySelector(
      "#postDesign"
    );


  if (preDesign) {
    preDesign.value = "";
  }


  if (postDesign) {
    postDesign.value = "";
  }


  // Always return to:
  // Research Information + Consent.

  showStage(
    0,
    false
  );
}


// ==========================================
// FIREBASE AUTHENTICATION CHECK
// ==========================================

watchAuthState(
  async (user) => {

    // ----------------------------------------
    // NOT LOGGED IN
    // ----------------------------------------

    if (!user) {

      sessionStorage.removeItem(
        "participantId"
      );


      window.location.replace(
        "/"
      );

      return;
    }


    // ----------------------------------------
    // LOGGED IN
    // ----------------------------------------

    currentUser =
      user;


    console.log(
      "Research user:",
      user.email,
      user.uid
    );


    // ========================================
    // IMPORTANT
    // ========================================
    //
    // DO NOT restore research progress.
    //
    // Every time /research is opened or
    // refreshed, start from the beginning.
    //
    // ========================================

    resetResearchPage();


    hidePageLoader();
  }
);


// ==========================================
// DESIGN UPLOAD
// ==========================================

async function uploadStage(
  endpoint,
  inputId,
  button,
  outputId
) {

  if (!currentUser) {

    throw new Error(
      "Your login session has expired. Please sign in again."
    );
  }


  if (!participantId) {

    throw new Error(
      "No active research participant was found."
    );
  }


  const file =
    document.querySelector(
      inputId
    ).files[0];


  if (!file) {

    throw new Error(
      "Please choose an image first."
    );
  }


  if (
    file.size >
    8 * 1024 * 1024
  ) {

    throw new Error(
      "Please choose an image smaller than 8 MB."
    );
  }


  const formData =
    new FormData();


  formData.append(
    "design",
    file
  );


  const authHeaders =
    await getAuthHeaders();


  button.disabled =
    true;


  button.textContent =
    "Analyzing...";


  document.querySelector(
    outputId
  ).innerHTML = `

    <div class="result-card loading-card">

      <div class="loader"></div>

      <h3>
        Analyzing your design
      </h3>

      <p class="muted">
        Please keep this page open while
        the AI reviews it.
      </p>

    </div>
  `;


  try {

    const data =
      await requestJSON(
        endpoint,
        {
          method:
            "POST",

          headers:
            authHeaders,

          body:
            formData
        }
      );


    const report =
      data.preTest?.analysis ||
      data.postTest?.analysis;


    if (!report) {

      throw new Error(
        "The analysis response was incomplete."
      );
    }


    document.querySelector(
      outputId
    ).innerHTML =
      reportMarkup(
        report
      );


    return data;

  } finally {

    button.disabled =
      false;


    button.textContent =
      button.dataset.label;
  }
}


// ==========================================
// START RESEARCH
// ==========================================

participantForm.addEventListener(
  "submit",
  async (event) => {

    event.preventDefault();


    if (!currentUser) {

      window.location.href =
        "/";

      return;
    }


    const consent =
      document.querySelector(
        "#consent"
      ).checked;


    if (!consent) {

      alert(
        "Please confirm your consent before starting the study."
      );

      return;
    }


    const submitButton =
      participantForm.querySelector(
        'button[type="submit"]'
      );


    const originalText =
      submitButton.textContent;


    try {

      submitButton.disabled =
        true;


      submitButton.textContent =
        "Starting study...";


      const authHeaders =
        await getAuthHeaders();


      const data =
        await requestJSON(
          "/api/research/start",
          {
            method:
              "POST",

            headers: {

              "Content-Type":
                "application/json",

              ...authHeaders

            },

            body:
              JSON.stringify({

                consent:
                  true,

                experience:
                  document
                    .querySelector(
                      "#experience"
                    )
                    .value,

                designType:
                  document
                    .querySelector(
                      "#researchDesignType"
                    )
                    .value,

                targetAudience:
                  document
                    .querySelector(
                      "#researchAudience"
                    )
                    .value

              })
          }
        );


      // --------------------------------------
      // IMPORTANT
      // --------------------------------------
      // We are NOT restoring a saved session.
      //
      // This is a newly started/current
      // research session.
      // --------------------------------------

      const session =
        data.session;


      const newParticipantId =
        session?.participantId ||
        session?.id;


      if (!newParticipantId) {

        throw new Error(
          "The research session could not be started."
        );
      }


      setParticipant(
        newParticipantId
      );


      // Move directly to Pre-Test.

      showStage(1);


    } catch (error) {

      alert(
        error.message
      );

    } finally {

      submitButton.disabled =
        false;


      submitButton.textContent =
        originalText;
    }
  }
);


// ==========================================
// PRE-TEST
// ==========================================

const preBtn =
  document.querySelector(
    "#pre-submit"
  );


preBtn.addEventListener(
  "click",
  async () => {

    try {

      const data =
        await uploadStage(

          `/api/research/${participantId}/pretest`,

          "#preDesign",

          preBtn,

          "#pre-results"
        );


      feedbackReviewArea
        .classList
        .remove("hidden");


      feedbackReviewed.checked =
        false;


      toPostButton.disabled =
        true;


      if (
        data.preTest?.analysis
      ) {

        preResults.innerHTML =
          reportMarkup(
            data.preTest.analysis,
            "Your Pre-Test Feedback"
          );
      }

    } catch (error) {

      alert(
        error.message
      );
    }
  }
);


// ==========================================
// FEEDBACK REVIEW
// ==========================================

feedbackReviewed.addEventListener(
  "change",
  (event) => {

    toPostButton.disabled =
      !event.target.checked;
  }
);


toPostButton.addEventListener(
  "click",
  () => {

    showStage(2);
  }
);


// ==========================================
// POST-TEST
// ==========================================

const postBtn =
  document.querySelector(
    "#post-submit"
  );


postBtn.addEventListener(
  "click",
  async () => {

    try {

      const data =
        await uploadStage(

          `/api/research/${participantId}/posttest`,

          "#postDesign",

          postBtn,

          "#post-results"
        );


      if (
        data.postTest?.analysis
      ) {

        postResults.innerHTML =
          reportMarkup(
            data.postTest.analysis,
            "Your Revised Design"
          );
      }


      renderComparison(
        data.improvement
      );


      toSurveyButton
        .classList
        .remove("hidden");

    } catch (error) {

      alert(
        error.message
      );
    }
  }
);


// ==========================================
// QUESTIONNAIRE BUTTON
// ==========================================

toSurveyButton.addEventListener(
  "click",
  () => {

    showStage(3);
  }
);


// ==========================================
// QUESTIONNAIRE
// ==========================================

document
  .querySelector(
    "#questionnaire-form"
  )
  .addEventListener(
    "submit",
    async (event) => {

      event.preventDefault();


      if (!currentUser) {

        window.location.href =
          "/";

        return;
      }


      if (!participantId) {

        alert(
          "No active research session was found."
        );

        return;
      }


      const formData =
        new FormData(
          event.currentTarget
        );


      const payload = {

        clarity:
          Number(
            formData.get(
              "clarity"
            )
          ),

        problemIdentification:
          Number(
            formData.get(
              "problemIdentification"
            )
          ),

        usefulness:
          Number(
            formData.get(
              "usefulness"
            )
          ),

        learning:
          Number(
            formData.get(
              "learning"
            )
          ),

        satisfaction:
          Number(
            formData.get(
              "satisfaction"
            )
          ),

        easeOfUse:
          Number(
            formData.get(
              "easeOfUse"
            )
          ),

        confidence:
          Number(
            formData.get(
              "confidence"
            )
          ),

        feedbackApplied:
          Number(
            formData.get(
              "feedbackApplied"
            )
          ),

        mostHelpful:
          formData.get(
            "mostHelpful"
          ),

        improvements:
          formData.get(
            "improvements"
          )

      };


      const submitButton =
        event.currentTarget
          .querySelector(
            'button[type="submit"]'
          );


      const originalText =
        submitButton.textContent;


      try {

        submitButton.disabled =
          true;


        submitButton.textContent =
          "Saving responses...";


        const authHeaders =
          await getAuthHeaders();


        await requestJSON(

          `/api/research/${participantId}/questionnaire`,

          {
            method:
              "POST",

            headers: {

              "Content-Type":
                "application/json",

              ...authHeaders

            },

            body:
              JSON.stringify(
                payload
              )
          }
        );


        sessionStorage.removeItem(
          "participantId"
        );


        // Study Complete screen.
        showStage(4);


      } catch (error) {

        alert(
          error.message
        );

      } finally {

        submitButton.disabled =
          false;


        submitButton.textContent =
          originalText;
      }
    }
  );


// ==========================================
// RESEARCH BACK BUTTONS
// ==========================================

document
  .querySelectorAll(
    "[data-back-stage]"
  )
  .forEach(
    (backButton) => {

      backButton.addEventListener(
        "click",
        () => {

          const target =
            Number(
              backButton.dataset.backStage
            );


          if (
            Number.isInteger(target) &&
            target >= 0
          ) {

            showStage(
              target
            );
          }
        }
      );
    }
  );


// ==========================================
// INTERNAL LINK LOADING SCREEN
// ==========================================

document.addEventListener(
  "click",
  (event) => {

    const link =
      event.target.closest(
        "a[href]"
      );


    if (!link) return;


    const href =
      link.getAttribute(
        "href"
      );


    if (
      !href ||
      href.startsWith("#") ||
      link.target === "_blank"
    ) {

      return;
    }


    try {

      const destination =
        new URL(
          link.href,
          window.location.href
        );


      if (
        destination.origin ===
          window.location.origin &&

        destination.href !==
          window.location.href
      ) {

        showPageLoader(
          "Loading..."
        );
      }

    } catch (_) {

      // Ignore invalid URLs.

    }
  }
);