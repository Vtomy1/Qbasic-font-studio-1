export interface FontDimensions {
  width: number;
  height: number;
}

export interface GlyphMetadata {
  code: number;
  char: string;
  name: string;
  category: 'control' | 'ascii' | 'extended' | 'box' | 'math' | 'greek' | 'custom';
}

export type FontGlyphs = Record<number, number[]>;

export interface FontProject {
  id: string;
  name: string;
  author: string;
  description: string;
  dimensions: FontDimensions;
  glyphs: FontGlyphs;
  modifiedGlyphs: number[]; // Array of glyph codes that have been edited
  createdAt: number;
  updatedAt: number;
}

export type ToolType = 'pen' | 'eraser' | 'fill' | 'line' | 'rect' | 'invert';

export type DOSTheme = 'qbasic' | 'amber' | 'green' | 'norton' | 'dark';

export interface DOSColor {
  code: number;
  name: string;
  hex: string;
}
