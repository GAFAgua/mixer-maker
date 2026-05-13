import { Clip, InstrumentType } from '../types';

class AudioEngine {
  context: AudioContext;
  masterGain: GainNode;
  compressor: DynamicsCompressorNode;
  activeOscillators: Set<OscillatorNode | AudioBufferSourceNode> = new Set();
  noiseBuffer: AudioBuffer | null = null;
  samplerBuffer: AudioBuffer | null = null;

  constructor() {
    this.context = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Add a compressor to prevent clipping when playing chords, allowing for higher base volume
    this.compressor = this.context.createDynamicsCompressor();
    this.compressor.threshold.setValueAtTime(-15, this.context.currentTime);
    this.compressor.knee.setValueAtTime(30, this.context.currentTime);
    this.compressor.ratio.setValueAtTime(12, this.context.currentTime);
    this.compressor.attack.setValueAtTime(0.003, this.context.currentTime);
    this.compressor.release.setValueAtTime(0.25, this.context.currentTime);
    this.compressor.connect(this.context.destination);

    this.masterGain = this.context.createGain();
    this.masterGain.connect(this.compressor);
    this.masterGain.gain.value = 1.2; // Increased volume overall, compressor will handle peaks
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

  async recordSample(durationMs: number = 1000): Promise<void> {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Microphone not supported in this browser/environment.');
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      mediaRecorder.ondataavailable = e => chunks.push(e.data);
      
      return new Promise((resolve, reject) => {
        mediaRecorder.onstop = async () => {
          try {
             const blob = new Blob(chunks, { type: 'audio/webm' });
             const arrayBuffer = await blob.arrayBuffer();
             this.samplerBuffer = await this.context.decodeAudioData(arrayBuffer);
             stream.getTracks().forEach(t => t.stop());
             resolve();
          } catch(e) {
             reject(e);
          }
        };
        mediaRecorder.start();
        setTimeout(() => mediaRecorder.stop(), durationMs);
      });
    } catch (e: any) {
      console.warn('Failed to record sample, using fallback sound.', e);
      // Fallback: generate a short default synthetic sound for the sampler
      const sampleRate = this.context.sampleRate;
      const buffer = this.context.createBuffer(1, sampleRate * 0.5, sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < buffer.length; i++) {
        // A simple synth vocal-like "ah" wave approximation
        const t = i / sampleRate;
        data[i] = Math.sin(2 * Math.PI * 440 * t) * Math.exp(-t * 5);
      }
      this.samplerBuffer = buffer;
      throw e; // rethrow so the UI can show a fallback warning
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
      gain.gain.linearRampToValueAtTime(volume * 0.8, t + 0.05);

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
      gain.gain.linearRampToValueAtTime(volume * 1.5, t + 0.02);
      
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
       
       gain.gain.setValueAtTime(volume * 2, t);
       gain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);
       
       osc.connect(gain);
       gain.connect(this.masterGain);
       osc.start(t);
       osc.stop(t + 0.3);
       
       stopFn = () => {}; 
    } else if (type === 'sampler' && this.samplerBuffer) {
       const source = this.context.createBufferSource();
       source.buffer = this.samplerBuffer;
       const rate = Math.pow(2, (midiNote - 60) / 12);
       source.playbackRate.value = rate;

       const gain = this.context.createGain();
       gain.gain.setValueAtTime(volume * 1.5, t);
       gain.gain.exponentialRampToValueAtTime(0.01, t + 1.0);
       
       source.connect(gain);
       gain.connect(this.masterGain);
       source.start(t);
       
       this.activeOscillators.add(source);
       stopFn = () => {
          try {
             gain.gain.cancelScheduledValues(this.context.currentTime);
             gain.gain.linearRampToValueAtTime(0, this.context.currentTime + 0.05);
             setTimeout(() => source.stop(), 50);
             this.activeOscillators.delete(source);
          } catch(e) {}
       };
    } else if (type === 'cymbal') {
       const noiseNode = this.context.createBufferSource();
       if (this.noiseBuffer) noiseNode.buffer = this.noiseBuffer;
       
       const filter = this.context.createBiquadFilter();
       filter.type = 'highpass';
       filter.frequency.value = 4000;
       
       const gain = this.context.createGain();
       gain.gain.setValueAtTime(volume * 1.0, t);
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
      
      const velocity = note.velocity ?? 1;
      const freq = 440 * Math.pow(2, (note.midiNote - 69) / 12);
      const instrumentToPlay = note.instrument || clip.instrument;

      if (instrumentToPlay === 'synth') {
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
        const sustainLevel = trackVolume * velocity * 0.8;

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

      } else if (instrumentToPlay === 'bass') {
        const osc = this.context.createOscillator();
        const gain = this.context.createGain();

        osc.type = 'triangle';
        osc.frequency.value = freq / 2;

        const attackT = Math.min(0.02, d * 0.2);
        const releaseT = Math.min(0.05, d * 0.2);
        const sustainLevel = trackVolume * velocity * 1.5;

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
        
      } else if (instrumentToPlay === 'drum') {
         const osc = this.context.createOscillator();
         const gain = this.context.createGain();
         osc.type = 'sine';
         osc.frequency.setValueAtTime(freq / 2, t);
         osc.frequency.exponentialRampToValueAtTime(30, t + 0.1); 
         
         gain.gain.setValueAtTime(trackVolume * velocity * 2, t);
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
      } else if (instrumentToPlay === 'sampler' && this.samplerBuffer) {
         const source = this.context.createBufferSource();
         source.buffer = this.samplerBuffer;
         const rate = Math.pow(2, (note.midiNote - 60) / 12);
         source.playbackRate.value = rate;
         
         const gain = this.context.createGain();
         const attackT = Math.min(0.05, d * 0.2);
         const releaseT = Math.min(0.05, d * 0.2);
         const sustainLevel = trackVolume * velocity * 1.5;
         
         gain.gain.setValueAtTime(0, t);
         gain.gain.linearRampToValueAtTime(sustainLevel, t + attackT);
         gain.gain.setValueAtTime(sustainLevel, t + d - releaseT);
         gain.gain.linearRampToValueAtTime(0, t + d);
         
         source.connect(gain);
         gain.connect(this.masterGain);
         try {
           source.start(t);
           source.stop(t + d);
           this.activeOscillators.add(source);
           source.onended = () => {
              this.activeOscillators.delete(source);
              source.disconnect(); gain.disconnect();
           };
         } catch(e) {}
      } else if (instrumentToPlay === 'cymbal') {
         const noiseNode = this.context.createBufferSource();
         if (this.noiseBuffer) noiseNode.buffer = this.noiseBuffer;
         
         const filter = this.context.createBiquadFilter();
         filter.type = 'highpass';
         filter.frequency.setValueAtTime(4000, t);
         
         const gain = this.context.createGain();
         gain.gain.setValueAtTime(trackVolume * velocity * 1.0, t);
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
