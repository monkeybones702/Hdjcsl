import React, { useState } from 'react';
import { ButtonAuditItem } from '../types/midi';
import { CheckCircle2, AlertCircle, RotateCcw, Download, Sparkles, Filter } from 'lucide-react';
import confetti from 'canvas-confetti';

interface ButtonHealthAuditProps {
  auditItems: ButtonAuditItem[];
  onResetAudit: () => void;
}

export const ButtonHealthAudit: React.FC<ButtonHealthAuditProps> = ({
  auditItems,
  onResetAudit,
}) => {
  const [filterCategory, setFilterCategory] = useState<string>('All');

  const total = auditItems.length;
  const passed = auditItems.filter((i) => i.tested).length;
  const percentage = Math.round((passed / total) * 100);

  React.useEffect(() => {
    if (passed === total && total > 0) {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });
    }
  }, [passed, total]);

  const filteredItems =
    filterCategory === 'All'
      ? auditItems
      : auditItems.filter((i) => i.category === filterCategory);

  const handleExportReport = () => {
    const report = {
      device: 'Hercules DJControl Starlight',
      timestamp: new Date().toISOString(),
      testedCount: passed,
      totalCount: total,
      healthScore: `${percentage}%`,
      items: auditItems.map((item) => ({
        id: item.id,
        name: item.name,
        deck: item.deck,
        category: item.category,
        tested: item.tested,
        pressCount: item.pressCount,
        lastVelocity: item.lastVelocity ?? null,
        lastLatencyMs: item.lastLatencyMs ?? null,
        lastPressTime: item.lastPressTime ? new Date(item.lastPressTime).toISOString() : null,
      })),
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `starlight-diagnostic-report-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="h-full w-full flex flex-col gap-2.5 min-h-0">
      {/* Compact Overview + Filter Bar */}
      <div className="shrink-0 bg-slate-900/90 border border-slate-800 rounded-xl p-3 flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-bold text-white">
              Button Health &amp; Input Audit
            </h2>
            <span className="text-[11px] font-mono tabular-nums text-slate-400">
              Verified: <strong className="text-white">{passed}</strong> / {total} ({percentage}%)
            </span>
            {percentage === 100 && (
              <span className="flex items-center gap-1 text-xs font-bold text-emerald-400">
                <Sparkles className="w-3.5 h-3.5" /> Complete
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportReport}
              className="px-2.5 py-1 text-xs font-medium rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-cyan-400" />
              <span>Export</span>
            </button>

            <button
              onClick={onResetAudit}
              className="px-2.5 py-1 text-xs font-medium rounded-md bg-slate-800 hover:bg-slate-700 text-rose-300 border border-slate-700 flex items-center gap-1.5 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          </div>
        </div>

        {/* Progress Bar + Category Filters on One Row */}
        <div className="flex flex-col md:flex-row md:items-center gap-2.5">
          <div className="flex-1 h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
            <div
              className={`h-full transition-all duration-300 ${
                percentage === 100
                  ? 'bg-gradient-to-r from-emerald-500 to-cyan-400'
                  : 'bg-gradient-to-r from-cyan-500 to-indigo-500'
              }`}
              style={{ width: `${percentage}%` }}
            />
          </div>

          <div className="flex items-center gap-1 overflow-x-auto scrollbar-none shrink-0">
            <Filter className="w-3.5 h-3.5 text-slate-500 mr-0.5 shrink-0" />
            {['All', 'Transport', 'Pad', 'Fader/Knob', 'Jog', 'Special'].map((cat) => (
              <button
                key={cat}
                onClick={() => setFilterCategory(cat)}
                className={`px-2 py-1 text-[11px] rounded-md font-medium transition-colors whitespace-nowrap shrink-0 ${
                  filterCategory === cat
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50'
                    : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Dense 4-Column Audit Grid fitting all 32 items in one desktop screen */}
      <div className="flex-1 min-h-0 overflow-y-auto slim-scroll pr-0.5">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className={`px-2.5 py-2 rounded-lg border transition-colors flex items-center justify-between gap-2 ${
                item.tested
                  ? 'bg-emerald-950/25 border-emerald-700/50'
                  : 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700'
              }`}
            >
              <div className="min-w-0 space-y-0.5">
                <div className="flex items-center gap-1.5 text-[10px] font-mono">
                  <span
                    className={`font-bold ${
                      item.deck === 'A'
                        ? 'text-cyan-400'
                        : item.deck === 'B'
                        ? 'text-purple-400'
                        : 'text-amber-400'
                    }`}
                  >
                    Deck {item.deck}
                  </span>
                  <span className="text-slate-600">·</span>
                  <span className="text-slate-400 truncate">{item.category}</span>
                </div>

                <h4 className="text-xs font-semibold text-white truncate">{item.name}</h4>

                <div className="text-[10px] font-mono tabular-nums text-slate-400 flex items-center gap-2">
                  <span>
                    Hits: <strong className="text-slate-200">{item.pressCount}</strong>
                  </span>
                  {item.lastVelocity !== undefined && (
                    <span>
                      Val: <strong className="text-cyan-400">{item.lastVelocity}</strong>
                    </span>
                  )}
                  {item.lastLatencyMs !== undefined && (
                    <span>
                      <strong className="text-amber-400">{item.lastLatencyMs}ms</strong>
                    </span>
                  )}
                </div>
              </div>

              <div className="shrink-0">
                {item.tested ? (
                  <div className="flex items-center gap-1 text-emerald-400">
                    <CheckCircle2 className="w-4 h-4 fill-emerald-950" />
                    <span className="text-[10px] font-bold font-mono">PASS</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-slate-600">
                    <AlertCircle className="w-4 h-4" />
                    <span className="text-[10px] font-mono">WAIT</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
