import { GoogleGenAI } from "@google/genai";

/**
 * Models that explicitly support image generation via generateContent with imageConfig.
 * gemini-2.5-flash-image and gemini-3-pro-image-preview are the primary targets.
 */
const IMAGE_MODELS = [
  'gemini-2.5-flash-image',
  'gemini-3-pro-image-preview'
];

export const generateImage = async (
  prompt: string, 
  referenceImages: { data: string; mimeType: string }[] = [],
  aspectRatio: string = "Auto",
  model: string = 'gemini-2.5-flash-image',
  seed?: number
): Promise<string | null> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // Prepare contents with parts (images + text)
  const parts: any[] = referenceImages
    .filter(img => img.data && img.data.startsWith('data:'))
    .map(img => ({
      inlineData: {
        data: img.data.split(',')[1],
        mimeType: img.mimeType
      }
    }));

  parts.push({ text: prompt });

  const isImageModel = IMAGE_MODELS.some(m => model.includes(m));
  const config: any = {};

  // Valid aspect ratios according to SDK documentation
  const validRatios = ["1:1", "3:4", "4:3", "9:16", "16:9"];

  if (isImageModel) {
    config.imageConfig = {};
    if (validRatios.includes(aspectRatio)) {
      config.imageConfig.aspectRatio = aspectRatio;
    }
    if (seed !== undefined) {
      config.seed = seed;
    }
  }

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: { parts },
      config: config
    });

    const candidates = response.candidates;
    if (candidates && candidates.length > 0 && candidates[0].content?.parts) {
      for (const part of candidates[0].content.parts) {
        if (part.inlineData) {
          return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
      }
    }
    return null;
  } catch (error: any) {
    console.error("Image generation failed:", error);
    return null;
  }
};