export type MIDIStatusType = 'noteon' | 'noteoff' | 'cc' | 'sysex' | 'pitchbend' | 'other';

export interface MIDIMessageEvent {
  id: string;
  timestamp: number;
  direction: 'in' | 'out';
  statusByte: number;
  data1: number;
  data2: number;
  hex: string;
  channel: number;
  type: MIDIStatusType;
  description: string;
  controlName?: string;
  deck?: 'A' | 'B' | 'Master';
}

export type PadMode = 'hotcue' | 'loop' | 'fx' | 'sampler';

export interface DeckControlState {
  play: boolean;
  cue: boolean;
  sync: boolean;
  pfl: boolean;
  vinyl: boolean;
  wheelTouch: boolean;
  wheelAngle: number; // in degrees for visual spinning
  wheelSpeed: number;
  pitch: number; // 0 to 127, 64 is center
  volume: number; // 0 to 127
  filter: number; // 0 to 127, 64 is neutral
  bass: number; // 0 to 127, 64 is neutral
  padMode: PadMode;
  pads: [boolean, boolean, boolean, boolean];
  padsVelocity: [number, number, number, number];
  baseLEDValue: number; // 0 to 127
}

export interface ControllerState {
  shift: boolean;
  crossfader: number; // 0 to 127, 64 is center
  masterVolume: number;
  headphoneVolume: number;
  deckA: DeckControlState;
  deckB: DeckControlState;
  baseLEDMode: number; // default or off
}

export interface ButtonAuditItem {
  id: string;
  name: string;
  deck: 'A' | 'B' | 'Master';
  category: 'Transport' | 'Pad' | 'Fader/Knob' | 'Jog' | 'Special';
  tested: boolean;
  pressCount: number;
  lastPressTime?: number;
  lastLatencyMs?: number;
  lastVelocity?: number;
}

export interface LEDState {
  deckAPlay: boolean;
  deckACue: boolean;
  deckASync: boolean;
  deckAPfl: boolean;
  deckAVinyl: boolean;
  deckAPads: [boolean, boolean, boolean, boolean];
  deckBPlay: boolean;
  deckBCue: boolean;
  deckBSync: boolean;
  deckBPfl: boolean;
  deckBPads: [boolean, boolean, boolean, boolean];
  baseLeftLevel: number; // 0 - 127
  baseRightLevel: number; // 0 - 127
}

export interface DeckAudioState {
  loaded: boolean;
  fileName: string;
  format: string;
  duration: number;
  currentTime: number;
  isPlaying: boolean;
  cuePoint: number;
  hotcues: [number | null, number | null, number | null, number | null];
  level: number; // 0 - 127 RMS VU level
  error?: string;
}

