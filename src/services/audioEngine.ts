import { DeckAudioState } from '../types/midi';

export const ACCEPTED_AUDIO_EXTENSIONS = ['mp3', 'm4a', 'ogg', 'wav'] as const;
export const ACCEPTED_AUDIO_INPUT =
  '.mp3,.m4a,.ogg,.wav,audio/mpeg,audio/mp4,audio/x-m4a,audio/ogg,audio/wav,audio/wave,audio/x-wav';

interface DeckNodes {
  audio: HTMLAudioElement;
  objectUrl: string | null;
  source: MediaElementAudioSourceNode | null;
  bassFilter: BiquadFilterNode | null;
  djFilter: BiquadFilterNode | null;
  channelGain: GainNode | null;
  crossfadeGain: GainNode | null;
  analyser: AnalyserNode | null;
  analyserBuffer: Uint8Array<ArrayBuffer> | null;
  state: DeckAudioState;
}

const createInitialDeckState = (): DeckAudioState => ({
  loaded: false,
  fileName: '',
  format: '',
  duration: 0,
  currentTime: 0,
  isPlaying: false,
  cuePoint: 0,
  hotcues: [null, null, null, null],
  level: 0,
});

export interface AudioEngineSnapshot {
  deckA: DeckAudioState;
  deckB: DeckAudioState;
}

type AudioListener = (snapshot: AudioEngineSnapshot) => void;

class DualDeckAudioEngine {
  private ctx: AudioContext | null = null;
  private deckA: DeckNodes;
  private deckB: DeckNodes;
  private crossfaderValue = 64;
  private listeners = new Set<AudioListener>();
  private rafId: number | null = null;
  private deckAVolume = 100;
  private deckBVolume = 100;

  constructor() {
    this.deckA = this.createDeckNodes('A');
    this.deckB = this.createDeckNodes('B');
  }

  private createDeckNodes(deckId: 'A' | 'B'): DeckNodes {
    const audio = new Audio();
    audio.preload = 'metadata';
    audio.crossOrigin = 'anonymous';
    // Keep pitch natural when adjusting tempo slider
    (audio as any).preservesPitch = true;

    const nodes: DeckNodes = {
      audio,
      objectUrl: null,
      source: null,
      bassFilter: null,
      djFilter: null,
      channelGain: null,
      crossfadeGain: null,
      analyser: null,
      analyserBuffer: null,
      state: createInitialDeckState(),
    };

    audio.addEventListener('loadedmetadata', () => {
      nodes.state = {
        ...nodes.state,
        duration: Number.isFinite(audio.duration) ? audio.duration : 0,
        currentTime: 0,
      };
      this.notify();
    });

    audio.addEventListener('ended', () => {
      nodes.state = {
        ...nodes.state,
        isPlaying: false,
        currentTime: 0,
        level: 0,
      };
      audio.currentTime = 0;
      this.stopLoopIfIdle();
      this.notify();
    });

    audio.addEventListener('error', () => {
      if (nodes.state.loaded) {
        nodes.state = {
          ...nodes.state,
          isPlaying: false,
          error: `Could not decode audio on Deck ${deckId}.`,
        };
        this.stopLoopIfIdle();
        this.notify();
      }
    });

    return nodes;
  }

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private wireDeckGraph(nodes: DeckNodes, deckId: 'A' | 'B') {
    const ctx = this.ensureContext();
    if (!ctx || nodes.source) return;

    const source = ctx.createMediaElementSource(nodes.audio);
    const bassFilter = ctx.createBiquadFilter();
    bassFilter.type = 'lowshelf';
    bassFilter.frequency.value = 200;
    bassFilter.gain.value = 0;

    const djFilter = ctx.createBiquadFilter();
    djFilter.type = 'allpass';
    djFilter.frequency.value = 1000;
    djFilter.Q.value = 1.2;

    const channelGain = ctx.createGain();
    const vol = deckId === 'A' ? this.deckAVolume : this.deckBVolume;
    channelGain.gain.value = vol / 127;

    const crossfadeGain = ctx.createGain();
    crossfadeGain.gain.value = this.computeCrossfadeGain(deckId, this.crossfaderValue);

    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;

    source.connect(bassFilter);
    bassFilter.connect(djFilter);
    djFilter.connect(channelGain);
    channelGain.connect(crossfadeGain);
    crossfadeGain.connect(analyser);
    analyser.connect(ctx.destination);

    nodes.source = source;
    nodes.bassFilter = bassFilter;
    nodes.djFilter = djFilter;
    nodes.channelGain = channelGain;
    nodes.crossfadeGain = crossfadeGain;
    nodes.analyser = analyser;
    nodes.analyserBuffer = new Uint8Array(analyser.frequencyBinCount) as Uint8Array<ArrayBuffer>;
  }

