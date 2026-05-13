import React, { useState, useEffect, useRef } from 'react';
import { Clip, Track, LiveNote, InstrumentType, PlayMode } from './types';
import { getRandomColor } from './lib/constants';
import { GRID_PADS_1, GRID_PADS_2 } from './lib/constants';
import { audioEngine } from './lib/audioEngine';
import Keyboard from './components/Keyboard';
import Library from './components/Library';
import Stage from './components/Stage';
import SynthDeck from './components/SynthDeck';
import { Play, Square, Circle, CircleSlash, Bell, Mic } from 'lucide-react';

const getChordNotes = (root: number, mode: PlayMode): number[] => {
  switch (mode) {
    case 'single': return [root];
    // Massive octave/fifth stack for a very heavy, distinct sound
    case 'power': return [root - 12, root, root + 7, root + 12];
    // Major 9th chord for a lush, bright, dreamy sound
    case 'major': return [root, root + 4, root + 7, root + 11, root + 14];
    // Minor 9th chord for a deep, jazzy, moody sound
    case 'minor': return [root, root + 3, root + 7, root + 10, root + 14];
    // Diatonic 7th chords for scale-accurate, rich progressions
    case 'diatonic': {
      const pitchClass = root % 12;
      switch (pitchClass) {
        case 0: return [root, root + 4, root + 7, root + 11]; // C Maj7
        case 2: return [root, root + 3, root + 7, root + 10]; // D Min7
        case 4: return [root, root + 3, root + 7, root + 10]; // E Min7
        case 5: return [root, root + 4, root + 7, root + 11]; // F Maj7
        case 7: return [root, root + 4, root + 7, root + 10]; // G Dom7
        case 9: return [root, root + 3, root + 7, root + 10]; // A Min7
        case 11: return [root, root + 3, root + 6, root + 10]; // B Half-Dim7
        default: return [root, root + 7]; 
      }
    }
    default: return [root];
  }
};

