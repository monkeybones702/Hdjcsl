import React, { useState, useEffect, useRef, useCallback } from 'react';
import { midiService } from './services/midiService';
import { audioEngine } from './services/audioEngine';
import {
  ControllerState,
  LEDState,
  ButtonAuditItem,
  MIDIMessageEvent,
  PadMode,
  DeckAudioState,
} from './types/midi';
import { INITIAL_AUDIT_ITEMS } from './utils/starlightMidi';
import { Header } from './components/Header';
import { ControllerVisualizer } from './components/ControllerVisualizer';
import { LEDTester } from './components/LEDTester';
import { ButtonHealthAudit } from './components/ButtonHealthAudit';
import { MIDIMonitorLog } from './components/MIDIMonitorLog';
import { SamsungOTGGuide } from './components/SamsungOTGGuide';
import { APKExportModal } from './components/APKExportModal';
import { Volume2, VolumeX, Activity } from 'lucide-react';

const INITIAL_DECK_STATE = {
  play: false,
  cue: false,
  sync: false,
  pfl: false,
  vinyl: true,
  wheelTouch: false,
  wheelAngle: 0,
  wheelSpeed: 0,
  pitch: 64,
  volume: 100,
  filter: 64,
  bass: 64,
  padMode: 'hotcue' as PadMode,
  pads: [false, false, false, false] as [boolean, boolean, boolean, boolean],
  padsVelocity: [0, 0, 0, 0] as [number, number, number, number],
  baseLEDValue: 0,
};

