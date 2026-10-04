import React, { useState, useEffect } from 'react';
import { FontProject } from '../types/font';
import { DEFAULT_CP437_FONT } from '../utils/cp437Data';
import { retroSound } from '../utils/sound';
import { downloadFile } from '../utils/exporters';
import {
  FolderOpen,
  Save,
  Plus,
  Trash2,
  Download,
  Upload,
  Copy,
  Clock,
  Check
} from 'lucide-react';

interface ProjectManagerModalProps {
  currentProject: FontProject;
  onLoadProject: (project: FontProject) => void;
  onUpdateProjectMeta: (name: string, author: string, description: string) => void;
  onClose: () => void;
}

const STORAGE_KEY = 'qbasic_font_studio_projects';

export const ProjectManagerModal: React.FC<ProjectManagerModalProps> = ({
  currentProject,
  onLoadProject,
  onUpdateProjectMeta,
  onClose,
}) => {
  const [savedProjects, setSavedProjects] = useState<FontProject[]>([]);
  const [name, setName] = useState<string>(currentProject.name);
  const [author, setAuthor] = useState<string>(currentProject.author || '');
  const [description, setDescription] = useState<string>(currentProject.description || '');
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  // Load projects from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setSavedProjects(parsed);
        }
      }
    } catch {
      // fallback
    }
  }, []);

  // Save current project to storage
  const handleSaveCurrent = () => {
    onUpdateProjectMeta(name, author, description);

    const updatedCurrent: FontProject = {
      ...currentProject,
      name,
      author,
      description,
      updatedAt: Date.now(),
    };

    const existingIdx = savedProjects.findIndex((p) => p.id === updatedCurrent.id);
    let updatedList: FontProject[];
    if (existingIdx >= 0) {
      updatedList = [...savedProjects];
      updatedList[existingIdx] = updatedCurrent;
    } else {
      updatedList = [updatedCurrent, ...savedProjects];
    }

    setSavedProjects(updatedList);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedList));
      setSaveSuccess(true);
      retroSound.success();
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (err) {
      alert('LocalStorage quota exceeded or unavailable.');
    }
  };

  // Create new blank project
  const handleNewProject = () => {
    const newProj: FontProject = {
      id: `proj_${Date.now()}`,
      name: 'NEW_GAME_FONT',
      author: 'QBasic Coder',
      description: 'Custom font set for QBasic game',
      dimensions: { width: 8, height: 8 },
      glyphs: JSON.parse(JSON.stringify(DEFAULT_CP437_FONT)),
      modifiedGlyphs: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    onLoadProject(newProj);
    setName(newProj.name);
    setAuthor(newProj.author);
    setDescription(newProj.description);
    retroSound.action();
  };

  // Delete saved project
  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Delete this saved font project?')) return;
    const filtered = savedProjects.filter((p) => p.id !== id);
    setSavedProjects(filtered);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    retroSound.clearSound();
  };

  // Import JSON file
  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed && parsed.glyphs && parsed.dimensions) {
          const importedProj: FontProject = {
            id: parsed.id || `proj_${Date.now()}`,
            name: parsed.name || 'IMPORTED_FONT',
            author: parsed.author || '',
            description: parsed.description || '',
            dimensions: parsed.dimensions || { width: 8, height: 8 },
            glyphs: parsed.glyphs,
            modifiedGlyphs: parsed.modifiedGlyphs || [],
            createdAt: parsed.createdAt || Date.now(),
            updatedAt: Date.now(),
          };
          onLoadProject(importedProj);
          setName(importedProj.name);
          setAuthor(importedProj.author);
          setDescription(importedProj.description);
          retroSound.success();
          alert('Font project imported successfully!');
        } else {
          alert('Invalid font project JSON structure.');
        }
      } catch {
        alert('Failed to parse font project file.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-3 select-none">
      <div className="bg-[#aaaaaa] text-black w-full max-w-3xl max-h-[90vh] flex flex-col dos-box shadow-2xl">
        {/* Title Bar */}
        <div className="bg-[#0000aa] text-white px-3 py-1.5 flex items-center justify-between border-b border-[#000055]">
          <div className="flex items-center space-x-2">
            <span className="bg-[#ffff55] text-black px-1.5 py-0.2 font-black text-xs">
              LIBRARY
            </span>
            <span className="font-bold text-xs md:text-sm font-mono tracking-wide">
              FONT PROJECTS & SAVE MANAGER
            </span>
          </div>

          <button
            onClick={() => {
              onClose();
              retroSound.action();
            }}
            className="text-white hover:text-[#ffff55] text-sm px-1.5 font-bold"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 p-3 overflow-y-auto flex flex-col gap-4 font-mono">
          {/* Current Project Details & Save form */}
          <div className="bg-[#000088] text-white p-3 border-2 border-[#5555ff] flex flex-col gap-3">
            <div className="text-xs font-bold text-[#ffff55] tracking-wider">
              CURRENT FONT SETTINGS
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-[11px] text-[#aaaaaa] mb-1">
                  FONT NAME (.BAS / .FNT):
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value.toUpperCase().replace(/\s+/g, '_'))}
                  className="w-full bg-[#000055] text-white px-2 py-1.5 border border-[#5555ff] focus:outline-none focus:border-[#ffff55]"
                />
              </div>

              <div>
                <label className="block text-[11px] text-[#aaaaaa] mb-1">
                  AUTHOR / DEVELOPER:
                </label>
                <input
                  type="text"
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  placeholder="e.g. Megatomy Games"
                  className="w-full bg-[#000055] text-white px-2 py-1.5 border border-[#5555ff] focus:outline-none focus:border-[#ffff55]"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] text-[#aaaaaa] mb-1">
                DESCRIPTION / GAME NOTES:
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Roguelike custom ASCII tiles and bold serif text"
                className="w-full bg-[#000055] text-white px-2 py-1.5 border border-[#5555ff] focus:outline-none focus:border-[#ffff55] text-xs"
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              <div className="text-[11px] text-[#00aaaa]">
                Cell: {currentProject.dimensions.width}x{currentProject.dimensions.height} | {currentProject.modifiedGlyphs.length} glyphs customized
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleSaveCurrent}
                  className="dos-button px-3 py-1 bg-[#ffff55] text-black font-bold text-xs flex items-center gap-1.5 hover:bg-white"
                >
                  {saveSuccess ? <Check className="w-3.5 h-3.5 text-green-700" /> : <Save className="w-3.5 h-3.5" />}
                  <span>{saveSuccess ? 'SAVED TO BROWSER!' : 'SAVE PROJECT'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Quick Actions: New Project / Import File */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex gap-2">
              <button
                onClick={handleNewProject}
                className="dos-button px-3 py-1.5 text-xs flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5 text-[#00aa00]" />
                <span>NEW BLANK FONT</span>
              </button>

              <label className="dos-button px-3 py-1.5 text-xs flex items-center gap-1.5 cursor-pointer">
                <Upload className="w-3.5 h-3.5 text-[#0000aa]" />
                <span>IMPORT .QBF / .JSON</span>
                <input
                  type="file"
                  accept=".json,.qbf"
                  onChange={handleImportFile}
                  className="hidden"
                />
              </label>
            </div>

            <div className="text-xs text-[#444444]">
              {savedProjects.length} Saved in Browser Library
            </div>
          </div>

          {/* Saved Projects Library List */}
          <div className="bg-[#888888] border-2 border-[#555555] p-2 flex flex-col gap-1.5 max-h-60 overflow-y-auto">
            <div className="text-[11px] font-bold text-black uppercase tracking-wider px-1">
              SAVED PROJECTS IN BROWSER STORAGE:
            </div>

            {savedProjects.length === 0 ? (
              <div className="text-center py-6 text-[#333333] text-xs">
                No saved fonts in browser storage yet. Click &quot;SAVE PROJECT&quot; above to store this font!
              </div>
            ) : (
              savedProjects.map((p) => {
                const isCurrent = p.id === currentProject.id;
                return (
                  <div
                    key={p.id}
                    onClick={() => {
                      onLoadProject(p);
                      setName(p.name);
                      setAuthor(p.author || '');
                      setDescription(p.description || '');
                      retroSound.action();
                    }}
                    className={`p-2 border cursor-pointer flex items-center justify-between transition-colors ${
                      isCurrent
                        ? 'bg-[#0000aa] text-white border-white'
                        : 'bg-[#aaaaaa] text-black border-[#666666] hover:bg-[#cccccc]'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-xs flex items-center gap-2">
                        <span>{p.name}</span>
                        {isCurrent && (
                          <span className="bg-[#ffff55] text-black px-1.5 text-[9px] font-black">
                            ACTIVE
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] opacity-80">
                        {p.dimensions.width}x{p.dimensions.height} | {p.modifiedGlyphs?.length || 0} modified glyphs {p.author ? `by ${p.author}` : ''}
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          downloadFile(JSON.stringify(p, null, 2), `${p.name}.qbf`, 'application/json');
                          retroSound.action();
                        }}
                        title="Download backup file (.qbf)"
                        className="p-1 hover:bg-black/20"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={(e) => handleDelete(p.id, e)}
                        title="Delete project"
                        className="p-1 hover:bg-red-500 hover:text-white"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-red-700" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-[#aaaaaa] p-2 border-t-2 border-[#555555] flex justify-end">
          <button
            onClick={() => {
              onClose();
              retroSound.action();
            }}
            className="dos-button px-4 py-1 text-xs"
          >
            CLOSE
          </button>
        </div>
      </div>
    </div>
  );
};
