import { GoogleGenAI } from "@google/genai";

declare global {
  interface Window {
    aistudio?: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}

export async function editImage(
  base64Image: string,
  prompt: string,
  imageSize: "1K" | "2K" | "4K" = "1K",
  aspectRatio: "auto" | "1:1" | "3:4" | "4:3" | "9:16" | "16:9" | "1:4" | "1:8" | "4:1" | "8:1" = "auto",
  mimeType: string = "image/png"
): Promise<string> {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  
  // Strip the data:image/...;base64, prefix if present
  const base64Data = base64Image.split(',')[1] || base64Image;

  const imageConfig: any = {
    imageSize: imageSize
  };

  if (aspectRatio !== "auto") {
    imageConfig.aspectRatio = aspectRatio;
  }

  const response = await ai.models.generateContent({
    model: 'gemini-3.1-flash-image-preview',
    contents: {
      parts: [
        {
          inlineData: {
            data: base64Data,
            mimeType: mimeType,
          },
        },
        {
          text: prompt,
        },
      ],
    },
    config: {
      imageConfig: imageConfig
    }
  });

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }

  throw new Error("No image data returned from Gemini");
}

export async function checkApiKey(): Promise<boolean> {
  if (typeof window.aistudio?.hasSelectedApiKey === 'function') {
    return await window.aistudio.hasSelectedApiKey();
  }
  return true; // Fallback for environments where this isn't defined
}

export async function openKeySelector(): Promise<void> {
  if (typeof window.aistudio?.openSelectKey === 'function') {
    await window.aistudio.openSelectKey();
  }
}
