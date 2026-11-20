import React, { useState, useEffect, useRef } from 'react';
import { MIDIMessageEvent } from '../types/midi';
import { Terminal, Trash2, Download, Pause, Play, ArrowDownRight, ArrowUpLeft } from 'lucide-react';

interface MIDIMonitorLogProps {
  logs: MIDIMessageEvent[];
  onClearLogs: () => void;
}

export const MIDIMonitorLog: React.FC<MIDIMonitorLogProps> = ({ logs, onClearLogs }) => {
  const [filterType, setFilterType] = useState<string>('all');
  const [filterDeck, setFilterDeck] = useState<string>('all');
  const [autoScroll, setAutoScroll] = useState<boolean>(true);
  const logContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autoScroll && logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  const filteredLogs = logs.filter((log) => {
    if (filterType !== 'all') {
      if (filterType === 'in' && log.direction !== 'in') return false;
      if (filterType === 'out' && log.direction !== 'out') return false;
      if (filterType === 'notes' && !['noteon', 'noteoff'].includes(log.type)) return false;
      if (filterType === 'cc' && log.type !== 'cc') return false;
    }
    if (filterDeck !== 'all') {
      if (log.deck !== filterDeck) return false;
    }
    return true;
  });

  const handleDownloadLog = () => {
    const lines = filteredLogs.map(
      (l) =>
        `[${new Date(l.timestamp).toLocaleTimeString()}.${String(l.timestamp % 1000).padStart(
          3,
          '0'
        )}] [${l.direction.toUpperCase()}] Hex: ${l.hex} | Type: ${l.type} | Deck: ${
          l.deck || 'N/A'
        } | Desc: ${l.description}`
    );
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `starlight-midi-log-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="h-full w-full flex flex-col gap-2.5 min-h-0">
      {/* Controls Bar */}
      <div className="shrink-0 bg-slate-900/90 border border-slate-800 rounded-xl p-2.5 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-bold text-white font-mono tabular-nums">
            LIVE MIDI CONSOLE ({filteredLogs.length} events)
          </span>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="bg-slate-950 border border-slate-700 text-xs text-slate-300 rounded-md px-2 py-1 focus:outline-none"
          >
            <option value="all">All Packets</option>
            <option value="in">Inputs Only</option>
            <option value="out">Outputs Only</option>
            <option value="notes">Notes Only</option>
            <option value="cc">CC Knobs/Sliders</option>
          </select>

          <select
            value={filterDeck}
            onChange={(e) => setFilterDeck(e.target.value)}
            className="bg-slate-950 border border-slate-700 text-xs text-slate-300 rounded-md px-2 py-1 focus:outline-none"
          >
            <option value="all">All Decks</option>
            <option value="A">Deck A</option>
            <option value="B">Deck B</option>
            <option value="Master">Master</option>
          </select>

          <button
            onClick={() => setAutoScroll(!autoScroll)}
            className={`px-2 py-1 text-xs rounded-md border font-mono transition-colors flex items-center gap-1 ${
              autoScroll
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50'
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}
          >
            {autoScroll ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
            <span>Auto-Scroll</span>
          </button>

          <button
            onClick={handleDownloadLog}
            className="px-2.5 py-1 text-xs rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 flex items-center gap-1 transition-colors"
          >
            <Download className="w-3 h-3" />
            <span>Export</span>
          </button>

          <button
            onClick={onClearLogs}
            className="px-2.5 py-1 text-xs rounded-md bg-slate-800 hover:bg-slate-700 text-rose-400 border border-slate-700 flex items-center gap-1 transition-colors"
          >
            <Trash2 className="w-3 h-3" />
            <span>Clear</span>
          </button>
        </div>
      </div>

      {/* Bounded Full-Height Terminal Window */}
      <div
        ref={logContainerRef}
        className="flex-1 min-h-0 bg-slate-950 rounded-xl border border-slate-800/90 p-3 font-mono text-xs overflow-y-auto slim-scroll space-y-1 shadow-inner"
      >
        {filteredLogs.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-600 gap-2">
            <Terminal className="w-8 h-8 opacity-40" />
            <p className="text-xs">Waiting for incoming or outgoing MIDI messages...</p>
            <p className="text-[11px] text-slate-700 text-center">
              Press any button on the Hercules Starlight or toggle LEDs to see raw traffic.
            </p>
          </div>
        ) : (
          filteredLogs.map((log) => {
            const timeStr = `${new Date(log.timestamp).toLocaleTimeString()}.${String(
              log.timestamp % 1000
            ).padStart(3, '0')}`;

            return (
              <div
                key={log.id}
                className={`py-1 px-2 rounded flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px] border border-transparent hover:border-slate-800 transition-colors ${
                  log.direction === 'out'
                    ? 'bg-purple-950/20 text-purple-200'
                    : log.type === 'noteon'
                    ? 'bg-emerald-950/20 text-emerald-200'
                    : log.type === 'noteoff'
                    ? 'bg-slate-900/40 text-slate-400'
                    : log.type === 'cc'
                    ? 'bg-cyan-950/20 text-cyan-200'
                    : 'bg-slate-900/60 text-slate-300'
                }`}
              >
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] text-slate-500 font-mono tabular-nums">{timeStr}</span>

                  {log.direction === 'in' ? (
                    <span className="px-1 rounded text-[9px] font-bold bg-cyan-900/60 text-cyan-300 border border-cyan-700/60 flex items-center gap-0.5">
                      <ArrowDownRight className="w-2.5 h-2.5" /> IN
                    </span>
                  ) : (
                    <span className="px-1 rounded text-[9px] font-bold bg-purple-900/60 text-purple-300 border border-purple-700/60 flex items-center gap-0.5">
                      <ArrowUpLeft className="w-2.5 h-2.5" /> OUT
                    </span>
                  )}

                  <span className="font-bold text-amber-300 bg-slate-900 px-1 rounded border border-slate-800">
                    {log.hex}
                  </span>

                  {log.deck && (
                    <span
                      className={`text-[9px] font-bold uppercase ${
                        log.deck === 'A'
                          ? 'text-cyan-400'
                          : log.deck === 'B'
                          ? 'text-purple-400'
                          : 'text-amber-400'
                      }`}
                    >
                      Deck {log.deck}
                    </span>
                  )}

                  <span className="text-slate-200">{log.description}</span>
                </div>

                <div className="text-[10px] text-slate-500 self-end sm:self-auto font-mono tabular-nums">
                  Ch {log.channel} · {log.type}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
