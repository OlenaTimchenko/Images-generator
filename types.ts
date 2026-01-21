
export type AspectRatio = '1:1' | '4:5' | '9:16' | '16:9' | '1.91:1';

export enum Resolution {
  Standard = 'Standard',
  HD = 'HD',
  FullHD = 'Full HD',
  TwoK = '2K',
  FourK = '4K'
}

export interface GenerationSettings {
  aspectRatio: AspectRatio;
  resolution: Resolution;
  count: number;
}

export interface GeneratedImage {
  id: string;
  url: string;
  prompt: string;
  timestamp: number;
  settings: GenerationSettings;
}

export interface UserFile {
  data: string; // base64
  mimeType: string;
}