  private computeCrossfadeGain(deckId: 'A' | 'B', val: number): number {
    const norm = Math.max(0, Math.min(1, val / 127));
    if (deckId === 'A') {
      return Math.min(1, (1 - norm) * 2);
    }
    return Math.min(1, norm * 2);
  }

  private getDeck(deck: 'A' | 'B'): DeckNodes {
    return deck === 'A' ? this.deckA : this.deckB;
  }

  public isSupportedFile(file: File): { valid: boolean; ext: string } {
    const ext = (file.name.split('.').pop() || '').toLowerCase();
    if ((ACCEPTED_AUDIO_EXTENSIONS as readonly string[]).includes(ext)) {
      return { valid: true, ext: ext.toUpperCase() };
    }
    const mime = file.type.toLowerCase();
    if (
      mime === 'audio/mpeg' ||
      mime === 'audio/mp3' ||
      mime === 'audio/mp4' ||
      mime === 'audio/x-m4a' ||
      mime === 'audio/aac' ||
      mime === 'audio/ogg' ||
      mime === 'audio/wav' ||
      mime === 'audio/wave' ||
      mime === 'audio/x-wav'
    ) {
      const mapped = mime.includes('ogg')
        ? 'OGG'
        : mime.includes('wav')
        ? 'WAV'
        : mime.includes('mp4') || mime.includes('m4a') || mime.includes('aac')
        ? 'M4A'
        : 'MP3';
      return { valid: true, ext: mapped };
    }
    return { valid: false, ext: ext.toUpperCase() || 'FILE' };
  }

  public loadFile(deck: 'A' | 'B', file: File): { ok: boolean; error?: string } {
    const check = this.isSupportedFile(file);
    if (!check.valid) {
      const nodes = this.getDeck(deck);
      nodes.state = {
        ...nodes.state,
        error: `Unsupported format (.${check.ext.toLowerCase()}). Upload MP3, M4A, OGG, or WAV.`,
      };
      this.notify();
      return { ok: false, error: nodes.state.error };
    }

    const nodes = this.getDeck(deck);
    nodes.audio.pause();
    if (nodes.objectUrl) {
      URL.revokeObjectURL(nodes.objectUrl);
      nodes.objectUrl = null;
    }

    const url = URL.createObjectURL(file);
    nodes.objectUrl = url;
    nodes.audio.src = url;
    nodes.audio.currentTime = 0;

    this.wireDeckGraph(nodes, deck);

    nodes.state = {
      loaded: true,
      fileName: file.name,
      format: check.ext,
      duration: 0,
      currentTime: 0,
      isPlaying: false,
      cuePoint: 0,
      hotcues: [null, null, null, null],
      level: 0,
      error: undefined,
    };

    nodes.audio.load();
    this.notify();
    return { ok: true };
  }

  public clearError(deck: 'A' | 'B') {
    const nodes = this.getDeck(deck);
    if (nodes.state.error) {
      nodes.state = { ...nodes.state, error: undefined };
      this.notify();
    }
  }

