import React, { useState } from 'react';
import { midiService } from '../services/midiService';
import { LEDState } from '../types/midi';
import { Sparkles, Zap, Sun, Moon, Square, Send, Check } from 'lucide-react';

interface LEDTesterProps {
  leds: LEDState;
  onRefreshLEDs: () => void;
}

export const LEDTester: React.FC<LEDTesterProps> = ({ leds, onRefreshLEDs }) => {
  const [activeShow, setActiveShow] = useState<string | null>(null);
  const [linkUnderglow, setLinkUnderglow] = useState(true);

  const [hexStatus, setHexStatus] = useState('91');
  const [hexData1, setHexData1] = useState('07');
  const [hexData2, setHexData2] = useState('7F');
  const [hexSentSuccess, setHexSentSuccess] = useState(false);

  const triggerShow = (name: string, fn: () => void) => {
    setActiveShow(name);
    fn();
    onRefreshLEDs();
  };

  const stopShows = () => {
    setActiveShow(null);
    midiService.stopActiveLightShow();
    onRefreshLEDs();
  };

  const handleUnderglowChange = (deck: 'A' | 'B', val: number) => {
    midiService.setBaseUnderglow(deck, val);
    if (linkUnderglow) {
      midiService.setBaseUnderglow(deck === 'A' ? 'B' : 'A', val);
    }
    onRefreshLEDs();
  };

  const handleSendCustomHex = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const s = parseInt(hexStatus, 16);
    const d1 = parseInt(hexData1, 16);
    const d2 = parseInt(hexData2, 16);
    if (isNaN(s) || isNaN(d1) || isNaN(d2)) return;

    midiService.sendShortMsg(s, d1, d2);
    setHexSentSuccess(true);
    setTimeout(() => setHexSentSuccess(false), 1500);
    onRefreshLEDs();
  };

  const applyPreset = (s: string, d1: string, d2: string) => {
    setHexStatus(s);
    setHexData1(d1);
    setHexData2(d2);
    midiService.sendShortMsg(parseInt(s, 16), parseInt(d1, 16), parseInt(d2, 16));
    setHexSentSuccess(true);
    setTimeout(() => setHexSentSuccess(false), 1500);
    onRefreshLEDs();
  };

  return (
    <div className="h-full w-full flex flex-col gap-2.5 min-h-0 overflow-y-auto lg:overflow-hidden slim-scroll">
      {/* Top Light Show Preset Strip */}
      <div className="shrink-0 bg-slate-900/90 border border-slate-800 rounded-xl p-3 flex flex-col gap-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-400" />
              <span>LED Light Shows &amp; Underglow Testing</span>
            </h2>
            <p className="text-[11px] text-slate-400">
              Trigger physical button LEDs, 2×2 performance pads, and base acrylic underglow via MIDI output.
            </p>
          </div>

          {activeShow && (
            <div className="flex items-center gap-2 text-xs font-mono text-blue-300">
              <span>Running: {activeShow}</span>
              <button
                onClick={stopShows}
                className="px-2 py-0.5 rounded bg-rose-600 hover:bg-rose-500 text-[10px] text-white font-bold"
              >
                STOP
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          <button
            onClick={() => triggerShow('All LEDs ON', () => midiService.testAllLEDs(true))}
            className="flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-lg bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/40 text-xs font-bold transition-colors"
          >
            <Sun className="w-3.5 h-3.5" />
            <span>ALL ON</span>
          </button>

          <button
            onClick={() => triggerShow('All LEDs OFF', () => midiService.testAllLEDs(false))}
            className="flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-bold transition-colors"
          >
            <Moon className="w-3.5 h-3.5" />
            <span>ALL OFF</span>
          </button>

          <button
            onClick={() => triggerShow('Knight Rider Chaser', () => midiService.startKnightRiderShow())}
            className={`flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-lg border text-xs font-bold transition-colors ${
              activeShow === 'Knight Rider Chaser'
                ? 'bg-blue-600 text-white border-blue-400'
                : 'bg-blue-950/40 hover:bg-blue-900/40 text-blue-300 border-blue-700/50'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>CHASER</span>
          </button>

          <button
            onClick={() => triggerShow('Audio VU Wave', () => midiService.startVUWaveShow())}
            className={`flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-lg border text-xs font-bold transition-colors ${
              activeShow === 'Audio VU Wave'
                ? 'bg-indigo-600 text-white border-indigo-400'
                : 'bg-indigo-950/40 hover:bg-indigo-900/40 text-indigo-300 border-indigo-700/50'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>VU WAVE</span>
          </button>

          <button
            onClick={() => triggerShow('Strobe Test', () => midiService.startStrobeShow())}
            className={`flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-lg border text-xs font-bold transition-colors ${
              activeShow === 'Strobe Test'
                ? 'bg-amber-600 text-white border-amber-400'
                : 'bg-amber-950/40 hover:bg-amber-900/40 text-amber-300 border-amber-700/50'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>STROBE</span>
          </button>

          <button
            onClick={stopShows}
            className="flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-rose-400 border border-rose-900/60 text-xs font-bold transition-colors"
          >
            <Square className="w-3.5 h-3.5" />
            <span>STOP</span>
          </button>
        </div>
      </div>

      {/* Main 2-Column Workspace */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-2.5">
        {/* Left: Direct Hardware LED Toggles */}
        <div className="lg:col-span-7 bg-slate-900/80 rounded-xl border border-slate-800 p-3 flex flex-col justify-between gap-2 min-h-0">
          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 shrink-0">
            <h3 className="text-xs font-bold text-white">Direct Hardware LED Toggles</h3>
            <span className="text-[11px] font-mono text-slate-400">
              Click to toggle physical controller LEDs
            </span>
          </div>

          {/* Deck A */}
          <div className="space-y-1.5 flex-1 flex flex-col justify-center">
            <span className="text-[11px] font-bold text-cyan-400 font-mono">
              DECK A (CHANNEL 1 · 0x91)
            </span>
            <div className="grid grid-cols-4 gap-2">
              <button
                onClick={() => {
                  midiService.setButtonLED('A', 'sync', !leds.deckASync);
                  onRefreshLEDs();
                }}
                className={`p-2 rounded-lg border text-[11px] font-mono font-bold flex flex-col items-center gap-0.5 transition-all ${
                  leds.deckASync
                    ? 'bg-rose-500/30 text-rose-200 border-rose-400 shadow-[0_0_12px_rgba(244,63,94,0.5)]'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                }`}
              >
                <span>SYNC LED</span>
                <span className="text-[9px] opacity-75">0x91 0x05</span>
              </button>

              <button
                onClick={() => {
                  midiService.setButtonLED('A', 'cue', !leds.deckACue);
                  onRefreshLEDs();
                }}
                className={`p-2 rounded-lg border text-[11px] font-mono font-bold flex flex-col items-center gap-0.5 transition-all ${
                  leds.deckACue
                    ? 'bg-orange-500/30 text-orange-200 border-orange-400 shadow-[0_0_12px_rgba(249,115,22,0.5)]'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                }`}
              >
                <span>CUE LED</span>
                <span className="text-[9px] opacity-75">0x91 0x06</span>
              </button>

              <button
                onClick={() => {
                  midiService.setButtonLED('A', 'play', !leds.deckAPlay);
                  onRefreshLEDs();
                }}
                className={`p-2 rounded-lg border text-[11px] font-mono font-bold flex flex-col items-center gap-0.5 transition-all ${
                  leds.deckAPlay
                    ? 'bg-emerald-500/30 text-emerald-200 border-emerald-400 shadow-[0_0_12px_rgba(34,197,94,0.5)]'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                }`}
              >
                <span>PLAY LED</span>
                <span className="text-[9px] opacity-75">0x91 0x07</span>
              </button>

              <button
                onClick={() => {
                  midiService.setButtonLED('A', 'pfl', !leds.deckAPfl);
                  onRefreshLEDs();
                }}
                className={`p-2 rounded-lg border text-[11px] font-mono font-bold flex flex-col items-center gap-0.5 transition-all ${
                  leds.deckAPfl
                    ? 'bg-cyan-500/30 text-cyan-200 border-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.5)]'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                }`}
              >
                <span>PFL LED</span>
                <span className="text-[9px] opacity-75">0x91 0x0C</span>
              </button>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {[0, 1, 2, 3].map((idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    midiService.setPadLED('A', 'hotcue', idx, !leds.deckAPads[idx]);
                    onRefreshLEDs();
                  }}
                  className={`py-2 rounded-lg border text-[11px] font-mono font-bold transition-all ${
                    leds.deckAPads[idx]
                      ? 'bg-blue-500 text-white border-blue-300 shadow-[0_0_12px_rgba(59,130,246,0.6)]'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  PAD {idx + 1}
                </button>
              ))}
            </div>
          </div>

          {/* Deck B */}
          <div className="space-y-1.5 pt-2 border-t border-slate-800 flex-1 flex flex-col justify-center">
            <span className="text-[11px] font-bold text-purple-400 font-mono">
              DECK B (CHANNEL 2 · 0x92)
            </span>
            <div className="grid grid-cols-4 gap-2">
              <button
                onClick={() => {
                  midiService.setButtonLED('B', 'sync', !leds.deckBSync);
                  onRefreshLEDs();
                }}
                className={`p-2 rounded-lg border text-[11px] font-mono font-bold flex flex-col items-center gap-0.5 transition-all ${
                  leds.deckBSync
                    ? 'bg-rose-500/30 text-rose-200 border-rose-400 shadow-[0_0_12px_rgba(244,63,94,0.5)]'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                }`}
              >
                <span>SYNC LED</span>
                <span className="text-[9px] opacity-75">0x92 0x05</span>
              </button>

              <button
                onClick={() => {
                  midiService.setButtonLED('B', 'cue', !leds.deckBCue);
                  onRefreshLEDs();
                }}
                className={`p-2 rounded-lg border text-[11px] font-mono font-bold flex flex-col items-center gap-0.5 transition-all ${
                  leds.deckBCue
                    ? 'bg-orange-500/30 text-orange-200 border-orange-400 shadow-[0_0_12px_rgba(249,115,22,0.5)]'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                }`}
              >
                <span>CUE LED</span>
                <span className="text-[9px] opacity-75">0x92 0x06</span>
              </button>

              <button
                onClick={() => {
                  midiService.setButtonLED('B', 'play', !leds.deckBPlay);
                  onRefreshLEDs();
                }}
                className={`p-2 rounded-lg border text-[11px] font-mono font-bold flex flex-col items-center gap-0.5 transition-all ${
                  leds.deckBPlay
                    ? 'bg-emerald-500/30 text-emerald-200 border-emerald-400 shadow-[0_0_12px_rgba(34,197,94,0.5)]'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                }`}
              >
                <span>PLAY LED</span>
                <span className="text-[9px] opacity-75">0x92 0x07</span>
              </button>

              <button
                onClick={() => {
                  midiService.setButtonLED('B', 'pfl', !leds.deckBPfl);
                  onRefreshLEDs();
                }}
                className={`p-2 rounded-lg border text-[11px] font-mono font-bold flex flex-col items-center gap-0.5 transition-all ${
                  leds.deckBPfl
                    ? 'bg-cyan-500/30 text-cyan-200 border-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.5)]'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                }`}
              >
                <span>PFL LED</span>
                <span className="text-[9px] opacity-75">0x92 0x0C</span>
              </button>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {[0, 1, 2, 3].map((idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    midiService.setPadLED('B', 'hotcue', idx, !leds.deckBPads[idx]);
                    onRefreshLEDs();
                  }}
                  className={`py-2 rounded-lg border text-[11px] font-mono font-bold transition-all ${
                    leds.deckBPads[idx]
                      ? 'bg-blue-500 text-white border-blue-300 shadow-[0_0_12px_rgba(59,130,246,0.6)]'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  PAD {idx + 1}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Base Acrylic Underglow & Raw Hex Packet Injector */}
        <div className="lg:col-span-5 flex flex-col justify-between gap-2.5 min-h-0">
          {/* Base Underglow */}
          <div className="bg-slate-900/80 rounded-xl border border-slate-800 p-3 space-y-2.5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
              <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-cyan-400" />
                <span>Base Underglow Acrylic Strip</span>
              </h3>
              <label className="flex items-center gap-1.5 text-[11px] text-slate-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={linkUnderglow}
                  onChange={(e) => setLinkUnderglow(e.target.checked)}
                  className="rounded bg-slate-800 border-slate-700 text-cyan-500 focus:ring-0"
                />
                <span>Link L/R</span>
              </label>
            </div>

            <div>
              <div className="flex justify-between text-[11px] font-mono tabular-nums mb-1">
                <span className="text-cyan-400">Left Underglow (0x91 0x23)</span>
                <span className="font-bold text-white">{leds.baseLeftLevel} / 127</span>
              </div>
              <input
                type="range"
                min="0"
                max="127"
                value={leds.baseLeftLevel}
                onChange={(e) => handleUnderglowChange('A', Number(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer h-2 bg-slate-800 rounded"
              />
            </div>

            <div>
              <div className="flex justify-between text-[11px] font-mono tabular-nums mb-1">
                <span className="text-purple-400">Right Underglow (0x92 0x23)</span>
                <span className="font-bold text-white">{leds.baseRightLevel} / 127</span>
              </div>
              <input
                type="range"
                min="0"
                max="127"
                value={leds.baseRightLevel}
                onChange={(e) => handleUnderglowChange('B', Number(e.target.value))}
                className="w-full accent-purple-400 cursor-pointer h-2 bg-slate-800 rounded"
              />
            </div>

            <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-2">
              <div className="text-[11px]">
                <span className="font-medium text-slate-300 block">Firmware Auto Show</span>
                <span className="text-[10px] text-slate-500 font-mono">0x90 0x24</span>
              </div>
              <div className="flex gap-1.5">
                <button
                  onClick={() => {
                    midiService.setBaseAutoMode(false);
                    onRefreshLEDs();
                  }}
                  className="px-2.5 py-1 text-[11px] rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
                >
                  Manual
                </button>
                <button
                  onClick={() => {
                    midiService.setBaseAutoMode(true);
                    onRefreshLEDs();
                  }}
                  className="px-2.5 py-1 text-[11px] rounded bg-cyan-600/30 hover:bg-cyan-600/40 text-cyan-300 border border-cyan-500/40 font-medium"
                >
                  Serato Auto
                </button>
              </div>
            </div>
          </div>

          {/* Raw Hex Packet Injector */}
          <div className="flex-1 bg-slate-900/80 rounded-xl border border-slate-800 p-3 flex flex-col justify-between gap-2">
            <h3 className="text-xs font-bold text-white flex items-center justify-between border-b border-slate-800 pb-1.5">
              <span>Raw Hex Packet Injector</span>
              {hexSentSuccess && (
                <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> Sent
                </span>
              )}
            </h3>

            <form onSubmit={handleSendCustomHex} className="flex items-end gap-2">
              <div className="flex-1">
                <label className="text-[10px] font-mono text-slate-400 block mb-1">Status</label>
                <input
                  type="text"
                  maxLength={2}
                  value={hexStatus}
                  onChange={(e) => setHexStatus(e.target.value.toUpperCase())}
                  className="w-full bg-slate-950 border border-slate-700 rounded-md px-2 py-1.5 text-center font-mono text-xs text-cyan-400 font-bold focus:outline-none focus:border-cyan-500"
                />
              </div>
              <div className="flex-1">
                <label className="text-[10px] font-mono text-slate-400 block mb-1">Data 1</label>
                <input
                  type="text"
                  maxLength={2}
                  value={hexData1}
                  onChange={(e) => setHexData1(e.target.value.toUpperCase())}
                  className="w-full bg-slate-950 border border-slate-700 rounded-md px-2 py-1.5 text-center font-mono text-xs text-amber-400 font-bold focus:outline-none focus:border-amber-500"
                />
              </div>
              <div className="flex-1">
                <label className="text-[10px] font-mono text-slate-400 block mb-1">Data 2</label>
                <input
                  type="text"
                  maxLength={2}
                  value={hexData2}
                  onChange={(e) => setHexData2(e.target.value.toUpperCase())}
                  className="w-full bg-slate-950 border border-slate-700 rounded-md px-2 py-1.5 text-center font-mono text-xs text-purple-400 font-bold focus:outline-none focus:border-purple-500"
                />
              </div>
              <button
                type="submit"
                className="px-3 py-1.5 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white rounded-md text-xs font-bold flex items-center gap-1"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send</span>
              </button>
            </form>

            <div>
              <span className="text-[10px] font-mono text-slate-400 block mb-1">
                Quick Presets:
              </span>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => applyPreset('91', '07', '7F')}
                  className="text-[10px] font-mono px-2 py-1 bg-slate-950 hover:bg-slate-800 text-slate-300 rounded border border-slate-800"
                >
                  91 07 7F (Play A)
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('91', '06', '7F')}
                  className="text-[10px] font-mono px-2 py-1 bg-slate-950 hover:bg-slate-800 text-slate-300 rounded border border-slate-800"
                >
                  91 06 7F (Cue A)
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('91', '23', '7F')}
                  className="text-[10px] font-mono px-2 py-1 bg-slate-950 hover:bg-slate-800 text-slate-300 rounded border border-slate-800"
                >
                  91 23 7F (Base A)
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('90', '24', '00')}
                  className="text-[10px] font-mono px-2 py-1 bg-slate-950 hover:bg-slate-800 text-slate-300 rounded border border-slate-800"
                >
                  90 24 00 (Manual)
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('B0', '7F', '7F')}
                  className="text-[10px] font-mono px-2 py-1 bg-slate-950 hover:bg-slate-800 text-slate-300 rounded border border-slate-800"
                >
                  B0 7F 7F (Query)
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
