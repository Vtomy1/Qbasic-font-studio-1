import React, { useState, useMemo } from 'react';
import { FontProject } from '../types/font';
import {
  generateQBasicDataCode,
  generateQBasicBinaryLoaderCode,
  generateQB64Code,
  generateCHeader,
  generateBinaryFnt,
  renderFontSpritesheet,
  downloadFile
} from '../utils/exporters';
import { retroSound } from '../utils/sound';
import {
  Download,
  Copy,
  Check,
  FileCode,
  Binary,
  Image,
  FileJson,
  X,
  Code
} from 'lucide-react';

interface ExportModalProps {
  project: FontProject;
  onClose: () => void;
}

type ExportTab = 'qbasic_data' | 'binary_fnt' | 'qb64' | 'c_header' | 'spritesheet' | 'json';

export const ExportModal: React.FC<ExportModalProps> = ({ project, onClose }) => {
  const [activeTab, setActiveTab] = useState<ExportTab>('qbasic_data');
  const [subset, setSubset] = useState<'all' | 'ascii' | 'modified'>('all');
  const [copied, setCopied] = useState<boolean>(false);
  const [spriteScale, setSpriteScale] = useState<number>(2);
  const [transparentBg, setTransparentBg] = useState<boolean>(false);

  // Generate code based on tab
  const generatedCode = useMemo(() => {
    switch (activeTab) {
      case 'qbasic_data':
        return generateQBasicDataCode(project, subset);
      case 'binary_fnt':
        return generateQBasicBinaryLoaderCode(project, `${project.name.toUpperCase().replace(/[^A-Z0-9]/g, '')}.FNT`);
      case 'qb64':
        return generateQB64Code(project);
      case 'c_header':
        return generateCHeader(project);
      case 'json':
        return JSON.stringify(project, null, 2);
      default:
        return '';
    }
  }, [project, activeTab, subset]);

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedCode);
    setCopied(true);
    retroSound.action();
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const safeName = project.name.replace(/[^a-zA-Z0-9_-]/g, '_');
    retroSound.success();

    if (activeTab === 'qbasic_data') {
      downloadFile(generatedCode, `${safeName}.BAS`, 'text/plain');
    } else if (activeTab === 'binary_fnt') {
      const binData = generateBinaryFnt(project);
      downloadFile(binData, `${safeName.toUpperCase().slice(0, 8)}.FNT`, 'application/octet-stream');
    } else if (activeTab === 'qb64') {
      downloadFile(generatedCode, `${safeName}_qb64.bas`, 'text/plain');
    } else if (activeTab === 'c_header') {
      downloadFile(generatedCode, `${safeName.toLowerCase()}_font.h`, 'text/plain');
    } else if (activeTab === 'spritesheet') {
      const canvas = renderFontSpritesheet(project, spriteScale, '#ffffff', '#000000', transparentBg);
      canvas.toBlob((blob) => {
        if (blob) downloadFile(blob, `${safeName}_spritesheet.png`, 'image/png');
      });
    } else if (activeTab === 'json') {
      downloadFile(generatedCode, `${safeName}.qbf`, 'application/json');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-3 select-none">
      <div className="bg-[#aaaaaa] text-black w-full max-w-4xl max-h-[92vh] flex flex-col dos-box shadow-2xl">
        {/* Title Bar */}
        <div className="bg-[#0000aa] text-white px-3 py-1.5 flex items-center justify-between border-b border-[#000055]">
          <div className="flex items-center space-x-2">
            <span className="bg-[#ffff55] text-black px-1.5 py-0.2 font-black text-xs">
              EXPORT
            </span>
            <span className="font-bold text-xs md:text-sm font-mono tracking-wide">
              SAVE CUSTOM FONT FOR GAMES & DEMOS — {project.name}
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

        {/* Tab Navigation */}
        <div className="bg-[#aaaaaa] px-2 pt-2 border-b-2 border-[#555555] flex flex-wrap gap-1">
          {[
            { id: 'qbasic_data', label: 'QBasic DATA (.BAS)', icon: FileCode },
            { id: 'binary_fnt', label: 'Binary Font (.FNT)', icon: Binary },
            { id: 'spritesheet', label: 'Spritesheet (.PNG)', icon: Image },
            { id: 'qb64', label: 'QB64 Modern', icon: Code },
            { id: 'c_header', label: 'C/C++ Header (.h)', icon: Code },
            { id: 'json', label: 'Project File (.qbf)', icon: FileJson },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as ExportTab);
                  retroSound.action();
                }}
                className={`px-3 py-1.5 text-xs font-bold font-mono flex items-center gap-1.5 transition-all ${
                  isActive
                    ? 'bg-[#0000aa] text-[#ffffff] shadow-md border-t-2 border-l-2 border-r-2 border-[#ffffff]'
                    : 'bg-[#888888] text-[#222222] hover:bg-[#999999] border border-[#666666]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Options / Filters */}
        <div className="bg-[#999999] px-3 py-1.5 flex flex-wrap items-center justify-between gap-2 border-b border-[#777777] text-xs font-mono">
          {activeTab === 'qbasic_data' && (
            <div className="flex items-center gap-2">
              <span className="font-bold">EXPORT SUBSET:</span>
              <div className="flex bg-[#777777] p-0.5 border border-[#555555]">
                {[
                  { id: 'all', label: 'All 256 Glyphs' },
                  { id: 'ascii', label: 'ASCII (32-126)' },
                  { id: 'modified', label: `Modified Only (${project.modifiedGlyphs.length})` },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setSubset(item.id as 'all' | 'ascii' | 'modified')}
                    className={`px-2 py-0.5 text-xs ${
                      subset === item.id ? 'bg-[#0000aa] text-white font-bold' : 'text-black hover:text-white'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'spritesheet' && (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="font-bold">SCALE:</span>
                {[1, 2, 4].map((s) => (
                  <button
                    key={s}
                    onClick={() => setSpriteScale(s)}
                    className={`px-2 py-0.5 border ${
                      spriteScale === s ? 'bg-[#0000aa] text-white font-bold' : 'bg-[#aaaaaa]'
                    }`}
                  >
                    {s}x ({s * 8}px)
                  </button>
                ))}
              </div>

              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={transparentBg}
                  onChange={(e) => setTransparentBg(e.target.checked)}
                />
                <span>Transparent Background</span>
              </label>
            </div>
          )}

          <div className="text-[11px] text-[#222222]">
            {activeTab === 'qbasic_data' && 'Includes SCREEN 13 drawing loop & SUB DrawQText'}
            {activeTab === 'binary_fnt' && '2048-byte binary file for BLOAD or custom binary loader'}
            {activeTab === 'spritesheet' && 'Full 16x16 character grid spritesheet ready for game engines'}
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 bg-[#000055] p-3 overflow-hidden flex flex-col">
          {activeTab !== 'spritesheet' ? (
            <div className="flex-1 relative border-2 border-[#5555ff] overflow-hidden bg-[#000033]">
              <textarea
                readOnly
                value={generatedCode}
                className="w-full h-full p-3 font-mono text-xs text-[#55ff55] bg-transparent resize-none focus:outline-none select-text overflow-y-auto leading-relaxed"
                style={{ imageRendering: 'pixelated' }}
              />
            </div>
          ) : (
            /* Spritesheet Preview */
            <div className="flex-1 border-2 border-[#5555ff] bg-[#000000] p-4 flex flex-col items-center justify-center overflow-auto">
              <span className="text-xs text-[#ffff55] font-mono mb-2">
                PREVIEW: {256} GLYPHS (16 × 16 GRID) @ {spriteScale}x SCALE
              </span>
              <img
                src={renderFontSpritesheet(project, spriteScale, '#ffffff', '#000000', transparentBg).toDataURL()}
                alt="Font Spritesheet"
                className="border-2 border-[#ffffff] shadow-lg max-h-[50vh] object-contain"
                style={{ imageRendering: 'pixelated' }}
              />
            </div>
          )}
        </div>

        {/* Bottom Actions Bar */}
        <div className="bg-[#aaaaaa] p-2.5 border-t-2 border-[#555555] flex flex-wrap items-center justify-between gap-2">
          <div className="text-xs font-mono text-[#333333]">
            Target: <b>QBasic 1.1 / QuickBASIC 4.5 / MS-DOS / DOSBox / QB64</b>
          </div>

          <div className="flex items-center space-x-2">
            {activeTab !== 'spritesheet' && (
              <button
                onClick={handleCopy}
                className="dos-button px-3 py-1.5 flex items-center gap-1.5 text-xs font-bold"
              >
                {copied ? <Check className="w-4 h-4 text-[#00aa00]" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'COPIED TO CLIPBOARD!' : 'COPY CODE'}</span>
              </button>
            )}

            <button
              onClick={handleDownload}
              className="dos-button px-4 py-1.5 bg-[#ffff55] text-black font-black text-xs flex items-center gap-1.5 hover:bg-[#ffffff]"
            >
              <Download className="w-4 h-4 text-[#0000aa]" />
              <span>
                {activeTab === 'qbasic_data' && 'DOWNLOAD .BAS PROGRAM'}
                {activeTab === 'binary_fnt' && 'DOWNLOAD .FNT BINARY'}
                {activeTab === 'qb64' && 'DOWNLOAD QB64 .BAS'}
                {activeTab === 'c_header' && 'DOWNLOAD .H HEADER'}
                {activeTab === 'spritesheet' && 'DOWNLOAD .PNG SPRITESHEET'}
                {activeTab === 'json' && 'DOWNLOAD .QBF FILE'}
              </span>
            </button>

            <button
              onClick={() => {
                onClose();
                retroSound.action();
              }}
              className="dos-button px-3 py-1.5 text-xs"
            >
              CLOSE
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
