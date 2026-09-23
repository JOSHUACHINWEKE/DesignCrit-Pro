import { GoogleGenAI } from "@google/genai";
import { buildDesignCritPrompt } from "../prompts/designCritPrompt.js";
import { calculateOverallScore } from "./scoring.service.js";

const GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function errorStatus(error) {
  return Number(
    error?.status ||
    error?.code ||
    error?.response?.status ||
    0
  );
}

function isTemporaryGeminiError(error) {
  const status = errorStatus(error);
  const message = String(error?.message || "").toLowerCase();

  return (
    [429, 500, 502, 503, 504].includes(status) ||
    error?.status === "UNAVAILABLE" ||
    message.includes("429") ||
    message.includes("quota") ||
    message.includes("rate limit") ||
    message.includes("high demand") ||
    message.includes("unavailable") ||
    message.includes("timeout") ||
    message.includes("timed out") ||
    message.includes("temporarily")
  );
}

function normalizeResult(result, metadata) {
  if (!result || typeof result !== "object" || Array.isArray(result)) {
    throw new Error("AI returned an invalid feedback object.");
  }

  result.overall_score = calculateOverallScore(result);

  // Research/audit metadata. The frontend can ignore these fields.
  result.ai_provider = metadata.provider;
  result.ai_model = metadata.model;
  result.fallback_used = Boolean(metadata.fallbackUsed);

  return result;
}

function parseJsonResponse(text, providerName) {
  if (!text || !String(text).trim()) {
    throw new Error(`${providerName} returned an empty response.`);
  }

  try {
    return JSON.parse(String(text).trim());
  } catch (error) {
    console.error(`${providerName} raw response:`, text);
    throw new Error(`${providerName} returned feedback that could not be parsed as JSON.`);
  }
}

async function analyzeWithGemini({
  imageBuffer,
  mimeType,
  prompt,
}) {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is missing.");
  }

  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
  });

  const model =
    process.env.GEMINI_MODEL ||
    "gemini-3.6-flash";

  const base64Image =
    imageBuffer.toString("base64");

  let lastError = null;

  // Retry Gemini once when the failure looks temporary.
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      const response =
        await ai.models.generateContent({
          model,
          contents: [
            {
              inlineData: {
                mimeType,
                data: base64Image,
              },
            },
            {
              text: prompt,
            },
          ],
          config: {
            responseMimeType:
              "application/json",
          },
        });

      const parsed =
        parseJsonResponse(
          response?.text,
          "Gemini"
        );

      return normalizeResult(
        parsed,
        {
          provider: "gemini",
          model,
          fallbackUsed: false,
        }
      );

    } catch (error) {
      lastError = error;

      console.error(
        `Gemini attempt ${attempt} failed:`,
        error?.message || error
      );

      // A permanent-looking Gemini error does not need a second
      // Gemini attempt. Groq can be tried immediately instead.
      if (!isTemporaryGeminiError(error)) {
        break;
      }

      if (attempt < 2) {
        await sleep(1800);
      }
    }
  }

  throw lastError ||
    new Error("Gemini analysis failed.");
}

async function analyzeWithGroq({
  imageBuffer,
  mimeType,
  prompt,
}) {
  if (!process.env.GROQ_API_KEY) {
    throw new Error(
      "GROQ_API_KEY is missing, so the fallback AI is unavailable."
    );
  }

  const model =
    process.env.GROQ_MODEL ||
    "qwen/qwen3.8-27b";

  const timeoutMs = Number(
    process.env.GROQ_TIMEOUT_MS ||
    120000
  );

  const base64Image =
    imageBuffer.toString("base64");

  const imageDataUrl =
    `data:${mimeType};base64,${base64Image}`;

  const controller =
    new AbortController();

  const timeout = setTimeout(
    () => controller.abort(),
    timeoutMs
  );

  try {
    const response = await fetch(
      GROQ_ENDPOINT,
      {
        method: "POST",
        headers: {
          Authorization:
            `Bearer ${process.env.GROQ_API_KEY}`,
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: prompt,
                },
                {
                  type: "image_url",
                  image_url: {
                    url: imageDataUrl,
                  },
                },
              ],
            },
          ],
          response_format: {
            type: "json_object",
          },
          reasoning_effort: "none",
          reasoning_format: "hidden",
          temperature: 0.2,
          max_completion_tokens: 3500,
          stream: false,
        }),
        signal: controller.signal,
      }
    );

    const data =
      await response.json()
        .catch(() => ({}));

    if (!response.ok) {
      const message =
        data?.error?.message ||
        data?.message ||
        `Groq request failed with status ${response.status}.`;

      const error = new Error(message);
      error.status = response.status;
      throw error;
    }

    const content =
      data?.choices?.[0]?.message?.content;

    const parsed =
      parseJsonResponse(
        content,
        "Groq"
      );

    return normalizeResult(
      parsed,
      {
        provider: "groq",
        model,
        fallbackUsed: true,
      }
    );

  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error(
        "Groq fallback timed out. Please try the analysis again."
      );
    }

    throw error;

  } finally {
    clearTimeout(timeout);
  }
}

export async function analyzeDesign({
  imageBuffer,
  mimeType,
  designType,
  targetAudience,
  feedbackDepth,
}) {
  const prompt = buildDesignCritPrompt({
    designType,
    targetAudience,
    feedbackDepth,
  });

  let geminiError = null;

  try {
    return await analyzeWithGemini({
      imageBuffer,
      mimeType,
      prompt,
    });

  } catch (error) {
    geminiError = error;

    console.warn(
      "Gemini could not complete the analysis. Switching to Groq fallback."
    );
  }

  try {
    return await analyzeWithGroq({
      imageBuffer,
      mimeType,
      prompt,
    });

  } catch (groqError) {
    console.error(
      "Groq fallback also failed:",
      groqError?.message || groqError
    );

    const combinedError = new Error(
      "The design analysis service is temporarily unavailable. Please try again in a moment."
    );

    combinedError.cause = {
      gemini:
        geminiError?.message ||
        "Gemini failed",
      groq:
        groqError?.message ||
        "Groq failed",
    };

    throw combinedError;
  }
}
