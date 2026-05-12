import React from 'react';
import { Clip } from '../types';
import { GripVertical, Trash2 } from 'lucide-react';

interface LibraryProps {
  clips: Clip[];
  onRemoveClip: (id: string) => void;
}

export default function Library({ clips, onRemoveClip }: LibraryProps) {
  return (
    <div className="w-80 border-r border-white/5 bg-[#0a0a0a] flex flex-col z-10 shrink-0 shadow-xl overflow-hidden relative">
      <div className="p-6 pb-2 border-b border-white/5 flex items-center justify-between">
        <h2 className="text-xs font-bold text-zinc-100 tracking-[0.2em] uppercase">Modules Library</h2>
        <div className="bg-white/10 text-white text-[10px] px-2 py-0.5 rounded font-mono font-bold tracking-widest">{clips.length}</div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
        {clips.length === 0 ? (
          <div className="h-40 flex pl-4 pr-4">
             <div className="w-full h-full border border-dashed border-white/10 rounded-xl flex flex-col items-center justify-center p-8 text-center bg-white/[0.02]">
                <p className="text-zinc-500 font-mono text-[10px] uppercase tracking-widest leading-relaxed">
                  Press RECORD<br/>Play the keyboard<br/>To create modules
                </p>
             </div>
          </div>
        ) : (
          clips.map(clip => (
            <div 
              key={clip.id}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData('clipId', clip.id);
                e.currentTarget.style.opacity = '0.5';
              }}
              onDragEnd={(e) => {
                e.currentTarget.style.opacity = '1';
              }}
              // clip.color is a tailwind class like "bg-cyan-500 text-cyan-900 border-cyan-400"
              className={`group flex items-center h-[4.5rem] bg-[#111111] hover:bg-[#151515] rounded-xl overflow-hidden cursor-grab active:cursor-grabbing shadow-md transition-all border border-white/5`}
            >
              {/* Colored handle/icon area */}
              <div className={`w-16 h-full ${clip.color} flex items-center justify-center border-r border-black/40 shadow-inner shrink-0`}>
                 <GripVertical size={16} className="text-black/50" />
              </div>
              
              <div className="flex-1 min-w-0 px-4 py-2 flex flex-col justify-center truncate">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-zinc-100 truncate tracking-wide">{clip.name}</span>
                  <span className="text-[9px] font-mono bg-white/10 px-1 rounded text-zinc-400">{clip.durationBars} Bar{clip.durationBars > 1 ? 's' : ''}</span>
                </div>
                <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest mt-0.5">{clip.instrument}</span>
              </div>
              
              <button 
                 onClick={() => onRemoveClip(clip.id)}
                 className="p-3 mr-1 text-zinc-600 hover:text-red-400 hover:bg-black/20 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                 title="Delete preset"
              >
                 <Trash2 size={16} />
              </button>
            </div>
          ))
        )}
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #333;
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #555;
        }
      `}</style>
    </div>
  );
}
