import { Clip, InstrumentType } from '../types';

class AudioEngine {
  context: AudioContext;
  masterGain: GainNode;
  activeOscillators: Set<OscillatorNode | AudioBufferSourceNode> = new Set();
  noiseBuffer: AudioBuffer | null = null;

  constructor() {
    this.context = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.masterGain = this.context.createGain();
    this.masterGain.connect(this.context.destination);
    this.masterGain.gain.value = 0.25; // Lower overall volume to provide headroom for large chords
    this.initNoiseBuffer();
  }

  initNoiseBuffer() {
    const bufferSize = this.context.sampleRate * 2.0; 
    this.noiseBuffer = this.context.createBuffer(1, bufferSize, this.context.sampleRate);
    const output = this.noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
    }
  }

  async resume() {
    if (this.context.state === 'suspended') {
      await this.context.resume();
    }
  }

  playMetronome(time: number, isFirstBeat: boolean, type: string) {
    const osc = this.context.createOscillator();
    const gain = this.context.createGain();
    
    if (type === 'click') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(isFirstBeat ? 1200 : 800, time);
        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(0.5, time + 0.005);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.05);
    } else if (type === 'beep') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(isFirstBeat ? 880 : 440, time);
        gain.gain.setValueAtTime(0.5, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.1);
    } else { // wood
        const filter = this.context.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(isFirstBeat ? 1000 : 600, time);
        filter.Q.value = 10;
        
        osc.type = 'square';
        osc.frequency.setValueAtTime(100, time);
        
        gain.gain.setValueAtTime(0.8, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.05);
        
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);
        try {
          osc.start(time);
          osc.stop(time + 0.1);
        } catch(e) {}
        return;
    }
    
    osc.connect(gain);
    gain.connect(this.masterGain);
    try {
      osc.start(time);
      osc.stop(time + 0.1);
    } catch(e) {}
  }

  playRealtime(midiNote: number, type: InstrumentType, volume = 1): () => void {
    this.resume();
    
    // Convert MIDI to frequency
    const freq = 440 * Math.pow(2, (midiNote - 69) / 12);
    const t = this.context.currentTime;
    
    let stopped = false;
    let stopFn = () => {};

    if (type === 'synth') {
      const osc = this.context.createOscillator();
      const gain = this.context.createGain();
      const filter = this.context.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(freq * 3, t);
      
      osc.type = 'sawtooth';
      osc.frequency.value = freq;
      
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(volume * 0.3, t + 0.05);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t);
      this.activeOscillators.add(osc);
      
      stopFn = () => {
         const stopTime = this.context.currentTime;
         try {
           gain.gain.cancelScheduledValues(stopTime);
           gain.gain.setValueAtTime(gain.gain.value, stopTime);
           gain.gain.linearRampToValueAtTime(0, stopTime + 0.2);
           osc.stop(stopTime + 0.2);
           setTimeout(() => {
             this.activeOscillators.delete(osc);
             osc.disconnect(); gain.disconnect(); filter.disconnect();
           }, 250);
         } catch(e){}
      };
    } else if (type === 'bass') {
      const osc = this.context.createOscillator();
      const gain = this.context.createGain();
      osc.type = 'triangle';
      osc.frequency.value = freq / 2; // Drop an octave
      
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(volume * 0.6, t + 0.02);
      
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t);
      this.activeOscillators.add(osc);
      
      stopFn = () => {
         const stopTime = this.context.currentTime;
         try {
           gain.gain.cancelScheduledValues(stopTime);
           gain.gain.setValueAtTime(gain.gain.value, stopTime);
           gain.gain.linearRampToValueAtTime(0, stopTime + 0.1);
           osc.stop(stopTime + 0.1);
           setTimeout(() => {
             this.activeOscillators.delete(osc);
             osc.disconnect(); gain.disconnect();
           }, 150);
         } catch(e) {}
      };
    } else if (type === 'drum') {
       const osc = this.context.createOscillator();
       const gain = this.context.createGain();
       osc.type = 'sine';
       
       // Base pitch relies slightly on note frequency, but mostly an envelope 
       osc.frequency.setValueAtTime(freq / 2, t);
       osc.frequency.exponentialRampToValueAtTime(30, t + 0.1); // Quick drop
       
       gain.gain.setValueAtTime(volume, t);
       gain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);
       
       osc.connect(gain);
       gain.connect(this.masterGain);
       osc.start(t);
       osc.stop(t + 0.3);
       
       stopFn = () => {}; 
    } else if (type === 'cymbal') {
       const noiseNode = this.context.createBufferSource();
       if (this.noiseBuffer) noiseNode.buffer = this.noiseBuffer;
       
       const filter = this.context.createBiquadFilter();
       filter.type = 'highpass';
       filter.frequency.value = 4000;
       
       const gain = this.context.createGain();
       gain.gain.setValueAtTime(volume * 0.4, t);
       gain.gain.exponentialRampToValueAtTime(0.01, t + 0.25); // Quick decay
       
       noiseNode.connect(filter);
       filter.connect(gain);
       gain.connect(this.masterGain);
       
       noiseNode.start(t);
       noiseNode.stop(t + 0.25);
       
       stopFn = () => {}; 
    }
    
    return () => {
      if (stopped) return;
      stopped = true;
      stopFn();
    };
  }

  scheduleClip(clip: Clip, startTimeInContext: number, trackVolume: number) {
    if (trackVolume <= 0) return;

    const now = this.context.currentTime;

    clip.notes.forEach(note => {
      const scheduledStart = startTimeInContext + note.startSecs;
      // Ensure the target schedule time is strictly in the future.
      let t = scheduledStart;
      let d = note.durationSecs;

      if (t < now) {
          // If we fell behind, adjust start time and duration so we don't schedule in the past
          d = d - (now - t);
          t = now + 0.005;
      }

      if (d <= 0) return; // Note already finished
      d = Math.max(0.02, d); // enforce minimum 20ms note duration
      
      const freq = 440 * Math.pow(2, (note.midiNote - 69) / 12);

      if (clip.instrument === 'synth') {
        const osc = this.context.createOscillator();
        const gain = this.context.createGain();
        const filter = this.context.createBiquadFilter();
        
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(freq * 3, t);
        
        osc.type = 'sawtooth';
        osc.frequency.value = freq;
        
        // ADSR Envelope
        const attackT = Math.min(0.05, d * 0.2);
        const releaseT = Math.min(0.05, d * 0.2);
        const sustainLevel = trackVolume * 0.3;

        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(sustainLevel, t + attackT); 
        gain.gain.setValueAtTime(sustainLevel, t + d - releaseT); 
        gain.gain.linearRampToValueAtTime(0, t + d);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);

        try {
          osc.start(t);
          osc.stop(t + d);
          
          this.activeOscillators.add(osc);
          osc.onended = () => {
            this.activeOscillators.delete(osc);
            osc.disconnect(); gain.disconnect(); filter.disconnect();
          };
        } catch (e) {}

      } else if (clip.instrument === 'bass') {
        const osc = this.context.createOscillator();
        const gain = this.context.createGain();

        osc.type = 'triangle';
        osc.frequency.value = freq / 2;

        const attackT = Math.min(0.02, d * 0.2);
        const releaseT = Math.min(0.05, d * 0.2);
        const sustainLevel = trackVolume * 0.6;

        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(sustainLevel, t + attackT);
        gain.gain.setValueAtTime(sustainLevel, t + d - releaseT);
        gain.gain.linearRampToValueAtTime(0, t + d);

        osc.connect(gain);
        gain.connect(this.masterGain);

        try {
          osc.start(t);
          osc.stop(t + d);
          this.activeOscillators.add(osc);
          osc.onended = () => {
            this.activeOscillators.delete(osc);
            osc.disconnect(); gain.disconnect();
          };
        } catch (e) {}
        
      } else if (clip.instrument === 'drum') {
         const osc = this.context.createOscillator();
         const gain = this.context.createGain();
         osc.type = 'sine';
         osc.frequency.setValueAtTime(freq / 2, t);
         osc.frequency.exponentialRampToValueAtTime(30, t + 0.1); 
         
         gain.gain.setValueAtTime(trackVolume, t);
         gain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);
         
         osc.connect(gain);
         gain.connect(this.masterGain);
         try {
           osc.start(t); osc.stop(t + 0.3);
           this.activeOscillators.add(osc);
           osc.onended = () => {
              this.activeOscillators.delete(osc);
              osc.disconnect(); gain.disconnect();
           };
         } catch(e) {}
      } else if (clip.instrument === 'cymbal') {
         const noiseNode = this.context.createBufferSource();
         if (this.noiseBuffer) noiseNode.buffer = this.noiseBuffer;
         
         const filter = this.context.createBiquadFilter();
         filter.type = 'highpass';
         filter.frequency.setValueAtTime(4000, t);
         
         const gain = this.context.createGain();
         gain.gain.setValueAtTime(trackVolume * 0.4, t);
         gain.gain.exponentialRampToValueAtTime(0.01, t + 0.25);
         
         noiseNode.connect(filter);
         filter.connect(gain);
         gain.connect(this.masterGain);
         try {
           noiseNode.start(t); noiseNode.stop(t + 0.25);
           this.activeOscillators.add(noiseNode);
           noiseNode.onended = () => {
              this.activeOscillators.delete(noiseNode);
              noiseNode.disconnect(); filter.disconnect(); gain.disconnect();
           };
         } catch(e) {}
      }
    });
  }

  stopAll() {
    this.activeOscillators.forEach(osc => {
      try {
        osc.stop();
        osc.disconnect();
      } catch (e) {}
    });
    this.activeOscillators.clear();
  }
}

export const audioEngine = new AudioEngine();
