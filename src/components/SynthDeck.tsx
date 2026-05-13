import React from 'react';
import { InstrumentType, PlayMode } from '../types';
import Keyboard from './Keyboard';

interface SynthDeckProps {
   deckName: string;
   colorHex: string; // e.g. '#a855f7' for purple or '#22d3ee' for cyan
   colorClass: string; // e.g. 'purple', 'cyan'
   instrument: InstrumentType;
   setInstrument: (inst: InstrumentType) => void;
   playMode: PlayMode;
   setPlayMode: (mode: PlayMode) => void;
   pads: { midi: number; note: string; keyMatch: string }[];
   activeNotes: Set<string>;
   onNoteOn: (note: number, keyMatch: string) => void;
   onNoteOff: (note: number, keyMatch: string) => void;
   keysDesc: string;
}

export default function SynthDeck({
  deckName, colorHex, colorClass,
  instrument, setInstrument,
  playMode, setPlayMode,
  pads, activeNotes,
  onNoteOn, onNoteOff, keysDesc
}: SynthDeckProps) {
    return (
        <div className="flex gap-4 p-4 lg:p-5 bg-white/[0.02] border border-white/5 rounded-xl shrink-0 w-full md:w-[480px] lg:w-[540px]">
          {/* Controls */}
          <div className="w-40 xl:w-48 flex flex-col gap-5 lg:gap-6 shrink-0 border-r border-white/10 pr-4">
             {/* Instrument */}
             <div>
               <div className="flex items-center gap-2 mb-3 lg:mb-4">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: colorHex, boxShadow: `0 0 8px ${colorHex}` }}></div>
                  <h3 className="text-[9px] lg:text-[10px] font-bold text-zinc-400 tracking-[0.2em] uppercase">{deckName} Inst</h3>
               </div>
               <div className="grid grid-cols-2 gap-1.5 lg:gap-2">
                 {(['bass', 'drum', 'cymbal', 'synth', 'sampler'] as const).map(inst => (
                    <button 
                      key={inst}
                      onClick={() => setInstrument(inst)}
                      className={`py-1.5 lg:py-2 px-1 text-[9px] lg:text-[10px] font-medium tracking-wider uppercase rounded transition-all duration-300
                        ${instrument === inst ? `bg-white/10 border border-white/30 text-white shadow-[0_0_10px_${colorHex}33]` : 'bg-white/5 border border-transparent text-zinc-500 hover:text-zinc-300 hover:bg-white/10'}`}
                      style={instrument === inst ? { color: colorHex, borderColor: `${colorHex}55`, backgroundColor: `${colorHex}15` } : {}}
                    >
                      {inst}
                    </button>
                 ))}
               </div>
             </div>

             {/* Play Mode */}
             <div>
               <div className="flex items-center gap-2 mb-3 lg:mb-4">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: colorHex, boxShadow: `0 0 8px ${colorHex}` }}></div>
                  <h3 className="text-[9px] lg:text-[10px] font-bold text-zinc-400 tracking-[0.2em] uppercase">Play Mode</h3>
               </div>
               <div className="grid grid-cols-2 gap-1.5 lg:gap-2">
                 {(['single', 'diatonic', 'major', 'minor', 'power'] as const).map(mode => (
                    <button 
                      key={mode}
                      onClick={() => setPlayMode(mode)}
                      className={`py-1.5 lg:py-2 px-1 text-[8px] lg:text-[9px] font-medium tracking-wider uppercase rounded transition-all duration-300
                        ${playMode === mode ? `bg-white/10 border border-white/30 text-white shadow-[0_0_10px_${colorHex}33]` : 'bg-white/5 border border-transparent text-zinc-500 hover:text-zinc-300 hover:bg-white/10'}`}
                      style={playMode === mode ? { color: colorHex, borderColor: `${colorHex}55`, backgroundColor: `${colorHex}15` } : {}}
                    >
                      {mode}
                    </button>
                 ))}
               </div>
             </div>
             
             <div className="mt-auto pt-3 lg:pt-4 border-t border-white/5">
                <p className="text-[8px] lg:text-[9px] text-zinc-600 font-mono tracking-widest uppercase">{keysDesc}</p>
             </div>
          </div>

          <div className="flex flex-col justify-end flex-1 w-[280px]">
             <Keyboard onNoteOn={onNoteOn} onNoteOff={onNoteOff} activeNotes={activeNotes} pads={pads} />
          </div>
        </div>
    );
}
