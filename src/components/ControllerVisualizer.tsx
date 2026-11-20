import React, { useRef, useState, useEffect } from 'react';
import { ControllerState, PadMode, LEDState, DeckAudioState } from '../types/midi';
import { ACCEPTED_AUDIO_INPUT, formatTrackTime } from '../services/audioEngine';
import {
  Disc,
  Headphones,
  Zap,
  Play,
  Pause,
  Upload,
  X,
  Music,
  AlertTriangle,
} from 'lucide-react';

interface VisualizerProps {
  state: ControllerState;
  leds: LEDState;
  deckAAudio: DeckAudioState;
  deckBAudio: DeckAudioState;
  onUploadAudio: (deck: 'A' | 'B', file: File) => void;
  onUnloadAudio: (deck: 'A' | 'B') => void;
  onToggleDeckPlay: (deck: 'A' | 'B') => void;
  onSeekDeck: (deck: 'A' | 'B', seconds: number) => void;
  onSimulateEvent: (status: number, data1: number, data2: number) => void;
  isVirtualMode: boolean;
}

interface DeckAudioStripProps {
  deck: 'A' | 'B';
  audio: DeckAudioState;
  accent: 'cyan' | 'purple';
  onUpload: (file: File) => void;
  onUnload: () => void;
  onTogglePlay: () => void;
  onSeek: (seconds: number) => void;
}

const DeckAudioStrip: React.FC<DeckAudioStripProps> = ({
  deck,
  audio,
  accent,
  onUpload,
  onUnload,
  onTogglePlay,
  onSeek,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUpload(file);
    }
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) onUpload(file);
  };

  const progressPct =
    audio.duration > 0 ? Math.min(100, (audio.currentTime / audio.duration) * 100) : 0;

  const borderHover =
    accent === 'cyan'
      ? isDragging
        ? 'border-cyan-400 bg-cyan-950/40'
        : 'border-slate-800 hover:border-cyan-700/70'
      : isDragging
      ? 'border-purple-400 bg-purple-950/40'
      : 'border-slate-800 hover:border-purple-700/70';

  const barColor = accent === 'cyan' ? 'bg-cyan-400' : 'bg-purple-400';
  const textAccent = accent === 'cyan' ? 'text-cyan-400' : 'text-purple-400';

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      className={`rounded-lg border px-2.5 py-1.5 bg-slate-950/90 transition-colors ${borderHover}`}
    >
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_AUDIO_INPUT}
        onChange={handleFileChange}
        className="hidden"
      />

      {!audio.loaded ? (
        <div className="flex items-center justify-between gap-2 min-h-[34px]">
          <div className="flex items-center gap-2 min-w-0">
            <Music className={`w-3.5 h-3.5 shrink-0 ${textAccent}`} />
            <span className="text-[11px] text-slate-400 truncate">
              {isDragging
                ? `Drop audio onto Deck ${deck}`
                : 'Load track (MP3, M4A, OGG, WAV)'}
            </span>
          </div>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className={`px-2.5 py-1 rounded text-[11px] font-semibold flex items-center gap-1 shrink-0 border transition-colors ${
              accent === 'cyan'
                ? 'bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border-cyan-500/40'
                : 'bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border-purple-500/40'
            }`}
          >
            <Upload className="w-3 h-3" />
            <span>Upload</span>
          </button>
        </div>
      ) : (
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <button
                type="button"
                onClick={onTogglePlay}
                className={`w-5 h-5 rounded flex items-center justify-center shrink-0 transition-colors ${
                  audio.isPlaying
                    ? 'bg-emerald-500 text-slate-950'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                }`}
                title={audio.isPlaying ? 'Pause Track' : 'Play Track'}
              >
                {audio.isPlaying ? (
                  <Pause className="w-3 h-3 fill-current" />
                ) : (
                  <Play className="w-3 h-3 fill-current" />
                )}
              </button>
              <span className="text-[11px] font-semibold text-white truncate">
                {audio.fileName}
              </span>
              <span className={`text-[10px] font-mono shrink-0 ${textAccent}`}>
                · {audio.format}
              </span>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-[10px] font-mono tabular-nums text-slate-300">
                {formatTrackTime(audio.currentTime)} / {formatTrackTime(audio.duration)}
              </span>
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                title="Replace audio file"
                className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
              >
                <Upload className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={onUnload}
                title="Eject track"
                className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-rose-400 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Interactive Seek Bar with Hotcue Markers */}
          <div
            onClick={(e) => {
              if (!audio.duration) return;
              const rect = e.currentTarget.getBoundingClientRect();
              const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
              onSeek(ratio * audio.duration);
            }}
            className="relative h-2 w-full rounded bg-slate-800 cursor-pointer overflow-hidden"
            title="Click anywhere to seek"
          >
            <div
              className={`h-full ${barColor} transition-[width] duration-75`}
              style={{ width: `${progressPct}%` }}
            />
            {audio.hotcues.map((cueTime, idx) => {
              if (cueTime === null || !audio.duration) return null;
              const leftPct = (cueTime / audio.duration) * 100;
              return (
                <div
                  key={idx}
                  className="absolute top-0 bottom-0 w-0.5 bg-amber-300"
                  style={{ left: `${leftPct}%` }}
                  title={`Hotcue ${idx + 1}: ${formatTrackTime(cueTime)}`}
                />
              );
            })}
          </div>
        </div>
      )}

      {audio.error && (
        <div className="mt-1 flex items-center gap-1 text-[10px] text-rose-400">
          <AlertTriangle className="w-3 h-3 shrink-0" />
          <span className="truncate">{audio.error}</span>
        </div>
      )}
    </div>
  );
};

