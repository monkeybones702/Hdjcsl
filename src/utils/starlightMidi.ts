import { MIDIMessageEvent, ButtonAuditItem, PadMode } from '../types/midi';

export interface DecodedControl {
  name: string;
  deck: 'A' | 'B' | 'Master';
  type: 'button' | 'fader' | 'knob' | 'jog' | 'led' | 'special' | 'pad';
  controlId: string;
  isPress?: boolean;
  value?: number;
  mode?: PadMode;
  padIndex?: number;
}

export function decodeStarlightMessage(status: number, data1: number, data2: number): DecodedControl | null {
  const isNoteOn = (status & 0xf0) === 0x90;
  const isNoteOff = (status & 0xf0) === 0x80;
  const isCC = (status & 0xf0) === 0xb0;
  const channel = (status & 0x0f) + 1;
  const isPressed = isNoteOn && data2 > 0;

  // Master controls
  if (status === 0x90 && data1 === 0x03) {
    return {
      name: 'Shift Button',
      deck: 'Master',
      type: 'button',
      controlId: 'master_shift',
      isPress: data2 >= 0x40,
      value: data2,
    };
  }

  if (status === 0xb0 && data1 === 0x00) {
    return {
      name: 'Crossfader',
      deck: 'Master',
      type: 'fader',
      controlId: 'master_crossfader',
      value: data2,
    };
  }

  // Deck A (Channel 2 / Status 0x91 / 0x81 / 0xB1)
  if (status === 0x91 || status === 0x81) {
    switch (data1) {
      case 0x07:
        return { name: 'Deck A - Play/Pause', deck: 'A', type: 'button', controlId: 'deck_a_play', isPress: isPressed, value: data2 };
      case 0x06:
        return { name: 'Deck A - Cue', deck: 'A', type: 'button', controlId: 'deck_a_cue', isPress: isPressed, value: data2 };
      case 0x05:
        return { name: 'Deck A - Sync', deck: 'A', type: 'button', controlId: 'deck_a_sync', isPress: isPressed, value: data2 };
      case 0x0c:
        return { name: 'Deck A - Headphone Cue (PFL)', deck: 'A', type: 'button', controlId: 'deck_a_pfl', isPress: isPressed, value: data2 };
      case 0x03:
        return { name: 'Deck A - Vinyl Mode', deck: 'A', type: 'button', controlId: 'deck_a_vinyl', isPress: isPressed, value: data2 };
      case 0x08:
        return { name: 'Deck A - Jog Wheel Touch', deck: 'A', type: 'jog', controlId: 'deck_a_jog_touch', isPress: isPressed, value: data2 };
      case 0x23:
        return { name: 'Deck A - Base LED VU Output', deck: 'A', type: 'led', controlId: 'deck_a_base_led', value: data2 };
    }
  }

  // Deck B (Channel 3 / Status 0x92 / 0x82 / 0xB2)
  if (status === 0x92 || status === 0x82) {
    switch (data1) {
      case 0x07:
        return { name: 'Deck B - Play/Pause', deck: 'B', type: 'button', controlId: 'deck_b_play', isPress: isPressed, value: data2 };
      case 0x06:
        return { name: 'Deck B - Cue', deck: 'B', type: 'button', controlId: 'deck_b_cue', isPress: isPressed, value: data2 };
      case 0x05:
        return { name: 'Deck B - Sync', deck: 'B', type: 'button', controlId: 'deck_b_sync', isPress: isPressed, value: data2 };
      case 0x0c:
        return { name: 'Deck B - Headphone Cue (PFL)', deck: 'B', type: 'button', controlId: 'deck_b_pfl', isPress: isPressed, value: data2 };
      case 0x08:
        return { name: 'Deck B - Jog Wheel Touch', deck: 'B', type: 'jog', controlId: 'deck_b_jog_touch', isPress: isPressed, value: data2 };
      case 0x23:
        return { name: 'Deck B - Base LED VU Output', deck: 'B', type: 'led', controlId: 'deck_b_base_led', value: data2 };
    }
  }

  // Deck A Shift Mode (0x94)
  if (status === 0x94 || status === 0x84) {
    switch (data1) {
      case 0x07:
        return { name: 'Deck A - SHIFT + Play (Stutter)', deck: 'A', type: 'button', controlId: 'deck_a_shift_play', isPress: isPressed, value: data2 };
      case 0x06:
        return { name: 'Deck A - SHIFT + Cue (Rewind Start)', deck: 'A', type: 'button', controlId: 'deck_a_shift_cue', isPress: isPressed, value: data2 };
      case 0x05:
        return { name: 'Deck A - SHIFT + Sync (Master Sync)', deck: 'A', type: 'button', controlId: 'deck_a_shift_sync', isPress: isPressed, value: data2 };
      case 0x0c:
        return { name: 'Deck A - SHIFT + Headphone (Cue Master)', deck: 'A', type: 'button', controlId: 'deck_a_shift_pfl', isPress: isPressed, value: data2 };
      case 0x08:
        return { name: 'Deck A - SHIFT + Jog Touch (Seek)', deck: 'A', type: 'jog', controlId: 'deck_a_shift_jog_touch', isPress: isPressed, value: data2 };
    }
  }

  // Deck B Shift Mode (0x95)
  if (status === 0x95 || status === 0x85) {
    switch (data1) {
      case 0x07:
        return { name: 'Deck B - SHIFT + Play (Stutter)', deck: 'B', type: 'button', controlId: 'deck_b_shift_play', isPress: isPressed, value: data2 };
      case 0x06:
        return { name: 'Deck B - SHIFT + Cue (Rewind Start)', deck: 'B', type: 'button', controlId: 'deck_b_shift_cue', isPress: isPressed, value: data2 };
      case 0x05:
        return { name: 'Deck B - SHIFT + Sync (Master Sync)', deck: 'B', type: 'button', controlId: 'deck_b_shift_sync', isPress: isPressed, value: data2 };
      case 0x0c:
        return { name: 'Deck B - SHIFT + Headphone (Cue Mix)', deck: 'B', type: 'button', controlId: 'deck_b_shift_pfl', isPress: isPressed, value: data2 };
      case 0x08:
        return { name: 'Deck B - SHIFT + Jog Touch (Seek)', deck: 'B', type: 'jog', controlId: 'deck_b_shift_jog_touch', isPress: isPressed, value: data2 };
    }
  }

  // CC Controls Deck A (0xB1)
  if (status === 0xb1) {
    switch (data1) {
      case 0x00:
        return { name: 'Deck A - Volume Fader', deck: 'A', type: 'fader', controlId: 'deck_a_volume', value: data2 };
      case 0x01:
        return { name: 'Deck A - Filter Knob', deck: 'A', type: 'knob', controlId: 'deck_a_filter', value: data2 };
      case 0x02:
        return { name: 'Deck A - Bass EQ Knob', deck: 'A', type: 'knob', controlId: 'deck_a_bass', value: data2 };
      case 0x08:
      case 0x28:
        return { name: 'Deck A - Pitch / Tempo Fader', deck: 'A', type: 'fader', controlId: 'deck_a_pitch', value: data2 };
      case 0x0a: {
        const delta = data2 < 0x40 ? data2 : -(128 - data2);
        return { name: `Deck A - Jog Wheel Scratch (${delta > 0 ? '+' : ''}${delta})`, deck: 'A', type: 'jog', controlId: 'deck_a_jog_scratch', value: delta };
      }
      case 0x09: {
        const delta = data2 < 0x40 ? data2 : -(128 - data2);
        return { name: `Deck A - Jog Wheel Bend (${delta > 0 ? '+' : ''}${delta})`, deck: 'A', type: 'jog', controlId: 'deck_a_jog_bend', value: delta };
      }
    }
  }

  // CC Controls Deck B (0xB2)
  if (status === 0xb2) {
    switch (data1) {
      case 0x00:
        return { name: 'Deck B - Volume Fader', deck: 'B', type: 'fader', controlId: 'deck_b_volume', value: data2 };
      case 0x01:
        return { name: 'Deck B - Filter Knob', deck: 'B', type: 'knob', controlId: 'deck_b_filter', value: data2 };
      case 0x02:
        return { name: 'Deck B - Bass EQ Knob', deck: 'B', type: 'knob', controlId: 'deck_b_bass', value: data2 };
      case 0x08:
      case 0x28:
        return { name: 'Deck B - Pitch / Tempo Fader', deck: 'B', type: 'fader', controlId: 'deck_b_pitch', value: data2 };
      case 0x0a: {
        const delta = data2 < 0x40 ? data2 : -(128 - data2);
        return { name: `Deck B - Jog Wheel Scratch (${delta > 0 ? '+' : ''}${delta})`, deck: 'B', type: 'jog', controlId: 'deck_b_jog_scratch', value: delta };
      }
      case 0x09: {
        const delta = data2 < 0x40 ? data2 : -(128 - data2);
        return { name: `Deck B - Jog Wheel Bend (${delta > 0 ? '+' : ''}${delta})`, deck: 'B', type: 'jog', controlId: 'deck_b_jog_bend', value: delta };
      }
    }
  }

  // Jog wheel Seek CC in Shift mode (0xB4 & 0xB5)
  if (status === 0xb4 && data1 === 0x0a) {
    const delta = data2 < 0x40 ? data2 : -(128 - data2);
    return { name: `Deck A - Jog Seek Fast (${delta > 0 ? '+' : ''}${delta})`, deck: 'A', type: 'jog', controlId: 'deck_a_jog_seek', value: delta };
  }
  if (status === 0xb5 && data1 === 0x0a) {
    const delta = data2 < 0x40 ? data2 : -(128 - data2);
    return { name: `Deck B - Jog Seek Fast (${delta > 0 ? '+' : ''}${delta})`, deck: 'B', type: 'jog', controlId: 'deck_b_jog_seek', value: delta };
  }

  // Deck A Performance Pads (0x96 Note-on / 0x86 Note-off)
  if (status === 0x96 || status === 0x86) {
    let mode: PadMode = 'hotcue';
    let padIndex = 0;
    if (data1 >= 0x00 && data1 <= 0x03) {
      mode = 'hotcue';
      padIndex = data1;
    } else if (data1 >= 0x10 && data1 <= 0x13) {
      mode = 'loop';
      padIndex = data1 - 0x10;
    } else if (data1 >= 0x20 && data1 <= 0x23) {
      mode = 'fx';
      padIndex = data1 - 0x20;
    } else if (data1 >= 0x30 && data1 <= 0x33) {
      mode = 'sampler';
      padIndex = data1 - 0x30;
    } else if (data1 >= 0x08 && data1 <= 0x0b) {
      // Hotcue clear with shift
      mode = 'hotcue';
      padIndex = data1 - 0x08;
      return {
        name: `Deck A - HotCue Clear Pad ${padIndex + 1}`,
        deck: 'A',
        type: 'pad',
        controlId: `deck_a_pad_${padIndex + 1}`,
        mode,
        padIndex,
        isPress: isPressed,
        value: data2,
      };
    }
    return {
      name: `Deck A - ${mode.toUpperCase()} Pad ${padIndex + 1}`,
      deck: 'A',
      type: 'pad',
      controlId: `deck_a_pad_${padIndex + 1}`,
      mode,
      padIndex,
      isPress: isPressed,
      value: data2,
    };
  }

  // Deck B Performance Pads (0x97 Note-on / 0x87 Note-off)
  if (status === 0x97 || status === 0x87) {
    let mode: PadMode = 'hotcue';
    let padIndex = 0;
    if (data1 >= 0x00 && data1 <= 0x03) {
      mode = 'hotcue';
      padIndex = data1;
    } else if (data1 >= 0x10 && data1 <= 0x13) {
      mode = 'loop';
      padIndex = data1 - 0x10;
    } else if (data1 >= 0x20 && data1 <= 0x23) {
      mode = 'fx';
      padIndex = data1 - 0x20;
    } else if (data1 >= 0x30 && data1 <= 0x33) {
      mode = 'sampler';
      padIndex = data1 - 0x30;
    } else if (data1 >= 0x08 && data1 <= 0x0b) {
      mode = 'hotcue';
      padIndex = data1 - 0x08;
      return {
        name: `Deck B - HotCue Clear Pad ${padIndex + 1}`,
        deck: 'B',
        type: 'pad',
        controlId: `deck_b_pad_${padIndex + 1}`,
        mode,
        padIndex,
        isPress: isPressed,
        value: data2,
      };
    }
    return {
      name: `Deck B - ${mode.toUpperCase()} Pad ${padIndex + 1}`,
      deck: 'B',
      type: 'pad',
      controlId: `deck_b_pad_${padIndex + 1}`,
      mode,
      padIndex,
      isPress: isPressed,
      value: data2,
    };
  }

  // Base LED mode switch (0x90 0x24)
  if (status === 0x90 && data1 === 0x24) {
    return {
      name: 'Base LED Auto Mode Control',
      deck: 'Master',
      type: 'special',
      controlId: 'base_led_mode',
      value: data2,
    };
  }

  return null;
}

