import { GoogleGenAI } from "@google/genai";
import { DEFAULT_ATLAS_SYSTEM_PROMPT } from "../constants/atlas-prompts";
import { CorrectedSegmentResult, SegmentItem } from "../types/atlas";
import fs from "fs";
import path from "path";
import os from "os";

export class GeminiService {
  private ai: GoogleGenAI;

  constructor() {
    const apiKey =
      process.env.GEMINI_API_KEY_atlas_helper ||
      process.env.GEMINI_API_KEY_ATLAS_HELPER ||
      process.env.GEMINI_API_KEY;

    if (!apiKey) {
      throw new Error(
        "GEMINI_API_KEY_atlas_helper environment variable is missing."
      );
    }
    this.ai = new GoogleGenAI({ apiKey });
  }

  /**
   * Uploads a video from Cloudflare R2 presigned URL to Gemini File API.
   */
  async uploadVideoFromUrl(videoUrl: string): Promise<{ fileUri: string; mimeType: string }> {
    const response = await fetch(videoUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch video from URL. Status: ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Create a temporary local file to upload via Gemini File API
    const tempFilePath = path.join(os.tmpdir(), `atlas-video-${Date.now()}.mp4`);
    await fs.promises.writeFile(tempFilePath, buffer);

    try {
      const fileUpload = await this.ai.files.upload({
        file: tempFilePath,
        config: {
          mimeType: "video/mp4",
        },
      });

      if (!fileUpload.name) {
        throw new Error("Failed to obtain file name from Gemini upload.");
      }
      const fileName: string = fileUpload.name;

      // Wait until processing is completed if needed
      let file = await this.ai.files.get({ name: fileName });
      while (file.state === "PROCESSING") {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        file = await this.ai.files.get({ name: fileName });
      }

      if (file.state === "FAILED" || !file.uri) {
        throw new Error("Gemini File processing failed or URI is missing.");
      }

      return {
        fileUri: file.uri,
        mimeType: file.mimeType || "video/mp4",
      };
    } finally {
      // Clean up local temporary file
      if (fs.existsSync(tempFilePath)) {
        await fs.promises.unlink(tempFilePath).catch(() => {});
      }
    }
  }

  /**
   * Corrects action labels for multiple segments with automatic model fallback
   * if quota or rate limits occur (gemini-2.5-pro -> gemini-2.5-flash -> gemini-1.5-pro -> gemini-1.5-flash).
   */
  async correctLabels(
    fileUri: string,
    segments: SegmentItem[],
    customPrompt?: string
  ): Promise<CorrectedSegmentResult[]> {
    const systemPrompt = customPrompt || DEFAULT_ATLAS_SYSTEM_PROMPT;

    const segmentsPayload = segments.map((s) => ({
      id: s.id,
      timeRange: `${s.startTime} - ${s.endTime}`,
      currentLabel: s.currentLabel,
    }));

    const userPrompt = `
Analyze the provided video using its file URI.
Here are the video segments to validate and correct:
${JSON.stringify(segmentsPayload, null, 2)}

Strictly adhere to the Atlas Label Rubric rules. Output raw JSON only.
`;

    // Try primary model and fallback to flash/1.5 models if quota is exceeded
    const modelsToTry = [
      "gemini-2.5-pro",
      "gemini-2.5-flash",
      "gemini-1.5-pro",
      "gemini-1.5-flash",
    ];

    let lastError: any = null;

    for (const model of modelsToTry) {
      try {
        const response = await this.ai.models.generateContent({
          model,
          contents: [
            {
              role: "user",
              parts: [
                {
                  fileData: {
                    fileUri,
                    mimeType: "video/mp4",
                  },
                },
                {
                  text: `${systemPrompt}\n\n${userPrompt}`,
                },
              ],
            },
          ],
          config: {
            responseMimeType: "application/json",
            temperature: 0.1,
          },
        });

        const responseText = response.text || "[]";
        const parsedResults = JSON.parse(responseText);
        if (Array.isArray(parsedResults)) {
          return parsedResults;
        }
      } catch (err: any) {
        console.warn(`Model ${model} failed, trying fallback model...`, err?.message || err);
        lastError = err;
        const errStr = String(err?.message || err);
        if (
          err?.status === 429 ||
          errStr.includes("429") ||
          errStr.includes("Quota exceeded") ||
          errStr.includes("RESOURCE_EXHAUSTED") ||
          errStr.includes("limit: 0")
        ) {
          continue; // Fallback to next model
        }
        throw err;
      }
    }

    throw new Error(
      lastError?.message ||
        "Gemini API quota exceeded on free tier. Please enable Billing in Google AI Studio or wait a few moments."
    );
  }
}