export const ControllerVisualizer: React.FC<VisualizerProps> = ({
  state,
  leds,
  deckAAudio,
  deckBAudio,
  onUploadAudio,
  onUnloadAudio,
  onToggleDeckPlay,
  onSeekDeck,
  onSimulateEvent,
}) => {
  const [deckAPadMode, setDeckAPadMode] = useState<PadMode>('hotcue');
  const [deckBPadMode, setDeckBPadMode] = useState<PadMode>('hotcue');
  const [deckARotation, setDeckARotation] = useState(0);
  const [deckBRotation, setDeckBRotation] = useState(0);

  // Sync manual MIDI jog changes
  useEffect(() => {
    setDeckARotation(state.deckA.wheelAngle);
  }, [state.deckA.wheelAngle]);

  useEffect(() => {
    setDeckBRotation(state.deckB.wheelAngle);
  }, [state.deckB.wheelAngle]);

  // Spin platter gently while audio is playing
  useEffect(() => {
    if (!deckAAudio.isPlaying && !deckBAudio.isPlaying) return;
    let raf = 0;
    let last = performance.now();
    const spin = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      if (deckAAudio.isPlaying) {
        setDeckARotation((prev) => (prev + dt * 110) % 360);
      }
      if (deckBAudio.isPlaying) {
        setDeckBRotation((prev) => (prev + dt * 110) % 360);
      }
      raf = requestAnimationFrame(spin);
    };
    raf = requestAnimationFrame(spin);
    return () => cancelAnimationFrame(raf);
  }, [deckAAudio.isPlaying, deckBAudio.isPlaying]);

  const handleJogSpin = (deck: 'A' | 'B', delta: number) => {
    if (deck === 'A') {
      setDeckARotation((prev) => (prev + delta * 8) % 360);
      onSimulateEvent(0xb1, 0x0a, delta > 0 ? 0x02 : 0x7e);
    } else {
      setDeckBRotation((prev) => (prev + delta * 8) % 360);
      onSimulateEvent(0xb2, 0x0a, delta > 0 ? 0x02 : 0x7e);
    }
  };

  const getPadLabels = (mode: PadMode, audio: DeckAudioState) => {
    switch (mode) {
      case 'hotcue':
        return [0, 1, 2, 3].map((i) =>
          audio.hotcues[i] !== null ? formatTrackTime(audio.hotcues[i]!) : `CUE ${i + 1}`
        );
      case 'loop':
        return ['1 BEAT', '2 BEAT', '4 BEAT', '8 BEAT'];
      case 'fx':
        return ['FX 1', 'FX 2', 'FX 3', 'ON/OFF'];
      case 'sampler':
        return ['SMPL 1', 'SMPL 2', 'SMPL 3', 'SMPL 4'];
    }
  };

  const handlePadPress = (deck: 'A' | 'B', mode: PadMode, index: number, down: boolean) => {
    const status = deck === 'A' ? 0x96 : 0x97;
    let offset = 0x00;
    if (mode === 'loop') offset = 0x10;
    else if (mode === 'fx') offset = 0x20;
    else if (mode === 'sampler') offset = 0x30;
    else if (state.shift && mode === 'hotcue') offset = 0x08;
    onSimulateEvent(status, offset + index, down ? 0x7f : 0x00);
  };

  const deckAPadLabels = getPadLabels(deckAPadMode, deckAAudio);
  const deckBPadLabels = getPadLabels(deckBPadMode, deckBAudio);

  return (
    <div className="h-full w-full flex flex-col min-h-0 select-none">
      {/* Authentic Hercules DJControl Starlight Chassis */}
      <div className="flex-1 min-h-0 w-full rounded-xl bg-gradient-to-b from-slate-900 via-[#080d1a] to-neutral-950 border border-slate-700/80 shadow-2xl p-2.5 sm:p-3.5 flex flex-col justify-between gap-2 overflow-y-auto lg:overflow-hidden slim-scroll">
        {/* Top Hardware Header Bar */}
        <div className="shrink-0 flex items-center justify-between border-b border-slate-800/80 pb-1.5 px-1">
          <div className="flex items-center gap-2 text-xs">
            <span className="font-black tracking-widest text-slate-200 uppercase font-mono">
              HERCULES
            </span>
            <span className="text-slate-600">·</span>
            <span className="text-[11px] font-semibold text-cyan-400 font-mono">
              DJCONTROL STARLIGHT
            </span>
          </div>

          <div className="flex items-center gap-3 text-[11px] font-mono tabular-nums">
            <span className="text-slate-400">
              VU L: <strong className="text-cyan-400">{leds.baseLeftLevel}</strong>
            </span>
            <span className="text-slate-400">
              VU R: <strong className="text-purple-400">{leds.baseRightLevel}</strong>
            </span>
            <span className={state.shift ? 'text-amber-300 font-bold' : 'text-slate-500 hidden sm:inline'}>
              {state.shift ? 'SHIFT ACTIVE' : 'HOLD SHIFT FOR 2ND LAYER'}
            </span>
          </div>
        </div>

        {/* 3 Hardware Columns matching real Starlight symmetry: Deck A | Center Mixer | Deck B */}
        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-2.5 items-stretch">
          {/* ================= DECK A (LEFT: OUTER JOG/PITCH + INNER 2x2 PADS) ================= */}
          <div className="lg:col-span-5 bg-slate-900/50 rounded-lg p-2.5 border border-slate-800/90 flex flex-col justify-between gap-2 min-h-0">
            {/* Deck A Header + Audio Upload Strip */}
            <div className="shrink-0 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold tracking-wider text-cyan-400 font-mono">
                  DECK 1 (A)
                </span>
                <span className="text-[10px] font-mono text-slate-500">
                  Ch 1 / Ch 7 Pads
                </span>
              </div>
              <DeckAudioStrip
                deck="A"
                audio={deckAAudio}
                accent="cyan"
                onUpload={(f) => onUploadAudio('A', f)}
                onUnload={() => onUnloadAudio('A')}
                onTogglePlay={() => onToggleDeckPlay('A')}
                onSeek={(s) => onSeekDeck('A', s)}
              />
            </div>

            {/* Physical Deck A Layout: Outer (Tempo + Jog + Sync/Cue/Play) | Inner (Vinyl/PFL + Mode + 2x2 Blue Pads) */}
            <div className="flex-1 min-h-0 grid grid-cols-12 gap-2 items-stretch">
              {/* Outer Left: Pitch + Jog + SYNC/CUE/PLAY */}
              <div className="col-span-7 flex flex-col justify-between items-center gap-1.5 bg-slate-950/60 rounded-lg p-2 border border-slate-800/70">
                <div className="flex items-center justify-center gap-2 w-full flex-1 min-h-0">
                  {/* Far-Left Tempo Fader */}
                  <div className="flex flex-col items-center justify-center h-full">
                    <span className="text-[9px] font-mono text-slate-400 font-bold mb-0.5">
                      TEMPO
                    </span>
                    <div className="relative h-24 sm:h-28 flex items-center">
                      <input
                        type="range"
                        min="0"
                        max="127"
                        value={state.deckA.pitch}
                        onChange={(e) => onSimulateEvent(0xb1, 0x08, Number(e.target.value))}
                        className="h-24 sm:h-28 w-5 appearance-none bg-slate-800 rounded cursor-pointer accent-cyan-400"
                        style={{ writingMode: 'vertical-lr', direction: 'rtl' }}
                        title="Deck A Tempo / Pitch"
                      />
                      <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-cyan-500/50 pointer-events-none" />
                    </div>
                    <span className="text-[9px] font-mono tabular-nums text-cyan-400 mt-0.5">
                      {((state.deckA.pitch - 64) * 0.19).toFixed(1)}%
                    </span>
                  </div>

                  {/* Jog Wheel Platter */}
                  <div className="flex flex-col items-center">
                    <div
                      onMouseDown={() => onSimulateEvent(0x91, 0x08, 0x7f)}
                      onMouseUp={() => onSimulateEvent(0x91, 0x08, 0x00)}
                      onTouchStart={() => onSimulateEvent(0x91, 0x08, 0x7f)}
                      onTouchEnd={() => onSimulateEvent(0x91, 0x08, 0x00)}
                      className={`w-24 h-24 sm:w-28 sm:h-28 xl:w-32 xl:h-32 rounded-full relative cursor-grab active:cursor-grabbing flex items-center justify-center border-[3px] transition-shadow ${
                        state.deckA.wheelTouch
                          ? 'border-cyan-400 shadow-lg shadow-cyan-500/40 ring-2 ring-cyan-500/20'
                          : 'border-slate-700 hover:border-slate-500 shadow-md'
                      } bg-gradient-to-br from-slate-800 via-neutral-900 to-slate-950`}
                      style={{
                        transform: `rotate(${deckARotation}deg)`,
                      }}
                      title="Jog Wheel Deck A (Top = Scratch, Rim = Bend)"
                    >
                      <div className="absolute inset-2 rounded-full border border-dashed border-slate-600/70" />
                      <div className="absolute inset-5 rounded-full border border-slate-700/80" />
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-cyan-950 via-slate-800 to-slate-950 border border-cyan-500/50 flex flex-col items-center justify-center">
                        <Disc className="w-4 h-4 text-cyan-400" />
                        <span className="text-[8px] font-mono text-cyan-300 font-bold">
                          {state.deckA.wheelTouch ? 'TOUCH' : 'A'}
                        </span>
                      </div>
                      <div className="absolute top-1 w-2 h-3 bg-cyan-400 rounded-sm shadow shadow-cyan-400" />
                    </div>

                    <div className="flex items-center gap-1.5 mt-1">
                      <button
                        type="button"
                        onClick={() => handleJogSpin('A', -2)}
                        className="px-1.5 py-0.5 rounded bg-slate-800 text-[9px] text-slate-300 hover:bg-slate-700 border border-slate-700"
                      >
                        ◀
                      </button>
                      <span className="text-[9px] font-mono tabular-nums text-slate-400 w-8 text-center">
                        {Math.round(deckARotation)}°
                      </span>
                      <button
                        type="button"
                        onClick={() => handleJogSpin('A', 2)}
                        className="px-1.5 py-0.5 rounded bg-slate-800 text-[9px] text-slate-300 hover:bg-slate-700 border border-slate-700"
                      >
                        ▶
                      </button>
                    </div>
                  </div>
                </div>

                {/* Bottom Transport Row: SYNC (Red), CUE (Orange), PLAY/PAUSE (Green) */}
                <div className="grid grid-cols-3 gap-1.5 w-full shrink-0">
                  <button
                    type="button"
                    onMouseDown={() => onSimulateEvent(state.shift ? 0x94 : 0x91, 0x05, 0x7f)}
                    onMouseUp={() => onSimulateEvent(state.shift ? 0x94 : 0x91, 0x05, 0x00)}
                    className={`h-9 rounded-md border font-bold text-[10px] flex flex-col items-center justify-center transition-all ${
                      leds.deckASync || state.deckA.sync
                        ? 'bg-rose-600/35 text-rose-200 border-rose-400 shadow-[0_0_14px_rgba(244,63,94,0.65)]'
                        : 'bg-rose-950/30 text-rose-300/80 border-rose-800/60 hover:border-rose-500'
                    }`}
                    title="SYNC (0x91 Note: 0x05)"
                  >
                    <span>SYNC</span>
                  </button>

                  <button
                    type="button"
                    onMouseDown={() => onSimulateEvent(state.shift ? 0x94 : 0x91, 0x06, 0x7f)}
                    onMouseUp={() => onSimulateEvent(state.shift ? 0x94 : 0x91, 0x06, 0x00)}
                    className={`h-9 rounded-md border font-bold text-[10px] flex flex-col items-center justify-center transition-all ${
                      leds.deckACue || state.deckA.cue
                        ? 'bg-orange-500/35 text-orange-200 border-orange-400 shadow-[0_0_14px_rgba(249,115,22,0.7)]'
                        : 'bg-orange-950/30 text-orange-300/80 border-orange-800/60 hover:border-orange-500'
                    }`}
                    title="CUE (0x91 Note: 0x06)"
                  >
                    <span>CUE</span>
                  </button>

                  <button
                    type="button"
                    onMouseDown={() => onSimulateEvent(state.shift ? 0x94 : 0x91, 0x07, 0x7f)}
                    onMouseUp={() => onSimulateEvent(state.shift ? 0x94 : 0x91, 0x07, 0x00)}
                    className={`h-9 rounded-md border font-bold text-[10px] flex items-center justify-center gap-0.5 transition-all ${
                      leds.deckAPlay || state.deckA.play || deckAAudio.isPlaying
                        ? 'bg-emerald-500/35 text-emerald-200 border-emerald-400 shadow-[0_0_14px_rgba(34,197,94,0.7)]'
                        : 'bg-emerald-950/30 text-emerald-300/80 border-emerald-800/60 hover:border-emerald-500'
                    }`}
                    title="PLAY / PAUSE (0x91 Note: 0x07)"
                  >
                    <Play className="w-3 h-3 fill-current" />
                    <span>/II</span>
                  </button>
                </div>
              </div>

              {/* Inner Left Column: Vinyl + PFL + Mode Switchers + 2x2 Electric Blue Pads */}
              <div className="col-span-5 flex flex-col justify-between gap-1.5 bg-slate-950/60 rounded-lg p-2 border border-slate-800/70">
                {/* Top 2 buttons: VINYL + Headphone PFL */}
                <div className="grid grid-cols-2 gap-1.5 shrink-0">
                  <button
                    type="button"
                    onMouseDown={() => onSimulateEvent(0x91, 0x03, 0x7f)}
                    className={`h-7 rounded border text-[9px] font-bold uppercase transition-all ${
                      leds.deckAVinyl || state.deckA.vinyl
                        ? 'bg-blue-600/30 text-blue-200 border-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.55)]'
                        : 'bg-slate-900 text-slate-400 border-slate-700'
                    }`}
                    title="Vinyl Mode (0x91 Note: 0x03)"
                  >
                    VINYL
                  </button>

                  <button
                    type="button"
                    onMouseDown={() => onSimulateEvent(state.shift ? 0x94 : 0x91, 0x0c, 0x7f)}
                    onMouseUp={() => onSimulateEvent(state.shift ? 0x94 : 0x91, 0x0c, 0x00)}
                    className={`h-7 rounded border text-[9px] font-bold flex items-center justify-center gap-1 transition-all ${
                      leds.deckAPfl || state.deckA.pfl
                        ? 'bg-cyan-500/35 text-cyan-200 border-cyan-300 shadow-[0_0_12px_rgba(34,211,238,0.6)]'
                        : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-slate-500'
                    }`}
                    title="Headphone Cue PFL (0x91 Note: 0x0C)"
                  >
                    <Headphones className="w-3 h-3" />
                    <span>PFL</span>
                  </button>
                </div>

                {/* Mode Selectors (2x2 compact) matching HOT CUE / LOOP / FX / SAMPLER */}
                <div className="grid grid-cols-2 gap-1 shrink-0">
                  {(['hotcue', 'loop', 'fx', 'sampler'] as PadMode[]).map((mode) => (
                    <button
                      type="button"
                      key={mode}
                      onClick={() => setDeckAPadMode(mode)}
                      className={`py-1 rounded text-[9px] font-bold uppercase tracking-tight transition-all border ${
                        deckAPadMode === mode
                          ? 'bg-white/90 text-slate-950 border-white shadow-[0_0_12px_rgba(255,255,255,0.65)]'
                          : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                      }`}
                    >
                      {mode === 'hotcue' ? 'HOT CUE' : mode}
                    </button>
                  ))}
                </div>

                {/* 2x2 Electric Blue Performance Pads */}
                <div className="grid grid-cols-2 gap-1.5 flex-1 min-h-0">
                  {[0, 1, 2, 3].map((idx) => {
                    const isPressed = state.deckA.pads[idx];
                    const hasCue =
                      deckAPadMode === 'hotcue' && deckAAudio.hotcues[idx] !== null;
                    const isLit = leds.deckAPads[idx] || isPressed || hasCue;
                    return (
                      <button
                        type="button"
                        key={idx}
                        onMouseDown={() => handlePadPress('A', deckAPadMode, idx, true)}
                        onMouseUp={() => handlePadPress('A', deckAPadMode, idx, false)}
                        onTouchStart={() => handlePadPress('A', deckAPadMode, idx, true)}
                        onTouchEnd={() => handlePadPress('A', deckAPadMode, idx, false)}
                        className={`rounded-md flex flex-col items-center justify-center p-1 font-mono transition-all active:scale-95 border-2 min-h-[42px] ${
                          isLit
                            ? 'bg-blue-600/35 text-white border-blue-400 shadow-[0_0_14px_rgba(59,130,246,0.75)]'
                            : 'bg-slate-950 text-blue-300/80 border-blue-600/60 shadow-[inset_0_0_8px_rgba(37,99,235,0.3)] hover:border-blue-400'
                        }`}
                      >
                        <span className="text-[11px] font-bold">{idx + 1}</span>
                        <span className="text-[8px] truncate max-w-full opacity-90">
                          {deckAPadLabels[idx]}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* ================= CENTER MIXER ================= */}
          <div className="lg:col-span-2 bg-slate-950/90 rounded-lg p-2.5 border border-slate-800 flex flex-col justify-between gap-1.5 min-h-0">
            {/* Top Circular SHIFT Button */}
            <div className="flex flex-col items-center gap-1 pb-1.5 border-b border-slate-800/80 shrink-0">
              <button
                type="button"
                onMouseDown={() => onSimulateEvent(0x90, 0x03, 0x7f)}
                onMouseUp={() => onSimulateEvent(0x90, 0x03, 0x00)}
                onTouchStart={() => onSimulateEvent(0x90, 0x03, 0x7f)}
                onTouchEnd={() => onSimulateEvent(0x90, 0x03, 0x00)}
                className={`w-full py-1.5 rounded-md font-bold text-[10px] uppercase tracking-wider border flex items-center justify-center gap-1.5 transition-all ${
                  state.shift
                    ? 'bg-amber-400 text-slate-950 border-amber-200 shadow-[0_0_14px_rgba(251,191,36,0.7)]'
                    : 'bg-slate-900 text-slate-200 border-slate-700 hover:border-slate-500'
                }`}
                title="Shift Button (0x90 Note: 0x03)"
              >
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    state.shift
                      ? 'bg-slate-950'
                      : 'bg-white shadow-[0_0_8px_rgba(255,255,255,0.9)]'
                  }`}
                />
                <span>SHIFT</span>
              </button>
            </div>

            {/* 2x2 EQ & Filter Knobs */}
            <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 shrink-0">
              <div className="flex flex-col items-center">
                <span className="text-[9px] font-mono text-slate-400 font-semibold">BASS A</span>
                <input
                  type="range"
                  min="0"
                  max="127"
                  value={state.deckA.bass}
                  onChange={(e) => onSimulateEvent(0xb1, 0x02, Number(e.target.value))}
                  className="w-full accent-cyan-400 cursor-pointer h-1.5"
                />
                <span className="text-[9px] font-mono tabular-nums text-cyan-400">
                  {state.deckA.bass}
                </span>
              </div>

              <div className="flex flex-col items-center">
                <span className="text-[9px] font-mono text-slate-400 font-semibold">BASS B</span>
                <input
                  type="range"
                  min="0"
                  max="127"
                  value={state.deckB.bass}
                  onChange={(e) => onSimulateEvent(0xb2, 0x02, Number(e.target.value))}
                  className="w-full accent-purple-400 cursor-pointer h-1.5"
                />
                <span className="text-[9px] font-mono tabular-nums text-purple-400">
                  {state.deckB.bass}
                </span>
              </div>

              <div className="flex flex-col items-center">
                <span className="text-[9px] font-mono text-slate-400 font-semibold">FILTER A</span>
                <input
                  type="range"
                  min="0"
                  max="127"
                  value={state.deckA.filter}
                  onChange={(e) => onSimulateEvent(0xb1, 0x01, Number(e.target.value))}
                  className="w-full accent-cyan-400 cursor-pointer h-1.5"
                />
                <span className="text-[9px] font-mono tabular-nums text-cyan-400">
                  {state.deckA.filter}
                </span>
              </div>

              <div className="flex flex-col items-center">
                <span className="text-[9px] font-mono text-slate-400 font-semibold">FILTER B</span>
                <input
                  type="range"
                  min="0"
                  max="127"
                  value={state.deckB.filter}
                  onChange={(e) => onSimulateEvent(0xb2, 0x01, Number(e.target.value))}
                  className="w-full accent-purple-400 cursor-pointer h-1.5"
                />
                <span className="text-[9px] font-mono tabular-nums text-purple-400">
                  {state.deckB.filter}
                </span>
              </div>
            </div>

            {/* Channel Volume Faders */}
            <div className="flex-1 min-h-[84px] grid grid-cols-2 gap-2 py-1.5 bg-slate-900/50 rounded-md border border-slate-800/80 px-2 items-center">
              <div className="flex flex-col items-center h-full justify-center">
                <span className="text-[9px] font-mono text-cyan-400 font-bold mb-1">VOL A</span>
                <input
                  type="range"
                  min="0"
                  max="127"
                  value={state.deckA.volume}
                  onChange={(e) => onSimulateEvent(0xb1, 0x00, Number(e.target.value))}
                  className="h-16 sm:h-20 w-4 accent-cyan-400 cursor-pointer"
                  style={{ writingMode: 'vertical-lr', direction: 'rtl' }}
                />
                <span className="text-[9px] font-mono tabular-nums text-slate-400 mt-0.5">
                  {state.deckA.volume}
                </span>
              </div>

              <div className="flex flex-col items-center h-full justify-center">
                <span className="text-[9px] font-mono text-purple-400 font-bold mb-1">VOL B</span>
                <input
                  type="range"
                  min="0"
                  max="127"
                  value={state.deckB.volume}
                  onChange={(e) => onSimulateEvent(0xb2, 0x00, Number(e.target.value))}
                  className="h-16 sm:h-20 w-4 accent-purple-400 cursor-pointer"
                  style={{ writingMode: 'vertical-lr', direction: 'rtl' }}
                />
                <span className="text-[9px] font-mono tabular-nums text-slate-400 mt-0.5">
                  {state.deckB.volume}
                </span>
              </div>
            </div>

            {/* Bottom Crossfader */}
            <div className="shrink-0 pt-1.5 border-t border-slate-800">
              <div className="flex justify-between text-[9px] font-mono text-slate-400 font-bold mb-1">
                <span className="text-cyan-400">A</span>
                <span>CROSSFADER</span>
                <span className="text-purple-400">B</span>
              </div>
              <input
                type="range"
                min="0"
                max="127"
                value={state.crossfader}
                onChange={(e) => onSimulateEvent(0xb0, 0x00, Number(e.target.value))}
                className="w-full accent-cyan-400 h-2 bg-slate-800 rounded cursor-pointer"
              />
            </div>
          </div>

          {/* ================= DECK B (RIGHT: INNER 2x2 PADS + OUTER JOG/PITCH) ================= */}
          <div className="lg:col-span-5 bg-slate-900/50 rounded-lg p-2.5 border border-slate-800/90 flex flex-col justify-between gap-2 min-h-0">
            {/* Deck B Header + Audio Upload Strip */}
            <div className="shrink-0 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold tracking-wider text-purple-400 font-mono">
                  DECK 2 (B)
                </span>
                <span className="text-[10px] font-mono text-slate-500">
                  Ch 2 / Ch 8 Pads
                </span>
              </div>
              <DeckAudioStrip
                deck="B"
                audio={deckBAudio}
                accent="purple"
                onUpload={(f) => onUploadAudio('B', f)}
                onUnload={() => onUnloadAudio('B')}
                onTogglePlay={() => onToggleDeckPlay('B')}
                onSeek={(s) => onSeekDeck('B', s)}
              />
            </div>

            {/* Physical Deck B Layout: Inner (PFL/Mode + 2x2 Blue Pads) | Outer (Jog + Pitch + Sync/Cue/Play) */}
            <div className="flex-1 min-h-0 grid grid-cols-12 gap-2 items-stretch">
              {/* Inner Right Column: PFL + Mode Switchers + 2x2 Electric Blue Pads */}
              <div className="col-span-5 flex flex-col justify-between gap-1.5 bg-slate-950/60 rounded-lg p-2 border border-slate-800/70">
                <div className="grid grid-cols-2 gap-1.5 shrink-0">
                  <button
                    type="button"
                    onMouseDown={() => onSimulateEvent(state.shift ? 0x95 : 0x92, 0x0c, 0x7f)}
                    onMouseUp={() => onSimulateEvent(state.shift ? 0x95 : 0x92, 0x0c, 0x00)}
                    className={`h-7 rounded border text-[9px] font-bold flex items-center justify-center gap-1 transition-all ${
                      leds.deckBPfl || state.deckB.pfl
                        ? 'bg-cyan-500/35 text-cyan-200 border-cyan-300 shadow-[0_0_12px_rgba(34,211,238,0.6)]'
                        : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-slate-500'
                    }`}
                    title="Headphone Cue PFL (0x92 Note: 0x0C)"
                  >
                    <Headphones className="w-3 h-3" />
                    <span>PFL</span>
                  </button>

                  <div className="h-7 rounded border border-slate-800 bg-slate-900/70 flex items-center justify-center text-[9px] font-mono text-slate-400">
                    DECK B
                  </div>
                </div>

                {/* Mode Selectors */}
                <div className="grid grid-cols-2 gap-1 shrink-0">
                  {(['hotcue', 'loop', 'fx', 'sampler'] as PadMode[]).map((mode) => (
                    <button
                      type="button"
                      key={mode}
                      onClick={() => setDeckBPadMode(mode)}
                      className={`py-1 rounded text-[9px] font-bold uppercase tracking-tight transition-all border ${
                        deckBPadMode === mode
                          ? 'bg-white/90 text-slate-950 border-white shadow-[0_0_12px_rgba(255,255,255,0.65)]'
                          : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                      }`}
                    >
                      {mode === 'hotcue' ? 'HOT CUE' : mode}
                    </button>
                  ))}
                </div>

                {/* 2x2 Electric Blue Performance Pads */}
                <div className="grid grid-cols-2 gap-1.5 flex-1 min-h-0">
                  {[0, 1, 2, 3].map((idx) => {
                    const isPressed = state.deckB.pads[idx];
                    const hasCue =
                      deckBPadMode === 'hotcue' && deckBAudio.hotcues[idx] !== null;
                    const isLit = leds.deckBPads[idx] || isPressed || hasCue;
                    return (
                      <button
                        type="button"
                        key={idx}
                        onMouseDown={() => handlePadPress('B', deckBPadMode, idx, true)}
                        onMouseUp={() => handlePadPress('B', deckBPadMode, idx, false)}
                        onTouchStart={() => handlePadPress('B', deckBPadMode, idx, true)}
                        onTouchEnd={() => handlePadPress('B', deckBPadMode, idx, false)}
                        className={`rounded-md flex flex-col items-center justify-center p-1 font-mono transition-all active:scale-95 border-2 min-h-[42px] ${
                          isLit
                            ? 'bg-blue-600/35 text-white border-blue-400 shadow-[0_0_14px_rgba(59,130,246,0.75)]'
                            : 'bg-slate-950 text-blue-300/80 border-blue-600/60 shadow-[inset_0_0_8px_rgba(37,99,235,0.3)] hover:border-blue-400'
                        }`}
                      >
                        <span className="text-[11px] font-bold">{idx + 1}</span>
                        <span className="text-[8px] truncate max-w-full opacity-90">
                          {deckBPadLabels[idx]}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Outer Right: Jog + Far-Right Pitch + SYNC/CUE/PLAY */}
              <div className="col-span-7 flex flex-col justify-between items-center gap-1.5 bg-slate-950/60 rounded-lg p-2 border border-slate-800/70">
                <div className="flex items-center justify-center gap-2 w-full flex-1 min-h-0">
                  {/* Jog Wheel Platter Deck B */}
                  <div className="flex flex-col items-center">
                    <div
                      onMouseDown={() => onSimulateEvent(0x92, 0x08, 0x7f)}
                      onMouseUp={() => onSimulateEvent(0x92, 0x08, 0x00)}
                      onTouchStart={() => onSimulateEvent(0x92, 0x08, 0x7f)}
                      onTouchEnd={() => onSimulateEvent(0x92, 0x08, 0x00)}
                      className={`w-24 h-24 sm:w-28 sm:h-28 xl:w-32 xl:h-32 rounded-full relative cursor-grab active:cursor-grabbing flex items-center justify-center border-[3px] transition-shadow ${
                        state.deckB.wheelTouch
                          ? 'border-purple-400 shadow-lg shadow-purple-500/40 ring-2 ring-purple-500/20'
                          : 'border-slate-700 hover:border-slate-500 shadow-md'
                      } bg-gradient-to-br from-slate-800 via-neutral-900 to-slate-950`}
                      style={{
                        transform: `rotate(${deckBRotation}deg)`,
                      }}
                      title="Jog Wheel Deck B"
                    >
                      <div className="absolute inset-2 rounded-full border border-dashed border-slate-600/70" />
                      <div className="absolute inset-5 rounded-full border border-slate-700/80" />
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-purple-950 via-slate-800 to-slate-950 border border-purple-500/50 flex flex-col items-center justify-center">
                        <Disc className="w-4 h-4 text-purple-400" />
                        <span className="text-[8px] font-mono text-purple-300 font-bold">
                          {state.deckB.wheelTouch ? 'TOUCH' : 'B'}
                        </span>
                      </div>
                      <div className="absolute top-1 w-2 h-3 bg-purple-400 rounded-sm shadow shadow-purple-400" />
                    </div>

                    <div className="flex items-center gap-1.5 mt-1">
                      <button
                        type="button"
                        onClick={() => handleJogSpin('B', -2)}
                        className="px-1.5 py-0.5 rounded bg-slate-800 text-[9px] text-slate-300 hover:bg-slate-700 border border-slate-700"
                      >
                        ◀
                      </button>
                      <span className="text-[9px] font-mono tabular-nums text-slate-400 w-8 text-center">
                        {Math.round(deckBRotation)}°
                      </span>
                      <button
                        type="button"
                        onClick={() => handleJogSpin('B', 2)}
                        className="px-1.5 py-0.5 rounded bg-slate-800 text-[9px] text-slate-300 hover:bg-slate-700 border border-slate-700"
                      >
                        ▶
                      </button>
                    </div>
                  </div>

                  {/* Far-Right Tempo Fader Deck B */}
                  <div className="flex flex-col items-center justify-center h-full">
                    <span className="text-[9px] font-mono text-slate-400 font-bold mb-0.5">
                      TEMPO
                    </span>
                    <div className="relative h-24 sm:h-28 flex items-center">
                      <input
                        type="range"
                        min="0"
                        max="127"
                        value={state.deckB.pitch}
                        onChange={(e) => onSimulateEvent(0xb2, 0x08, Number(e.target.value))}
                        className="h-24 sm:h-28 w-5 appearance-none bg-slate-800 rounded cursor-pointer accent-purple-400"
                        style={{ writingMode: 'vertical-lr', direction: 'rtl' }}
                        title="Deck B Tempo / Pitch"
                      />
                      <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-purple-500/50 pointer-events-none" />
                    </div>
                    <span className="text-[9px] font-mono tabular-nums text-purple-400 mt-0.5">
                      {((state.deckB.pitch - 64) * 0.19).toFixed(1)}%
                    </span>
                  </div>
                </div>

                {/* Bottom Transport Row: SYNC (Red), CUE (Orange), PLAY/PAUSE (Green) */}
                <div className="grid grid-cols-3 gap-1.5 w-full shrink-0">
                  <button
                    type="button"
                    onMouseDown={() => onSimulateEvent(state.shift ? 0x95 : 0x92, 0x05, 0x7f)}
                    onMouseUp={() => onSimulateEvent(state.shift ? 0x95 : 0x92, 0x05, 0x00)}
                    className={`h-9 rounded-md border font-bold text-[10px] flex flex-col items-center justify-center transition-all ${
                      leds.deckBSync || state.deckB.sync
                        ? 'bg-rose-600/35 text-rose-200 border-rose-400 shadow-[0_0_14px_rgba(244,63,94,0.65)]'
                        : 'bg-rose-950/30 text-rose-300/80 border-rose-800/60 hover:border-rose-500'
                    }`}
                    title="SYNC (0x92 Note: 0x05)"
                  >
                    <span>SYNC</span>
                  </button>

                  <button
                    type="button"
                    onMouseDown={() => onSimulateEvent(state.shift ? 0x95 : 0x92, 0x06, 0x7f)}
                    onMouseUp={() => onSimulateEvent(state.shift ? 0x95 : 0x92, 0x06, 0x00)}
                    className={`h-9 rounded-md border font-bold text-[10px] flex flex-col items-center justify-center transition-all ${
                      leds.deckBCue || state.deckB.cue
                        ? 'bg-orange-500/35 text-orange-200 border-orange-400 shadow-[0_0_14px_rgba(249,115,22,0.7)]'
                        : 'bg-orange-950/30 text-orange-300/80 border-orange-800/60 hover:border-orange-500'
                    }`}
                    title="CUE (0x92 Note: 0x06)"
                  >
                    <span>CUE</span>
                  </button>

                  <button
                    type="button"
                    onMouseDown={() => onSimulateEvent(state.shift ? 0x95 : 0x92, 0x07, 0x7f)}
                    onMouseUp={() => onSimulateEvent(state.shift ? 0x95 : 0x92, 0x07, 0x00)}
                    className={`h-9 rounded-md border font-bold text-[10px] flex items-center justify-center gap-0.5 transition-all ${
                      leds.deckBPlay || state.deckB.play || deckBAudio.isPlaying
                        ? 'bg-emerald-500/35 text-emerald-200 border-emerald-400 shadow-[0_0_14px_rgba(34,197,94,0.7)]'
                        : 'bg-emerald-950/30 text-emerald-300/80 border-emerald-800/60 hover:border-emerald-500'
                    }`}
                    title="PLAY / PAUSE (0x92 Note: 0x07)"
                  >
                    <Play className="w-3 h-3 fill-current" />
                    <span>/II</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Acrylic Base Underglow LED Bar */}
        <div className="shrink-0 pt-1.5 border-t border-slate-800/80">
          <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono mb-1 px-1">
            <span className="flex items-center gap-1.5">
              <Zap className="w-3 h-3 text-cyan-400" />
              <span>ACRYLIC BASE UNDERGLOW</span>
            </span>
            <span className="text-slate-500">0x91 0x23 (L) · 0x92 0x23 (R)</span>
          </div>
          <div className="h-3.5 rounded-full overflow-hidden border border-slate-700/60 bg-slate-950 p-0.5 flex items-center justify-between">
            <div
              className="h-full rounded-full transition-all duration-75"
              style={{
                width: '48%',
                backgroundColor: '#06b6d4',
                opacity: Math.max(0.12, leds.baseLeftLevel / 127),
                boxShadow:
                  leds.baseLeftLevel > 5
                    ? `0 0 ${10 + (leds.baseLeftLevel / 127) * 20}px rgba(6, 182, 212, ${0.4 + (leds.baseLeftLevel / 127) * 0.6})`
                    : 'none',
              }}
            />
            <div className="w-1.5 h-1.5 rounded-full bg-slate-700" />
            <div
              className="h-full rounded-full transition-all duration-75"
              style={{
                width: '48%',
                backgroundColor: '#a855f7',
                opacity: Math.max(0.12, leds.baseRightLevel / 127),
                boxShadow:
                  leds.baseRightLevel > 5
                    ? `0 0 ${10 + (leds.baseRightLevel / 127) * 20}px rgba(168, 85, 247, ${0.4 + (leds.baseRightLevel / 127) * 0.6})`
                    : 'none',
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
