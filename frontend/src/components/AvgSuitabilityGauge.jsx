import React from 'react';
import { Gauge, TrendingUp, Sparkles } from 'lucide-react';

export function AvgSuitabilityGauge({ runningTotals, baselineAvgScore = 63.6 }) {
  const score = runningTotals?.avg_suitability_score || 0;
  const servedCount = runningTotals?.served || 0;
  
  // Calculate difference vs baseline
  const diff = score > 0 ? (score - baselineAvgScore).toFixed(1) : 0;
  const isPositive = parseFloat(diff) >= 0;

  // SVG Gauge calculations (semi-circle arc)
  const radius = 70;
  const circumference = Math.PI * radius; // Half circumference for semi-circle
  const fillRatio = Math.min(1, Math.max(0, score / 100));
  const strokeDashoffset = circumference * (1 - fillRatio);

  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-100 card-shadow flex flex-col justify-between h-full font-sans">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-50 text-[#22C55E]">
              <Gauge className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#1A2130]">Avg Suitability Score</h3>
              <p className="text-xs text-[#8A94A6]">Running average of allocated battery health</p>
            </div>
          </div>
          <span className="flex items-center gap-1 text-xs font-sans font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
            <Sparkles className="w-3.5 h-3.5 text-[#22C55E]" />
            Optimal
          </span>
        </div>

        {/* Circular Gauge Graphic */}
        <div className="relative flex flex-col items-center justify-center my-2">
          <svg className="w-52 h-28 overflow-visible">
            {/* Gradient definition */}
            <defs>
              <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#2F6FED" />
                <stop offset="100%" stopColor="#22C55E" />
              </linearGradient>
            </defs>

            {/* Background Track Arc */}
            <path
              d="M 15 100 A 70 70 0 0 1 155 100"
              fill="none"
              stroke="#E2E8F0"
              strokeWidth="14"
              strokeLinecap="round"
            />

            {/* Value Filled Arc */}
            <path
              d="M 15 100 A 70 70 0 0 1 155 100"
              fill="none"
              stroke="url(#gaugeGradient)"
              strokeWidth="14"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              className="transition-all duration-500 ease-out"
            />
          </svg>

          {/* Center Text Readout inside Semi-Circle */}
          <div className="absolute top-12 flex flex-col items-center">
            <span className="text-3xl font-extrabold font-mono text-slate-900 tracking-tight">
              {score > 0 ? score.toFixed(1) : '0.0'}
            </span>
            <span className="text-[11px] font-sans text-slate-500 uppercase tracking-wider">
              / <span className="font-mono">100</span> Score
            </span>
          </div>
        </div>

        {/* Comparison Footnote vs Baseline */}
        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex items-center justify-between text-xs font-sans mt-1">
          <span className="text-slate-500 font-sans">vs Baseline (<span className="font-mono">{baselineAvgScore}</span>):</span>
          {servedCount > 0 ? (
            <span className={`font-semibold flex items-center gap-1 font-sans ${isPositive ? 'text-emerald-600' : 'text-amber-600'}`}>
              <TrendingUp className="w-3.5 h-3.5" />
              <span className="font-mono">{isPositive ? `+${diff}` : diff}</span> pts lift (<span className="font-mono">+{((diff / baselineAvgScore) * 100).toFixed(1)}%</span>)
            </span>
          ) : (
            <span className="text-slate-400 font-sans">Awaiting allocations</span>
          )}
        </div>
      </div>
    </div>
  );
}
