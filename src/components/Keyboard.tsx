import React, { useEffect, useRef } from 'react';

interface Pad {
  midi: number;
  note: string;
  keyMatch: string;
}

interface KeyboardProps {
  onNoteOn: (note: number, keyMatch: string) => void;
  onNoteOff: (note: number, keyMatch: string) => void;
  activeNotes: Set<string>;
  pads: Pad[];
}

export default function Keyboard({ onNoteOn, onNoteOff, activeNotes, pads }: KeyboardProps) {
  // Use a ref to keep track of mouse interaction without triggering re-renders continuously
  // when dragging across keys.
  const isMouseDown = useRef(false);

  useEffect(() => {
    const handleGlobalMouseUp = () => {
      isMouseDown.current = false;
    };
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return; // Prevent continuous firing when holding key down
      // Ignore text input fields
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      const keyObj = pads.find(k => k.keyMatch === e.key.toLowerCase());
      if (keyObj) {
        onNoteOn(keyObj.midi, keyObj.keyMatch);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const keyObj = pads.find(k => k.keyMatch === e.key.toLowerCase());
      if (keyObj) {
        onNoteOff(keyObj.midi, keyObj.keyMatch);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [onNoteOn, onNoteOff, pads]);

  return (
    <div className="grid grid-cols-4 gap-2 lg:gap-3 w-full max-w-[320px] mx-auto">
      {pads.map((pad) => {
        const isActive = activeNotes.has(pad.keyMatch);

        return (
          <div
            key={pad.midi}
            onMouseDown={() => {
              isMouseDown.current = true;
              onNoteOn(pad.midi, pad.keyMatch);
            }}
            onMouseEnter={() => {
              if (isMouseDown.current && !isActive) onNoteOn(pad.midi, pad.keyMatch);
            }}
            onMouseLeave={() => {
              if (isActive) onNoteOff(pad.midi, pad.keyMatch);
            }}
            onMouseUp={() => {
              if (isActive) onNoteOff(pad.midi, pad.keyMatch);
            }}
            className={`aspect-square relative flex flex-col justify-center items-center rounded-lg transition-all duration-75 cursor-pointer select-none
              ${isActive 
                ? 'bg-cyan-500/20 shadow-[0_0_15px_rgba(34,211,238,0.4),inset_0_0_10px_rgba(34,211,238,0.2)] border-2 border-cyan-400 transform scale-[0.96]' 
                : 'bg-white/[0.03] border border-white/10 shadow-sm hover:bg-white/[0.06] hover:border-white/20'}`}
          >
            <span className={`text-[10px] md:text-[12px] font-mono font-bold tracking-widest pointer-events-none ${isActive ? 'text-cyan-400' : 'text-zinc-400'}`}>
              {pad.keyMatch.toUpperCase()}
            </span>
            <span className={`text-[8px] md:text-[9px] font-mono mt-0.5 md:mt-1 pointer-events-none ${isActive ? 'text-cyan-400/70' : 'text-zinc-600'}`}>
              {pad.note}
            </span>
          </div>
        );
      })}
    </div>
  );
}
