export interface Category {
  name: string;
  description: string;
}

export const INITIAL_CATEGORIES: Category[] = [
  { name: 'Character', description: 'Unique personas and biological identities.' },
  { name: 'Place', description: 'Environments and spatial locations.' },
  { name: 'Object', description: 'Key items, props, and artifacts.' },
  { name: 'Outfit', description: 'Clothing styles and wearable gear.' },
  { name: 'Art Style', description: 'Specific aesthetic signatures.' },
  { name: 'Lighting', description: 'Atmospheric illumination profiles.' },
  { name: 'Mood', description: 'Emotional tones and vibes.' },
  { name: 'Color Palette', description: 'Specific chromatic schemes.' },
  { name: 'Composition', description: 'Framing and structural arrangements.' }
];

export type AssetType = string;

export type EnhancerCategory = 
  | 'Style' 
  | 'Lighting' 
  | 'CameraAngle' 
  | 'Mood' 
  | 'ColorPalette' 
  | 'TextureMaterial' 
  | 'ArtistInfluence' 
  | 'Motion' 
  | 'AspectRatio';

export interface VisualControls extends Record<EnhancerCategory, string> {}

export interface VisualAsset {
  id: string;
  name: string;
  type: AssetType;
  description: string;
  promptSnippet: string;
  imageUrl?: string; 
  tags: string[];
  createdAt: number;
}

export interface GenerationResult {
  id: string;
  url: string;
  prompt: string;
  timestamp: number;
  assetsUsed: string[]; 
  seed?: number;
}