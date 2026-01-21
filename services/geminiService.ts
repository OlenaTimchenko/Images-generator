
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { GenerationSettings, UserFile, Resolution, AspectRatio } from "../types";

const GEMINI_MODELS = {
  BASIC: 'gemini-2.5-flash-image',
  PRO: 'gemini-3-pro-image-preview'
};

/**
 * Maps user aspect ratio choices to Gemini supported ratios.
 * Supported: "1:1", "3:4", "4:3", "9:16", "16:9"
 */
const mapToGeminiRatio = (ratio: AspectRatio): string => {
  switch (ratio) {
    case '1:1': return '1:1';
    case '4:5': return '3:4'; // Closest
    case '9:16': return '9:16';
    case '16:9': return '16:9';
    case '1.91:1': return '16:9'; // Closest
    default: return '1:1';
  }
};

const mapToGeminiSize = (res: Resolution): "1K" | "2K" | "4K" => {
  if (res === Resolution.TwoK) return "2K";
  if (res === Resolution.FourK) return "4K";
  return "1K";
};

export const generateImages = async (
  prompt: string, 
  settings: GenerationSettings, 
  referenceFile?: UserFile
): Promise<string[]> => {
  const isPro = settings.resolution === Resolution.TwoK || settings.resolution === Resolution.FourK;
  const model = isPro ? GEMINI_MODELS.PRO : GEMINI_MODELS.BASIC;

  // Initialize client with key from process.env.API_KEY
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

  const geminiRatio = mapToGeminiRatio(settings.aspectRatio);
  const geminiSize = mapToGeminiSize(settings.resolution);

  const results: string[] = [];

  // If a reference file is provided, we enhance the prompt to guide the photoshoot
  const finalPrompt = referenceFile 
    ? `Professional photoshoot based on the provided person. Style: ${prompt}. Ensure realistic skin textures, cinematic lighting, and perfect framing for ${settings.aspectRatio} output.` 
    : `${prompt}. High resolution, professional composition for ${settings.aspectRatio} social media post, detailed textures, 8k quality.`;

  // We loop for 'count' because individual generateContent calls usually return 1 image for these models
  for (let i = 0; i < settings.count; i++) {
    try {
      const parts: any[] = [{ text: finalPrompt }];
      if (referenceFile) {
        parts.unshift({
          inlineData: {
            data: referenceFile.data,
            mimeType: referenceFile.mimeType,
          },
        });
      }

      const response: GenerateContentResponse = await ai.models.generateContent({
        model,
        contents: { parts },
        config: {
          imageConfig: {
            aspectRatio: geminiRatio as any,
            ...(isPro ? { imageSize: geminiSize } : {})
          }
        },
      });

      // Find the image part in candidates
      const imagePart = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);
      if (imagePart?.inlineData?.data) {
        results.push(`data:image/png;base64,${imagePart.inlineData.data}`);
      }
    } catch (error) {
      console.error("Generation error:", error);
      throw error;
    }
  }

  return results;
};
