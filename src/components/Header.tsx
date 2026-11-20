import React from 'react';
import { Disc3, Usb, Smartphone, Download, RefreshCw, Terminal, Sliders } from 'lucide-react';

interface HeaderProps {
  isConnected: boolean;
  deviceName: string;
  isVirtualMode: boolean;
  onToggleVirtualMode: () => void;
  onRescan: () => void;
  onOpenOTGGuide: () => void;
  onOpenAPKModal: () => void;
  availableInputs: { id: string; name: string }[];
  availableOutputs: { id: string; name: string }[];
  onSelectPort: (inputId?: string, outputId?: string) => void;
  activeTab: 'visualizer' | 'led_tester' | 'audit' | 'midi_log';
  setActiveTab: (tab: 'visualizer' | 'led_tester' | 'audit' | 'midi_log') => void;
}

export const Header: React.FC<HeaderProps> = ({
  isConnected,
  deviceName,
  isVirtualMode,
  onToggleVirtualMode,
  onRescan,
  onOpenOTGGuide,
  onOpenAPKModal,
  availableInputs,
  onSelectPort,
  activeTab,
  setActiveTab,
}) => {
  return (
    <header className="shrink-0 border-b border-slate-800/90 bg-slate-900/95 backdrop-blur-md z-40 px-3 sm:px-5 py-2">
      <div className="max-w-7xl mx-auto flex flex-wrap lg:flex-nowrap items-center justify-between gap-2 lg:gap-4">
        {/* Left: Brand Wordmark */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 via-blue-600 to-indigo-600 shadow-md shadow-cyan-500/20">
            <Disc3 className="w-5 h-5 text-white animate-spin [animation-duration:10s]" />
          </div>
          <div className="leading-tight">
            <h1 className="font-bold text-sm sm:text-base tracking-tight text-white whitespace-nowrap">
              Starlight DJ Tool
            </h1>
            <div className="text-[11px] text-slate-400 flex items-center gap-1.5 whitespace-nowrap">
              <span>Hercules DJControl Starlight</span>
              <span aria-hidden="true">·</span>
              <span className="text-slate-500">Linux &amp; A16 OTG</span>
            </div>
          </div>
        </div>

        {/* Center: 4 Single-Line Navigation Tabs */}
        <nav className="flex items-center bg-slate-950/90 p-1 rounded-lg border border-slate-800 overflow-x-auto scrollbar-none order-3 lg:order-2 w-full lg:w-auto justify-between sm:justify-start">
          <button
            onClick={() => setActiveTab('visualizer')}
            className={`px-2.5 py-1.5 rounded-md text-xs font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
              activeTab === 'visualizer'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                : 'text-slate-400 hover:text-slate-200 border border-transparent'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Deck &amp; Hardware</span>
          </button>
          <button
            onClick={() => setActiveTab('led_tester')}
            className={`px-2.5 py-1.5 rounded-md text-xs font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
              activeTab === 'led_tester'
                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                : 'text-slate-400 hover:text-slate-200 border border-transparent'
            }`}
          >
            <Disc3 className="w-3.5 h-3.5" />
            <span>LED Shows</span>
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`px-2.5 py-1.5 rounded-md text-xs font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
              activeTab === 'audit'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : 'text-slate-400 hover:text-slate-200 border border-transparent'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Button Audit</span>
          </button>
          <button
            onClick={() => setActiveTab('midi_log')}
            className={`px-2.5 py-1.5 rounded-md text-xs font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
              activeTab === 'midi_log'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'text-slate-400 hover:text-slate-200 border border-transparent'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>MIDI Log</span>
          </button>
        </nav>

        {/* Right: Connection & Action Controls */}
        <div className="flex items-center gap-1.5 shrink-0 order-2 lg:order-3">
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-[11px] font-mono whitespace-nowrap ${
              isConnected
                ? 'bg-emerald-950/60 border-emerald-700/60 text-emerald-300'
                : isVirtualMode
                ? 'bg-amber-950/60 border-amber-700/60 text-amber-300'
                : 'bg-rose-950/60 border-rose-800/60 text-rose-300'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${
                isConnected
                  ? 'bg-emerald-400 animate-pulse'
                  : isVirtualMode
                  ? 'bg-amber-400'
                  : 'bg-rose-400'
              }`}
            />
            <span className="truncate max-w-[110px] sm:max-w-[150px]">
              {isConnected ? deviceName : isVirtualMode ? 'Virtual Mode' : 'No MIDI'}
            </span>
          </div>

          {availableInputs.length > 1 && (
            <select
              aria-label="Select MIDI Input Port"
              onChange={(e) => onSelectPort(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-xs text-slate-200 rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-cyan-500 max-w-[120px]"
            >
              {availableInputs.map((port) => (
                <option key={port.id} value={port.id}>
                  {port.name}
                </option>
              ))}
            </select>
          )}

          <button
            onClick={onRescan}
            title="Scan for USB-OTG MIDI devices"
            className="p-1.5 rounded-md bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={onToggleVirtualMode}
            className={`px-2.5 py-1.5 text-xs font-medium rounded-md border transition-colors whitespace-nowrap shrink-0 ${
              isVirtualMode
                ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300'
                : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
            }`}
          >
            {isVirtualMode ? 'Sim ON' : 'Simulate'}
          </button>

          <button
            onClick={onOpenOTGGuide}
            title="Samsung Galaxy A16 OTG Setup Guide"
            className="px-2.5 py-1.5 text-xs font-medium rounded-md bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition-colors flex items-center gap-1 whitespace-nowrap shrink-0"
          >
            <Usb className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">OTG</span>
          </button>

          <button
            onClick={onOpenAPKModal}
            className="px-2.5 py-1.5 text-xs font-semibold rounded-md bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white flex items-center gap-1.5 shadow-sm transition-all whitespace-nowrap shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">APK</span>
          </button>
        </div>
      </div>
    </header>
  );
};
