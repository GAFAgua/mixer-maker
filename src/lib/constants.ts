export const TOTAL_BARS = 16; // A timeline consisting of 16 bars (blocks)

export const GRID_PADS_1 = [
  // Row 1 (Top)
  { midi: 60, note: 'C4', keyMatch: '1' },
  { midi: 61, note: 'C#4', keyMatch: '2' },
  { midi: 62, note: 'D4', keyMatch: '3' },
  { midi: 63, note: 'D#4', keyMatch: '4' },
  // Row 2
  { midi: 56, note: 'G#3', keyMatch: 'q' },
  { midi: 57, note: 'A3', keyMatch: 'w' },
  { midi: 58, note: 'A#3', keyMatch: 'e' },
  { midi: 59, note: 'B3', keyMatch: 'r' },
  // Row 3
  { midi: 52, note: 'E3', keyMatch: 'a' },
  { midi: 53, note: 'F3', keyMatch: 's' },
  { midi: 54, note: 'F#3', keyMatch: 'd' },
  { midi: 55, note: 'G3', keyMatch: 'f' },
  // Row 4 (Bottom)
  { midi: 48, note: 'C3', keyMatch: 'z' },
  { midi: 49, note: 'C#3', keyMatch: 'x' },
  { midi: 50, note: 'D3', keyMatch: 'c' },
  { midi: 51, note: 'D#3', keyMatch: 'v' },
];

export const GRID_PADS_2 = [
  // Row 1 (Top)
  { midi: 72, note: 'C5', keyMatch: '7' },
  { midi: 73, note: 'C#5', keyMatch: '8' },
  { midi: 74, note: 'D5', keyMatch: '9' },
  { midi: 75, note: 'D#5', keyMatch: '0' },
  // Row 2
  { midi: 68, note: 'G#4', keyMatch: 'u' },
  { midi: 69, note: 'A4', keyMatch: 'i' },
  { midi: 70, note: 'A#4', keyMatch: 'o' },
  { midi: 71, note: 'B4', keyMatch: 'p' },
  // Row 3
  { midi: 64, note: 'E4', keyMatch: 'h' },
  { midi: 65, note: 'F4', keyMatch: 'j' },
  { midi: 66, note: 'F#4', keyMatch: 'k' },
  { midi: 67, note: 'G4', keyMatch: 'l' },
  // Row 4 (Bottom)
  { midi: 60, note: 'C4', keyMatch: 'b' },
  { midi: 61, note: 'C#4', keyMatch: 'n' },
  { midi: 62, note: 'D4', keyMatch: 'm' },
  { midi: 63, note: 'D#4', keyMatch: ',' },
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