export default function App() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isRecordingSampler, setIsRecordingSampler] = useState(false);
  const [bpm, setBpm] = useState(120);
  const [instrument1, setInstrument1] = useState<InstrumentType>('synth');
  const [playMode1, setPlayMode1] = useState<PlayMode>('single');
  const [instrument2, setInstrument2] = useState<InstrumentType>('drum');
  const [playMode2, setPlayMode2] = useState<PlayMode>('single');
  
  const [metronomeEnabled, setMetronomeEnabled] = useState(false);
  const [metronomeSound, setMetronomeSound] = useState<'click' | 'beep' | 'wood'>('click');
  const [visualBeat, setVisualBeat] = useState(-1);

  const metronomeEnabledRef = useRef(metronomeEnabled);
  const metronomeSoundRef = useRef(metronomeSound);
  useEffect(() => { metronomeEnabledRef.current = metronomeEnabled; }, [metronomeEnabled]);
  useEffect(() => { metronomeSoundRef.current = metronomeSound; }, [metronomeSound]);

  const [clips, setClips] = useState<Clip[]>([]);
  const [tracks, setTracks] = useState<Track[]>(Array.from({ length: 7 }).map((_, i) => ({
    id: `t${i}`, name: `Deck ${i + 1}`, volume: 0.8, muted: false, activeClipId: undefined
  })));

  // Recording State Refs (mutable to avoid interval resets)
  const recordingStartTime = useRef<number | null>(null);
  const recordedNotesRef = useRef<LiveNote[]>([]);
  
  // Realtime Active Audio Nodes (Key: deck-midi)
  const activeAudiosRef = useRef<Map<string, (() => void)[]>>(new Map());
  const [activeNotes, setActiveNotes] = useState<Set<string>>(new Set()); // Only for visual Keyboard state

  // Engine refs for the scheduler
  const tracksRef = useRef(tracks);
  const clipsRef = useRef(clips);
  
  useEffect(() => { tracksRef.current = tracks; }, [tracks]);
  useEffect(() => { clipsRef.current = clips; }, [clips]);

  const isPlayingRef = useRef(isPlaying);
  useEffect(() => {
    isPlayingRef.current = isPlaying;
    if (!isPlaying && !metronomeEnabled) {
      audioEngine.stopAll();
      setVisualBeat(-1);
    } else {
      audioEngine.resume(); // Ensure context is awake
    }
  }, [isPlaying, metronomeEnabled]);

  // Audio Sequencer Loop (Incredibox style: continuous looping of single clips per track)
  useEffect(() => {
    // Global tick length is 1 Bar (4 beats). 
    // Clips schedule themselves if the current global bar modulo their length is 0.
    const secondsPerBar = (60 / bpm) * 4;
    
    // Lookahead variables
    let nextBarTime = audioEngine.context.currentTime;
    let logicalBar = 0;
    
    const interval = setInterval(() => {
      if (!isPlayingRef.current && !metronomeEnabledRef.current) {
        // Keeps the clock synced to 'now' while stopped, so it starts immediately when toggled
        nextBarTime = audioEngine.context.currentTime;
        logicalBar = 0;
        return;
      }

      const now = audioEngine.context.currentTime;
      // If we are close to the next loop scheduling point (0.1s lookahead)
      if (now >= nextBarTime - 0.1) {
        
        // Schedule all active clips
        if (isPlayingRef.current) {
          tracksRef.current.forEach(t => {
            if (t.muted) return;
            const clipId = t.activeClipId;
            if (clipId) {
              const clip = clipsRef.current.find(c => c.id === clipId);
              if (clip) {
                // Only schedule this clip if its loop cycle starts at the current logical bar
                if (logicalBar % clip.durationBars === 0) {
                   audioEngine.scheduleClip(clip, nextBarTime, t.volume);
                }
              }
            }
          });
        }
        
        const beatDuration = 60 / bpm;
        // Schedule metronome & visual cues for the next 4 beats
        for (let b = 0; b < 4; b++) {
            const beatTime = nextBarTime + b * beatDuration;
            
            if (metronomeEnabledRef.current) {
                audioEngine.playMetronome(beatTime, b === 0, metronomeSoundRef.current);
            }
            
            if (isPlayingRef.current || metronomeEnabledRef.current) {
                const timeUntilBeat = Math.max(0, beatTime - audioEngine.context.currentTime);
                setTimeout(() => {
                    setVisualBeat(b);
                }, timeUntilBeat * 1000);
            }
        }

        // Advance Time
        nextBarTime += secondsPerBar;
        logicalBar++;
      }
    }, 25);

    return () => {
      clearInterval(interval);
      audioEngine.stopAll();
      setVisualBeat(-1);
    };
  }, [bpm]);

  // Handle finalization of the recording buffer when 'isRecording' turns false
  useEffect(() => {
    if (!isRecording && recordingStartTime.current) {
        const totalDurationMs = Date.now() - recordingStartTime.current;
        
        if (recordedNotesRef.current.length > 0 && totalDurationMs > 500) {
           const secondsPerBar = (60 / bpm) * 4;
           const totalDurationSecs = totalDurationMs / 1000;
           // Round to the nearest bar to determine the loop length of the clip
           const durationBars = Math.max(1, Math.round(totalDurationSecs / secondsPerBar));

           const newClip: Clip = {
              id: Date.now().toString(),
              name: `Mod ${clips.length + 1}`,
              color: getRandomColor(),
              instrument: instrument1,
              durationBars: durationBars, 
              notes: recordedNotesRef.current.map(n => {
                  const rawStart = (n.startRaw - recordingStartTime.current!) / 1000;
                  const rawDuration = Math.max(0.05, ((n.stopRaw || Date.now()) - n.startRaw) / 1000);
                  return {
                      midiNote: n.midiNote,
                      startSecs: rawStart, 
                      durationSecs: rawDuration,
                      velocity: n.velocity,
                      instrument: n.instrument
                  };
              })
           };
           setClips(prev => [...prev, newClip]);
        }
        
        recordingStartTime.current = null;
        recordedNotesRef.current = [];
    }
  }, [isRecording, clips.length, bpm, instrument1]);

  const handleRecordSample = async () => {
    if (isRecordingSampler) return;
    setIsRecordingSampler(true);
    try {
       await audioEngine.recordSample(1500); // 1.5 second sample limit
    } catch(e: any) {
       const msg = e?.name === 'NotFoundError' ? "No microphone found. Using a fallback synthetic sound." :
                   e?.name === 'NotAllowedError' ? "Microphone access denied. Using a fallback synthetic sound." :
                   "Failed to record voice sample (" + (e?.message || "unknown") + "). Using a fallback synthetic sound.";
       alert(msg);
    } finally {
       setIsRecordingSampler(false);
    }
  };

  // Keyboard Handlers
  const handleNoteOn = (rootNote: number, deckIndex: 1 | 2, keyMatch: string) => {
    const audioKey = `${deckIndex}-${rootNote}`;
    if (activeAudiosRef.current.has(audioKey)) return; // prevent duplicate fires
    
    const playMode = deckIndex === 1 ? playMode1 : playMode2;
    const currentInstrument = deckIndex === 1 ? instrument1 : instrument2;
    const notesToPlay = getChordNotes(rootNote, playMode);
    
    // Play all notes, dividing volume so chords aren't overwhelmingly loud
    const stopFns = notesToPlay.map(n => audioEngine.playRealtime(n, currentInstrument, 1 / Math.max(1, notesToPlay.length * 0.7)));
    
    activeAudiosRef.current.set(audioKey, stopFns);

    setActiveNotes(prev => {
        const next = new Set(prev);
        next.add(keyMatch);
        return next;
    });

    if (isRecording) {
      if (!recordingStartTime.current) {
         recordingStartTime.current = Date.now();
      }
      const velocity = 1 / Math.max(1, notesToPlay.length * 0.7);
      notesToPlay.forEach(n => {
        recordedNotesRef.current.push({
           midiNote: n,
           startRaw: Date.now(),
           rootMidi: rootNote,
           velocity: velocity,
           instrument: currentInstrument
        });
      });
    }
  };

  const handleNoteOff = (rootNote: number, deckIndex: 1 | 2, keyMatch: string) => {
    const audioKey = `${deckIndex}-${rootNote}`;
    const stopFns = activeAudiosRef.current.get(audioKey);
    if (stopFns) {
      stopFns.forEach(fn => fn());
      activeAudiosRef.current.delete(audioKey);
    }

    setActiveNotes(prev => {
        const next = new Set(prev);
        next.delete(keyMatch);
        return next;
    });

    if (isRecording) {
       // Stop all notes associated with this physical key
       recordedNotesRef.current.filter(n => n.rootMidi === rootNote && !n.stopRaw).forEach(n => {
          n.stopRaw = Date.now();
       });
    }
  };

  // Track manipulation Handlers
  const handleDropClip = (trackId: string, clipId: string) => {
    setTracks(prev => prev.map(t => {
      if (t.id !== trackId) return t;
      return { ...t, activeClipId: clipId };
    }));
  };

  const handleRemoveClipFromSlot = (trackId: string) => {
    setTracks(prev => prev.map(t => {
      if (t.id !== trackId) return t;
      return { ...t, activeClipId: undefined };
    }));
  };

  const handleToggleMute = (trackId: string) => {
    setTracks(prev => prev.map(t => (t.id === trackId ? { ...t, muted: !t.muted } : t)));
  };

  const handleChangeVolume = (trackId: string, volume: number) => {
    setTracks(prev => prev.map(t => (t.id === trackId ? { ...t, volume } : t)));
  };

  const handleRemoveClipLibrary = (clipId: string) => {
    setClips(prev => prev.filter(c => c.id !== clipId));
    // Remove from tracks too
    setTracks(prev => prev.map(t => (t.activeClipId === clipId ? { ...t, activeClipId: undefined } : t)));
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-[#000000] text-zinc-100 font-sans overflow-hidden">
      
      {/* Top Navigation Transport */}
      <header className="h-14 bg-[#050505] border-b border-white/10 flex items-center px-6 justify-between shrink-0 z-20">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center shadow-[0_0_15px_rgba(34,211,238,0.3)]">
              <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            </div>
            <div className="flex flex-col">
              <h1 className="text-sm font-bold tracking-widest text-zinc-100 uppercase leading-none">
                GrooveBox
              </h1>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 bg-white/[0.02] px-4 py-1.5 border border-white/5 rounded-md shrink-0">
             
             {/* Visual Beat Indicator */}
             <div className="flex gap-1.5 mr-1 pr-3 border-r border-white/10">
                {[0, 1, 2, 3].map(beat => (
                   <div 
                      key={beat} 
                      className={`w-1.5 h-1.5 rounded-full transition-colors duration-[50ms] 
                        ${visualBeat === beat ? (beat === 0 ? 'bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]' : 'bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]') : 'bg-white/10'}`}
                   ></div>
                ))}
             </div>

             <span className="text-[10px] font-mono font-medium text-zinc-500 tracking-widest ml-1 mr-2">TEMPO</span>
             <div className="flex items-center gap-1">
               <button 
                  onClick={() => setBpm(80)}
                  className={`px-2 py-1 rounded-sm text-[10px] font-bold tracking-wider transition-colors ${bpm <= 80 ? 'bg-cyan-500/20 text-cyan-400' : 'bg-white/5 text-zinc-500 hover:text-zinc-300 hover:bg-white/10'}`}
               >SLOW</button>
               <button 
                  onClick={() => setBpm(120)}
                  className={`px-2 py-1 rounded-sm text-[10px] font-bold tracking-wider transition-colors ${(bpm > 80 && bpm < 160) ? 'bg-cyan-500/20 text-cyan-400' : 'bg-white/5 text-zinc-500 hover:text-zinc-300 hover:bg-white/10'}`}
               >MID</button>
               <button 
                  onClick={() => setBpm(160)}
                  className={`px-2 py-1 rounded-sm text-[10px] font-bold tracking-wider transition-colors ${bpm >= 160 ? 'bg-cyan-500/20 text-cyan-400' : 'bg-white/5 text-zinc-500 hover:text-zinc-300 hover:bg-white/10'}`}
               >FAST</button>
             </div>

             <div className="h-4 w-px bg-white/10 mx-2"></div>
             
             <div className="flex items-center gap-1">
               <button
                 onClick={handleRecordSample}
                 className={`w-6 h-6 flex items-center justify-center rounded transition-all duration-300 ${isRecordingSampler ? 'text-red-400 bg-red-400/20 shadow-[0_0_10px_rgba(248,113,113,0.5)] animate-pulse' : 'text-zinc-500 hover:text-red-400 hover:bg-white/10'}`}
                 title="Record Voice Sample for Sampler Instrument"
               >
                 <Mic size={12} />
               </button>
               <div className="h-3 w-px bg-white/10 mx-1"></div>
               <button
                 onClick={() => setMetronomeEnabled(!metronomeEnabled)}
                 className={`w-6 h-6 flex items-center justify-center rounded transition-colors ${metronomeEnabled ? 'text-cyan-400 bg-cyan-400/10' : 'text-zinc-500 hover:text-zinc-300'}`}
                 title="Toggle Metronome"
               >
                  <Bell size={12} />
               </button>
               <button
                 onClick={() => {
                    const sounds: ('click' | 'beep' | 'wood')[] = ['click', 'beep', 'wood'];
                    setMetronomeSound(sounds[(sounds.indexOf(metronomeSound) + 1) % sounds.length]);
                 }}
                 className="text-[9px] uppercase font-mono text-zinc-400 hover:text-zinc-200 transition-colors w-10 text-left"
                 title="Change Metronome Sound"
               >
                 {metronomeSound}
               </button>
             </div>
          </div>

          <div className="h-4 w-px bg-white/10 mx-1 hidden sm:block"></div>

          <div className="flex items-center gap-2">
            <button 
               onClick={() => setIsPlaying(!isPlaying)}
               className={`flex items-center justify-center w-9 h-9 rounded-md transition-all duration-300
                 ${isPlaying ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 shadow-[0_0_15px_rgba(34,211,238,0.15)]' : 'bg-white/[0.02] text-zinc-400 hover:text-zinc-200 border border-white/5 hover:border-white/10 hover:bg-white/[0.04]'}`}
            >
               {isPlaying ? <Square size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" className="ml-0.5" />}
            </button>
            
            <button 
               onClick={() => {
                  if (!isRecording) {
                    // Start recording immediately to capture rests at the beginning
                    recordingStartTime.current = Date.now();
                    recordedNotesRef.current = [];
                  } else {
                    // It will be finalized in the useEffect
                  }
                  setIsRecording(!isRecording);
               }}
               className={`flex items-center gap-2 px-4 h-9 rounded-md font-medium text-[10px] tracking-wider uppercase transition-all duration-300
                 ${isRecording ? 'bg-red-500/10 text-red-500 border border-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.15)]' : 'bg-white/[0.02] text-zinc-400 hover:text-zinc-200 border border-white/5 hover:border-white/10 hover:bg-white/[0.04]'}`}
            >
               {isRecording ? <CircleSlash size={12} /> : <Circle size={12} className="text-red-500" fill="currentColor" />}
               {isRecording ? 'Finish' : 'Record'}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
         {/* Left Sidebar Library */}
         <Library clips={clips} onRemoveClip={handleRemoveClipLibrary} />
         
         {/* Central Stage */}
         <Stage 
            tracks={tracks}
            clips={clips}
            isPlaying={isPlaying}
            onDropClip={handleDropClip}
            onRemoveClip={handleRemoveClipFromSlot}
            onToggleMute={handleToggleMute}
            onChangeVolume={handleChangeVolume}
         />
      </div>

      {/* Bottom Panel (Synth + Keyboard) */}
      <div className="bg-[#050505] border-t border-white/10 p-4 md:p-6 flex shrink-0 gap-6 lg:gap-8 z-20 overflow-x-auto justify-center">
         <SynthDeck 
           deckName="Deck A"
           colorHex="#a855f7"
           colorClass="purple"
           instrument={instrument1}
           setInstrument={setInstrument1}
           playMode={playMode1}
           setPlayMode={setPlayMode1}
           pads={GRID_PADS_1}
           activeNotes={activeNotes}
           onNoteOn={(n, keyMatch) => handleNoteOn(n, 1, keyMatch)}
           onNoteOff={(n, keyMatch) => handleNoteOff(n, 1, keyMatch)}
           keysDesc="Left Keys (1-v)"
         />
         <SynthDeck 
           deckName="Deck B"
           colorHex="#22d3ee"
           colorClass="cyan"
           instrument={instrument2}
           setInstrument={setInstrument2}
           playMode={playMode2}
           setPlayMode={setPlayMode2}
           pads={GRID_PADS_2}
           activeNotes={activeNotes}
           onNoteOn={(n, keyMatch) => handleNoteOn(n, 2, keyMatch)}
           onNoteOff={(n, keyMatch) => handleNoteOff(n, 2, keyMatch)}
           keysDesc="Right Keys (7-p)"
         />
      </div>
    </div>
  );
}
