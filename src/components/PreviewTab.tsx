import React, { useState, useEffect, useRef } from 'react';
import { FontProject } from '../types/font';
import { DOS_PALETTE } from '../utils/cp437Data';
import { retroSound } from '../utils/sound';
import {
  Gamepad2,
  Type,
  Swords,
  Layers,
  Sparkles,
  ArrowRight,
  Terminal,
  Grid
} from 'lucide-react';

interface PreviewTabProps {
  project: FontProject;
  onSelectGlyph: (code: number) => void;
  onBackToEditor: () => void;
}

type GameMockupMode = 'text' | 'rpg' | 'arcade' | 'roguelike' | 'charmap';

export const PreviewTab: React.FC<PreviewTabProps> = ({
  project,
  onSelectGlyph,
  onBackToEditor,
}) => {
  const [mode, setMode] = useState<GameMockupMode>('roguelike');
  const [customText, setCustomText] = useState<string>(
    'QBASIC GORILLAS & NIBBLES\n\nHELLO FROM SCREEN 13!\nTHE HERO WIELDS A SHINING BLADE.'
  );
  const [fgColor, setFgColor] = useState<number>(14); // Yellow
  const [bgColor, setBgColor] = useState<number>(1); // Dark Blue (#0000AA)
  const [scale, setScale] = useState<number>(2);

  // Roguelike interactive state
  const [playerPos, setPlayerPos] = useState<{ x: number; y: number }>({ x: 4, y: 3 });
  const [playerHp, setPlayerHp] = useState<number>(20);
  const [playerGold, setPlayerGold] = useState<number>(45);
  const [dungeonLevel, setDungeonLevel] = useState<number>(1);
  const [gameLog, setGameLog] = useState<string>('Welcome to the QBasic Dungeon! Use Arrow Keys to move.');

  const { dimensions, glyphs } = project;
  const w = dimensions.width;
  const h = dimensions.height;

  // Roguelike map grid (20 columns x 10 rows)
  const [mapGrid, setMapGrid] = useState<string[]>([
    '####################',
    '#....$....#........#',
    '#.o.......#....$o..#',
    '#....@....+........#',
    '#.........#........#',
    '#######+############',
    '#.....#.......#....#',
    '#..$..#...o...+..>.#',
    '#.....#.......#....#',
    '####################',
  ]);

  // Handle player movement in roguelike
  const movePlayer = (dx: number, dy: number) => {
    const newX = playerPos.x + dx;
    const newY = playerPos.y + dy;

    if (newY < 0 || newY >= mapGrid.length || newX < 0 || newX >= mapGrid[0].length) return;

    const cell = mapGrid[newY][newX];
    if (cell === '#') {
      // Wall collision
      retroSound.beep(200, 20);
      return;
    }

    if (cell === '+') {
      // Open door
      const newGrid = [...mapGrid];
      const rowChars = newGrid[newY].split('');
      rowChars[newX] = '/';
      newGrid[newY] = rowChars.join('');
      setMapGrid(newGrid);
      setGameLog('You opened a wooden dungeon door.');
      retroSound.beep(500, 30);
      return;
    }

    if (cell === '$') {
      // Pick up gold
      setPlayerGold((g) => g + 25);
      setGameLog('You picked up 25 Gold coins ($)!');
      retroSound.beep(1200, 40);
    } else if (cell === 'o') {
      // Fight orc
      setPlayerHp((hp) => Math.max(1, hp - 4));
      setPlayerGold((g) => g + 15);
      setGameLog('You struck down an Orc (o)! Received 15 Gold. -4 HP.');
      retroSound.beep(350, 40);
    } else if (cell === '>') {
      // Next dungeon floor
      setDungeonLevel((l) => l + 1);
      setPlayerHp(20);
      setGameLog(`Descended to Dungeon Floor ${dungeonLevel + 1}! Fully healed.`);
      retroSound.success();
    } else {
      retroSound.beep(800, 15);
    }

    // Clear old cell, set new
    const newGrid = [...mapGrid];
    const prevRow = newGrid[playerPos.y].split('');
    prevRow[playerPos.x] = '.';
    newGrid[playerPos.y] = prevRow.join('');

    const currRow = newGrid[newY].split('');
    currRow[newX] = '@';
    newGrid[newY] = currRow.join('');

    setMapGrid(newGrid);
    setPlayerPos({ x: newX, y: newY });
  };

  // Keyboard navigation for roguelike
  useEffect(() => {
    if (mode !== 'roguelike') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'KeyW'].includes(e.code)) {
        e.preventDefault();
        movePlayer(0, -1);
      } else if (['ArrowDown', 'KeyS'].includes(e.code)) {
        e.preventDefault();
        movePlayer(0, 1);
      } else if (['ArrowLeft', 'KeyA'].includes(e.code)) {
        e.preventDefault();
        movePlayer(-1, 0);
      } else if (['ArrowRight', 'KeyD'].includes(e.code)) {
        e.preventDefault();
        movePlayer(1, 0);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mode, playerPos, mapGrid, dungeonLevel]);

  // Helper to draw a single character to canvas context
  const drawGlyph = (
    ctx: CanvasRenderingContext2D,
    charCode: number,
    destX: number,
    destY: number,
    glyphScale: number,
    colorHex: string
  ) => {
    const rows = glyphs[charCode] || [];
    ctx.fillStyle = colorHex;

    for (let r = 0; r < h; r++) {
      const b = rows[r] ?? 0;
      if (b === 0) continue;
      for (let bit = 0; bit < w; bit++) {
        if ((b & (1 << (7 - bit))) !== 0) {
          ctx.fillRect(
            destX + bit * glyphScale,
            destY + r * glyphScale,
            glyphScale,
            glyphScale
          );
        }
      }
    }
  };

  // Free Text Canvas Renderer
  const textCanvasRef = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    if (mode !== 'text' || !textCanvasRef.current) return;
    const canvas = textCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Canvas size
    canvas.width = 640;
    canvas.height = 360;

    // Fill background
    ctx.fillStyle = DOS_PALETTE[bgColor]?.hex || '#0000aa';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const colorStr = DOS_PALETTE[fgColor]?.hex || '#ffff55';

    // Render text with word wrap
    const lines = customText.split('\n');
    let curY = 20;

    lines.forEach((line) => {
      let curX = 20;
      for (let i = 0; i < line.length; i++) {
        const charCode = line.charCodeAt(i);
        drawGlyph(ctx, charCode, curX, curY, scale, colorStr);
        curX += w * scale;
        if (curX > canvas.width - (w * scale * 2)) {
          curX = 20;
          curY += (h + 2) * scale;
        }
      }
      curY += (h + 4) * scale;
    });
  }, [mode, customText, fgColor, bgColor, scale, glyphs, w, h]);

  return (
    <div className="flex-1 flex flex-col bg-[#0000aa] text-white p-2 md:p-3 overflow-y-auto">
      {/* Top Mode Selector Bar */}
      <div className="bg-[#aaaaaa] text-black p-2 dos-box flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex items-center space-x-1">
          <button
            onClick={() => {
              setMode('roguelike');
              retroSound.action();
            }}
            className={`dos-button px-3 py-1 flex items-center gap-1.5 text-xs ${
              mode === 'roguelike' ? 'bg-[#ffff55] text-black font-black' : ''
            }`}
          >
            <Gamepad2 className="w-3.5 h-3.5 text-[#aa0000]" />
            <span>PLAYABLE ROGUELIKE</span>
          </button>

          <button
            onClick={() => {
              setMode('rpg');
              retroSound.action();
            }}
            className={`dos-button px-3 py-1 flex items-center gap-1.5 text-xs ${
              mode === 'rpg' ? 'bg-[#ffff55] text-black font-black' : ''
            }`}
          >
            <Swords className="w-3.5 h-3.5 text-[#0000aa]" />
            <span>RPG BATTLE SCENE</span>
          </button>

          <button
            onClick={() => {
              setMode('arcade');
              retroSound.action();
            }}
            className={`dos-button px-3 py-1 flex items-center gap-1.5 text-xs ${
              mode === 'arcade' ? 'bg-[#ffff55] text-black font-black' : ''
            }`}
          >
            <Terminal className="w-3.5 h-3.5 text-[#00aa00]" />
            <span>ARCADE HUD</span>
          </button>

          <button
            onClick={() => {
              setMode('text');
              retroSound.action();
            }}
            className={`dos-button px-3 py-1 flex items-center gap-1.5 text-xs ${
              mode === 'text' ? 'bg-[#ffff55] text-black font-black' : ''
            }`}
          >
            <Type className="w-3.5 h-3.5" />
            <span>TEXT TESTER</span>
          </button>

          <button
            onClick={() => {
              setMode('charmap');
              retroSound.action();
            }}
            className={`dos-button px-3 py-1 flex items-center gap-1.5 text-xs ${
              mode === 'charmap' ? 'bg-[#ffff55] text-black font-black' : ''
            }`}
          >
            <Grid className="w-3.5 h-3.5 text-[#aa5500]" />
            <span>256 CHART</span>
          </button>
        </div>

        <button
          onClick={onBackToEditor}
          className="dos-button px-3 py-1 bg-[#ffffff] text-[#0000aa] font-bold text-xs flex items-center gap-1"
        >
          <ArrowRight className="w-3.5 h-3.5" />
          <span>RETURN TO GLYPH EDITOR</span>
        </button>
      </div>

      {/* MODE 1: PLAYABLE ROGUELIKE MINI-GAME */}
      {mode === 'roguelike' && (
        <div className="flex-1 flex flex-col items-center justify-center gap-3">
          <div className="bg-[#000000] border-4 border-[#aaaaaa] p-4 shadow-2xl flex flex-col items-center font-mono">
            {/* Title */}
            <div className="w-full text-center text-[#ffff55] text-xs font-bold border-b border-[#333333] pb-1 mb-2 tracking-wider">
              --- QBASIC DUNGEON CRAWLER (SCREEN 13) ---
            </div>

            {/* The Dungeon Grid */}
            <div
              className="bg-black select-none my-2"
              style={{
                display: 'grid',
                gridTemplateRows: `repeat(${mapGrid.length}, minmax(0, 1fr))`,
                gap: '1px',
              }}
            >
              {mapGrid.map((rowStr, rIdx) => (
                <div key={rIdx} className="flex">
                  {rowStr.split('').map((char, cIdx) => {
                    const charCode = char.charCodeAt(0);
                    const rows = glyphs[charCode] || [];
                    const isPlayer = char === '@';
                    const isOrc = char === 'o';
                    const isGold = char === '$';
                    const isDoor = char === '+' || char === '/';
                    const isWall = char === '#';
                    const isStairs = char === '>';

                    let charColor = '#aaaaaa';
                    if (isPlayer) charColor = '#ffff55';
                    else if (isOrc) charColor = '#ff5555';
                    else if (isGold) charColor = '#ffff55';
                    else if (isDoor) charColor = '#aa5500';
                    else if (isWall) charColor = '#5555ff';
                    else if (isStairs) charColor = '#55ffff';

                    return (
                      <div
                        key={cIdx}
                        style={{
                          width: `${w * 3}px`,
                          height: `${h * 3}px`,
                        }}
                        className="flex items-center justify-center p-0.5"
                      >
                        <svg
                          viewBox={`0 0 ${w} ${h}`}
                          style={{
                            width: `${w * 3}px`,
                            height: `${h * 3}px`,
                            shapeRendering: 'crispEdges',
                          }}
                        >
                          {rows.map((b, row) =>
                            Array.from({ length: w }).map((_, bit) =>
                              (b & (1 << (7 - bit))) !== 0 ? (
                                <rect
                                  key={`${row}-${bit}`}
                                  x={bit}
                                  y={row}
                                  width={1}
                                  height={1}
                                  fill={charColor}
                                />
                              ) : null
                            )
                          )}
                        </svg>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>

            {/* In-game HUD */}
            <div className="w-full bg-[#000055] p-2 border border-[#5555ff] flex items-center justify-between text-xs mt-2">
              <span className="text-[#ff5555] font-bold">HP: {playerHp}/20</span>
              <span className="text-[#ffff55] font-bold">GOLD: ${playerGold}</span>
              <span className="text-[#55ffff]">DUNGEON FLOOR: {dungeonLevel}</span>
            </div>

            {/* Game Message Log */}
            <div className="w-full bg-[#111111] p-1.5 text-[11px] text-[#55ff55] mt-1 border border-[#333333] text-center">
              &gt; {gameLog}
            </div>

            {/* On-screen controls */}
            <div className="flex items-center gap-2 mt-3">
              <span className="text-[10px] text-[#aaaaaa]">MOVE:</span>
              <button
                onClick={() => movePlayer(0, -1)}
                className="dos-button px-2.5 py-1 text-xs"
              >
                ▲ UP
              </button>
              <button
                onClick={() => movePlayer(-1, 0)}
                className="dos-button px-2.5 py-1 text-xs"
              >
                ◄ LEFT
              </button>
              <button
                onClick={() => movePlayer(0, 1)}
                className="dos-button px-2.5 py-1 text-xs"
              >
                ▼ DOWN
              </button>
              <button
                onClick={() => movePlayer(1, 0)}
                className="dos-button px-2.5 py-1 text-xs"
              >
                ► RIGHT
              </button>
            </div>
          </div>

          <div className="text-xs text-[#ffff55] font-mono text-center">
            * This dungeon is rendered strictly pixel-by-pixel with your custom font data!
          </div>
        </div>
      )}

      {/* MODE 2: RPG BATTLE SCENE */}
      {mode === 'rpg' && (
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="bg-[#000000] border-4 border-[#aaaaaa] p-6 shadow-2xl max-w-2xl w-full font-mono flex flex-col gap-4">
            {/* Top Scene: Enemy Encounter */}
            <div className="flex items-center justify-between border-b-2 border-[#555555] pb-3">
              <div className="flex items-center space-x-4">
                {/* Enemy Avatar built with font character 1 or 2 */}
                <div
                  className="bg-[#000055] p-2 border-2 border-[#ff5555] flex items-center justify-center"
                  style={{ width: `${w * 6}px`, height: `${h * 6}px` }}
                >
                  <svg
                    viewBox={`0 0 ${w} ${h}`}
                    style={{ width: `${w * 6}px`, height: `${h * 6}px`, shapeRendering: 'crispEdges' }}
                  >
                    {(glyphs[2] || glyphs[8] || []).map((b, r) =>
                      Array.from({ length: w }).map((_, bit) =>
                        (b & (1 << (7 - bit))) !== 0 ? (
                          <rect key={`${r}-${bit}`} x={bit} y={r} width={1} height={1} fill="#ff5555" />
                        ) : null
                      )
                    )}
                  </svg>
                </div>

                <div>
                  <div className="text-sm font-bold text-[#ff5555]">SHADOW GOBLIN LORD</div>
                  <div className="text-xs text-[#aaaaaa]">HP: [████████░░] 80/100</div>
                  <div className="text-[10px] text-[#ffff55]">LVL 12 BEAST</div>
                </div>
              </div>

              <div className="text-right">
                <div className="text-sm font-bold text-[#55ff55]">HERO WARRIOR</div>
                <div className="text-xs text-[#ffffff]">HP: [██████████] 150/150</div>
                <div className="text-xs text-[#55ffff]">MP: [██████░░░░] 60/100</div>
              </div>
            </div>

            {/* RPG Dialog Box with classic CP437 double border look */}
            <div className="bg-[#0000aa] p-3 border-2 border-[#ffffff] text-xs leading-relaxed shadow-md">
              <span className="text-[#ffff55] font-bold block mb-1">
                ╔═══════════════════════════════════════════════╗
              </span>
              <span className="text-[#ffffff]">
                The Shadow Goblin lunges from the dark! &quot;You shall not pass to the lower catacombs!&quot;
              </span>
              <span className="text-[#ffff55] font-bold block mt-1">
                ╚═══════════════════════════════════════════════╝
              </span>
            </div>

            {/* RPG Battle Menu */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {['[1] ATTACK SWORD', '[2] CAST FIREBALL', '[3] HEALING POTION', '[4] FLEE DUNGEON'].map(
                (cmd, idx) => (
                  <button
                    key={idx}
                    onClick={() => retroSound.action()}
                    className="dos-button p-2 text-xs text-center hover:bg-[#ffff55] hover:text-black font-bold"
                  >
                    {cmd}
                  </button>
                )
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODE 3: RETRO ARCADE HUD */}
      {mode === 'arcade' && (
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="bg-[#000000] border-4 border-[#aaaaaa] p-6 shadow-2xl max-w-xl w-full font-mono flex flex-col gap-6">
            {/* High Score Header */}
            <div className="flex justify-between items-center text-xs font-bold border-b border-[#333333] pb-2">
              <div className="text-center">
                <span className="text-[#ff5555] block">1UP</span>
                <span className="text-[#ffffff]">048290</span>
              </div>
              <div className="text-center">
                <span className="text-[#ffff55] block">HIGH SCORE</span>
                <span className="text-[#ffffff]">150000</span>
              </div>
              <div className="text-center">
                <span className="text-[#5555ff] block">2UP</span>
                <span className="text-[#ffffff]">000000</span>
              </div>
            </div>

            {/* Arcade Game Canvas Mockup */}
            <div className="bg-[#050510] h-48 border-2 border-[#555555] flex flex-col items-center justify-center relative overflow-hidden">
              <div className="text-sm font-bold text-[#ffff55] tracking-widest animate-pulse">
                STAGE 03: ASTEROID BELT
              </div>
              <div className="text-xs text-[#55ffff] mt-2">
                BONUS MULTIPLIER x4
              </div>

              {/* Player Ship Sprite */}
              <div
                className="mt-4 flex items-center justify-center"
                style={{ width: `${w * 4}px`, height: `${h * 4}px` }}
              >
                <svg
                  viewBox={`0 0 ${w} ${h}`}
                  style={{ width: `${w * 4}px`, height: `${h * 4}px`, shapeRendering: 'crispEdges' }}
                >
                  {(glyphs[30] || glyphs[24] || []).map((b, r) =>
                    Array.from({ length: w }).map((_, bit) =>
                      (b & (1 << (7 - bit))) !== 0 ? (
                        <rect key={`${r}-${bit}`} x={bit} y={r} width={1} height={1} fill="#55ff55" />
                      ) : null
                    )
                  )}
                </svg>
              </div>
            </div>

            {/* Bottom HUD: Lives, Shields & Credits */}
            <div className="flex justify-between items-center text-xs">
              <div className="flex items-center gap-1 text-[#ff5555]">
                <span>LIVES:</span>
                <span>♥♥♥</span>
              </div>
              <div className="text-[#ffff55] font-bold">INSERT COIN (25¢)</div>
              <div className="text-[#00aaaa]">CREDITS: 02</div>
            </div>
          </div>
        </div>
      )}

      {/* MODE 4: CUSTOM TEXT TESTER */}
      {mode === 'text' && (
        <div className="flex-1 flex flex-col lg:flex-row gap-3">
          {/* Controls Panel */}
          <div className="lg:w-80 bg-[#000088] p-3 border-2 border-[#5555ff] flex flex-col gap-3">
            <div className="text-xs font-bold text-[#ffff55]">TEXT INPUT</div>
            <textarea
              rows={4}
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              className="w-full bg-[#000055] text-white p-2 border border-[#5555ff] font-mono text-xs focus:outline-none focus:border-[#ffff55]"
            />

            {/* Preset Sentences */}
            <div className="flex flex-wrap gap-1">
              {[
                'THE QUICK BROWN FOX',
                'GAME OVER - TRY AGAIN',
                'INSERT 25¢ TO PLAY',
                'QBASIC 4.5 SCREEN 13',
              ].map((phrase, idx) => (
                <button
                  key={idx}
                  onClick={() => setCustomText(phrase)}
                  className="text-[10px] bg-[#000055] hover:bg-[#0000aa] border border-[#3333aa] px-1.5 py-0.5 text-[#aaaaaa] hover:text-white font-mono"
                >
                  {phrase}
                </button>
              ))}
            </div>

            {/* QBasic Color Selectors */}
            <div>
              <div className="text-xs font-bold text-[#ffff55] mb-1">
                COLOR {fgColor} (FOREGROUND)
              </div>
              <div className="grid grid-cols-8 gap-1">
                {DOS_PALETTE.map((pal) => (
                  <button
                    key={pal.code}
                    onClick={() => {
                      setFgColor(pal.code);
                      retroSound.action();
                    }}
                    title={`${pal.code}: ${pal.name}`}
                    style={{ backgroundColor: pal.hex }}
                    className={`w-7 h-6 border ${
                      fgColor === pal.code ? 'border-white ring-2 ring-yellow-400' : 'border-black'
                    }`}
                  />
                ))}
              </div>
            </div>

            <div>
              <div className="text-xs font-bold text-[#ffff55] mb-1">
                BACKGROUND COLOR ({bgColor})
              </div>
              <div className="grid grid-cols-8 gap-1">
                {DOS_PALETTE.slice(0, 8).map((pal) => (
                  <button
                    key={pal.code}
                    onClick={() => {
                      setBgColor(pal.code);
                      retroSound.action();
                    }}
                    title={`${pal.code}: ${pal.name}`}
                    style={{ backgroundColor: pal.hex }}
                    className={`w-7 h-6 border ${
                      bgColor === pal.code ? 'border-white ring-2 ring-yellow-400' : 'border-black'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Scale Slider */}
            <div>
              <div className="text-xs font-bold text-[#ffff55] mb-1">
                TEXT SCALE: {scale}x
              </div>
              <div className="flex gap-1">
                {[1, 2, 3, 4].map((s) => (
                  <button
                    key={s}
                    onClick={() => setScale(s)}
                    className={`flex-1 py-1 text-xs border font-bold ${
                      scale === s ? 'bg-[#ffff55] text-black border-white' : 'bg-[#000055] text-white border-[#3333aa]'
                    }`}
                  >
                    {s}x
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Canvas Display */}
          <div className="flex-1 bg-[#000000] border-4 border-[#aaaaaa] p-3 flex items-center justify-center shadow-inner overflow-auto">
            <canvas
              ref={textCanvasRef}
              className="border border-[#555555] shadow-lg max-w-full"
              style={{ imageRendering: 'pixelated' }}
            />
          </div>
        </div>
      )}

      {/* MODE 5: FULL 256 CHARACTER MAP CHART */}
      {mode === 'charmap' && (
        <div className="flex-1 flex flex-col items-center justify-center p-2 overflow-auto">
          <div className="bg-[#000000] border-4 border-[#aaaaaa] p-4 shadow-2xl max-w-3xl w-full font-mono">
            <div className="text-center text-[#ffff55] text-xs font-bold border-b border-[#333333] pb-1 mb-3">
              === FULL CODE PAGE 437 CHARACTER MATRIX (0-255) ===
            </div>

            {/* 16x16 Table */}
            <div className="grid grid-cols-16 gap-[2px] bg-[#222233] p-1">
              {Array.from({ length: 256 }).map((_, code) => {
                const rows = glyphs[code] || [];
                const isModified = project.modifiedGlyphs.includes(code);

                return (
                  <button
                    key={code}
                    onClick={() => {
                      onSelectGlyph(code);
                      retroSound.selectChar();
                    }}
                    title={`Char ${code} (&H${code.toString(16).toUpperCase().padStart(2, '0')}) - Click to Edit`}
                    className={`w-7 h-7 flex flex-col items-center justify-center p-0.5 relative transition-all ${
                      isModified
                        ? 'bg-[#000088] border border-[#ffff55]'
                        : 'bg-[#000000] border border-[#222244] hover:border-[#55ffff]'
                    }`}
                  >
                    <svg
                      viewBox={`0 0 ${w} ${h}`}
                      className="w-full h-full"
                      style={{ shapeRendering: 'crispEdges' }}
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
                              fill={isModified ? '#ffff55' : '#ffffff'}
                            />
                          ) : null
                        )
                      )}
                    </svg>
                  </button>
                );
              })}
            </div>

            <div className="text-[11px] text-[#aaaaaa] text-center mt-3">
              Click any character box to load and edit it in the Glyph Matrix.
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
