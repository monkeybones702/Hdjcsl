import React, { useState } from 'react';
import { X, Usb, Smartphone, Terminal, Check, Copy, ExternalLink, ShieldAlert, Cpu } from 'lucide-react';

interface SamsungOTGGuideProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SamsungOTGGuide: React.FC<SamsungOTGGuideProps> = ({ isOpen, onClose }) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  if (!isOpen) return null;

  const copyCommand = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const shizukuCommands = [
    {
      title: 'Install Downloaded APK directly via Shizuku (No prompt)',
      cmd: 'rish -c "pm install -r -d /sdcard/Download/starlight-djtool.apk"',
      desc: 'Silently installs the Starlight DJ Tool APK directly from your Downloads folder using Shizuku.',
    },
    {
      title: 'Grant USB & MIDI permissions to Browser / App',
      cmd: 'rish -c "pm grant com.android.chrome android.permission.USB_PERMISSION"',
      desc: 'Bypasses prompt dialogs for USB OTG connection in Chrome.',
    },
    {
      title: 'Check Samsung A16 USB Host & Connected Hercules Device',
      cmd: 'rish -c "dumpsys usb | grep -i -E \'hercules|starlight|midi\'"',
      desc: 'Verifies that Android USB subsystem recognizes the Hercules DJControl Starlight.',
    },
    {
      title: 'Inspect Linux Kernel OTG Audio/MIDI logs on Android',
      cmd: 'rish -c "dmesg | grep -i -E \'usb|snd|midi\' | tail -n 25"',
      desc: 'Shows real-time kernel handshakes when plugging the OTG cable into your Samsung A16.',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl p-4 sm:p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-950/80 border border-cyan-700/60 text-cyan-400">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                Samsung Galaxy A16 &amp; Linux OTG Guide
                <span className="text-[10px] font-mono bg-cyan-900/60 text-cyan-300 px-2 py-0.5 rounded border border-cyan-700">
                  Shizuku Ready
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Setup instructions for USB-OTG MIDI &amp; Shizuku package deployment
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Section 1: Samsung A16 OTG Setup */}
        <div className="space-y-3">
          <h4 className="text-sm font-bold text-cyan-400 flex items-center gap-2">
            <Usb className="w-4 h-4" />
            1. Physical OTG Connection on Samsung Galaxy A16
          </h4>
          <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 text-xs text-slate-300 space-y-2">
            <div className="flex items-start gap-2">
              <span className="font-bold text-cyan-400">Step 1:</span>
              <span>
                Use a standard <strong>USB-C (Male) to USB-A (Female) OTG adapter</strong> (or USB-C to Mini-USB cable) to connect the Starlight to your Samsung A16.
              </span>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-bold text-cyan-400">Step 2:</span>
              <span>
                <strong>Power delivery:</strong> The Hercules DJControl Starlight draws ~500mA. The Samsung A16 can supply this directly, but if your battery is under 20%, Android may throttle USB power. For long sets, use an OTG Y-cable with PD charging.
              </span>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-bold text-cyan-400">Step 3:</span>
              <span>
                <strong>Samsung One UI Settings:</strong> Open <em>Settings → Developer options → Default USB configuration</em> and select <strong>MIDI</strong>. Also ensure <em>Disable USB audio routing</em> is OFF.
              </span>
            </div>
          </div>
        </div>

        {/* Section 2: Shizuku Integration & Terminal Commands */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-purple-400 flex items-center gap-2">
              <Terminal className="w-4 h-4" />
              2. Shizuku Shell Commands (Samsung A16)
            </h4>
            <span className="text-[10px] text-slate-400 font-mono">Run in Termux with 'rish'</span>
          </div>

          <p className="text-xs text-slate-400">
            Since your Samsung A16 has Shizuku activated, you can execute these commands directly in Termux or any terminal to manage USB permissions and silently install the APK:
          </p>

          <div className="space-y-2.5">
            {shizukuCommands.map((item, idx) => (
              <div
                key={idx}
                className="bg-slate-950 p-3 rounded-xl border border-slate-800 hover:border-slate-700 transition-colors"
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-xs font-bold text-slate-200">{item.title}</span>
                  <button
                    onClick={() => copyCommand(item.cmd, idx)}
                    className="px-2 py-1 text-[11px] font-mono rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 flex items-center gap-1 transition-colors"
                  >
                    {copiedIndex === idx ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="bg-slate-900/90 px-2.5 py-1.5 rounded-lg border border-slate-800/80 font-mono text-[11px] text-cyan-300 break-all select-all">
                  {item.cmd}
                </div>
                <p className="text-[11px] text-slate-400 mt-1">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Section 3: Linux Desktop Setup */}
        <div className="space-y-3">
          <h4 className="text-sm font-bold text-amber-400 flex items-center gap-2">
            <Cpu className="w-4 h-4" />
            3. Linux Desktop Connection
          </h4>
          <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 text-xs text-slate-300 space-y-2 font-mono">
            <p className="text-slate-400">The DJControl Starlight is USB class-compliant on Linux:</p>
            <div className="bg-slate-900 p-2 rounded border border-slate-800 text-[11px] text-amber-300">
              # Verify USB enumeration: <br />
              lsusb | grep -i "06f8" # Guiman / Hercules Vendor ID<br />
              <br />
              # Verify ALSA MIDI port:<br />
              aconnect -l | grep -i -A 3 "Starlight"
            </div>
            <p className="text-slate-400">
              In Chromium / Chrome / Brave on Linux, ensure your user is in the <code className="text-cyan-400">audio</code> group: <code className="text-slate-200">sudo usermod -aG audio $USER</code>.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-2 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-colors"
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
};
