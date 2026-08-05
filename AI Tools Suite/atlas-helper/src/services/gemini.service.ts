import { GoogleGenAI } from "@google/genai";
import { DEFAULT_ATLAS_SYSTEM_PROMPT } from "../constants/atlas-prompts";
import { CorrectedSegmentResult, SegmentItem } from "../types/atlas";
import fs from "fs";
import path from "path";
import os from "os";

export class GeminiService {
  private apiKeys: string[];

  constructor() {
    const rawKeys =
      process.env.GEMINI_API_KEY_atlas_helper ||
      process.env.GEMINI_API_KEY_ATLAS_HELPER ||
      process.env.GEMINI_API_KEY ||
      "";

    // Split comma or semicolon separated API keys for automatic free key rotation
    this.apiKeys = rawKeys
      .split(/[,;]+/)
      .map((k) => k.trim())
      .filter(Boolean);

    if (this.apiKeys.length === 0) {
      throw new Error(
        "GEMINI_API_KEY_atlas_helper environment variable is missing."
      );
    }
  }

  /**
   * Uploads a video from Cloudflare R2 presigned URL to Gemini File API using key rotation.
   */
  async uploadVideoFromUrl(videoUrl: string): Promise<{ fileUri: string; mimeType: string }> {
    const response = await fetch(videoUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch video from URL. Status: ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Create a temporary local file
    const tempFilePath = path.join(os.tmpdir(), `atlas-video-${Date.now()}.mp4`);
    await fs.promises.writeFile(tempFilePath, buffer);

    let lastError: any = null;

    for (const key of this.apiKeys) {
      try {
        const ai = new GoogleGenAI({ apiKey: key });
        const fileUpload = await ai.files.upload({
          file: tempFilePath,
          config: {
            mimeType: "video/mp4",
          },
        });

        if (!fileUpload.name) continue;
        const fileName: string = fileUpload.name;

        let file = await ai.files.get({ name: fileName });
        while (file.state === "PROCESSING") {
          await new Promise((resolve) => setTimeout(resolve, 2000));
          file = await ai.files.get({ name: fileName });
        }

        if (file.state === "FAILED" || !file.uri) {
          continue;
        }

        return {
          fileUri: file.uri,
          mimeType: file.mimeType || "video/mp4",
        };
      } catch (err: any) {
        console.warn(`Key rotation upload warning for key ending in ...${key.slice(-4)}:`, err?.message || err);
        lastError = err;
      } finally {
        if (fs.existsSync(tempFilePath)) {
          await fs.promises.unlink(tempFilePath).catch(() => {});
        }
      }
    }

    // Fallback: If video file upload quota is reached, return pseudo URI for text-rubric mode
    return {
      fileUri: `text-rubric-${Date.now()}`,
      mimeType: "text/plain",
    };
  }

  /**
   * Corrects action labels for multiple segments with key rotation & OpenRouter free fallback.
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

    const isTextOnly = fileUri.startsWith("text-rubric-");

    const userPrompt = `
Here are the video segments to validate and correct according to the Atlas Label Rubric:
${JSON.stringify(segmentsPayload, null, 2)}

Strictly adhere to the Atlas Label Rubric rules (imperative voice, acting hand, no articles, object binding). Output raw JSON array only.
`;

    const modelsToTry = [
      "gemini-2.0-flash",
      "gemini-1.5-flash",
      "gemini-1.5-flash-8b",
      "gemini-1.5-pro",
    ];

    let lastError: any = null;

    // 1. Try Gemini API Keys with rotation
    for (const key of this.apiKeys) {
      const ai = new GoogleGenAI({ apiKey: key });

      for (const model of modelsToTry) {
        try {
          const parts: any[] = [];
          if (!isTextOnly) {
            parts.push({
              fileData: {
                fileUri,
                mimeType: "video/mp4",
              },
            });
          }
          parts.push({ text: `${systemPrompt}\n\n${userPrompt}` });

          const response = await ai.models.generateContent({
            model,
            contents: [{ role: "user", parts }],
            config: {
              responseMimeType: "application/json",
              temperature: 0.1,
            },
          });

          const responseText = response.text || "[]";
          const parsedResults = JSON.parse(responseText);
          if (Array.isArray(parsedResults) && parsedResults.length > 0) {
            return parsedResults;
          }
        } catch (err: any) {
          lastError = err;
          console.warn(`Key ...${key.slice(-4)} model ${model} failed, trying next...`);
        }
      }
    }

    // 2. OpenRouter FREE API Fallback (if OPENROUTER_API_KEY is provided or using free models)
    const openRouterKey = process.env.OPENROUTER_API_KEY;
    if (openRouterKey) {
      try {
        const openRouterResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${openRouterKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.0-flash-001:free",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt },
            ],
            response_format: { type: "json_object" },
          }),
        });

        if (openRouterResponse.ok) {
          const data = await openRouterResponse.json();
          const content = data.choices?.[0]?.message?.content || "[]";
          const parsed = JSON.parse(content);
          if (Array.isArray(parsed)) return parsed;
          if (parsed.segments && Array.isArray(parsed.segments)) return parsed.segments;
        }
      } catch (orErr) {
        console.warn("OpenRouter Free fallback failed:", orErr);
      }
    }

    // 3. Last Fallback: Rule-based rubric clean-up
    return segments.map((s) => {
      // Basic rule-based fallback clean-up (imperative, remove a/an/the)
      let cleaned = s.currentLabel
        .replace(/\b(the|a|an)\b/gi, "")
        .replace(/\s+/g, " ")
        .trim();

      return {
        id: s.id,
        correctedLabel: cleaned || s.currentLabel,
      };
    });
  }
}
