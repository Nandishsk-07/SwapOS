import React from 'react';
import { Battery, ShieldAlert, AlertTriangle, CheckCircle } from 'lucide-react';

export function FleetSnapshot({ fleet = [], allocatedCount = 0 }) {
  const totalFleet = fleet.length || 200;
  
  // Categorize fleet
  const safeCount = fleet.filter(b => b.classification === 'Safe and Available').length || 184;
  const degradedCount = fleet.filter(b => b.classification === 'Degraded but Usable').length || 11;
  const unsafeCount = fleet.filter(b => b.classification === 'Unsafe/Quarantine').length || 5;

  const safePct = Math.round((safeCount / totalFleet) * 100);
  const degradedPct = Math.round((degradedCount / totalFleet) * 100);
  const unsafePct = Math.round((unsafeCount / totalFleet) * 100);

  // Remaining available safe batteries
  const remainingAvailable = Math.max(0, safeCount + degradedCount - allocatedCount);

  // Averages
  const avgSoh = fleet.length > 0
    ? (fleet.reduce((acc, b) => acc + (b.SoH || 0), 0) / fleet.length).toFixed(1)
    : '80.1';
  
  const avgSoc = fleet.length > 0
    ? (fleet.reduce((acc, b) => acc + (b.SoC || 0), 0) / fleet.length).toFixed(1)
    : '76.4';

  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-100 card-shadow flex flex-col justify-between h-full font-sans">
      <div>
        {/* Card Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-indigo-50 text-[#2F6FED]">
              <Battery className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#1A2130]">Fleet Snapshot</h2>
              <p className="text-xs text-[#8A94A6]">{totalFleet} Pack Fleet Distribution & Status</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-slate-100 px-3 py-1 rounded-full">
            <span>Fleet Total:</span>
            <strong className="text-slate-900 font-mono">{totalFleet}</strong>
            <span className="text-slate-500">Packs</span>
          </div>
        </div>

        {/* 3 Categories Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 mb-4">
          
          {/* Safe and Available */}
          <div className="bg-blue-50/50 p-3.5 rounded-xl border border-blue-100 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#2F6FED]" />
                  <span className="text-xs font-semibold text-slate-800">Safe and Available</span>
                </div>
                <CheckCircle className="w-4 h-4 text-[#2F6FED]" />
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold font-mono text-[#2F6FED]">{safeCount}</span>
                <span className="text-xs text-slate-500 font-mono">/ {totalFleet}</span>
                <span className="text-[10px] text-slate-400 font-mono pl-1">({safePct}%)</span>
              </div>
            </div>
            {/* Battery Cell Segment Bar */}
            <div className="mt-3">
              <div className="w-full bg-blue-200/60 h-2 rounded-full overflow-hidden">
                <div className="bg-[#2F6FED] h-full rounded-full" style={{ width: `${safePct}%` }} />
              </div>
            </div>
          </div>

          {/* Degraded but Usable */}
          <div className="bg-amber-50/50 p-3.5 rounded-xl border border-amber-100 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#F5A524]" />
                  <span className="text-xs font-semibold text-slate-800">Degraded but Usable</span>
                </div>
                <AlertTriangle className="w-4 h-4 text-[#F5A524]" />
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold font-mono text-amber-700">{degradedCount}</span>
                <span className="text-xs text-slate-500 font-mono">/ {totalFleet}</span>
                <span className="text-[10px] text-slate-400 font-mono pl-1">({degradedPct}%)</span>
              </div>
            </div>
            {/* Battery Cell Segment Bar */}
            <div className="mt-3">
              <div className="w-full bg-amber-200/60 h-2 rounded-full overflow-hidden">
                <div className="bg-[#F5A524] h-full rounded-full" style={{ width: `${degradedPct}%` }} />
              </div>
            </div>
          </div>

          {/* Unsafe-Quarantine */}
          <div className="bg-red-50/50 p-3.5 rounded-xl border border-red-100 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#EF4444]" />
                  <span className="text-xs font-semibold text-slate-800">Unsafe-Quarantine</span>
                </div>
                <ShieldAlert className="w-4 h-4 text-[#EF4444]" />
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold font-mono text-red-600">{unsafeCount}</span>
                <span className="text-xs text-slate-500 font-mono">/ {totalFleet}</span>
                <span className="text-[10px] text-slate-400 font-mono pl-1">({unsafePct}%)</span>
              </div>
            </div>
            {/* Battery Cell Segment Bar */}
            <div className="mt-3">
              <div className="w-full bg-red-200/60 h-2 rounded-full overflow-hidden">
                <div className="bg-[#EF4444] h-full rounded-full" style={{ width: `${unsafePct}%` }} />
              </div>
            </div>
          </div>

        </div>

        {/* Secondary Fleet Telemetry Strip */}
        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex flex-wrap items-center justify-between text-xs gap-3 font-sans">
          <div className="flex items-center gap-1.5">
            <span className="text-[#8A94A6]">Available Packs:</span>
            <strong className="text-slate-800"><span className="font-mono">{remainingAvailable}</span> / <span className="font-mono">{safeCount + degradedCount}</span></strong>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[#8A94A6]">Fleet Avg SoH:</span>
            <strong className="text-emerald-600 font-mono">{avgSoh}%</strong>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[#8A94A6]">Fleet Avg SoC:</span>
            <strong className="text-[#2F6FED] font-mono">{avgSoc}%</strong>
          </div>
        </div>
      </div>
    </div>
  );
}
