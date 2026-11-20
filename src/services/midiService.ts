import { MIDIMessageEvent, LEDState, PadMode } from '../types/midi';
import { decodeStarlightMessage } from '../utils/starlightMidi';

type MIDIMessageListener = (event: MIDIMessageEvent) => void;
type StateChangeListener = (connected: boolean, deviceName: string) => void;

class StarlightMIDIService {
  private midiAccess: WebMidi.MIDIAccess | null = null;
  private inputPort: WebMidi.MIDIInput | null = null;
  private outputPort: WebMidi.MIDIOutput | null = null;
  private messageListeners: Set<MIDIMessageListener> = new Set();
  private stateListeners: Set<StateChangeListener> = new Set();
  public isConnected: boolean = false;
  public deviceName: string = 'Not Connected';
  public isSupported: boolean = false;
  public isVirtualMode: boolean = false;

  public ledState: LEDState = {
    deckAPlay: false,
    deckACue: false,
    deckASync: false,
    deckAPfl: false,
    deckAVinyl: true,
    deckAPads: [false, false, false, false],
    deckBPlay: false,
    deckBCue: false,
    deckBSync: false,
    deckBPfl: false,
    deckBPads: [false, false, false, false],
    baseLeftLevel: 0,
    baseRightLevel: 0,
  };

  private animationTimer: number | null = null;

  constructor() {
    this.isSupported = typeof navigator !== 'undefined' && 'requestMIDIAccess' in navigator;
  }

