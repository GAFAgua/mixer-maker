export type InstrumentType = 'bass' | 'drum' | 'cymbal' | 'synth' | 'sampler';

export type PlayMode = 'single' | 'diatonic' | 'major' | 'minor' | 'power';

export interface NoteEvent {
  midiNote: number;
  startSecs: number; // Start time relative to clip start
  durationSecs: number; // Length of the note
  velocity?: number; // Added to prevent loud overlay
  instrument?: InstrumentType; // The instrument used to record this note
}

export interface Clip {
  id: string;
  name: string;
  color: string;
  instrument: InstrumentType;
  durationBars: number; 
  notes: NoteEvent[];
}

export interface Track {
  id: string;
  name: string;
  volume: number;
  muted: boolean;
  activeClipId?: string; // Replaced slots with a single looping clip like Incredibox
}

export interface LiveNote {
  midiNote: number;
  startRaw: number; // raw Date.now() timestamp when recording started
  stopRaw?: number; // optional stop time, recorded when key is lifted
  rootMidi?: number; // physical key pressed to trigger this note
  velocity?: number; // the derived volume at recording time
  instrument?: InstrumentType;
}
