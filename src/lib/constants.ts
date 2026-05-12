export const TOTAL_BARS = 16; // A timeline consisting of 16 bars (blocks)

// A standard 2-octave C-Major based layout mapped to PC Keyboard
export const PIANO_KEYS = [
  { midi: 60, note: "C4", isBlack: false, keyMatch: "a" },
  { midi: 61, note: "C#4", isBlack: true, keyMatch: "w" },
  { midi: 62, note: "D4", isBlack: false, keyMatch: "s" },
  { midi: 63, note: "D#4", isBlack: true, keyMatch: "e" },
  { midi: 64, note: "E4", isBlack: false, keyMatch: "d" },
  { midi: 65, note: "F4", isBlack: false, keyMatch: "f" },
  { midi: 66, note: "F#4", isBlack: true, keyMatch: "t" },
  { midi: 67, note: "G4", isBlack: false, keyMatch: "g" },
  { midi: 68, note: "G#4", isBlack: true, keyMatch: "y" },
  { midi: 69, note: "A4", isBlack: false, keyMatch: "h" },
  { midi: 70, note: "A#4", isBlack: true, keyMatch: "u" },
  { midi: 71, note: "B4", isBlack: false, keyMatch: "j" },
  { midi: 72, note: "C5", isBlack: false, keyMatch: "k" },
  { midi: 73, note: "C#5", isBlack: true, keyMatch: "o" },
  { midi: 74, note: "D5", isBlack: false, keyMatch: "l" },
  { midi: 75, note: "D#5", isBlack: true, keyMatch: "p" },
  { midi: 76, note: "E5", isBlack: false, keyMatch: ";" },
];

export const COLORS = [
  'bg-cyan-500/10 border-cyan-500/30 text-cyan-300',
  'bg-purple-500/10 border-purple-500/30 text-purple-300',
  'bg-fuchsia-500/10 border-fuchsia-500/30 text-fuchsia-300',
  'bg-indigo-500/10 border-indigo-500/30 text-indigo-300',
  'bg-blue-500/10 border-blue-500/30 text-blue-300',
  'bg-rose-500/10 border-rose-500/30 text-rose-300',
  'bg-emerald-500/10 border-emerald-500/30 text-emerald-300',
  'bg-amber-500/10 border-amber-500/30 text-amber-300',
  'bg-lime-500/10 border-lime-500/30 text-lime-300',
];

export const getRandomColor = () => COLORS[Math.floor(Math.random() * COLORS.length)];
