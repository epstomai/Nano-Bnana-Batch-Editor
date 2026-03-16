export interface GeneratedImage {
  id: string;
  prompt: string;
  url: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  error?: string;
}

export interface AppState {
  originalImage: string | null;
  prompts: string[];
  dataJson: string;
  results: GeneratedImage[];
  isProcessing: boolean;
  apiKeySelected: boolean;
  imageSize: "1K" | "2K" | "4K";
  aspectRatio: "auto" | "1:1" | "3:4" | "4:3" | "9:16" | "16:9" | "1:4" | "1:8" | "4:1" | "8:1";
  model: "gemini-3.1-flash-image-preview" | "gemini-3-pro-image-preview";
}
