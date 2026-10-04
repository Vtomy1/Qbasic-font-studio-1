import React, { useState, useRef, useEffect, useCallback } from 'react';
import { FontProject, ToolType } from '../types/font';
import { DEFAULT_CP437_FONT, CP437_NAMES } from '../utils/cp437Data';
import { retroSound } from '../utils/sound';
import {
  Pencil,
  Eraser,
  PaintBucket,
  RotateCw,
  FlipHorizontal,
  FlipVertical,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Copy,
  ClipboardPaste,
  Trash2,
  Undo2,
  Redo2,
  Eye,
  EyeOff,
  Grid,
  Sparkles,
  RefreshCw,
  Maximize2
} from 'lucide-react';

interface GlyphEditorProps {
  project: FontProject;
  selectedCode: number;
  onUpdateGlyph: (code: number, newRows: number[]) => void;
  onResetGlyphToDefault: (code: number) => void;
  onCopyGlyph: (code: number) => void;
  onPasteGlyph: (code: number) => void;
  hasClipboard: boolean;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

export const GlyphEditor: React.FC<GlyphEditorProps> = ({
  project,
  selectedCode,
  onUpdateGlyph,
  onResetGlyphToDefault,
  onCopyGlyph,
  onPasteGlyph,
  hasClipboard,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
}) => {
  const [activeTool, setActiveTool] = useState<ToolType>('pen');
  const [showGhost, setShowGhost] = useState<boolean>(true);
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [isMouseDown, setIsMouseDown] = useState<boolean>(false);
  const [drawMode, setDrawMode] = useState<boolean>(true); // true = draw 1, false = erase 0
  const [previewColorIdx, setPreviewColorIdx] = useState<number>(14); // Yellow default

  const { dimensions, glyphs } = project;
  const w = dimensions.width;
  const h = dimensions.height;

  const currentRows = glyphs[selectedCode] || new Array(h).fill(0);
  const defaultRows = DEFAULT_CP437_FONT[selectedCode] || new Array(h).fill(0);
  const charMeta = CP437_NAMES[selectedCode];

  // Helper to test if a bit is 1
  const getBit = (row: number, col: number, rows = currentRows): boolean => {
    if (row < 0 || row >= h || col < 0 || col >= w) return false;
    const byteVal = rows[row] ?? 0;
    return (byteVal & (1 << (7 - col))) !== 0;
  };

  // Helper to set or clear a bit
  const setBit = (row: number, col: number, val: boolean) => {
    if (row < 0 || row >= h || col < 0 || col >= w) return;
    const newRows = [...currentRows];
    let byteVal = newRows[row] ?? 0;
    if (val) {
      byteVal |= (1 << (7 - col));
    } else {
      byteVal &= ~(1 << (7 - col));
    }
    newRows[row] = byteVal;
    onUpdateGlyph(selectedCode, newRows);
  };

  // Handle cell click / drag
  const handleCellPointerDown = (r: number, c: number, e: React.PointerEvent) => {
    e.preventDefault();
    setIsMouseDown(true);

    if (activeTool === 'pen') {
      const current = getBit(r, c);
      const nextVal = !current;
      setDrawMode(nextVal);
      setBit(r, c, nextVal);
      retroSound.drawPixel(nextVal);
    } else if (activeTool === 'eraser') {
      setBit(r, c, false);
      retroSound.drawPixel(false);
    } else if (activeTool === 'fill') {
      // Flood fill
      floodFill(r, c);
      retroSound.action();
    }
  };

  const handleCellPointerEnter = (r: number, c: number) => {
    if (!isMouseDown) return;

    if (activeTool === 'pen') {
      setBit(r, c, drawMode);
      retroSound.drawPixel(drawMode);
    } else if (activeTool === 'eraser') {
      setBit(r, c, false);
      retroSound.drawPixel(false);
    }
  };

  // Flood fill algorithm
  const floodFill = (startR: number, startC: number) => {
    const targetVal = getBit(startR, startC);
    const fillVal = !targetVal;
    if (targetVal === fillVal) return;

    const newRows = [...currentRows];
    const visited = new Set<string>();
    const queue: [number, number][] = [[startR, startC]];

    const testBitLocal = (r: number, c: number) => {
      const b = newRows[r] ?? 0;
      return (b & (1 << (7 - c))) !== 0;
    };

    const setBitLocal = (r: number, c: number, val: boolean) => {
      let b = newRows[r] ?? 0;
      if (val) b |= (1 << (7 - c));
      else b &= ~(1 << (7 - c));
      newRows[r] = b;
    };

    while (queue.length > 0) {
      const [r, c] = queue.pop()!;
      const key = `${r},${c}`;
      if (visited.has(key)) continue;
      visited.add(key);

      if (r < 0 || r >= h || c < 0 || c >= w) continue;
      if (testBitLocal(r, c) !== targetVal) continue;

      setBitLocal(r, c, fillVal);

      queue.push([r + 1, c]);
      queue.push([r - 1, c]);
      queue.push([r, c + 1]);
      queue.push([r, c - 1]);
    }

    onUpdateGlyph(selectedCode, newRows);
  };

  // Transformations
  const handleShift = (dr: number, dc: number) => {
    const newRows = new Array(h).fill(0);
    for (let r = 0; r < h; r++) {
      for (let c = 0; c < w; c++) {
        const fromR = r - dr;
        const fromC = c - dc;
        if (fromR >= 0 && fromR < h && fromC >= 0 && fromC < w) {
          if (getBit(fromR, fromC)) {
            newRows[r] |= (1 << (7 - c));
          }
        }
      }
    }
    onUpdateGlyph(selectedCode, newRows);
    retroSound.action();
  };

  const handleFlipHorizontal = () => {
    const newRows = currentRows.map((byteVal) => {
      let reversed = 0;
      for (let bit = 0; bit < w; bit++) {
        if ((byteVal & (1 << (7 - bit))) !== 0) {
          reversed |= (1 << bit);
        }
      }
      return reversed;
    });
    onUpdateGlyph(selectedCode, newRows);
    retroSound.action();
  };

  const handleFlipVertical = () => {
    const newRows = [...currentRows].reverse();
    onUpdateGlyph(selectedCode, newRows);
    retroSound.action();
  };

  const handleRotate90 = () => {
    const newRows = new Array(h).fill(0);
    for (let r = 0; r < h; r++) {
      for (let c = 0; c < w; c++) {
        if (getBit(r, c)) {
          // Clockwise: newRow = c, newCol = (h - 1) - r
          const newR = c;
          const newC = (h - 1) - r;
          if (newR < h && newC < w) {
            newRows[newR] |= (1 << (7 - newC));
          }
        }
      }
    }
    onUpdateGlyph(selectedCode, newRows);
    retroSound.action();
  };

  const handleInvert = () => {
    const newRows = currentRows.map((b) => (~b) & 0xff);
    onUpdateGlyph(selectedCode, newRows);
    retroSound.clearSound();
  };

  const handleClear = () => {
    onUpdateGlyph(selectedCode, new Array(h).fill(0));
    retroSound.clearSound();
  };

  useEffect(() => {
    const handlePointerUp = () => setIsMouseDown(false);
    window.addEventListener('pointerup', handlePointerUp);
    return () => window.removeEventListener('pointerup', handlePointerUp);
  }, []);

  return (
    <div className="flex-1 flex flex-col bg-[#0000aa] text-white p-2 md:p-3 overflow-y-auto">
      {/* Top Glyph Info & Action Bar */}
      <div className="bg-[#aaaaaa] text-[#000000] p-2 dos-box flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex items-center space-x-3">
          <div className="bg-[#0000aa] text-[#ffff55] px-2.5 py-1 text-sm font-mono font-bold flex items-center gap-1.5 shadow-inner">
            <span className="text-white text-xs">EDITING:</span>
            <span>CHAR {selectedCode}</span>
            <span className="text-[#00aaaa] text-xs">
              (&H{selectedCode.toString(16).toUpperCase().padStart(2, '0')})
            </span>
          </div>

          <div className="text-xs font-mono">
            <span className="font-bold text-black">{charMeta?.name || 'Glyph'}</span>
            <span className="text-[#555555] ml-2">[{charMeta?.category || 'custom'}]</span>
          </div>
        </div>

        {/* Undo / Redo & Clipboard */}
        <div className="flex items-center space-x-1">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            title="Undo"
            className={`dos-button px-2 py-1 flex items-center gap-1 text-xs ${
              !canUndo ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            <Undo2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Undo</span>
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            title="Redo"
            className={`dos-button px-2 py-1 flex items-center gap-1 text-xs ${
              !canRedo ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            <Redo2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Redo</span>
          </button>

          <button
            onClick={() => {
              onCopyGlyph(selectedCode);
              retroSound.action();
            }}
            title="Copy Glyph"
            className="dos-button px-2 py-1 flex items-center gap-1 text-xs"
          >
            <Copy className="w-3.5 h-3.5 text-[#0000aa]" />
            <span className="hidden sm:inline">Copy</span>
          </button>

          <button
            onClick={() => {
              onPasteGlyph(selectedCode);
              retroSound.action();
            }}
            disabled={!hasClipboard}
            title="Paste Glyph"
            className={`dos-button px-2 py-1 flex items-center gap-1 text-xs ${
              !hasClipboard ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            <ClipboardPaste className="w-3.5 h-3.5 text-[#00aa00]" />
            <span className="hidden sm:inline">Paste</span>
          </button>

          <button
            onClick={() => {
              onResetGlyphToDefault(selectedCode);
              retroSound.clearSound();
            }}
            title="Reset to default CP437 ROM glyph"
            className="dos-button px-2 py-1 flex items-center gap-1 text-xs text-[#aa0000]"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reset</span>
          </button>
        </div>
      </div>

      {/* Main Workspace Area: Tools (Left) + Interactive Pixel Canvas (Center) + Byte Values & Live Previews (Right) */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-3 items-start">
        {/* LEFT COLUMN: Drawing Tools & Transformations (2 Cols) */}
        <div className="lg:col-span-2 flex flex-col gap-2">
          {/* Tool Selector */}
          <div className="bg-[#000088] p-2 border-2 border-[#5555ff] flex flex-col gap-1">
            <div className="text-[10px] font-bold text-[#ffff55] tracking-wider mb-1">
              DRAWING TOOLS
            </div>

            <button
              onClick={() => {
                setActiveTool('pen');
                retroSound.action();
              }}
              className={`p-1.5 flex items-center gap-2 text-xs border text-left font-mono transition-colors ${
                activeTool === 'pen'
                  ? 'bg-[#ffff55] text-black border-white font-bold'
                  : 'bg-[#000055] text-white border-[#3333aa] hover:bg-[#000077]'
              }`}
            >
              <Pencil className="w-3.5 h-3.5" />
              <span>Pencil [P]</span>
            </button>

            <button
              onClick={() => {
                setActiveTool('eraser');
                retroSound.action();
              }}
              className={`p-1.5 flex items-center gap-2 text-xs border text-left font-mono transition-colors ${
                activeTool === 'eraser'
                  ? 'bg-[#ffff55] text-black border-white font-bold'
                  : 'bg-[#000055] text-white border-[#3333aa] hover:bg-[#000077]'
              }`}
            >
              <Eraser className="w-3.5 h-3.5" />
              <span>Eraser [E]</span>
            </button>

            <button
              onClick={() => {
                setActiveTool('fill');
                retroSound.action();
              }}
              className={`p-1.5 flex items-center gap-2 text-xs border text-left font-mono transition-colors ${
                activeTool === 'fill'
                  ? 'bg-[#ffff55] text-black border-white font-bold'
                  : 'bg-[#000055] text-white border-[#3333aa] hover:bg-[#000077]'
              }`}
            >
              <PaintBucket className="w-3.5 h-3.5" />
              <span>Fill Bucket [F]</span>
            </button>
          </div>

          {/* Transformation Controls */}
          <div className="bg-[#000088] p-2 border-2 border-[#5555ff] flex flex-col gap-1">
            <div className="text-[10px] font-bold text-[#ffff55] tracking-wider mb-1">
              SHIFT GLYPH
            </div>

            <div className="grid grid-cols-3 gap-1 mb-2">
              <div />
              <button
                onClick={() => handleShift(-1, 0)}
                title="Shift Up"
                className="dos-button p-1 flex justify-center items-center"
              >
                <ArrowUp className="w-3.5 h-3.5" />
              </button>
              <div />

              <button
                onClick={() => handleShift(0, -1)}
                title="Shift Left"
                className="dos-button p-1 flex justify-center items-center"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
              </button>
              <div className="flex items-center justify-center text-[10px] text-[#aaaaaa]">
                DIR
              </div>
              <button
                onClick={() => handleShift(0, 1)}
                title="Shift Right"
                className="dos-button p-1 flex justify-center items-center"
              >
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              <div />
              <button
                onClick={() => handleShift(1, 0)}
                title="Shift Down"
                className="dos-button p-1 flex justify-center items-center"
              >
                <ArrowDown className="w-3.5 h-3.5" />
              </button>
              <div />
            </div>

            <div className="text-[10px] font-bold text-[#ffff55] tracking-wider mb-1">
              MODIFY
            </div>

            <button
              onClick={handleFlipHorizontal}
              className="p-1 flex items-center gap-1.5 text-xs bg-[#000055] border border-[#3333aa] hover:bg-[#000077] text-white font-mono"
            >
              <FlipHorizontal className="w-3.5 h-3.5 text-[#55ffff]" />
              <span>Flip Horiz</span>
            </button>

            <button
              onClick={handleFlipVertical}
              className="p-1 flex items-center gap-1.5 text-xs bg-[#000055] border border-[#3333aa] hover:bg-[#000077] text-white font-mono"
            >
              <FlipVertical className="w-3.5 h-3.5 text-[#55ffff]" />
              <span>Flip Vert</span>
            </button>

            <button
              onClick={handleRotate90}
              className="p-1 flex items-center gap-1.5 text-xs bg-[#000055] border border-[#3333aa] hover:bg-[#000077] text-white font-mono"
            >
              <RotateCw className="w-3.5 h-3.5 text-[#55ff55]" />
              <span>Rotate 90°</span>
            </button>

            <button
              onClick={handleInvert}
              className="p-1 flex items-center gap-1.5 text-xs bg-[#000055] border border-[#3333aa] hover:bg-[#000077] text-white font-mono"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#ffff55]" />
              <span>Invert Bits</span>
            </button>

            <button
              onClick={handleClear}
              className="p-1 flex items-center gap-1.5 text-xs bg-[#aa0000] border border-[#ff5555] hover:bg-[#cc0000] text-white font-mono mt-1 font-bold"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear Grid</span>
            </button>
          </div>

          {/* View Toggles */}
          <div className="bg-[#000088] p-2 border-2 border-[#5555ff] flex flex-col gap-1 text-xs">
            <label className="flex items-center gap-2 cursor-pointer hover:text-[#ffff55]">
              <input
                type="checkbox"
                checked={showGhost}
                onChange={(e) => setShowGhost(e.target.checked)}
                className="accent-[#ffff55]"
              />
              <span className="font-mono text-[11px]">Ghost CP437 Guide</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer hover:text-[#ffff55]">
              <input
                type="checkbox"
                checked={showGrid}
                onChange={(e) => setShowGrid(e.target.checked)}
                className="accent-[#ffff55]"
              />
              <span className="font-mono text-[11px]">Show Grid Lines</span>
            </label>
          </div>
        </div>

        {/* CENTER COLUMN: Big Interactive Pixel Matrix Canvas (6 Cols) */}
        <div className="lg:col-span-6 flex flex-col items-center justify-center bg-[#000055] p-3 md:p-6 border-2 border-[#5555ff] relative shadow-inner">
          <div className="w-full flex items-center justify-between text-xs font-mono text-[#00aaaa] mb-2 px-1">
            <span>
              CELL: {w} × {h} PIXELS
            </span>
            <span className="text-[#ffff55]">
              CLICK / DRAG TO {activeTool.toUpperCase()}
            </span>
          </div>

          {/* Pixel Grid Container */}
          <div
            className="relative bg-[#000000] p-1 border-4 border-[#aaaaaa] shadow-2xl select-none"
            style={{ touchAction: 'none' }}
          >
            {/* The Grid of Pixels */}
            <div
              className="grid gap-[1px] bg-[#222244]"
              style={{
                gridTemplateColumns: `repeat(${w}, minmax(0, 1fr))`,
                width: `${w * 36}px`,
                maxWidth: '100%',
                height: `${h * 36}px`,
              }}
            >
              {Array.from({ length: h }).map((_, r) =>
                Array.from({ length: w }).map((_, c) => {
                  const isPixelSet = getBit(r, c);
                  const isGhostSet = showGhost && ((defaultRows[r] ?? 0) & (1 << (7 - c))) !== 0;

                  return (
                    <div
                      key={`${r}-${c}`}
                      onPointerDown={(e) => handleCellPointerDown(r, c, e)}
                      onPointerEnter={() => handleCellPointerEnter(r, c)}
                      className={`relative cursor-pointer transition-colors duration-75 flex items-center justify-center ${
                        isPixelSet
                          ? 'bg-[#ffffff] shadow-[inset_1px_1px_0px_#ffffff,inset_-1px_-1px_0px_#aaaaaa]'
                          : 'bg-[#000000] hover:bg-[#111133]'
                      }`}
                      style={{
                        border: showGrid ? '1px solid rgba(85, 85, 255, 0.25)' : 'none',
                      }}
                    >
                      {/* Ghost CP437 Reference Indicator */}
                      {!isPixelSet && isGhostSet && (
                        <div className="w-2.5 h-2.5 bg-[#00aa00] opacity-45 rounded-sm" />
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 text-[10px] text-[#aaaaaa] mt-3 font-mono">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 bg-white inline-block border border-gray-400" /> Pixel ON (1)
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 bg-black inline-block border border-gray-600" /> Pixel OFF (0)
            </span>
            {showGhost && (
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 bg-[#00aa00] opacity-50 inline-block border border-green-600" /> Original ROM Ghost
              </span>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Row Byte Table, Binary Bitmask & Multi-Scale Live Previews (4 Cols) */}
        <div className="lg:col-span-4 flex flex-col gap-2">
          {/* Row Bytes & Bitmask Table */}
          <div className="bg-[#000088] p-2.5 border-2 border-[#5555ff] flex flex-col gap-1">
            <div className="flex items-center justify-between text-[11px] font-bold text-[#ffff55] tracking-wider border-b border-[#3333aa] pb-1 mb-1">
              <span>ROW BITMASKS</span>
              <span>HEX & BINARY DATA</span>
            </div>

            <div className="flex flex-col gap-1 font-mono text-[11px]">
              {Array.from({ length: h }).map((_, r) => {
                const b = currentRows[r] ?? 0;
                const binaryStr = b.toString(2).padStart(w, '0');
                const hexStr = `&H${b.toString(16).toUpperCase().padStart(2, '0')}`;

                return (
                  <div
                    key={r}
                    className="flex items-center justify-between px-1.5 py-0.5 bg-[#000055] border border-[#3333aa]"
                  >
                    <span className="text-[#8888aa] text-[10px]">R{r}:</span>
                    <span className="text-[#55ffff] tracking-widest font-mono text-xs">
                      {binaryStr.split('').map((ch, idx) => (
                        <span
                          key={idx}
                          className={ch === '1' ? 'text-[#ffff55] font-bold' : 'text-[#333377]'}
                        >
                          {ch}
                        </span>
                      ))}
                    </span>
                    <span className="text-[#ffffff] font-bold bg-[#0000aa] px-1 border border-[#5555aa]">
                      {hexStr}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Live Scale Previews (1x, 2x, 4x, 8x) */}
          <div className="bg-[#000088] p-2.5 border-2 border-[#5555ff] flex flex-col gap-2">
            <div className="flex items-center justify-between text-[11px] font-bold text-[#ffff55] tracking-wider border-b border-[#3333aa] pb-1">
              <span>LIVE SIZE PREVIEW</span>
              <span className="text-[#00aaaa] text-[10px]">QBASIC SCREEN 13</span>
            </div>

            {/* Scale comparison */}
            <div className="bg-[#000000] p-3 border-2 border-[#aaaaaa] flex items-center justify-around">
              {/* 1x Actual Size */}
              <div className="flex flex-col items-center gap-1">
                <span className="text-[9px] text-[#aaaaaa]">1x (8x8)</span>
                <div
                  className="bg-black border border-[#333333] flex items-center justify-center p-0.5"
                  style={{ width: `${w}px`, height: `${h}px` }}
                >
                  <svg
                    viewBox={`0 0 ${w} ${h}`}
                    style={{ width: `${w}px`, height: `${h}px`, shapeRendering: 'crispEdges' }}
                  >
                    {currentRows.map((b, r) =>
                      Array.from({ length: w }).map((_, bit) =>
                        (b & (1 << (7 - bit))) !== 0 ? (
                          <rect key={`${r}-${bit}`} x={bit} y={r} width={1} height={1} fill="#ffffff" />
                        ) : null
                      )
                    )}
                  </svg>
                </div>
              </div>

              {/* 2x Double Size */}
              <div className="flex flex-col items-center gap-1">
                <span className="text-[9px] text-[#aaaaaa]">2x Scale</span>
                <div
                  className="bg-black border border-[#333333] flex items-center justify-center p-0.5"
                  style={{ width: `${w * 2}px`, height: `${h * 2}px` }}
                >
                  <svg
                    viewBox={`0 0 ${w} ${h}`}
                    style={{ width: `${w * 2}px`, height: `${h * 2}px`, shapeRendering: 'crispEdges' }}
                  >
                    {currentRows.map((b, r) =>
                      Array.from({ length: w }).map((_, bit) =>
                        (b & (1 << (7 - bit))) !== 0 ? (
                          <rect key={`${r}-${bit}`} x={bit} y={r} width={1} height={1} fill="#55ff55" />
                        ) : null
                      )
                    )}
                  </svg>
                </div>
              </div>

              {/* 4x Quad Size */}
              <div className="flex flex-col items-center gap-1">
                <span className="text-[9px] text-[#aaaaaa]">4x Scale</span>
                <div
                  className="bg-black border border-[#333333] flex items-center justify-center p-0.5"
                  style={{ width: `${w * 4}px`, height: `${h * 4}px` }}
                >
                  <svg
                    viewBox={`0 0 ${w} ${h}`}
                    style={{ width: `${w * 4}px`, height: `${h * 4}px`, shapeRendering: 'crispEdges' }}
                  >
                    {currentRows.map((b, r) =>
                      Array.from({ length: w }).map((_, bit) =>
                        (b & (1 << (7 - bit))) !== 0 ? (
                          <rect key={`${r}-${bit}`} x={bit} y={r} width={1} height={1} fill="#ffff55" />
                        ) : null
                      )
                    )}
                  </svg>
                </div>
              </div>

              {/* 6x Size */}
              <div className="flex flex-col items-center gap-1">
                <span className="text-[9px] text-[#aaaaaa]">6x Scale</span>
                <div
                  className="bg-black border border-[#333333] flex items-center justify-center p-0.5"
                  style={{ width: `${w * 6}px`, height: `${h * 6}px` }}
                >
                  <svg
                    viewBox={`0 0 ${w} ${h}`}
                    style={{ width: `${w * 6}px`, height: `${h * 6}px`, shapeRendering: 'crispEdges' }}
                  >
                    {currentRows.map((b, r) =>
                      Array.from({ length: w }).map((_, bit) =>
                        (b & (1 << (7 - bit))) !== 0 ? (
                          <rect key={`${r}-${bit}`} x={bit} y={r} width={1} height={1} fill="#55ffff" />
                        ) : null
                      )
                    )}
                  </svg>
                </div>
              </div>
            </div>

            {/* Quick Word Context Test */}
            <div className="bg-[#000055] p-2 border border-[#3333aa] flex flex-col gap-1">
              <span className="text-[10px] text-[#8888aa] font-mono">
                PREVIEW IN CONTEXT: &quot;A{String.fromCharCode(selectedCode)}B&quot;
              </span>
              <div className="flex items-center gap-1 bg-[#000000] p-1.5 border border-[#444466]">
                {[65, selectedCode, 66].map((code, idx) => {
                  const rows = glyphs[code] || DEFAULT_CP437_FONT[code] || [];
                  return (
                    <div
                      key={idx}
                      style={{ width: `${w * 2}px`, height: `${h * 2}px` }}
                      className={code === selectedCode ? 'border-b-2 border-[#ffff55]' : ''}
                    >
                      <svg
                        viewBox={`0 0 ${w} ${h}`}
                        style={{ width: `${w * 2}px`, height: `${h * 2}px`, shapeRendering: 'crispEdges' }}
                      >
                        {rows.map((b, r) =>
                          Array.from({ length: w }).map((_, bit) =>
                            (b & (1 << (7 - bit))) !== 0 ? (
                              <rect
                                key={`${r}-${bit}`}
                                x={bit}
                                y={r}
                                width={1}
                                height={1}
                                fill={code === selectedCode ? '#ffff55' : '#ffffff'}
                              />
                            ) : null
                          )
                        )}
                      </svg>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