export default function App() {
  const [activeTab, setActiveTab] = useState<'visualizer' | 'led_tester' | 'audit' | 'midi_log'>('visualizer');
  const [isOTGGuideOpen, setIsOTGGuideOpen] = useState(false);
  const [isAPKModalOpen, setIsAPKModalOpen] = useState(false);
  const [audioFeedback, setAudioFeedback] = useState(true);
  const [vuLedSync, setVuLedSync] = useState(true);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  // Connection State
  const [isConnected, setIsConnected] = useState(false);
  const [deviceName, setDeviceName] = useState('Checking...');
  const [isVirtualMode, setIsVirtualMode] = useState(false);
  const [availableInputs, setAvailableInputs] = useState<{ id: string; name: string }[]>([]);
  const [availableOutputs, setAvailableOutputs] = useState<{ id: string; name: string }[]>([]);

  // Controller State
  const [controllerState, setControllerState] = useState<ControllerState>({
    shift: false,
    crossfader: 64,
    masterVolume: 100,
    headphoneVolume: 80,
    deckA: { ...INITIAL_DECK_STATE },
    deckB: { ...INITIAL_DECK_STATE },
    baseLEDMode: 0,
  });

  // Audio Deck State
  const [audioSnap, setAudioSnap] = useState(() => audioEngine.getSnapshot());

  // LED State
  const [leds, setLeds] = useState<LEDState>({ ...midiService.ledState });

  // Audit Checklist
  const [auditItems, setAuditItems] = useState<ButtonAuditItem[]>(INITIAL_AUDIT_ITEMS);

  // MIDI Message Logs (up to 300)
  const [logs, setLogs] = useState<MIDIMessageEvent[]>([]);

  // Web Audio click synth
  const audioCtxRef = useRef<AudioContext | null>(null);
  const lastVuSyncTimeRef = useRef<number>(0);

  const playClickSound = useCallback(
    (freq = 440, type: OscillatorType = 'sine', duration = 0.04) => {
      if (!audioFeedback) return;
      try {
        if (!audioCtxRef.current) {
          audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        if (audioCtxRef.current.state === 'suspended') {
          audioCtxRef.current.resume();
        }
        const ctx = audioCtxRef.current;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        gain.gain.setValueAtTime(0.06, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + duration);
      } catch {
        // Autoplay fallback
      }
    },
    [audioFeedback]
  );

  // Subscribe to DualDeckAudioEngine updates
  useEffect(() => {
    const unsub = audioEngine.subscribe((snap) => {
      setAudioSnap(snap);

      // Sync audio VU levels to hardware Base Underglow LEDs if enabled (throttled ~15fps)
      if (vuLedSync && (snap.deckA.isPlaying || snap.deckB.isPlaying)) {
        const now = performance.now();
        if (now - lastVuSyncTimeRef.current > 70) {
          lastVuSyncTimeRef.current = now;
          midiService.setBaseUnderglow('A', snap.deckA.level);
          midiService.setBaseUnderglow('B', snap.deckB.level);
          setLeds({ ...midiService.ledState });
        }
      }
    });
    return unsub;
  }, [vuLedSync]);

  // Handle incoming MIDI message (both hardware and simulated clicks)
  const handleMIDIMessage = useCallback(
    (msg: MIDIMessageEvent) => {
      const receiveTime = performance.now();

      setLogs((prev) => [msg, ...prev.slice(0, 299)]);

      // Skip outgoing LED echo from mutating controller input state
      if (msg.direction === 'out') {
        setLeds({ ...midiService.ledState });
        return;
      }

      const status = msg.statusByte;
      const data1 = msg.data1;
      const data2 = msg.data2;
      const isPressed = msg.type === 'noteon' && data2 > 0;

      // Wire audio engine actions on physical/virtual MIDI triggers
      if (status === 0xb0 && data1 === 0x00) {
        audioEngine.setCrossfader(data2);
      } else if ((status === 0x91 || status === 0x94) && isPressed) {
        if (data1 === 0x07) {
          audioEngine.togglePlay('A').then((playing) => {
            midiService.setButtonLED('A', 'play', playing);
            setLeds({ ...midiService.ledState });
          });
        } else if (data1 === 0x06) {
          const playing = audioEngine.triggerCue('A', status === 0x94);
          midiService.setButtonLED('A', 'play', playing);
          setLeds({ ...midiService.ledState });
        }
      } else if ((status === 0x92 || status === 0x95) && isPressed) {
        if (data1 === 0x07) {
          audioEngine.togglePlay('B').then((playing) => {
            midiService.setButtonLED('B', 'play', playing);
            setLeds({ ...midiService.ledState });
          });
        } else if (data1 === 0x06) {
          const playing = audioEngine.triggerCue('B', status === 0x95);
          midiService.setButtonLED('B', 'play', playing);
          setLeds({ ...midiService.ledState });
        }
      } else if (status === 0xb1) {
        if (data1 === 0x00) audioEngine.setVolume('A', data2);
        else if (data1 === 0x01) audioEngine.setFilter('A', data2);
        else if (data1 === 0x02) audioEngine.setBass('A', data2);
        else if (data1 === 0x08 || data1 === 0x28) audioEngine.setPitch('A', data2);
        else if (data1 === 0x0a || data1 === 0x09) {
          const delta = data2 < 0x40 ? data2 : -(128 - data2);
          audioEngine.nudgeSeconds('A', delta * 0.12);
        }
      } else if (status === 0xb2) {
        if (data1 === 0x00) audioEngine.setVolume('B', data2);
        else if (data1 === 0x01) audioEngine.setFilter('B', data2);
        else if (data1 === 0x02) audioEngine.setBass('B', data2);
        else if (data1 === 0x08 || data1 === 0x28) audioEngine.setPitch('B', data2);
        else if (data1 === 0x0a || data1 === 0x09) {
          const delta = data2 < 0x40 ? data2 : -(128 - data2);
          audioEngine.nudgeSeconds('B', delta * 0.12);
        }
      } else if (status === 0x96 && isPressed) {
        if (data1 >= 0x00 && data1 <= 0x03) {
          audioEngine.triggerHotcue('A', data1, false);
        } else if (data1 >= 0x08 && data1 <= 0x0b) {
          audioEngine.triggerHotcue('A', data1 - 0x08, true);
        }
      } else if (status === 0x97 && isPressed) {
        if (data1 >= 0x00 && data1 <= 0x03) {
          audioEngine.triggerHotcue('B', data1, false);
        } else if (data1 >= 0x08 && data1 <= 0x0b) {
          audioEngine.triggerHotcue('B', data1 - 0x08, true);
        }
      }

      // Update physical controller state & audit based on message
      setControllerState((prev) => {
        const next = {
          ...prev,
          deckA: { ...prev.deckA },
          deckB: { ...prev.deckB },
        };

        let targetAuditId: string | null = null;
        const latencyMs = Math.round(performance.now() - receiveTime);

        if (status === 0x90 && data1 === 0x03) {
          next.shift = data2 >= 0x40;
          targetAuditId = 'master_shift';
          if (next.shift) playClickSound(600, 'square');
        }

        if (status === 0xb0 && data1 === 0x00) {
          next.crossfader = data2;
          targetAuditId = 'master_crossfader';
        }

        // Deck A Transport
        if (status === 0x91 || status === 0x81 || status === 0x94 || status === 0x84) {
          if (data1 === 0x07) {
            next.deckA.play = isPressed;
            targetAuditId = 'deck_a_play';
            if (isPressed && !audioEngine.getSnapshot().deckA.loaded) playClickSound(520, 'triangle');
          } else if (data1 === 0x06) {
            next.deckA.cue = isPressed;
            targetAuditId = 'deck_a_cue';
            if (isPressed && !audioEngine.getSnapshot().deckA.loaded) playClickSound(440, 'triangle');
          } else if (data1 === 0x05) {
            next.deckA.sync = isPressed;
            targetAuditId = 'deck_a_sync';
            if (isPressed) playClickSound(660, 'triangle');
          } else if (data1 === 0x0c) {
            next.deckA.pfl = isPressed;
            targetAuditId = 'deck_a_pfl';
            if (isPressed) playClickSound(380, 'sine');
          } else if (data1 === 0x03) {
            if (isPressed) next.deckA.vinyl = !next.deckA.vinyl;
            targetAuditId = 'deck_a_vinyl';
            if (isPressed) playClickSound(300, 'sine');
          } else if (data1 === 0x08) {
            next.deckA.wheelTouch = isPressed;
            targetAuditId = 'deck_a_jog_touch';
            if (isPressed) playClickSound(200, 'sawtooth', 0.02);
          } else if (data1 === 0x23) {
            next.deckA.baseLEDValue = data2;
          }
        }

        // Deck B Transport
        if (status === 0x92 || status === 0x82 || status === 0x95 || status === 0x85) {
          if (data1 === 0x07) {
            next.deckB.play = isPressed;
            targetAuditId = 'deck_b_play';
            if (isPressed && !audioEngine.getSnapshot().deckB.loaded) playClickSound(520, 'triangle');
          } else if (data1 === 0x06) {
            next.deckB.cue = isPressed;
            targetAuditId = 'deck_b_cue';
            if (isPressed && !audioEngine.getSnapshot().deckB.loaded) playClickSound(440, 'triangle');
          } else if (data1 === 0x05) {
            next.deckB.sync = isPressed;
            targetAuditId = 'deck_b_sync';
            if (isPressed) playClickSound(660, 'triangle');
          } else if (data1 === 0x0c) {
            next.deckB.pfl = isPressed;
            targetAuditId = 'deck_b_pfl';
            if (isPressed) playClickSound(380, 'sine');
          } else if (data1 === 0x08) {
            next.deckB.wheelTouch = isPressed;
            targetAuditId = 'deck_b_jog_touch';
            if (isPressed) playClickSound(200, 'sawtooth', 0.02);
          } else if (data1 === 0x23) {
            next.deckB.baseLEDValue = data2;
          }
        }

        // Deck A CC Knobs & Faders
        if (status === 0xb1) {
          if (data1 === 0x00) {
            next.deckA.volume = data2;
            targetAuditId = 'deck_a_volume';
          } else if (data1 === 0x01) {
            next.deckA.filter = data2;
            targetAuditId = 'deck_a_filter';
          } else if (data1 === 0x02) {
            next.deckA.bass = data2;
            targetAuditId = 'deck_a_bass';
          } else if (data1 === 0x08 || data1 === 0x28) {
            next.deckA.pitch = data2;
            targetAuditId = 'deck_a_pitch';
          } else if (data1 === 0x0a) {
            const delta = data2 < 0x40 ? data2 : -(128 - data2);
            next.deckA.wheelAngle = (next.deckA.wheelAngle + delta * 6) % 360;
            targetAuditId = 'deck_a_jog_scratch';
          } else if (data1 === 0x09) {
            const delta = data2 < 0x40 ? data2 : -(128 - data2);
            next.deckA.wheelAngle = (next.deckA.wheelAngle + delta * 3) % 360;
            targetAuditId = 'deck_a_jog_bend';
          }
        }

        // Deck B CC Knobs & Faders
        if (status === 0xb2) {
          if (data1 === 0x00) {
            next.deckB.volume = data2;
            targetAuditId = 'deck_b_volume';
          } else if (data1 === 0x01) {
            next.deckB.filter = data2;
            targetAuditId = 'deck_b_filter';
          } else if (data1 === 0x02) {
            next.deckB.bass = data2;
            targetAuditId = 'deck_b_bass';
          } else if (data1 === 0x08 || data1 === 0x28) {
            next.deckB.pitch = data2;
            targetAuditId = 'deck_b_pitch';
          } else if (data1 === 0x0a) {
            const delta = data2 < 0x40 ? data2 : -(128 - data2);
            next.deckB.wheelAngle = (next.deckB.wheelAngle + delta * 6) % 360;
            targetAuditId = 'deck_b_jog_scratch';
          } else if (data1 === 0x09) {
            const delta = data2 < 0x40 ? data2 : -(128 - data2);
            next.deckB.wheelAngle = (next.deckB.wheelAngle + delta * 3) % 360;
            targetAuditId = 'deck_b_jog_bend';
          }
        }

        // Deck A Pads
        if (status === 0x96 || status === 0x86) {
          const padIdx = data1 & 0x03;
          const pads = [...next.deckA.pads] as [boolean, boolean, boolean, boolean];
          pads[padIdx] = isPressed;
          next.deckA.pads = pads;
          targetAuditId = `deck_a_pad_${padIdx + 1}`;
          if (isPressed) playClickSound(300 + padIdx * 70, 'triangle');
        }

        // Deck B Pads
        if (status === 0x97 || status === 0x87) {
          const padIdx = data1 & 0x03;
          const pads = [...next.deckB.pads] as [boolean, boolean, boolean, boolean];
          pads[padIdx] = isPressed;
          next.deckB.pads = pads;
          targetAuditId = `deck_b_pad_${padIdx + 1}`;
          if (isPressed) playClickSound(300 + padIdx * 70, 'triangle');
        }

        if (targetAuditId) {
          setAuditItems((prevList) =>
            prevList.map((item) => {
              if (item.id === targetAuditId) {
                return {
                  ...item,
                  tested: true,
                  pressCount: item.pressCount + 1,
                  lastPressTime: Date.now(),
                  lastLatencyMs: Math.max(1, latencyMs),
                  lastVelocity: data2,
                };
              }
              return item;
            })
          );
        }

        return next;
      });
    },
    [playClickSound]
  );

  const refreshPorts = useCallback(() => {
    const ports = midiService.getAvailablePorts();
    setAvailableInputs(ports.inputs);
    setAvailableOutputs(ports.outputs);
  }, []);

  const initMidi = useCallback(async () => {
    await midiService.initMIDI();
    setIsConnected(midiService.isConnected);
    setDeviceName(midiService.deviceName);
    setIsVirtualMode(midiService.isVirtualMode);
    refreshPorts();
    setLeds({ ...midiService.ledState });
  }, [refreshPorts]);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        console.warn('Service worker registration failed:', err);
      });
    }

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    });

    const unsubMsg = midiService.onMessage(handleMIDIMessage);
    const unsubState = midiService.onStateChange((connected, name) => {
      setIsConnected(connected);
      setDeviceName(name);
      refreshPorts();
    });

    initMidi();

    return () => {
      unsubMsg();
      unsubState();
    };
  }, [handleMIDIMessage, initMidi, refreshPorts]);

  const handleSimulateEvent = (status: number, data1: number, data2: number) => {
    midiService.injectVirtualInput(status, data1, data2);
  };

  const handleToggleVirtualMode = () => {
    midiService.isVirtualMode = !midiService.isVirtualMode;
    setIsVirtualMode(midiService.isVirtualMode);
    if (midiService.isVirtualMode) {
      setIsConnected(false);
      setDeviceName('Virtual Simulator Mode');
    } else {
      initMidi();
    }
  };

  const handleResetAudit = () => {
    setAuditItems(INITIAL_AUDIT_ITEMS.map((item) => ({ ...item, tested: false, pressCount: 0 })));
  };

  const handleUploadAudio = (deck: 'A' | 'B', file: File) => {
    audioEngine.loadFile(deck, file);
    midiService.setButtonLED(deck, 'play', false);
    setLeds({ ...midiService.ledState });
  };

  const handleUnloadAudio = (deck: 'A' | 'B') => {
    audioEngine.unloadDeck(deck);
    midiService.setButtonLED(deck, 'play', false);
    setLeds({ ...midiService.ledState });
  };

  const handleToggleDeckPlay = async (deck: 'A' | 'B') => {
    const playing = await audioEngine.togglePlay(deck);
    midiService.setButtonLED(deck, 'play', playing);
    setLeds({ ...midiService.ledState });
  };

  const handleSeekDeck = (deck: 'A' | 'B', seconds: number) => {
    audioEngine.seek(deck, seconds);
  };

  return (
    <div className="h-dvh w-screen overflow-hidden bg-slate-950 text-slate-100 flex flex-col font-sans">
      <Header
        isConnected={isConnected}
        deviceName={deviceName}
        isVirtualMode={isVirtualMode}
        onToggleVirtualMode={handleToggleVirtualMode}
        onRescan={initMidi}
        onOpenOTGGuide={() => setIsOTGGuideOpen(true)}
        onOpenAPKModal={() => setIsAPKModalOpen(true)}
        availableInputs={availableInputs}
        availableOutputs={availableOutputs}
        onSelectPort={(inId, outId) => {
          midiService.selectPortById(inId, outId);
          setIsConnected(midiService.isConnected);
          setDeviceName(midiService.deviceName);
        }}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* Compact Single-Line Utility Strip */}
      <div className="shrink-0 max-w-7xl w-full mx-auto px-2 sm:px-4 pt-2">
        <div className="bg-slate-900/70 border border-slate-800 rounded-lg px-3 py-1.5 flex items-center justify-between gap-2 text-[11px]">
          <span className="text-slate-300 truncate">
            <strong className="text-slate-100">OTG USB MIDI:</strong> Plug Hercules Starlight into USB-C OTG or upload MP3/M4A/OGG/WAV tracks to either deck.
          </span>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => setVuLedSync(!vuLedSync)}
              className={`hidden sm:flex items-center gap-1 font-mono transition-colors ${
                vuLedSync ? 'text-cyan-400' : 'text-slate-500 hover:text-slate-300'
              }`}
              title="Sync deck audio VU meter to Starlight base underglow LEDs"
            >
              <Activity className="w-3.5 h-3.5" />
              <span>{vuLedSync ? 'VU→LED ON' : 'VU→LED OFF'}</span>
            </button>

            <button
              onClick={() => setAudioFeedback(!audioFeedback)}
              className="flex items-center gap-1 text-slate-400 hover:text-cyan-300 font-mono transition-colors"
              title="Toggle button click sound feedback"
            >
              {audioFeedback ? (
                <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
              ) : (
                <VolumeX className="w-3.5 h-3.5" />
              )}
              <span className="hidden sm:inline">{audioFeedback ? 'Clicks ON' : 'Muted'}</span>
            </button>

            <button
              onClick={() => setIsOTGGuideOpen(true)}
              className="text-cyan-400 hover:text-cyan-300 underline font-semibold whitespace-nowrap"
            >
              OTG &amp; Shizuku Guide
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Viewport: strictly fits remaining height */}
      <main className="flex-1 min-h-0 max-w-7xl w-full mx-auto px-2 sm:px-4 py-2 overflow-hidden flex flex-col">
        {activeTab === 'visualizer' && (
          <ControllerVisualizer
            state={controllerState}
            leds={leds}
            deckAAudio={audioSnap.deckA as DeckAudioState}
            deckBAudio={audioSnap.deckB as DeckAudioState}
            onUploadAudio={handleUploadAudio}
            onUnloadAudio={handleUnloadAudio}
            onToggleDeckPlay={handleToggleDeckPlay}
            onSeekDeck={handleSeekDeck}
            onSimulateEvent={handleSimulateEvent}
            isVirtualMode={isVirtualMode}
          />
        )}

        {activeTab === 'led_tester' && (
          <LEDTester
            leds={leds}
            onRefreshLEDs={() => setLeds({ ...midiService.ledState })}
          />
        )}

        {activeTab === 'audit' && (
          <ButtonHealthAudit
            auditItems={auditItems}
            onResetAudit={handleResetAudit}
          />
        )}

        {activeTab === 'midi_log' && (
          <MIDIMonitorLog
            logs={logs}
            onClearLogs={() => setLogs([])}
          />
        )}
      </main>

      <SamsungOTGGuide
        isOpen={isOTGGuideOpen}
        onClose={() => setIsOTGGuideOpen(false)}
      />

      <APKExportModal
        isOpen={isAPKModalOpen}
        onClose={() => setIsAPKModalOpen(false)}
        deferredPrompt={deferredPrompt}
      />
    </div>
  );
}
