import { FontProject } from '../types/font';

/**
 * Generate complete, runnable QBasic 1.1 / QuickBASIC 4.5 / QB64 source code
 * using DATA statements and a fast bitmask drawing subroutine.
 */
export function generateQBasicDataCode(project: FontProject, subset: 'all' | 'ascii' | 'modified' = 'all'): string {
  const { name, dimensions, glyphs, modifiedGlyphs } = project;
  const h = dimensions.height;

  // Determine which character range to export
  let startChar = 0;
  let endChar = 255;
  if (subset === 'ascii') {
    startChar = 32;
    endChar = 126;
  }

  const exportChars: number[] = [];
  if (subset === 'modified') {
    for (let c = 0; c < 256; c++) {
      if (modifiedGlyphs.includes(c)) exportChars.push(c);
    }
    if (exportChars.length === 0) {
      for (let c = 32; c <= 126; c++) exportChars.push(c);
    }
  } else {
    for (let c = startChar; c <= endChar; c++) exportChars.push(c);
  }

  // Format DATA lines (16 bytes per line)
  const dataLines: string[] = [];
  let currentBytes: string[] = [];

  for (const c of exportChars) {
    const rows = glyphs[c] || new Array(h).fill(0);
    for (let r = 0; r < h; r++) {
      const b = rows[r] ?? 0;
      currentBytes.push(`&H${b.toString(16).toUpperCase().padStart(2, '0')}`);
      if (currentBytes.length >= 16) {
        dataLines.push(`DATA ${currentBytes.join(', ')}`);
        currentBytes = [];
      }
    }
  }
  if (currentBytes.length > 0) {
    dataLines.push(`DATA ${currentBytes.join(', ')}`);
  }

  const totalChars = exportChars.length;
  const minCode = exportChars[0];
  const maxCode = exportChars[exportChars.length - 1];

  return `' ====================================================================
' QBASIC CUSTOM FONT ENGINE
' Generated with QBasic Font Studio
' Font: ${name} (${dimensions.width}x${dimensions.height})
' Target: QBasic 1.1, QuickBASIC 4.5, MS-DOS, DOSBox, QB64
' ====================================================================

DEFINT A-Z
DECLARE SUB DrawQChar (c AS INTEGER, x AS INTEGER, y AS INTEGER, col AS INTEGER)
DECLARE SUB DrawQText (txt AS STRING, x AS INTEGER, y AS INTEGER, col AS INTEGER)
DECLARE SUB DrawQTextScaled (txt AS STRING, x AS INTEGER, y AS INTEGER, col AS INTEGER, scale AS INTEGER)

CONST FONT.W = ${dimensions.width}
CONST FONT.H = ${dimensions.height}
CONST FONT.MIN = ${minCode}
CONST FONT.MAX = ${maxCode}
CONST FONT.COUNT = ${totalChars}

' SCREEN 13: 320x200, 256 Colors (Standard DOS Game Mode)
SCREEN 13
CLS

' Allocate memory array for font glyph rows
DIM SHARED CustomFont(0 TO 255, 0 TO FONT.H - 1) AS INTEGER

' Load font bitmap data
PRINT "Loading custom font...";
RESTORE FontData
FOR c = FONT.MIN TO FONT.MAX
  FOR r = 0 TO FONT.H - 1
    READ byteVal
    CustomFont(c, r) = byteVal
  NEXT r
NEXT c

CLS
' -------------------------------------------------------------
' DEMO DISPLAY
' -------------------------------------------------------------
' Colors: 14=Yellow, 11=Bright Cyan, 10=Bright Green, 15=White, 12=Bright Red
DrawQText "=== ${name.toUpperCase()} ===", 20, 15, 14
DrawQText "CUSTOM FONT LOADED SUCCESSFULLY!", 20, 32, 11
DrawQText "QBasic 1.1 / QuickBASIC 4.5 Demo", 20, 48, 15

' Drawing scaled text
DrawQTextScaled "VICTORY!", 20, 70, 10, 2
DrawQText "SCORE: 042900   LIVES: 3   HP: 100/100", 20, 115, 12

DrawQText "Press any key to test interactive loop...", 20, 150, 7

DO: LOOP WHILE INKEY$ = ""

' Interactive typing loop
CLS
DrawQText "TYPE SOMETHING (ESC to quit):", 10, 10, 14
inputX = 10: inputY = 30
DO
  k$ = INKEY$
  IF k$ <> "" THEN
    IF k$ = CHR$(27) THEN EXIT DO ' ESC key
    IF k$ = CHR$(13) THEN         ' Enter key
      inputX = 10
      inputY = inputY + FONT.H + 4
      IF inputY > 180 THEN CLS : inputY = 10
    ELSEIF k$ = CHR$(8) THEN      ' Backspace
      IF inputX > 10 THEN
        inputX = inputX - FONT.W
        LINE (inputX, inputY)-(inputX + FONT.W - 1, inputY + FONT.H - 1), 0, BF
      END IF
    ELSE
      DrawQChar ASC(k$), inputX, inputY, 15
      inputX = inputX + FONT.W
      IF inputX > 310 THEN inputX = 10: inputY = inputY + FONT.H + 4
    END IF
  END IF
LOOP

SCREEN 0: WIDTH 80: CLS
END

' -------------------------------------------------------------
' SUBROUTINES
' -------------------------------------------------------------
SUB DrawQChar (c AS INTEGER, x AS INTEGER, y AS INTEGER, col AS INTEGER)
  IF c < 0 OR c > 255 THEN EXIT SUB
  FOR r = 0 TO FONT.H - 1
    b = CustomFont(c, r)
    IF b <> 0 THEN
      FOR bit = 0 TO FONT.W - 1
        IF (b AND (2 ^ (7 - bit))) <> 0 THEN
          PSET (x + bit, y + r), col
        END IF
      NEXT bit
    END IF
  NEXT r
END SUB

SUB DrawQText (txt AS STRING, x AS INTEGER, y AS INTEGER, col AS INTEGER)
  currX = x
  FOR i = 1 TO LEN(txt)
    c = ASC(MID$(txt, i, 1))
    DrawQChar c, currX, y, col
    currX = currX + FONT.W
  NEXT i
END SUB

SUB DrawQTextScaled (txt AS STRING, x AS INTEGER, y AS INTEGER, col AS INTEGER, scale AS INTEGER)
  IF scale < 1 THEN scale = 1
  currX = x
  FOR i = 1 TO LEN(txt)
    c = ASC(MID$(txt, i, 1))
    FOR r = 0 TO FONT.H - 1
      b = CustomFont(c, r)
      IF b <> 0 THEN
        FOR bit = 0 TO FONT.W - 1
          IF (b AND (2 ^ (7 - bit))) <> 0 THEN
            LINE (currX + bit * scale, y + r * scale)-STEP(scale - 1, scale - 1), col, BF
          END IF
        NEXT bit
      END IF
    NEXT r
    currX = currX + FONT.W * scale
  NEXT i
END SUB

' =============================================================
' FONT BITMAP DATA (${totalChars} Glyphs, ${totalChars * h} Bytes)
' =============================================================
FontData:
${dataLines.join('\n')}
`;
}

