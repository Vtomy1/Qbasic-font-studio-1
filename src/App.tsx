/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { FontProject, DOSTheme } from './types/font';
import { DEFAULT_CP437_FONT } from './utils/cp437Data';
import { PRESET_FONTS } from './utils/presets';
import { retroSound } from './utils/sound';
import { Header } from './components/Header';
import { CharacterGrid } from './components/CharacterGrid';
import { GlyphEditor } from './components/GlyphEditor';
import { PreviewTab } from './components/PreviewTab';
import { ExportModal } from './components/ExportModal';
import { ProjectManagerModal } from './components/ProjectManagerModal';
import { HelpModal } from './components/HelpModal';

const DEFAULT_PROJECT: FontProject = {
  id: 'proj_default_game',
  name: 'GAMEFONT',
  author: 'DOS Game Dev',
  description: 'Custom 8x8 bitmap font for QBasic game',
  dimensions: { width: 8, height: 8 },
  glyphs: JSON.parse(JSON.stringify(DEFAULT_CP437_FONT)),
  modifiedGlyphs: [],
  createdAt: Date.now(),
  updatedAt: Date.now(),
};

export default function App() {
  const [project, setProject] = useState<FontProject>(() => {
    try {
      const saved = localStorage.getItem('qbasic_font_studio_active');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.glyphs && parsed.dimensions) {
          return parsed;
        }
      }
    } catch {
      // fallback
    }
    return DEFAULT_PROJECT;
  });

  const [selectedCode, setSelectedCode] = useState<number>(65); // ASCII 'A'
  const [activeTab, setActiveTab] = useState<'editor' | 'preview'>('editor');
  const [theme, setTheme] = useState<DOSTheme>('qbasic');
  const [crtEnabled, setCrtEnabled] = useState<boolean>(true);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // History stack for Undo/Redo
  const [history, setHistory] = useState<FontProject[]>([project]);
  const [historyIdx, setHistoryIdx] = useState<number>(0);

  // Clipboard for copy & paste glyph
  const [clipboardRows, setClipboardRows] = useState<number[] | null>(null);

  // Modals
  const [exportModalOpen, setExportModalOpen] = useState<boolean>(false);
  const [projectsModalOpen, setProjectsModalOpen] = useState<boolean>(false);
  const [helpModalOpen, setHelpModalOpen] = useState<boolean>(false);

  // Push new state to history
  const pushHistory = useCallback((newProject: FontProject) => {
    setHistory((prev) => {
      const sliced = prev.slice(0, historyIdx + 1);
      return [...sliced, newProject];
    });
    setHistoryIdx((prev) => prev + 1);
  }, [historyIdx]);

  // Save to active localStorage on update
  useEffect(() => {
    try {
      localStorage.setItem('qbasic_font_studio_active', JSON.stringify(project));
    } catch {
      // ignore
    }
  }, [project]);

  // Update glyph handler
  const handleUpdateGlyph = (code: number, newRows: number[]) => {
    setProject((prev) => {
      const updatedGlyphs = {
        ...prev.glyphs,
        [code]: newRows,
      };

      // Check if modified compared to CP437 ROM default
      const defaultRows = DEFAULT_CP437_FONT[code] || [];
      const isDifferent = newRows.some((b, r) => b !== (defaultRows[r] ?? 0));

      let updatedModified = [...prev.modifiedGlyphs];
      if (isDifferent) {
        if (!updatedModified.includes(code)) {
          updatedModified.push(code);
        }
      } else {
        updatedModified = updatedModified.filter((c) => c !== code);
      }

      const nextProj: FontProject = {
        ...prev,
        glyphs: updatedGlyphs,
        modifiedGlyphs: updatedModified,
        updatedAt: Date.now(),
      };

      pushHistory(nextProj);
      return nextProj;
    });
  };

  // Reset single glyph to default ROM
  const handleResetGlyphToDefault = (code: number) => {
    const defaultRows = DEFAULT_CP437_FONT[code] || new Array(project.dimensions.height).fill(0);
    handleUpdateGlyph(code, [...defaultRows]);
  };

  // Copy / Paste glyph
  const handleCopyGlyph = (code: number) => {
    const rows = project.glyphs[code] || [];
    setClipboardRows([...rows]);
  };

  const handlePasteGlyph = (code: number) => {
    if (!clipboardRows) return;
    handleUpdateGlyph(code, [...clipboardRows]);
  };

  // Undo & Redo
  const canUndo = historyIdx > 0;
  const canRedo = historyIdx < history.length - 1;

  const handleUndo = () => {
    if (!canUndo) return;
    const prevIdx = historyIdx - 1;
    setHistoryIdx(prevIdx);
    setProject(history[prevIdx]);
    retroSound.action();
  };

  const handleRedo = () => {
    if (!canRedo) return;
    const nextIdx = historyIdx + 1;
    setHistoryIdx(nextIdx);
    setProject(history[nextIdx]);
    retroSound.action();
  };

  // Load Preset Font
  const handleLoadPreset = (presetId: string) => {
    const found = PRESET_FONTS.find((p) => p.id === presetId);
    if (!found) return;

    setProject((prev) => {
      // Find modified compared to CP437 default
      const modified: number[] = [];
      for (let i = 0; i < 256; i++) {
        const presRows = found.glyphs[i] || [];
        const defRows = DEFAULT_CP437_FONT[i] || [];
        const isDiff = presRows.some((b, r) => b !== (defRows[r] ?? 0));
        if (isDiff) modified.push(i);
      }

      const nextProj: FontProject = {
        ...prev,
        name: found.name.toUpperCase().replace(/[^A-Z0-9]/g, '_').slice(0, 12),
        glyphs: JSON.parse(JSON.stringify(found.glyphs)),
        modifiedGlyphs: modified,
        updatedAt: Date.now(),
      };
      pushHistory(nextProj);
      return nextProj;
    });
  };

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept when inside inputs or textareas
      const target = e.target as HTMLElement;
      if (['INPUT', 'TEXTAREA'].includes(target.tagName)) return;

      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        handleUndo();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'Z'))) {
        e.preventDefault();
        handleRedo();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        e.preventDefault();
        handleCopyGlyph(selectedCode);
        retroSound.action();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
        e.preventDefault();
        handlePasteGlyph(selectedCode);
        retroSound.action();
      } else if (e.key === 'F2') {
        e.preventDefault();
        setActiveTab('editor');
        retroSound.action();
      } else if (e.key === 'F3') {
        e.preventDefault();
        setActiveTab('preview');
        retroSound.action();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo, selectedCode, clipboardRows]);

  // Compute theme CSS styles
  const getThemeClass = () => {
    switch (theme) {
      case 'amber':
        return 'filter sepia(1) saturate(5) hue-rotate(5deg) contrast(1.1)';
      case 'green':
        return 'filter sepia(1) saturate(8) hue-rotate(85deg) contrast(1.15)';
      case 'norton':
        return 'filter hue-rotate(180deg) saturate(1.2)';
      case 'dark':
        return 'filter contrast(1.05) brightness(0.9)';
      default:
        return '';
    }
  };

  return (
    <div
      className={`w-screen h-screen flex flex-col overflow-hidden bg-[#0000aa] select-none ${
        crtEnabled ? 'crt-effect' : ''
      }`}
      style={{
        filter: theme === 'amber' ? 'sepia(1) saturate(5) hue-rotate(5deg)' : theme === 'green' ? 'sepia(1) saturate(8) hue-rotate(85deg)' : 'none',
      }}
    >
      {/* Top Menu & Quick Action Bar */}
      <Header
        project={project}
        onUpdateProject={(updater) => {
          setProject((prev) => {
            const next = updater(prev);
            pushHistory(next);
            return next;
          });
        }}
        onLoadPreset={handleLoadPreset}
        onOpenExport={() => setExportModalOpen(true)}
        onOpenProjects={() => setProjectsModalOpen(true)}
        onOpenHelp={() => setHelpModalOpen(true)}
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={canUndo}
        canRedo={canRedo}
        theme={theme}
        setTheme={setTheme}
        crtEnabled={crtEnabled}
        setCrtEnabled={setCrtEnabled}
        soundEnabled={soundEnabled}
        setSoundEnabled={setSoundEnabled}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* Main App Body */}
      <div className="flex-1 flex overflow-hidden">
        {activeTab === 'editor' ? (
          <>
            {/* Left: CP437 256 Character Grid Picker */}
            <div className="w-64 sm:w-72 md:w-80 lg:w-96 h-full flex-shrink-0">
              <CharacterGrid
                project={project}
                selectedCode={selectedCode}
                onSelectCode={(code) => setSelectedCode(code)}
              />
            </div>

            {/* Right: Main Glyph Pixel Matrix Editor */}
            <GlyphEditor
              project={project}
              selectedCode={selectedCode}
              onUpdateGlyph={handleUpdateGlyph}
              onResetGlyphToDefault={handleResetGlyphToDefault}
              onCopyGlyph={handleCopyGlyph}
              onPasteGlyph={handlePasteGlyph}
              hasClipboard={clipboardRows !== null}
              onUndo={handleUndo}
              onRedo={handleRedo}
              canUndo={canUndo}
              canRedo={canRedo}
            />
          </>
        ) : (
          /* Live Game Simulation & Text Tester */
          <PreviewTab
            project={project}
            onSelectGlyph={(code) => {
              setSelectedCode(code);
              setActiveTab('editor');
            }}
            onBackToEditor={() => setActiveTab('editor')}
          />
        )}
      </div>

      {/* Bottom DOS Status Bar */}
      <div className="bg-[#00aaaa] text-[#000000] px-3 py-0.5 text-[11px] font-mono font-bold flex items-center justify-between border-t border-[#000055]">
        <div className="flex items-center space-x-4">
          <span>
            [F2] Editor | [F3] Game Test | [Ctrl+Z] Undo | [Ctrl+C/V] Copy/Paste Glyph
          </span>
          <span className="hidden sm:inline text-[#000055]">
            Target: SCREEN 13 (320x200 256 Colors)
          </span>
        </div>

        <div className="flex items-center space-x-3">
          <span>QBASIC 1.1 / QUICKBASIC 4.5 COMPLIANT</span>
          <button
            onClick={() => setExportModalOpen(true)}
            className="bg-[#0000aa] text-[#ffff55] px-2 py-0.2 hover:bg-[#ffffff] hover:text-[#0000aa]"
          >
            EXPORT .BAS
          </button>
        </div>
      </div>

      {/* Modals */}
      {exportModalOpen && (
        <ExportModal
          project={project}
          onClose={() => setExportModalOpen(false)}
        />
      )}

      {projectsModalOpen && (
        <ProjectManagerModal
          currentProject={project}
          onLoadProject={(loaded) => {
            setProject(loaded);
            pushHistory(loaded);
            setProjectsModalOpen(false);
          }}
          onUpdateProjectMeta={(name, author, desc) => {
            setProject((prev) => ({
              ...prev,
              name,
              author,
              description: desc,
            }));
          }}
          onClose={() => setProjectsModalOpen(false)}
        />
      )}

      {helpModalOpen && (
        <HelpModal onClose={() => setHelpModalOpen(false)} />
      )}
    </div>
  );
}