  public async initMIDI(): Promise<{ success: boolean; message: string; ports: { inputs: string[]; outputs: string[] } }> {
    if (!this.isSupported) {
      this.isVirtualMode = true;
      return {
        success: false,
        message: 'Web MIDI API is not supported in this browser. Running in Virtual Simulator mode.',
        ports: { inputs: [], outputs: [] },
      };
    }

    try {
      this.midiAccess = await navigator.requestMIDIAccess({ sysex: true, software: true });
      this.midiAccess.onstatechange = (e: WebMidi.MIDIConnectionEvent) => this.handleStateChange(e);

      const inputs: string[] = [];
      const outputs: string[] = [];

      this.midiAccess.inputs.forEach((input: WebMidi.MIDIInput) => inputs.push(input.name || 'Unnamed Input'));
      this.midiAccess.outputs.forEach((output: WebMidi.MIDIOutput) => outputs.push(output.name || 'Unnamed Output'));

      // Look for Hercules DJControl Starlight or fallback to first available
      let matchedInput: WebMidi.MIDIInput | null = null;
      let matchedOutput: WebMidi.MIDIOutput | null = null;

      for (const input of this.midiAccess.inputs.values()) {
        const name = (input.name || '').toLowerCase();
        if (name.includes('starlight') || name.includes('hercules') || name.includes('djcontrol')) {
          matchedInput = input;
          break;
        }
      }

      for (const output of this.midiAccess.outputs.values()) {
        const name = (output.name || '').toLowerCase();
        if (name.includes('starlight') || name.includes('hercules') || name.includes('djcontrol')) {
          matchedOutput = output;
          break;
        }
      }

      // If no Starlight found specifically, fallback to first connected USB MIDI device if available
      if (!matchedInput && this.midiAccess.inputs.size > 0) {
        matchedInput = this.midiAccess.inputs.values().next().value || null;
      }
      if (!matchedOutput && this.midiAccess.outputs.size > 0) {
        matchedOutput = this.midiAccess.outputs.values().next().value || null;
      }

      if (matchedInput) {
        this.selectPorts(matchedInput, matchedOutput);
        return {
          success: true,
          message: `Connected to ${this.deviceName}`,
          ports: { inputs, outputs },
        };
      } else {
        this.isConnected = false;
        this.deviceName = 'No MIDI device detected';
        this.notifyStateChange();
        return {
          success: false,
          message: 'No MIDI controller found. Connect your Hercules Starlight via OTG USB and tap Re-scan.',
          ports: { inputs, outputs },
        };
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      this.isConnected = false;
      this.deviceName = 'Permission Denied / Error';
      return {
        success: false,
        message: `MIDI access request error: ${errorMsg}. Make sure to allow MIDI permission.`,
        ports: { inputs: [], outputs: [] },
      };
    }
  }

  public getAvailablePorts(): { inputs: { id: string; name: string }[]; outputs: { id: string; name: string }[] } {
    if (!this.midiAccess) return { inputs: [], outputs: [] };
    const inputs: { id: string; name: string }[] = [];
    const outputs: { id: string; name: string }[] = [];

    this.midiAccess.inputs.forEach((p: WebMidi.MIDIInput) => inputs.push({ id: p.id, name: p.name || 'Unnamed Input' }));
    this.midiAccess.outputs.forEach((p: WebMidi.MIDIOutput) => outputs.push({ id: p.id, name: p.name || 'Unnamed Output' }));

    return { inputs, outputs };
  }

  public selectPortById(inputId?: string, outputId?: string) {
    if (!this.midiAccess) return;
    let inPort: WebMidi.MIDIInput | null = null;
    let outPort: WebMidi.MIDIOutput | null = null;

    if (inputId) {
      inPort = this.midiAccess.inputs.get(inputId) || null;
    }
    if (outputId) {
      outPort = this.midiAccess.outputs.get(outputId) || null;
    }
    this.selectPorts(inPort, outPort);
  }

  private selectPorts(inPort: WebMidi.MIDIInput | null, outPort: WebMidi.MIDIOutput | null) {
    if (this.inputPort) {
      this.inputPort.onmidimessage = null;
    }

    this.inputPort = inPort;
    this.outputPort = outPort;

    if (this.inputPort) {
      this.inputPort.onmidimessage = (e: WebMidi.MIDIMessageEvent) => this.handleMIDIMessage(e);
      this.isConnected = true;
      this.deviceName = this.inputPort.name || 'Hercules DJControl Starlight';
      this.isVirtualMode = false;

      // Ask controller to send initial knob/slider positions
      this.queryHardwareKnobs();
      // Light vinyl button by default
      this.sendShortMsg(0x91, 0x03, 0x7f);
    } else {
      this.isConnected = false;
      this.deviceName = 'Disconnected';
    }

    this.notifyStateChange();
  }

  private handleStateChange(e: WebMidi.MIDIConnectionEvent) {
    const port = e.port;
    if (port.state === 'connected' && !this.isConnected) {
      // Re-initialize to pick up newly connected device
      this.initMIDI();
    } else if (port.state === 'disconnected' && port.id === this.inputPort?.id) {
      this.isConnected = false;
      this.deviceName = 'Device Disconnected';
      this.notifyStateChange();
    }
  }

  private handleMIDIMessage(event: WebMidi.MIDIMessageEvent) {
    if (!event.data) return;
    const data = event.data;
    const status = data[0];
    const data1 = data.length > 1 ? data[1] : 0;
    const data2 = data.length > 2 ? data[2] : 0;

    const hex = Array.from(data)
      .map((b: number) => '0x' + b.toString(16).toUpperCase().padStart(2, '0'))
      .join(' ');

    const decoded = decodeStarlightMessage(status, data1, data2);

    let type: MIDIMessageEvent['type'] = 'other';
    const topNibble = status & 0xf0;
    if (topNibble === 0x90) type = data2 > 0 ? 'noteon' : 'noteoff';
    else if (topNibble === 0x80) type = 'noteoff';
    else if (topNibble === 0xb0) type = 'cc';
    else if (status === 0xf0 || status === 0xf7) type = 'sysex';
    else if (topNibble === 0xe0) type = 'pitchbend';

    const msgEvent: MIDIMessageEvent = {
      id: `${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: Date.now(),
      direction: 'in',
      statusByte: status,
      data1,
      data2,
      hex,
      channel: (status & 0x0f) + 1,
      type,
      description: decoded ? decoded.name : `Raw MIDI: Status 0x${status.toString(16).toUpperCase()} Data: ${data1}, ${data2}`,
      controlName: decoded?.name,
      deck: decoded?.deck,
    };

    this.notifyMessage(msgEvent);
  }

  public sendShortMsg(status: number, data1: number, data2: number): boolean {
    const hex = `0x${status.toString(16).toUpperCase().padStart(2, '0')} 0x${data1.toString(16).toUpperCase().padStart(2, '0')} 0x${data2.toString(16).toUpperCase().padStart(2, '0')}`;
    const decoded = decodeStarlightMessage(status, data1, data2);

    const logEvent: MIDIMessageEvent = {
      id: `${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: Date.now(),
      direction: 'out',
      statusByte: status,
      data1,
      data2,
      hex,
      channel: (status & 0x0f) + 1,
      type: (status & 0xf0) === 0x90 ? 'noteon' : (status & 0xf0) === 0xb0 ? 'cc' : 'other',
      description: `[LED/Command] ${decoded ? decoded.name : 'Raw Short Message'} -> ${data2 > 0 ? 'ON (' + data2 + ')' : 'OFF'}`,
      controlName: decoded?.name,
      deck: decoded?.deck,
    };

    this.notifyMessage(logEvent);

    if (this.outputPort) {
      try {
        this.outputPort.send([status, data1, data2]);
        return true;
      } catch (err) {
        console.error('Failed to send MIDI message:', err);
        return false;
      }
    }
    return true; // Accepted in virtual mode
  }

  public sendSysEx(bytes: number[]): boolean {
    const hex = bytes.map((b) => '0x' + b.toString(16).toUpperCase().padStart(2, '0')).join(' ');
    const logEvent: MIDIMessageEvent = {
      id: `${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: Date.now(),
      direction: 'out',
      statusByte: bytes[0] || 0xf0,
      data1: bytes[1] || 0,
      data2: bytes[2] || 0,
      hex,
      channel: 1,
      type: 'sysex',
      description: `[SysEx] Sent ${bytes.length} bytes to controller`,
    };
    this.notifyMessage(logEvent);

    if (this.outputPort) {
      try {
        this.outputPort.send(bytes);
        return true;
      } catch (err) {
        console.error('Failed to send SysEx:', err);
        return false;
      }
    }
    return true;
  }

  public queryHardwareKnobs() {
    // Send 0xB0 0x7F 0x7F which requests Starlight firmware to report all physical positions
    this.sendShortMsg(0xb0, 0x7f, 0x7f);
  }

  // LED Commands
  public setButtonLED(deck: 'A' | 'B', button: 'play' | 'cue' | 'sync' | 'pfl' | 'vinyl', state: boolean) {
    const val = state ? 0x7f : 0x00;
    if (deck === 'A') {
      switch (button) {
        case 'play':
          this.sendShortMsg(0x91, 0x07, val);
          this.ledState.deckAPlay = state;
          break;
        case 'cue':
          this.sendShortMsg(0x91, 0x06, val);
          this.ledState.deckACue = state;
          break;
        case 'sync':
          this.sendShortMsg(0x91, 0x05, val);
          this.ledState.deckASync = state;
          break;
        case 'pfl':
          this.sendShortMsg(0x91, 0x0c, val);
          this.ledState.deckAPfl = state;
          break;
        case 'vinyl':
          this.sendShortMsg(0x91, 0x03, val);
          this.ledState.deckAVinyl = state;
          break;
      }
    } else {
      switch (button) {
        case 'play':
          this.sendShortMsg(0x92, 0x07, val);
          this.ledState.deckBPlay = state;
          break;
        case 'cue':
          this.sendShortMsg(0x92, 0x06, val);
          this.ledState.deckBCue = state;
          break;
        case 'sync':
          this.sendShortMsg(0x92, 0x05, val);
          this.ledState.deckBSync = state;
          break;
        case 'pfl':
          this.sendShortMsg(0x92, 0x0c, val);
          this.ledState.deckBPfl = state;
          break;
      }
    }
  }

  public setPadLED(deck: 'A' | 'B', mode: PadMode, padIndex: number, state: boolean) {
    const status = deck === 'A' ? 0x96 : 0x97;
    let offset = 0x00;
    if (mode === 'loop') offset = 0x10;
    else if (mode === 'fx') offset = 0x20;
    else if (mode === 'sampler') offset = 0x30;

    const midino = offset + padIndex;
    const val = state ? 0x7f : 0x00;
    this.sendShortMsg(status, midino, val);

    if (deck === 'A') {
      const pads = [...this.ledState.deckAPads] as [boolean, boolean, boolean, boolean];
      pads[padIndex] = state;
      this.ledState.deckAPads = pads;
    } else {
      const pads = [...this.ledState.deckBPads] as [boolean, boolean, boolean, boolean];
      pads[padIndex] = state;
      this.ledState.deckBPads = pads;
    }
  }

  public setBaseUnderglow(deck: 'A' | 'B', value: number) {
    const clamped = Math.max(0, Math.min(127, Math.round(value)));
    if (deck === 'A') {
      this.sendShortMsg(0x91, 0x23, clamped);
      this.ledState.baseLeftLevel = clamped;
    } else {
      this.sendShortMsg(0x92, 0x23, clamped);
      this.ledState.baseRightLevel = clamped;
    }
  }

  public setBaseAutoMode(enable: boolean) {
    this.sendShortMsg(0x90, 0x24, enable ? 0x7f : 0x00);
  }

  // Preset light shows
  public stopActiveLightShow() {
    if (this.animationTimer !== null) {
      window.clearInterval(this.animationTimer);
      this.animationTimer = null;
    }
  }

  public testAllLEDs(on: boolean) {
    this.stopActiveLightShow();
    this.setButtonLED('A', 'play', on);
    this.setButtonLED('A', 'cue', on);
    this.setButtonLED('A', 'sync', on);
    this.setButtonLED('A', 'pfl', on);
    this.setButtonLED('A', 'vinyl', on);

    this.setButtonLED('B', 'play', on);
    this.setButtonLED('B', 'cue', on);
    this.setButtonLED('B', 'sync', on);
    this.setButtonLED('B', 'pfl', on);

    for (let i = 0; i < 4; i++) {
      this.setPadLED('A', 'hotcue', i, on);
      this.setPadLED('B', 'hotcue', i, on);
    }

    this.setBaseUnderglow('A', on ? 127 : 0);
    this.setBaseUnderglow('B', on ? 127 : 0);
  }

  public startKnightRiderShow() {
    this.stopActiveLightShow();
    let step = 0;
    const items: Array<() => void> = [
      () => { this.testAllLEDs(false); this.setButtonLED('A', 'sync', true); this.setBaseUnderglow('A', 127); },
      () => { this.testAllLEDs(false); this.setButtonLED('A', 'cue', true); this.setPadLED('A', 'hotcue', 0, true); },
      () => { this.testAllLEDs(false); this.setButtonLED('A', 'play', true); this.setPadLED('A', 'hotcue', 1, true); },
      () => { this.testAllLEDs(false); this.setPadLED('A', 'hotcue', 2, true); this.setPadLED('A', 'hotcue', 3, true); },
      () => { this.testAllLEDs(false); this.setPadLED('B', 'hotcue', 0, true); this.setPadLED('B', 'hotcue', 1, true); },
      () => { this.testAllLEDs(false); this.setButtonLED('B', 'play', true); this.setPadLED('B', 'hotcue', 2, true); },
      () => { this.testAllLEDs(false); this.setButtonLED('B', 'cue', true); this.setPadLED('B', 'hotcue', 3, true); },
      () => { this.testAllLEDs(false); this.setButtonLED('B', 'sync', true); this.setBaseUnderglow('B', 127); },
    ];

    let direction = 1;
    this.animationTimer = window.setInterval(() => {
      items[step]();
      step += direction;
      if (step >= items.length - 1) direction = -1;
      else if (step <= 0) direction = 1;
    }, 90);
  }

  public startVUWaveShow() {
    this.stopActiveLightShow();
    let tick = 0;
    this.animationTimer = window.setInterval(() => {
      tick += 0.15;
      const valA = Math.round((Math.sin(tick) + 1) * 63.5);
      const valB = Math.round((Math.cos(tick) + 1) * 63.5);
      this.setBaseUnderglow('A', valA);
      this.setBaseUnderglow('B', valB);

      // Light pads based on level
      for (let i = 0; i < 4; i++) {
        this.setPadLED('A', 'hotcue', i, valA > (i + 1) * 28);
        this.setPadLED('B', 'hotcue', i, valB > (i + 1) * 28);
      }
    }, 50);
  }

  public startStrobeShow() {
    this.stopActiveLightShow();
    let on = false;
    this.animationTimer = window.setInterval(() => {
      on = !on;
      this.testAllLEDs(on);
    }, 120);
  }

  // Virtual Injection for Simulator
  public injectVirtualInput(status: number, data1: number, data2: number) {
    const data = new Uint8Array([status, data1, data2]);
    const event = {
      data,
      receivedTime: performance.now(),
    } as unknown as WebMidi.MIDIMessageEvent;
    this.handleMIDIMessage(event);
  }

  // Event Listeners
  public onMessage(listener: MIDIMessageListener): () => void {
    this.messageListeners.add(listener);
    return () => this.messageListeners.delete(listener);
  }

  public onStateChange(listener: StateChangeListener): () => void {
    this.stateListeners.add(listener);
    return () => this.stateListeners.delete(listener);
  }

  private notifyMessage(msg: MIDIMessageEvent) {
    this.messageListeners.forEach((fn) => fn(msg));
  }

  private notifyStateChange() {
    this.stateListeners.forEach((fn) => fn(this.isConnected, this.deviceName));
  }
}

export const midiService = new StarlightMIDIService();