/**
 * Generate QBasic BLOAD / Binary GET loader script for .FNT files
 */
export function generateQBasicBinaryLoaderCode(project: FontProject, filename: string = 'GAMEFONT.FNT'): string {
  const { dimensions, name } = project;
  return `' ====================================================================
' QBASIC BINARY FONT LOADER (.FNT)
' Font: ${name} (${dimensions.width}x${dimensions.height})
' Load external binary file for lightning fast startup without big DATA lines
' ====================================================================

DEFINT A-Z
SCREEN 13 ' 320x200 256 colors
CLS

CONST FONT.W = ${dimensions.width}
CONST FONT.H = ${dimensions.height}
CONST TOTAL.BYTES = 256 * FONT.H

DIM SHARED CustomFont(0 TO 255, 0 TO FONT.H - 1) AS INTEGER

' Open binary font file and read bytes directly
OPEN "${filename}" FOR BINARY AS #1
IF LOF(1) = 0 THEN
  CLOSE #1
  PRINT "ERROR: File ${filename} not found!"
  END
END IF

FOR c = 0 TO 255
  FOR r = 0 TO FONT.H - 1
    DIM byteIn AS STRING * 1
    GET #1, , byteIn
    CustomFont(c, r) = ASC(byteIn)
  NEXT r
NEXT c
CLOSE #1

' Test font drawing
CALL QPrint("Binary font ${filename} loaded!", 20, 20, 10)
CALL QPrint("Ready for DOS games & demos.", 20, 36, 14)

DO: LOOP WHILE INKEY$ = ""
SYSTEM

SUB QPrint (txt$, x, y, col)
  FOR i = 1 TO LEN(txt$)
    c = ASC(MID$(txt$, i, 1))
    cx = x + (i - 1) * FONT.W
    FOR r = 0 TO FONT.H - 1
      b = CustomFont(c, r)
      IF b <> 0 THEN
        FOR bit = 0 TO FONT.W - 1
          IF (b AND (2 ^ (7 - bit))) <> 0 THEN
            PSET (cx + bit, y + r), col
          END IF
        NEXT bit
      END IF
    NEXT r
  NEXT i
END SUB
`;
}

