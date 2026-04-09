/**
 * Effect preset definitions for the sampler
 */
export const EFFECTS = [
  { id: 'none', label: 'None', type: null },
  { id: 'reverb', label: 'Reverb', type: 'reverb', params: { decay: 2, wet: 0.3 } },
  { id: 'delay', label: 'Delay', type: 'delay', params: { delayTime: 0.25, feedback: 0.4, wet: 0.4 } },
  { id: 'lowpass', label: 'Low Pass', type: 'filter', params: { frequency: 800, type: 'lowpass' } },
  { id: 'highpass', label: 'High Pass', type: 'filter', params: { frequency: 400, type: 'highpass' } },
  { id: 'bitcrush', label: 'Bitcrush', type: 'bitcrush', params: { bits: 6 } },
  { id: 'distortion', label: 'Distortion', type: 'distortion', params: { distortion: 0.6 } },
  { id: 'chorus', label: 'Chorus', type: 'chorus', params: { frequency: 1.5, delayTime: 3.5, depth: 0.7 } },
  { id: 'phaser', label: 'Phaser', type: 'phaser', params: { frequency: 0.5, octaves: 3, baseFrequency: 350 } },
  { id: 'tremolo', label: 'Tremolo', type: 'tremolo', params: { frequency: 10, depth: 0.5 } },
  { id: 'compressor', label: 'Compressor', type: 'compressor', params: { threshold: -24, ratio: 4 } },
  { id: 'pitchshift', label: 'Pitch +5', type: 'pitchshift', params: { pitch: 5 } },
  { id: 'pitchshift_down', label: 'Pitch -5', type: 'pitchshift', params: { pitch: -5 } },
  { id: 'lofi', label: 'Lo-Fi', type: 'lofi', params: { bits: 8, frequency: 4000 } },
  { id: 'tape', label: 'Tape Sat.', type: 'distortion', params: { distortion: 0.1, wet: 0.7 } },
];

export const PAD_COLORS = [
  '#ff2200', '#ff5500', '#ff8800', '#ffbb00',
  '#aaff00', '#00ff88', '#00ddff', '#0088ff',
  '#aa00ff', '#ff00aa', '#ff0055', '#ff3300',
  '#00ffcc', '#ffcc00', '#cc00ff', '#ff6600',
];

export const DEFAULT_PAD = {
  sample: null,
  audioBuffer: null,
  volume: 0.8,
  pitch: 0,
  attack: 0.005,
  decay: 0.1,
  sustain: 0.8,
  release: 0.3,
  effect: 'none',
  mute: false,
  solo: false,
  oneshot: true,
};