  public unloadDeck(deck: 'A' | 'B') {
    const nodes = this.getDeck(deck);
    nodes.audio.pause();
    nodes.audio.removeAttribute('src');
    nodes.audio.load();
    if (nodes.objectUrl) {
      URL.revokeObjectURL(nodes.objectUrl);
      nodes.objectUrl = null;
    }
    nodes.state = createInitialDeckState();
    this.stopLoopIfIdle();
    this.notify();
  }

  public async togglePlay(deck: 'A' | 'B'): Promise<boolean> {
    const nodes = this.getDeck(deck);
    if (!nodes.state.loaded) return false;

    this.wireDeckGraph(nodes, deck);
    this.ensureContext();

    if (nodes.audio.paused) {
      try {
        await nodes.audio.play();
        nodes.state = { ...nodes.state, isPlaying: true, error: undefined };
        this.startLoop();
        this.notify();
        return true;
      } catch {
        nodes.state = {
          ...nodes.state,
          isPlaying: false,
          error: 'Tap Play on screen to unlock browser audio playback.',
        };
        this.notify();
        return false;
      }
    } else {
      nodes.audio.pause();
      nodes.state = {
        ...nodes.state,
        isPlaying: false,
        currentTime: nodes.audio.currentTime,
        level: 0,
      };
      this.stopLoopIfIdle();
      this.notify();
      return false;
    }
  }

  public triggerCue(deck: 'A' | 'B', isShift = false): boolean {
    const nodes = this.getDeck(deck);
    if (!nodes.state.loaded) return false;

    if (isShift) {
      nodes.audio.pause();
      nodes.audio.currentTime = 0;
      nodes.state = {
        ...nodes.state,
        isPlaying: false,
        currentTime: 0,
        cuePoint: 0,
        level: 0,
      };
      this.stopLoopIfIdle();
      this.notify();
      return false;
    }

    if (!nodes.audio.paused) {
      nodes.audio.pause();
      nodes.audio.currentTime = nodes.state.cuePoint;
      nodes.state = {
        ...nodes.state,
        isPlaying: false,
        currentTime: nodes.state.cuePoint,
        level: 0,
      };
      this.stopLoopIfIdle();
    } else {
      // If paused near cue, set cue point to current position
      const newCue = nodes.audio.currentTime;
      nodes.state = {
        ...nodes.state,
        cuePoint: newCue,
        currentTime: newCue,
      };
    }
    this.notify();
    return nodes.state.isPlaying;
  }

  public triggerHotcue(deck: 'A' | 'B', padIndex: number, clear = false) {
    const nodes = this.getDeck(deck);
    if (!nodes.state.loaded || padIndex < 0 || padIndex > 3) return;

    const hotcues = [...nodes.state.hotcues] as [
      number | null,
      number | null,
      number | null,
      number | null,
    ];

    if (clear) {
      hotcues[padIndex] = null;
      nodes.state = { ...nodes.state, hotcues };
      this.notify();
      return;
    }

    const existing = hotcues[padIndex];
    if (existing === null) {
      hotcues[padIndex] = nodes.audio.currentTime;
      nodes.state = { ...nodes.state, hotcues };
    } else {
      nodes.audio.currentTime = existing;
      nodes.state = { ...nodes.state, currentTime: existing };
    }
    this.notify();
  }

  public seek(deck: 'A' | 'B', seconds: number) {
    const nodes = this.getDeck(deck);
    if (!nodes.state.loaded) return;
    const clamped = Math.max(0, Math.min(nodes.state.duration || 0, seconds));
    nodes.audio.currentTime = clamped;
    nodes.state = { ...nodes.state, currentTime: clamped };
    this.notify();
  }

  public nudgeSeconds(deck: 'A' | 'B', deltaSeconds: number) {
    const nodes = this.getDeck(deck);
    if (!nodes.state.loaded) return;
    this.seek(deck, nodes.audio.currentTime + deltaSeconds);
  }

