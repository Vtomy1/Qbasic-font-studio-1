import React from 'react';
import { retroSound } from '../utils/sound';
import { HelpCircle, Terminal, BookOpen, Cpu, Sparkles } from 'lucide-react';

interface HelpModalProps {
  onClose: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-3 select-none">
      <div className="bg-[#aaaaaa] text-black w-full max-w-3xl max-h-[90vh] flex flex-col dos-box shadow-2xl font-mono">
        {/* Title Bar */}
        <div className="bg-[#0000aa] text-white px-3 py-1.5 flex items-center justify-between border-b border-[#000055]">
          <div className="flex items-center space-x-2">
            <span className="bg-[#ffff55] text-black px-1.5 py-0.2 font-black text-xs">
              DOCS
            </span>
            <span className="font-bold text-xs md:text-sm tracking-wide">
              QBASIC FONT SYSTEM GUIDE & TUTORIAL
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
        <div className="flex-1 p-4 overflow-y-auto space-y-4 text-xs leading-relaxed">
          <div className="bg-[#000088] text-white p-3 border-2 border-[#5555ff]">
            <h3 className="text-sm font-bold text-[#ffff55] mb-1 flex items-center gap-1.5">
              <Terminal className="w-4 h-4" />
              How QBasic / QuickBASIC Renders Custom Fonts
            </h3>
            <p className="text-[#cccccc]">
              Standard MS-DOS text mode (`SCREEN 0`) uses the fixed hardware VGA BIOS font. But when building DOS games in graphics modes like <b>SCREEN 13 (320x200 256 colors)</b> or <b>SCREEN 12 (640x480 16 colors)</b>, the default `PRINT` command only renders the plain standard BIOS font with basic color.
            </p>
            <p className="mt-2 text-[#cccccc]">
              By storing character bitmasks into an array via <b>DATA statements</b> or <b>binary .FNT files</b>, your game can render custom typography, proportional sizes, fantasy runes, dialog boxes, and sprite tiles anywhere on screen using fast bitmask tests.
            </p>
          </div>

          <div className="bg-[#ffffff] p-3 border-2 border-[#555555]">
            <h4 className="font-bold text-black text-xs mb-1 flex items-center gap-1.5">
              <Cpu className="w-4 h-4 text-[#0000aa]" />
              The 8x8 Character Bitmask Explained
            </h4>
            <p className="text-[#333333] mb-2">
              Each 8x8 character consists of 8 horizontal byte rows. Each byte contains 8 bits (0 or 1). Bit 7 represents the leftmost pixel and Bit 0 represents the rightmost pixel.
            </p>
            <div className="bg-[#000055] text-[#55ff55] p-2.5 font-mono text-[11px] leading-tight overflow-x-auto">
              <div>Row 0: 00111100 = &amp;H3C (48)   ..████..</div>
              <div>Row 1: 01000010 = &amp;H42 (66)   .█....█.</div>
              <div>Row 2: 01000010 = &amp;H42 (66)   .█....█.</div>
              <div>Row 3: 01111110 = &amp;H7E (126)  .██████.</div>
              <div>Row 4: 01000010 = &amp;H42 (66)   .█....█.</div>
              <div>Row 5: 01000010 = &amp;H42 (66)   .█....█.</div>
              <div>Row 6: 00000000 = &amp;H00 (0)    ........</div>
              <div>Row 7: 00000000 = &amp;H00 (0)    ........</div>
            </div>
          </div>

          <div className="bg-[#ffffff] p-3 border-2 border-[#555555]">
            <h4 className="font-bold text-black text-xs mb-1 flex items-center gap-1.5">
              <BookOpen className="w-4 h-4 text-[#00aa00]" />
              Quick Start in DOSBox / QBasic
            </h4>
            <ol className="list-decimal list-inside space-y-1.5 text-[#333333]">
              <li>
                Click <b>EXPORT GAME CODE</b> in the top right.
              </li>
              <li>
                Select <b>QBasic DATA (.BAS)</b> or <b>Binary Font (.FNT)</b>.
              </li>
              <li>
                Click <b>DOWNLOAD .BAS PROGRAM</b>. Save it into your DOSBox games folder (e.g. `C:\DOS\MYGAME.BAS`).
              </li>
              <li>
                In DOSBox, type:
                <code className="block bg-[#000055] text-[#ffff55] p-1.5 my-1">
                  C:\&gt; QBASIC /RUN MYGAME.BAS
                </code>
              </li>
              <li>
                Your custom font will render immediately on SCREEN 13!
              </li>
            </ol>
          </div>

          <div className="bg-[#000088] text-white p-3 border-2 border-[#5555ff]">
            <h4 className="font-bold text-[#ffff55] text-xs mb-1 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4" />
              Keyboard Shortcuts in Font Studio
            </h4>
            <div className="grid grid-cols-2 gap-2 text-[11px] text-[#dddddd]">
              <div><b>P</b>: Pencil Tool</div>
              <div><b>E</b>: Eraser Tool</div>
              <div><b>F</b>: Fill Bucket</div>
              <div><b>Ctrl + Z</b>: Undo</div>
              <div><b>Ctrl + Y</b>: Redo</div>
              <div><b>F2</b>: Switch to Glyph Editor</div>
              <div><b>F3</b>: Switch to Game Simulation Test</div>
            </div>
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
            GOT IT
          </button>
        </div>
      </div>
    </div>
  );
};