export const INITIAL_AUDIT_ITEMS: ButtonAuditItem[] = [
  // Master
  { id: 'master_shift', name: 'Shift Button', deck: 'Master', category: 'Special', tested: false, pressCount: 0 },
  { id: 'master_crossfader', name: 'Crossfader Slider', deck: 'Master', category: 'Fader/Knob', tested: false, pressCount: 0 },

  // Deck A Transport
  { id: 'deck_a_play', name: 'Deck A - Play / Pause', deck: 'A', category: 'Transport', tested: false, pressCount: 0 },
  { id: 'deck_a_cue', name: 'Deck A - Cue', deck: 'A', category: 'Transport', tested: false, pressCount: 0 },
  { id: 'deck_a_sync', name: 'Deck A - Sync', deck: 'A', category: 'Transport', tested: false, pressCount: 0 },
  { id: 'deck_a_pfl', name: 'Deck A - Headphone Cue (PFL)', deck: 'A', category: 'Transport', tested: false, pressCount: 0 },
  { id: 'deck_a_vinyl', name: 'Deck A - Vinyl Scratch Mode', deck: 'A', category: 'Special', tested: false, pressCount: 0 },

  // Deck A Jog
  { id: 'deck_a_jog_touch', name: 'Deck A - Jog Wheel Touch Sensor', deck: 'A', category: 'Jog', tested: false, pressCount: 0 },
  { id: 'deck_a_jog_scratch', name: 'Deck A - Jog Scratch Wheel Rotation', deck: 'A', category: 'Jog', tested: false, pressCount: 0 },
  { id: 'deck_a_jog_bend', name: 'Deck A - Jog Outer Rim Pitch Bend', deck: 'A', category: 'Jog', tested: false, pressCount: 0 },

  // Deck A Faders & Knobs
  { id: 'deck_a_volume', name: 'Deck A - Volume Level Fader', deck: 'A', category: 'Fader/Knob', tested: false, pressCount: 0 },
  { id: 'deck_a_pitch', name: 'Deck A - Pitch / Tempo Slider', deck: 'A', category: 'Fader/Knob', tested: false, pressCount: 0 },
  { id: 'deck_a_filter', name: 'Deck A - Filter Knob', deck: 'A', category: 'Fader/Knob', tested: false, pressCount: 0 },
  { id: 'deck_a_bass', name: 'Deck A - Bass EQ Knob', deck: 'A', category: 'Fader/Knob', tested: false, pressCount: 0 },

  // Deck A Pads
  { id: 'deck_a_pad_1', name: 'Deck A - Pad 1', deck: 'A', category: 'Pad', tested: false, pressCount: 0 },
  { id: 'deck_a_pad_2', name: 'Deck A - Pad 2', deck: 'A', category: 'Pad', tested: false, pressCount: 0 },
  { id: 'deck_a_pad_3', name: 'Deck A - Pad 3', deck: 'A', category: 'Pad', tested: false, pressCount: 0 },
  { id: 'deck_a_pad_4', name: 'Deck A - Pad 4', deck: 'A', category: 'Pad', tested: false, pressCount: 0 },

  // Deck B Transport
  { id: 'deck_b_play', name: 'Deck B - Play / Pause', deck: 'B', category: 'Transport', tested: false, pressCount: 0 },
  { id: 'deck_b_cue', name: 'Deck B - Cue', deck: 'B', category: 'Transport', tested: false, pressCount: 0 },
  { id: 'deck_b_sync', name: 'Deck B - Sync', deck: 'B', category: 'Transport', tested: false, pressCount: 0 },
  { id: 'deck_b_pfl', name: 'Deck B - Headphone Cue (PFL)', deck: 'B', category: 'Transport', tested: false, pressCount: 0 },

  // Deck B Jog
  { id: 'deck_b_jog_touch', name: 'Deck B - Jog Wheel Touch Sensor', deck: 'B', category: 'Jog', tested: false, pressCount: 0 },
  { id: 'deck_b_jog_scratch', name: 'Deck B - Jog Scratch Wheel Rotation', deck: 'B', category: 'Jog', tested: false, pressCount: 0 },
  { id: 'deck_b_jog_bend', name: 'Deck B - Jog Outer Rim Pitch Bend', deck: 'B', category: 'Jog', tested: false, pressCount: 0 },

  // Deck B Faders & Knobs
  { id: 'deck_b_volume', name: 'Deck B - Volume Level Fader', deck: 'B', category: 'Fader/Knob', tested: false, pressCount: 0 },
  { id: 'deck_b_pitch', name: 'Deck B - Pitch / Tempo Slider', deck: 'B', category: 'Fader/Knob', tested: false, pressCount: 0 },
  { id: 'deck_b_filter', name: 'Deck B - Filter Knob', deck: 'B', category: 'Fader/Knob', tested: false, pressCount: 0 },
  { id: 'deck_b_bass', name: 'Deck B - Bass EQ Knob', deck: 'B', category: 'Fader/Knob', tested: false, pressCount: 0 },

  // Deck B Pads
  { id: 'deck_b_pad_1', name: 'Deck B - Pad 1', deck: 'B', category: 'Pad', tested: false, pressCount: 0 },
  { id: 'deck_b_pad_2', name: 'Deck B - Pad 2', deck: 'B', category: 'Pad', tested: false, pressCount: 0 },
  { id: 'deck_b_pad_3', name: 'Deck B - Pad 3', deck: 'B', category: 'Pad', tested: false, pressCount: 0 },
  { id: 'deck_b_pad_4', name: 'Deck B - Pad 4', deck: 'B', category: 'Pad', tested: false, pressCount: 0 },
];