  public setVolume(deck: 'A' | 'B', midiVal: number) {
    if (deck === 'A') this.deckAVolume = midiVal;
    else this.deckBVolume = midiVal;
    const nodes = this.getDeck(deck);
    if (nodes.channelGain) {
      nodes.channelGain.gain.value = Math.max(0, Math.min(1, midiVal / 127));
    }
  }

  public setCrossfader(midiVal: number) {
    this.crossfaderValue = midiVal;
    if (this.deckA.crossfadeGain) {
      this.deckA.crossfadeGain.gain.value = this.computeCrossfadeGain('A', midiVal);
    }
    if (this.deckB.crossfadeGain) {
      this.deckB.crossfadeGain.gain.value = this.computeCrossfadeGain('B', midiVal);
    }
  }

  public setPitch(deck: 'A' | 'B', midiVal: number) {
    const nodes = this.getDeck(deck);
    // ±12% pitch range around center 64
    const rate = 1 + ((midiVal - 64) / 64) * 0.12;
    nodes.audio.playbackRate = Math.max(0.5, Math.min(1.5, rate));
  }

  public setBass(deck: 'A' | 'B', midiVal: number) {
    const nodes = this.getDeck(deck);
    if (!nodes.bassFilter) return;
    const db = ((midiVal - 64) / 64) * 14; // -14dB to +14dB
    nodes.bassFilter.gain.value = db;
  }

  public setFilter(deck: 'A' | 'B', midiVal: number) {
    const nodes = this.getDeck(deck);
    if (!nodes.djFilter) return;
    if (midiVal >= 60 && midiVal <= 68) {
      nodes.djFilter.type = 'allpass';
      nodes.djFilter.frequency.value = 1000;
    } else if (midiVal < 60) {
      nodes.djFilter.type = 'lowpass';
      const norm = midiVal / 60;
      nodes.djFilter.frequency.value = 160 * Math.pow(100, norm); // 160Hz to 16kHz
    } else {
      nodes.djFilter.type = 'highpass';
      const norm = (midiVal - 68) / (127 - 68);
      nodes.djFilter.frequency.value = 60 * Math.pow(110, norm); // 60Hz to 6.6kHz
    }
  }

  private computeLevel(nodes: DeckNodes): number {
    if (!nodes.state.isPlaying || !nodes.analyser || !nodes.analyserBuffer) return 0;
    nodes.analyser.getByteTimeDomainData(nodes.analyserBuffer);
    let sum = 0;
    const len = nodes.analyserBuffer.length;
    for (let i = 0; i < len; i++) {
      const v = (nodes.analyserBuffer[i] - 128) / 128;
      sum += v * v;
    }
    const rms = Math.sqrt(sum / len);
    return Math.min(127, Math.round(rms * 340));
  }

  private startLoop() {
    if (this.rafId !== null) return;
    const tick = () => {
      if (!this.deckA.state.isPlaying && !this.deckB.state.isPlaying) {
        this.rafId = null;
        return;
      }

      if (this.deckA.state.isPlaying) {
        this.deckA.state = {
          ...this.deckA.state,
          currentTime: this.deckA.audio.currentTime,
          level: this.computeLevel(this.deckA),
        };
      }
      if (this.deckB.state.isPlaying) {
        this.deckB.state = {
          ...this.deckB.state,
          currentTime: this.deckB.audio.currentTime,
          level: this.computeLevel(this.deckB),
        };
      }

      this.notify();
      this.rafId = window.requestAnimationFrame(tick);
    };
    this.rafId = window.requestAnimationFrame(tick);
  }

  private stopLoopIfIdle() {
    if (!this.deckA.state.isPlaying && !this.deckB.state.isPlaying && this.rafId !== null) {
      window.cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  public getSnapshot(): AudioEngineSnapshot {
    return {
      deckA: this.deckA.state,
      deckB: this.deckB.state,
    };
  }

  public subscribe(listener: AudioListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    const snap = this.getSnapshot();
    this.listeners.forEach((fn) => fn(snap));
  }
}

export const audioEngine = new DualDeckAudioEngine();

export function formatTrackTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