/**
 * Generate QB64 Modern implementation code
 */
export function generateQB64Code(project: FontProject): string {
  return `' ====================================================================
' QB64 PHOENIX / MODERN BASIC FONT RENDERER
' Font: ${project.name}
' Supports 32-bit color, hardware scaling, and smooth game loops
' ====================================================================

$RESIZE:SMOOTH
SCREEN _NEWIMAGE(640, 480, 32)
_TITLE "${project.name} - QB64 Game Engine"

DIM SHARED FontData(0 TO 255, 0 TO ${project.dimensions.height - 1}) AS _UNSIGNED _BYTE

' Embed font data or load via DATA statements
RESTORE FontDataBlock
FOR c = 0 TO 255
  FOR r = 0 TO ${project.dimensions.height - 1}
    READ b%
    FontData(c, r) = b%
  NEXT r
NEXT c

' Draw test loop
DO
  _LIMIT 60
  CLS _RGB32(10, 15, 30)

  DrawQB64Text "${project.name}", 40, 40, _RGB32(255, 230, 80), 3
  DrawQB64Text "Created with QBasic Font Studio", 40, 100, _RGB32(100, 220, 255), 2
  DrawQB64Text "Press ESC to Quit", 40, 400, _RGB32(180, 180, 180), 1

  _DISPLAY
LOOP UNTIL _KEYDOWN(27)
SYSTEM

SUB DrawQB64Text (txt$, startX, startY, col AS _UNSIGNED _OFFSET, scale)
  IF scale < 1 THEN scale = 1
  curX = startX
  FOR i = 1 TO LEN(txt$)
    c = ASC(MID$(txt$, i, 1))
    FOR r = 0 TO ${project.dimensions.height - 1}
      b = FontData(c, r)
      IF b <> 0 THEN
        FOR bit = 0 TO ${project.dimensions.width - 1}
          IF (b AND (2 ^ (7 - bit))) <> 0 THEN
            LINE (curX + bit * scale, startY + r * scale)-STEP(scale - 1, scale - 1), col, BF
          END IF
        NEXT bit
      END IF
    NEXT r
    curX = curX + ${project.dimensions.width} * scale
  NEXT i
END SUB

FontDataBlock:
' Refer to QBasic DATA export for full dataset
`;
}

/**
 * Generate C/C++ Header Array (e.g. for Raylib, DOS DJGPP, Open Watcom, Pico-8, TIC-80)
 */
