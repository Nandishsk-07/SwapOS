import React, { useMemo } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  CartesianGrid 
} from 'recharts';
import { BarChart3 } from 'lucide-react';

export function SuitabilityScoreDistribution({ fleet = [] }) {
  // Bin suitability scores into 10 score intervals: 0-10, 10-20, ..., 90-100
  const histogramData = useMemo(() => {
    const bins = [
      { range: '0-20', label: '0-20 (Critical)', min: 0, max: 20, count: 0, color: '#EF4444' },
      { range: '20-40', label: '20-40 (Poor)', min: 20, max: 40, count: 0, color: '#EF4444' },
      { range: '40-50', label: '40-50 (Unsafe/Deg)', min: 40, max: 50, count: 0, color: '#F5A524' },
      { range: '50-60', label: '50-60 (Usable)', min: 50, max: 60, count: 0, color: '#F5A524' },
      { range: '60-70', label: '60-70 (Good)', min: 60, max: 70, count: 0, color: '#2F6FED' },
      { range: '70-80', label: '70-80 (Optimal)', min: 70, max: 80, count: 0, color: '#2F6FED' },
      { range: '80-90', label: '80-90 (Prime)', min: 80, max: 90, count: 0, color: '#2F6FED' },
      { range: '90-100', label: '90-100 (Peak)', min: 90, max: 100, count: 0, color: '#2F6FED' },
    ];

    if (fleet.length === 0) return bins;

    fleet.forEach((b) => {
      const score = b.suitability_score || 0;
      for (const bin of bins) {
        if (score >= bin.min && (score < bin.max || (bin.max === 100 && score <= 100))) {
          bin.count++;
          break;
        }
      }
    });

    return bins;
  }, [fleet]);

  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-100 card-shadow flex flex-col justify-between h-full font-sans">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-4 font-sans">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-blue-50 text-[#2F6FED]">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#1A2130]">Suitability Score Distribution</h3>
              <p className="text-xs text-[#8A94A6]">Normalized 0–100 suitability scores across 200 packs</p>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-end gap-3 text-xs mb-3 font-sans">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#EF4444]" />
            <span className="text-slate-600">Unsafe (<span className="font-mono">&lt;40</span>)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#F5A524]" />
            <span className="text-slate-600">Degraded (<span className="font-mono">40–60</span>)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#2F6FED]" />
            <span className="text-slate-600">Safe (<span className="font-mono">&gt;60</span>)</span>
          </div>
        </div>

        {/* Histogram Chart */}
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={histogramData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
              <XAxis 
                dataKey="range" 
                tick={{ fontSize: 11, fill: '#8A94A6', fontFamily: 'IBM Plex Mono' }} 
                axisLine={{ stroke: '#E2E8F0' }}
                tickLine={false}
              />
              <YAxis 
                tick={{ fontSize: 11, fill: '#8A94A6', fontFamily: 'IBM Plex Mono' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip 
                cursor={{ fill: 'rgba(241, 245, 249, 0.6)' }}
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-[#0F1C2E] text-white p-2.5 rounded-xl shadow-xl border border-slate-700 text-xs font-sans">
                        <div className="font-bold text-blue-400 font-mono">{data.label}</div>
                        <div className="mt-1 font-sans">Packs Count: <strong className="text-white font-mono">{data.count}</strong></div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                {histogramData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
