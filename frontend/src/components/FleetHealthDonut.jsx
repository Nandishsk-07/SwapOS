import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { PieChart as PieIcon } from 'lucide-react';

export function FleetHealthDonut({ fleet = [], allocatedCount = 0 }) {
  const safeCount = fleet.filter(b => b.classification === 'Safe and Available').length || 184;
  const degradedCount = fleet.filter(b => b.classification === 'Degraded but Usable').length || 11;
  const unsafeCount = fleet.filter(b => b.classification === 'Unsafe/Quarantine').length || 5;

  const totalPacks = safeCount + degradedCount + unsafeCount;

  const pieData = useMemo(() => [
    { name: 'Safe', value: safeCount, color: '#2F6FED' },
    { name: 'Degraded', value: degradedCount, color: '#F5A524' },
    { name: 'Unsafe', value: unsafeCount, color: '#EF4444' },
  ], [safeCount, degradedCount, unsafeCount]);

  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-100 card-shadow flex flex-col justify-between h-full font-sans">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-purple-50 text-[#8B5CF6]">
              <PieIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#1A2130]">Battery Fleet Health</h3>
              <p className="text-xs text-[#8A94A6]">Safety & degradation proportions</p>
            </div>
          </div>
        </div>

        {/* Donut Chart with Live Center Label */}
        <div className="relative h-48 w-full flex items-center justify-center my-2 font-sans">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-[#0F1C2E] text-white p-2.5 rounded-xl shadow-xl text-xs font-sans border border-slate-700">
                        <div className="font-bold" style={{ color: data.color }}>{data.name}</div>
                        <div className="mt-0.5 font-sans">Count: <strong className="font-mono">{data.value}</strong> packs</div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={80}
                paddingAngle={3}
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>

          {/* Center Label: Displays the total of all three classification slices */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none font-sans">
            <span className="text-2xl font-bold font-mono text-slate-900">{totalPacks}</span>
            <span className="text-[10px] font-sans text-slate-400">Total Packs</span>
          </div>
        </div>

        {/* Legend */}
        <div className="grid grid-cols-3 gap-2 text-center pt-2 border-t border-slate-100 text-xs font-sans">
          <div className="bg-blue-50/50 p-2 rounded-xl border border-blue-100">
            <div className="text-[10px] text-slate-500 font-sans">Safe</div>
            <div className="font-bold text-[#2F6FED] text-sm font-mono">{safeCount}</div>
          </div>
          <div className="bg-amber-50/50 p-2 rounded-xl border border-amber-100">
            <div className="text-[10px] text-slate-500 font-sans">Degraded</div>
            <div className="font-bold text-[#F5A524] text-sm font-mono">{degradedCount}</div>
          </div>
          <div className="bg-red-50/50 p-2 rounded-xl border border-red-100">
            <div className="text-[10px] text-slate-500 font-sans">Unsafe</div>
            <div className="font-bold text-[#EF4444] text-sm font-mono">{unsafeCount}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