export function generateCHeader(project: FontProject): string {
  const { name, dimensions, glyphs } = project;
  const h = dimensions.height;
  const lines: string[] = [];

  lines.push(`/* ====================================================================`);
  lines.push(` * Custom Bitmap Font: ${name} (${dimensions.width}x${dimensions.height})`);
  lines.push(` * Generated with QBasic Font Studio`);
  lines.push(` * ==================================================================== */`);
  lines.push(``);
  lines.push(`#ifndef ${name.toUpperCase().replace(/[^A-Z0-9]/g, '_')}_FONT_H`);
  lines.push(`#define ${name.toUpperCase().replace(/[^A-Z0-9]/g, '_')}_FONT_H`);
  lines.push(``);
  lines.push(`#include <stdint.h>`);
  lines.push(``);
  lines.push(`#define FONT_WIDTH  ${dimensions.width}`);
  lines.push(`#define FONT_HEIGHT ${dimensions.height}`);
  lines.push(`#define FONT_GLYPHS 256`);
  lines.push(``);
  lines.push(`static const uint8_t font_${name.toLowerCase().replace(/[^a-z0-9]/g, '_')}[256][${h}] = {`);

  for (let c = 0; c < 256; c++) {
    const rows = glyphs[c] || new Array(h).fill(0);
    const rowHex = rows.map((r) => `0x${r.toString(16).toUpperCase().padStart(2, '0')}`).join(', ');
    lines.push(`    /* Char ${c.toString().padStart(3, ' ')} (0x${c.toString(16).toUpperCase().padStart(2, '0')}) */ { ${rowHex} },`);
  }

  lines.push(`};`);
  lines.push(``);
  lines.push(`#endif /* ${name.toUpperCase().replace(/[^A-Z0-9]/g, '_')}_FONT_H */`);

  return lines.join('\n');
}

/**
 * Build raw binary Uint8Array representing the font file (e.g. 2048 bytes for 256 8x8 glyphs)
 */
export function generateBinaryFnt(project: FontProject): Uint8Array {
  const h = project.dimensions.height;
  const totalBytes = 256 * h;
  const buffer = new Uint8Array(totalBytes);

  for (let c = 0; c < 256; c++) {
    const rows = project.glyphs[c] || new Array(h).fill(0);
    for (let r = 0; r < h; r++) {
      buffer[c * h + r] = rows[r] ?? 0;
    }
  }

  return buffer;
}

/**
 * Trigger browser file download of binary or text data
 */
export function downloadFile(content: string | Uint8Array | Blob, filename: string, mimeType: string = 'text/plain') {
  const blob = content instanceof Blob ? content : new Blob([content as unknown as BlobPart], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Render complete font to a spritesheet canvas (16x16 characters)
 */
export function renderFontSpritesheet(
  project: FontProject,
  scale: number = 2,
  fgColor: string = '#FFFFFF',
  bgColor: string = '#000000',
  transparentBg: boolean = false
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  const w = project.dimensions.width;
  const h = project.dimensions.height;
  const cols = 16;
  const rows = 16;

  canvas.width = cols * w * scale;
  canvas.height = rows * h * scale;
  const ctx = canvas.getContext('2d')!;

  if (!transparentBg) {
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  } else {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  ctx.fillStyle = fgColor;

  for (let i = 0; i < 256; i++) {
    const colIdx = i % cols;
    const rowIdx = Math.floor(i / cols);
    const glyphX = colIdx * w * scale;
    const glyphY = rowIdx * h * scale;

    const glyphRows = project.glyphs[i] || [];
    for (let r = 0; r < h; r++) {
      const byteVal = glyphRows[r] || 0;
      for (let bit = 0; bit < w; bit++) {
        if ((byteVal & (1 << (7 - bit))) !== 0) {
          ctx.fillRect(glyphX + bit * scale, glyphY + r * scale, scale, scale);
        }
      }
    }
  }

  return canvas;
}
