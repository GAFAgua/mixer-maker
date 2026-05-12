import React, { useEffect, useRef } from 'react';
import { PIANO_KEYS } from '../lib/constants';

interface KeyboardProps {
  onNoteOn: (note: number) => void;
  onNoteOff: (note: number) => void;
  activeNotes: Set<number>;
}

export default function Keyboard({ onNoteOn, onNoteOff, activeNotes }: KeyboardProps) {
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

      const keyObj = PIANO_KEYS.find(k => k.keyMatch === e.key.toLowerCase());
      if (keyObj) {
        onNoteOn(keyObj.midi);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const keyObj = PIANO_KEYS.find(k => k.keyMatch === e.key.toLowerCase());
      if (keyObj) {
        onNoteOff(keyObj.midi);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [onNoteOn, onNoteOff]);

  return (
    <div className="relative flex select-none mt-4 h-48 sm:h-56 bg-white/[0.02] rounded-lg p-3 overflow-x-auto w-full border border-white/5 mx-auto justify-center shadow-inner">
      {PIANO_KEYS.map((key) => {
        const isActive = activeNotes.has(key.midi);

        if (key.isBlack) {
          return (
            <div
              key={key.midi}
              onMouseDown={() => {
                isMouseDown.current = true;
                onNoteOn(key.midi);
              }}
              onMouseEnter={() => {
                if (isMouseDown.current && !isActive) onNoteOn(key.midi);
              }}
              onMouseLeave={() => {
                if (isActive) onNoteOff(key.midi);
              }}
              onMouseUp={() => {
                if (isActive) onNoteOff(key.midi);
              }}
              className={`z-10 absolute flex flex-col justify-end pb-3 items-center rounded-b-md transition-all duration-75 cursor-pointer 
                ${isActive ? 'bg-cyan-400 h-32 transform translate-y-1 shadow-[0_0_20px_rgba(0,240,255,0.6)] border border-cyan-300' : 'bg-[#0f0f0f] h-36 border border-white/10 shadow-lg hover:border-white/20'}`}
              style={{
                width: '3.5%',
                minWidth: '24px',
                left: `calc(50% - ${PIANO_KEYS.length * 2.5}% + ${PIANO_KEYS.indexOf(key) * 5}% - 0.5%)`,
              }}
            >
              <span className={`text-[10px] font-mono tracking-widest font-bold select-none pointer-events-none ${isActive ? 'text-[#0a0a0a]' : 'text-zinc-600'}`}>
                {key.keyMatch.toUpperCase()}
              </span>
            </div>
          );
        }

        // White Key
        return (
          <div
            key={key.midi}
            onMouseDown={() => {
              isMouseDown.current = true;
              onNoteOn(key.midi);
            }}
            onMouseEnter={() => {
              if (isMouseDown.current && !isActive) onNoteOn(key.midi);
            }}
            onMouseLeave={() => {
              if (isActive) onNoteOff(key.midi);
            }}
            onMouseUp={() => {
              if (isActive) onNoteOff(key.midi);
            }}
            className={`flex-1 relative flex flex-col justify-end pb-3 items-center mx-[2px] rounded-b transition-all duration-75 cursor-pointer z-0
              ${isActive ? 'bg-white/[0.08] h-[95%] transform translate-y-[5%] shadow-[inset_0_-5px_20px_rgba(0,240,255,0.2)] border-b-2 border-cyan-400' : 'bg-white/[0.03] border border-white/5 shadow-sm hover:bg-white/[0.05]'}`}
            style={{ maxWidth: '60px', minWidth: '40px' }}
          >
            <span className={`text-[10px] font-mono font-bold select-none pointer-events-none tracking-widest ${isActive ? 'text-cyan-400' : 'text-zinc-500'}`}>
              {key.keyMatch.toUpperCase()}
            </span>
          </div>
        );
      })}
    </div>
  );
}
