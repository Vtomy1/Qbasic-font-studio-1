import React, { useMemo, useState } from 'react';
import { FontProject } from '../types/font';
import { CP437_NAMES } from '../utils/cp437Data';
import { retroSound } from '../utils/sound';
import { Search, Filter, CheckCircle2 } from 'lucide-react';

interface CharacterGridProps {
  project: FontProject;
  selectedCode: number;
  onSelectCode: (code: number) => void;
}

export const CharacterGrid: React.FC<CharacterGridProps> = ({
  project,
  selectedCode,
  onSelectCode,
}) => {
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const { glyphs, modifiedGlyphs, dimensions } = project;
  const w = dimensions.width;
  const h = dimensions.height;

  // Filter characters
  const filteredCodes = useMemo(() => {
    const list: number[] = [];
    const query = searchQuery.trim().toLowerCase();

    for (let c = 0; c < 256; c++) {
      const meta = CP437_NAMES[c];
      const isModified = modifiedGlyphs.includes(c);

      // Category filter
      if (filterCategory === 'modified' && !isModified) continue;
      if (filterCategory === 'control' && (c < 0 || (c > 31 && c !== 127))) continue;
      if (filterCategory === 'ascii' && (c < 32 || c > 126)) continue;
      if (filterCategory === 'extended' && (c < 128 || c > 175)) continue;
      if (filterCategory === 'box' && (c < 176 || c > 223)) continue;
      if (filterCategory === 'math' && (c < 224 || c > 255)) continue;

      // Search query filter
      if (query) {
        const hex = c.toString(16).toLowerCase();
        const hexFormatted = `&h${hex}`;
        const hex0x = `0x${hex}`;
        const dec = c.toString();
        const name = meta?.name.toLowerCase() || '';
        const symbol = meta?.symbol.toLowerCase() || '';

        const matches =
          dec === query ||
          hex === query ||
          hexFormatted === query ||
          hex0x === query ||
          symbol === query ||
          name.includes(query);

        if (!matches) continue;
      }

      list.push(c);
    }
    return list;
  }, [filterCategory, searchQuery, modifiedGlyphs]);

  return (
    <div className="flex flex-col h-full bg-[#000088] border-r-2 border-[#555555] text-white">
      {/* Search & Category Filter Toolbar */}
      <div className="p-2 bg-[#0000aa] border-b border-[#000055] flex flex-col gap-2">
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search code (65, &H41), char (A), name..."
            className="w-full bg-[#000055] text-[#ffffff] placeholder-[#8888aa] px-2.5 py-1 text-xs border border-[#5555ff] focus:outline-none focus:border-[#ffff55] font-mono"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1 text-[#aaaaaa] hover:text-[#ffffff] text-xs"
            >
              ✕
            </button>
          )}
        </div>

        {/* Category Pills */}
        <div className="flex flex-wrap gap-1 text-[10px]">
          {[
            { id: 'all', label: 'All 256' },
            { id: 'ascii', label: 'ASCII (32-126)' },
            { id: 'control', label: 'Icons (0-31)' },
            { id: 'box', label: 'Box Drawing' },
            { id: 'extended', label: 'Accents' },
            { id: 'math', label: 'Math/Greek' },
            { id: 'modified', label: `Modified (${modifiedGlyphs.length})` },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => {
                setFilterCategory(cat.id);
                retroSound.action();
              }}
              className={`px-1.5 py-0.5 border ${
                filterCategory === cat.id
                  ? 'bg-[#ffff55] text-[#000000] border-[#ffffff] font-bold'
                  : 'bg-[#000055] text-[#aaaaaa] border-[#3333aa] hover:text-white'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of Glyphs */}
      <div className="flex-1 overflow-y-auto p-2">
        <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-8 lg:grid-cols-8 gap-1">
          {filteredCodes.map((code) => {
            const isSelected = selectedCode === code;
            const isModified = modifiedGlyphs.includes(code);
            const meta = CP437_NAMES[code];
            const rows = glyphs[code] || new Array(h).fill(0);

            return (
              <button
                key={code}
                onClick={() => {
                  onSelectCode(code);
                  retroSound.selectChar();
                }}
                title={`ASCII ${code} (&H${code.toString(16).toUpperCase().padStart(2, '0')}): ${meta?.name || 'Glyph'}`}
                className={`flex flex-col items-center justify-between p-1 border transition-all relative ${
                  isSelected
                    ? 'bg-[#ffff55] text-[#000000] border-[#ffffff] shadow-md scale-105 z-10'
                    : 'bg-[#000055] text-[#ffffff] border-[#3333aa] hover:border-[#55ffff] hover:bg-[#000077]'
                }`}
              >
                {/* Modified Indicator */}
                {isModified && (
                  <span
                    className={`absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full ${
                      isSelected ? 'bg-[#aa0000]' : 'bg-[#ffff55]'
                    }`}
                  />
                )}

                {/* Pixel Canvas Rendering the Character */}
                <div
                  className="w-8 h-8 flex items-center justify-center p-0.5 my-0.5"
                  style={{ imageRendering: 'pixelated' }}
                >
                  <svg
                    viewBox={`0 0 ${w} ${h}`}
                    className="w-full h-full"
                    style={{ shapeRendering: 'crispEdges' }}
                  >
                    {rows.map((rowByte, r) => {
                      const rects: React.ReactNode[] = [];
                      for (let bit = 0; bit < w; bit++) {
                        if ((rowByte & (1 << (7 - bit))) !== 0) {
                          rects.push(
                            <rect
                              key={`${r}-${bit}`}
                              x={bit}
                              y={r}
                              width={1}
                              height={1}
                              fill={isSelected ? '#000000' : '#ffffff'}
                            />
                          );
                        }
                      }
                      return rects;
                    })}
                  </svg>
                </div>

                {/* Code Label (Dec & Hex) */}
                <div className="text-[9px] font-mono leading-tight text-center">
                  <span className="font-bold">{code}</span>
                  <span className={`block opacity-75 ${isSelected ? 'text-[#333333]' : 'text-[#8888aa]'}`}>
                    &H{code.toString(16).toUpperCase().padStart(2, '0')}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {filteredCodes.length === 0 && (
          <div className="text-center py-10 text-[#aaaaaa] text-xs">
            No glyphs match current filter or search.
          </div>
        )}
      </div>

      {/* Selected Character Footer Info */}
      <div className="p-2 bg-[#000055] border-t border-[#000044] text-xs font-mono flex items-center justify-between">
        <div>
          <span className="text-[#ffff55] font-bold">CHAR {selectedCode}</span>
          <span className="text-[#aaaaaa] ml-2">
            (&H{selectedCode.toString(16).toUpperCase().padStart(2, '0')})
          </span>
          <div className="text-[11px] text-[#00aaaa] truncate max-w-[200px]">
            {CP437_NAMES[selectedCode]?.name || 'Custom Character'}
          </div>
        </div>

        {modifiedGlyphs.includes(selectedCode) ? (
          <span className="bg-[#aa0000] text-white px-1.5 py-0.5 text-[10px] font-bold">
            EDITED
          </span>
        ) : (
          <span className="text-[#888888] text-[10px]">DEFAULT</span>
        )}
      </div>
    </div>
  );
};
