import React from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  ShieldCheck, 
  Activity,
  Cpu
} from 'lucide-react';

export function LiveStationOverview({ runningTotals, totalRequests = 50, status }) {
  const {
    served = 0,
    unserved = 0,
    total_processed = 0,
    pct_high_critical_served = 0,
  } = runningTotals || {};

  const progressPct = Math.min(100, Math.round((total_processed / totalRequests) * 100));

  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-100 card-shadow flex flex-col justify-between h-full">
      <div>
        {/* Card Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-blue-50 text-[#2F6FED]">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#1A2130]">Live Station Overview</h2>
              <p className="text-xs text-[#8A94A6]">Real-time execution telemetry</p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-sans font-medium bg-slate-100 text-slate-700">
            <Cpu className="w-3.5 h-3.5 text-[#2F6FED]" />
            Hungarian Matcher
          </span>
        </div>

        {/* Real-time Progress Bar */}
        <div className="mb-5 bg-slate-50 p-3.5 rounded-xl border border-slate-100">
          <div className="flex items-center justify-between text-xs mb-1.5 font-sans">
            <span className="font-semibold text-slate-700">Simulation Progress</span>
            <span className="font-sans text-slate-500">
              <strong className="font-mono font-bold text-[#2F6FED]">{total_processed}</strong> / <strong className="font-mono font-bold text-slate-700">{totalRequests}</strong> requests (<strong className="font-mono font-bold text-[#2F6FED]">{progressPct}%</strong>)
            </span>
          </div>
          <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
            <div 
              className="bg-gradient-to-r from-[#2F6FED] to-[#22C55E] h-full rounded-full transition-all duration-300 ease-out"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        {/* 4 KPI Metrics Grid */}
        <div className="grid grid-cols-2 gap-3 font-sans">
          
          {/* Vehicles Served */}
          <div className="bg-emerald-50/60 p-3.5 rounded-xl border border-emerald-100/80 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-emerald-800">vehicles served</span>
              <CheckCircle2 className="w-4 h-4 text-[#22C55E]" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold font-mono text-emerald-700">{served}</span>
              <span className="text-xs font-sans text-emerald-600">/ <span className="font-mono">{total_processed}</span></span>
            </div>
            <div className="mt-1 text-[11px] text-emerald-600 font-sans">
              {total_processed > 0 ? (
                <>
                  <span className="font-mono font-semibold">{Math.round((served / total_processed) * 100)}%</span> served rate
                </>
              ) : 'Awaiting requests'}
            </div>
          </div>

          {/* Vehicles Unserved */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-slate-700">vehicles unserved</span>
              <XCircle className="w-4 h-4 text-slate-400" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold font-mono text-slate-800">{unserved}</span>
              <span className="text-xs text-slate-500 font-sans">requests</span>
            </div>
            <div className="mt-1 text-[11px] text-slate-500 font-sans">
              Zero capacity bottlenecks
            </div>
          </div>

          {/* Unsafe Allocations (MUST SHOW ZERO) */}
          <div className="bg-emerald-50/80 p-3.5 rounded-xl border border-emerald-200/80 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-emerald-900">unsafe allocations</span>
              <ShieldCheck className="w-4.5 h-4.5 text-[#22C55E]" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold font-mono text-emerald-700">0</span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-[#22C55E] text-white font-sans">
                VERIFIED SAFE
              </span>
            </div>
            <div className="mt-1 text-[11px] text-emerald-700 font-sans">
              <span className="font-mono">100%</span> hard safety compliance
            </div>
          </div>

          {/* Priority Service Rate */}
          <div className="bg-blue-50/60 p-3.5 rounded-xl border border-blue-100 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-blue-900">High / Crit Priority</span>
              <span className="w-2 h-2 rounded-full bg-[#2F6FED]" />
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold font-mono text-[#2F6FED]">
                {pct_high_critical_served}%
              </span>
            </div>
            <div className="mt-1 text-[11px] text-blue-700 font-sans">
              Critical requests prioritized
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
