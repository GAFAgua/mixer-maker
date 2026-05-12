import React from 'react';
import { Track, Clip } from '../types';
import { Volume2, VolumeX, Trash2, Disc3 } from 'lucide-react';

interface StageProps {
  tracks: Track[];
  clips: Clip[];
  isPlaying: boolean;
  onDropClip: (trackId: string, clipId: string) => void;
  onRemoveClip: (trackId: string) => void;
  onToggleMute: (trackId: string) => void;
  onChangeVolume: (trackId: string, volume: number) => void;
}

export default function Stage({ 
  tracks, 
  clips, 
  isPlaying,
  onDropClip, 
  onRemoveClip, 
  onToggleMute, 
  onChangeVolume 
}: StageProps) {

  return (
    <div className="flex-1 flex pt-8 px-6 pb-8 gap-4 bg-[#000000] overflow-x-auto items-center justify-center min-w-max relative shadow-inner">
      
      {/* Decorative Background grid */}
      <div className="absolute inset-0 pointer-events-none opacity-20" 
           style={{ backgroundImage: 'linear-gradient(#333 1px, transparent 1px), linear-gradient(90deg, #333 1px, transparent 1px)', backgroundSize: '40px 40px' }}>
      </div>

      {tracks.map(track => {
        const clipId = track.activeClipId;
        const clip = clipId ? clips.find(c => c.id === clipId) : null;
        const active = isPlaying && clip && !track.muted;
        
        return (
          <div 
            key={track.id} 
            className="flex flex-col items-center gap-4 group z-10 w-32 md:w-40 shrink-0"
          >
            {/* The Deck / Character Slot */}
            <div 
              onDragOver={(e) => {
                e.preventDefault(); 
                e.currentTarget.style.borderColor = 'rgba(34, 211, 238, 0.5)';
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                e.currentTarget.style.transform = 'scale(1.02)';
              }}
              onDragLeave={(e) => {
                e.currentTarget.style.borderColor = '';
                e.currentTarget.style.backgroundColor = '';
                e.currentTarget.style.transform = '';
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.currentTarget.style.borderColor = '';
                e.currentTarget.style.backgroundColor = '';
                e.currentTarget.style.transform = '';
                const droppedClipId = e.dataTransfer.getData('clipId');
                if (droppedClipId) {
                  onDropClip(track.id, droppedClipId);
                }
              }}
              className={`w-full h-72 md:h-[22rem] rounded-2xl border-2 transition-all duration-300 flex flex-col items-center justify-center relative overflow-hidden backdrop-blur-md
                ${clip ? 'border-transparent shadow-2xl' : 'border-white/10 border-dashed hover:border-white/30 bg-white/[0.02]'}`}
            >
              {clip ? (
                <div className={`absolute inset-0 flex flex-col items-center justify-between py-6 transition-all duration-500
                   ${clip.color} ${active ? 'opacity-100 scale-100' : 'opacity-60 grayscale-[40%] scale-[0.98]'} `}>
                  
                  {/* Top: Remove Button */}
                  <button 
                    onClick={() => onRemoveClip(track.id)}
                    className="absolute top-2 right-2 p-1.5 opacity-0 group-hover:opacity-100 bg-black/40 text-white rounded-full hover:bg-red-500/80 hover:text-white transition-all shadow-lg backdrop-blur-sm z-20"
                  >
                    <Trash2 size={12} />
                  </button>
                  
                  {/* Visualizer Block */}
                  <div className="flex-1 flex flex-col items-center justify-center w-full px-4 gap-6">
                      <div className={`relative flex items-center justify-center w-20 h-20 rounded-full border-4 border-black/30 shadow-inner bg-black/20 ${active ? 'animate-spin-slow' : ''}`}>
                         <Disc3 size={32} className="text-white/50" />
                         {/* Equalizer bars if active */}
                         {active && (
                            <div className="absolute inset-0 flex items-center justify-center gap-1 opacity-70">
                               <div className="w-1 h-3 bg-white rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                               <div className="w-1 h-6 bg-white rounded-full animate-bounce" style={{ animationDelay: '100ms' }}></div>
                               <div className="w-1 h-4 bg-white rounded-full animate-bounce" style={{ animationDelay: '200ms' }}></div>
                            </div>
                         )}
                      </div>
                      
                      <div className="flex flex-col items-center gap-1 w-full text-center">
                        <span className="text-sm font-black tracking-widest text-white shadow-black/50 drop-shadow-md uppercase w-full truncate px-2">
                          {clip.name}
                        </span>
                        <span className="text-[10px] font-mono text-white/80 uppercase tracking-widest bg-black/30 px-2.5 py-1 rounded-sm">
                          {clip.instrument}
                        </span>
                      </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center text-white/20 gap-3 grayscale opacity-50 group-hover:opacity-100 group-hover:grayscale-0 transition-all duration-500">
                   <div className="w-16 h-16 rounded-full border-2 border-dashed border-current flex items-center justify-center pointer-events-none">
                     <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                       <line x1="12" y1="5" x2="12" y2="19"></line>
                       <line x1="5" y1="12" x2="19" y2="12"></line>
                     </svg>
                   </div>
                   <span className="text-[10px] font-mono font-medium tracking-widest uppercase pointer-events-none">Drop Block</span>
                </div>
              )}
              
              {/* Overlay Mute Indicator */}
              {clip && track.muted && (
                 <div className="absolute inset-0 bg-black/70 backdrop-blur-[2px] flex items-center justify-center transition-all z-10">
                    <VolumeX size={32} className="text-white/50" />
                 </div>
              )}
            </div>
            
            {/* Track Controls */}
            <div className="flex flex-col items-center w-full gap-3 px-2 bg-white/[0.02] p-3 rounded-lg border border-white/5">
              <div className="flex items-center justify-between w-full">
                <span className="text-[10px] font-mono text-zinc-500 font-bold uppercase tracking-widest">{track.name}</span>
                <button 
                  onClick={() => onToggleMute(track.id)}
                  className={`p-1.5 rounded-md transition-colors ${track.muted ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5 border border-transparent'}`}
                >
                  {track.muted ? <VolumeX size={12} /> : <Volume2 size={12} />}
                </button>
              </div>
              <input 
                type="range" 
                min="0" 
                max="1" 
                step="0.05"
                value={track.volume}
                onChange={(e) => onChangeVolume(track.id, parseFloat(e.target.value))}
                disabled={track.muted}
                className={`w-full h-1 appearance-none cursor-pointer ${track.muted ? 'opacity-30 bg-white/5' : 'bg-white/10'} accent-cyan-400`}
              />
            </div>
            
          </div>
        );
      })}
    </div>
  );
}
