import React, { useState } from 'react';
import { FontProject, DOSTheme } from '../types/font';
import { retroSound } from '../utils/sound';
import { PRESET_FONTS } from '../utils/presets';
import {
  FileCode,
  FolderOpen,
  Save,
  RotateCcw,
  Sparkles,
  Volume2,
  VolumeX,
  Tv,
  HelpCircle,
  Download,
  Palette,
  Layers,
  ChevronDown
} from 'lucide-react';

interface HeaderProps {
  project: FontProject;
  onUpdateProject: (updater: (prev: FontProject) => FontProject) => void;
  onLoadPreset: (presetId: string) => void;
  onOpenExport: () => void;
  onOpenProjects: () => void;
  onOpenHelp: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  theme: DOSTheme;
  setTheme: (t: DOSTheme) => void;
  crtEnabled: boolean;
  setCrtEnabled: (v: boolean | ((prev: boolean) => boolean)) => void;
  soundEnabled: boolean;
  setSoundEnabled: (v: boolean | ((prev: boolean) => boolean)) => void;
  activeTab: 'editor' | 'preview';
  setActiveTab: (tab: 'editor' | 'preview') => void;
}

export const Header: React.FC<HeaderProps> = ({
  project,
  onUpdateProject,
  onLoadPreset,
  onOpenExport,
  onOpenProjects,
  onOpenHelp,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  theme,
  setTheme,
  crtEnabled,
  setCrtEnabled,
  soundEnabled,
  setSoundEnabled,
  activeTab,
  setActiveTab,
}) => {
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  const toggleSound = () => {
    setSoundEnabled((prev) => {
      const next = !prev;
      retroSound.enabled = next;
      if (next) retroSound.beep(880, 40);
      return next;
    });
  };

  const handleDimensionsChange = (h: number) => {
    onUpdateProject((prev) => {
      // Re-sample or pad rows for all glyphs
      const newGlyphs: Record<number, number[]> = {};
      for (let i = 0; i < 256; i++) {
        const oldRows = prev.glyphs[i] || [];
        const nextRows = new Array(h).fill(0);
        for (let r = 0; r < h; r++) {
          if (r < oldRows.length) {
            nextRows[r] = oldRows[r];
          }
        }
        newGlyphs[i] = nextRows;
      }
      return {
        ...prev,
        dimensions: { width: 8, height: h },
        glyphs: newGlyphs,
        updatedAt: Date.now(),
      };
    });
    retroSound.action();
  };

  return (
    <header className="bg-[#aaaaaa] text-[#000000] border-b-2 border-[#555555] select-none text-xs md:text-sm font-bold shadow-md z-30">
      {/* Top Title Bar */}
      <div className="bg-[#0000aa] text-[#ffffff] px-3 py-1 flex items-center justify-between border-b border-[#000055]">
        <div className="flex items-center space-x-2">
          <span className="bg-[#ffffff] text-[#0000aa] px-1.5 py-0.5 font-black text-xs tracking-wider">
            QBASIC
          </span>
          <span className="tracking-wide text-xs md:text-sm font-mono flex items-center gap-2">
            FONT STUDIO v3.2 — <span className="text-[#ffff55]">{project.name}.BAS</span>
            <span className="text-[#00aaaa] text-[11px] font-normal hidden sm:inline">
              ({project.dimensions.width}x{project.dimensions.height} Cell)
            </span>
          </span>
        </div>

        <div className="flex items-center space-x-2">
          {project.modifiedGlyphs.length > 0 && (
            <span className="bg-[#aa0000] text-[#ffffff] px-2 py-0.5 text-[11px] rounded-none animate-pulse">
              {project.modifiedGlyphs.length} GLYPHS MODIFIED
            </span>
          )}

          {/* Quick tab switcher */}
          <div className="flex bg-[#000055] p-0.5 border border-[#5555ff]">
            <button
              onClick={() => {
                setActiveTab('editor');
                retroSound.action();
              }}
              className={`px-2.5 py-0.5 text-xs transition-colors ${
                activeTab === 'editor'
                  ? 'bg-[#ffffff] text-[#0000aa] font-bold shadow-sm'
                  : 'text-[#aaaaaa] hover:text-[#ffffff]'
              }`}
            >
              EDITOR [F2]
            </button>
            <button
              onClick={() => {
                setActiveTab('preview');
                retroSound.action();
              }}
              className={`px-2.5 py-0.5 text-xs transition-colors ${
                activeTab === 'preview'
                  ? 'bg-[#ffff55] text-[#0000aa] font-bold shadow-sm'
                  : 'text-[#aaaaaa] hover:text-[#ffffff]'
              }`}
            >
              GAME TEST [F3]
            </button>
          </div>

          {/* CRT toggle */}
          <button
            onClick={() => setCrtEnabled((prev) => !prev)}
            title="Toggle CRT Screen Scanlines & Curve"
            className={`px-2 py-0.5 text-xs border flex items-center gap-1 ${
              crtEnabled
                ? 'bg-[#00aa00] text-black border-[#55ff55]'
                : 'bg-[#555555] text-[#aaaaaa] border-[#888888]'
            }`}
          >
            <Tv className="w-3.5 h-3.5" />
            <span className="hidden md:inline">CRT {crtEnabled ? 'ON' : 'OFF'}</span>
          </button>

          {/* Audio Beep Toggle */}
          <button
            onClick={toggleSound}
            title="Toggle Retro PC Speaker Sound Effects"
            className={`px-2 py-0.5 text-xs border flex items-center gap-1 ${
              soundEnabled
                ? 'bg-[#00aaaa] text-black border-[#55ffff]'
                : 'bg-[#555555] text-[#aaaaaa] border-[#888888]'
            }`}
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            <span className="hidden md:inline">SPEAKER</span>
          </button>
        </div>
      </div>

      {/* Classic QuickBASIC Menu Bar */}
      <div className="flex items-center justify-between px-2 py-1 bg-[#aaaaaa] relative">
        <div className="flex items-center space-x-1">
          {/* File Menu */}
          <div className="relative">
            <button
              onClick={() => setOpenMenu(openMenu === 'file' ? null : 'file')}
              className={`px-2 py-0.5 hover:bg-[#0000aa] hover:text-[#ffffff] transition-colors flex items-center gap-1 ${
                openMenu === 'file' ? 'bg-[#0000aa] text-[#ffffff]' : ''
              }`}
            >
              <u>F</u>ile <ChevronDown className="w-3 h-3" />
            </button>
            {openMenu === 'file' && (
              <div
                className="absolute left-0 top-full mt-0.5 w-56 bg-[#aaaaaa] text-[#000000] dos-box p-1 z-50 shadow-2xl flex flex-col gap-0.5"
                onMouseLeave={() => setOpenMenu(null)}
              >
                <button
                  onClick={() => {
                    onOpenProjects();
                    setOpenMenu(null);
                    retroSound.action();
                  }}
                  className="w-full text-left px-2 py-1 hover:bg-[#0000aa] hover:text-[#ffffff] flex items-center gap-2"
                >
                  <FolderOpen className="w-3.5 h-3.5 text-[#0000aa]" />
                  <span><u>O</u>pen Project Library...</span>
                </button>
                <button
                  onClick={() => {
                    onOpenProjects();
                    setOpenMenu(null);
                    retroSound.action();
                  }}
                  className="w-full text-left px-2 py-1 hover:bg-[#0000aa] hover:text-[#ffffff] flex items-center gap-2"
                >
                  <Save className="w-3.5 h-3.5 text-[#00aa00]" />
                  <span><u>S</u>ave to Browser</span>
                </button>
                <hr className="border-t border-[#555555] my-1" />
                <button
                  onClick={() => {
                    onOpenExport();
                    setOpenMenu(null);
                    retroSound.action();
                  }}
                  className="w-full text-left px-2 py-1 hover:bg-[#0000aa] hover:text-[#ffffff] flex items-center gap-2 font-black"
                >
                  <FileCode className="w-3.5 h-3.5 text-[#aa0000]" />
                  <span><u>E</u>xport Game Code (.BAS / .FNT)...</span>
                </button>
                <hr className="border-t border-[#555555] my-1" />
                <button
                  onClick={() => {
                    onLoadPreset('cp437_default');
                    setOpenMenu(null);
                    retroSound.clearSound();
                  }}
                  className="w-full text-left px-2 py-1 hover:bg-[#0000aa] hover:text-[#ffffff] flex items-center gap-2 text-[#aa0000]"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset to Default CP437</span>
                </button>
              </div>
            )}
          </div>

          {/* Presets Menu */}
          <div className="relative">
            <button
              onClick={() => setOpenMenu(openMenu === 'presets' ? null : 'presets')}
              className={`px-2 py-0.5 hover:bg-[#0000aa] hover:text-[#ffffff] transition-colors flex items-center gap-1 ${
                openMenu === 'presets' ? 'bg-[#0000aa] text-[#ffffff]' : ''
              }`}
            >
              <u>P</u>resets <ChevronDown className="w-3 h-3" />
            </button>
            {openMenu === 'presets' && (
              <div
                className="absolute left-0 top-full mt-0.5 w-64 bg-[#aaaaaa] text-[#000000] dos-box p-1 z-50 shadow-2xl flex flex-col gap-0.5"
                onMouseLeave={() => setOpenMenu(null)}
              >
                <div className="px-2 py-0.5 text-[10px] text-[#555555] font-bold">LOAD RETRO PRESET:</div>
                {PRESET_FONTS.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => {
                      onLoadPreset(preset.id);
                      setOpenMenu(null);
                      retroSound.action();
                    }}
                    className="w-full text-left px-2 py-1 hover:bg-[#0000aa] hover:text-[#ffffff] flex items-center justify-between"
                  >
                    <span>{preset.name}</span>
                    <span className="text-[10px] opacity-75">{preset.category}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Dimensions Menu (8x8, 8x12, 8x14, 8x16) */}
          <div className="relative">
            <button
              onClick={() => setOpenMenu(openMenu === 'dimensions' ? null : 'dimensions')}
              className={`px-2 py-0.5 hover:bg-[#0000aa] hover:text-[#ffffff] transition-colors flex items-center gap-1 ${
                openMenu === 'dimensions' ? 'bg-[#0000aa] text-[#ffffff]' : ''
              }`}
            >
              <u>S</u>ize: {project.dimensions.width}x{project.dimensions.height} <ChevronDown className="w-3 h-3" />
            </button>
            {openMenu === 'dimensions' && (
              <div
                className="absolute left-0 top-full mt-0.5 w-52 bg-[#aaaaaa] text-[#000000] dos-box p-1 z-50 shadow-2xl flex flex-col gap-0.5"
                onMouseLeave={() => setOpenMenu(null)}
              >
                <div className="px-2 py-0.5 text-[10px] text-[#555555] font-bold">CELL DIMENSIONS:</div>
                {[
                  { h: 8, label: '8x8 (Standard QBasic SCREEN 13 & BIOS)' },
                  { h: 12, label: '8x12 (CGA / Medium Display)' },
                  { h: 14, label: '8x14 (EGA Standard 350-line)' },
                  { h: 16, label: '8x16 (VGA SCREEN 12 480-line)' },
                ].map((item) => (
                  <button
                    key={item.h}
                    onClick={() => {
                      handleDimensionsChange(item.h);
                      setOpenMenu(null);
                    }}
                    className={`w-full text-left px-2 py-1 hover:bg-[#0000aa] hover:text-[#ffffff] flex items-center justify-between ${
                      project.dimensions.height === item.h ? 'bg-[#0000aa] text-[#ffffff]' : ''
                    }`}
                  >
                    <span>{item.label}</span>
                    {project.dimensions.height === item.h && <span>✓</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Theme Menu */}
          <div className="relative">
            <button
              onClick={() => setOpenMenu(openMenu === 'theme' ? null : 'theme')}
              className={`px-2 py-0.5 hover:bg-[#0000aa] hover:text-[#ffffff] transition-colors flex items-center gap-1 ${
                openMenu === 'theme' ? 'bg-[#0000aa] text-[#ffffff]' : ''
              }`}
            >
              <u>T</u>heme <ChevronDown className="w-3 h-3" />
            </button>
            {openMenu === 'theme' && (
              <div
                className="absolute left-0 top-full mt-0.5 w-48 bg-[#aaaaaa] text-[#000000] dos-box p-1 z-50 shadow-2xl flex flex-col gap-0.5"
                onMouseLeave={() => setOpenMenu(null)}
              >
                {[
                  { id: 'qbasic', name: 'QuickBASIC Blue' },
                  { id: 'amber', name: 'MS-DOS Amber CRT' },
                  { id: 'green', name: 'Phosphor Green Matrix' },
                  { id: 'norton', name: 'Norton Midnight Blue' },
                  { id: 'dark', name: 'Modern Dark DOS' },
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => {
                      setTheme(t.id as DOSTheme);
                      setOpenMenu(null);
                      retroSound.action();
                    }}
                    className={`w-full text-left px-2 py-1 hover:bg-[#0000aa] hover:text-[#ffffff] flex items-center justify-between ${
                      theme === t.id ? 'bg-[#0000aa] text-[#ffffff]' : ''
                    }`}
                  >
                    <span>{t.name}</span>
                    {theme === t.id && <span>✓</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Undo / Redo */}
          <div className="flex items-center space-x-1 pl-2 border-l border-[#888888]">
            <button
              onClick={onUndo}
              disabled={!canUndo}
              title="Undo (Ctrl+Z)"
              className={`px-2 py-0.5 ${canUndo ? 'hover:bg-[#0000aa] hover:text-[#ffffff]' : 'text-[#777777] cursor-not-allowed'}`}
            >
              Undo
            </button>
            <button
              onClick={onRedo}
              disabled={!canRedo}
              title="Redo (Ctrl+Y)"
              className={`px-2 py-0.5 ${canRedo ? 'hover:bg-[#0000aa] hover:text-[#ffffff]' : 'text-[#777777] cursor-not-allowed'}`}
            >
              Redo
            </button>
          </div>

          {/* Help */}
          <button
            onClick={() => {
              onOpenHelp();
              retroSound.action();
            }}
            className="px-2 py-0.5 hover:bg-[#0000aa] hover:text-[#ffffff] flex items-center gap-1"
          >
            <u>H</u>elp <HelpCircle className="w-3 h-3 text-[#aa0000]" />
          </button>
        </div>

        {/* Right side Main Export Button */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => {
              onOpenExport();
              retroSound.action();
            }}
            className="dos-button px-3 py-1 bg-[#ffff55] text-[#000000] font-black text-xs flex items-center gap-1.5 shadow hover:bg-[#ffffff] active:translate-y-0.5"
          >
            <Download className="w-3.5 h-3.5 text-[#0000aa]" />
            <span>EXPORT GAME CODE / .BAS</span>
          </button>
        </div>
      </div>
    </header>
  );
};
