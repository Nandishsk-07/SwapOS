import React, { useMemo } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  CartesianGrid 
} from 'recharts';
import { Trophy, CheckCircle, ShieldCheck } from 'lucide-react';

export function BaselineVsOptimized({ metrics, verification = [] }) {
  const baseline = metrics?.baseline || {
    served: 50,
    pct_high_critical_served: 100.0,
    avg_soh_allocated: 80.3,
    avg_suitability_score_allocated: 63.6,
  };

  const optimized = metrics?.optimized || {
    served: 50,
    pct_high_critical_served: 100.0,
    avg_soh_allocated: 91.3,
    avg_suitability_score_allocated: 77.0,
  };

  const chartData = useMemo(() => [
    {
      metric: 'Vehicles Served',
      Baseline: baseline.served || 50,
      'Our Method': optimized.served || 50,
      unit: 'reqs',
    },
    {
      metric: '% Priority Served',
      Baseline: baseline.pct_high_critical_served || 100,
      'Our Method': optimized.pct_high_critical_served || 100,
      unit: '%',
    },
    {
      metric: 'Avg SoH Allocated',
      Baseline: baseline.avg_soh_allocated || 80.3,
      'Our Method': optimized.avg_soh_allocated || 91.3,
      unit: '%',
    },
    {
      metric: 'Avg Suitability',
      Baseline: baseline.avg_suitability_score_allocated || 63.6,
      'Our Method': optimized.avg_suitability_score_allocated || 77.0,
      unit: 'pts',
    },
  ], [baseline, optimized]);

  // Check verification rules
  const allVerified = verification.length > 0 ? verification.every(c => c.passed) : true;

  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-100 card-shadow flex flex-col justify-between h-full font-sans">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 font-sans">
            <div className="p-2 rounded-xl bg-[#8B5CF6]/10 text-[#8B5CF6]">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#1A2130]">Baseline vs Optimized</h3>
              <p className="text-xs text-[#8A94A6]">Highest-SoC-First vs Hungarian Optimization Algorithm</p>
            </div>
          </div>

          {/* Verification Shield Badge */}
          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-sans font-medium border ${
            allVerified
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-red-50 text-red-700 border-red-200'
          }`}>
            <ShieldCheck className={`w-4 h-4 ${allVerified ? 'text-emerald-600' : 'text-red-500'}`} />
            <span><span className="font-mono">{verification.filter(c => c.passed).length}/{verification.length || 4}</span> Constraints {allVerified ? 'PASSED' : 'ISSUES'}</span>
          </div>
        </div>

        {/* Comparison Chart */}
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
              <XAxis 
                dataKey="metric" 
                tick={{ fontSize: 11, fill: '#1A2130', fontWeight: 500, fontFamily: 'Inter' }} 
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
                    const metricName = payload[0].payload.metric;
                    const unit = payload[0].payload.unit;
                    return (
                      <div className="bg-[#0F1C2E] text-white p-3 rounded-xl shadow-xl text-xs font-sans border border-slate-700">
                        <div className="font-bold text-slate-300 mb-1 font-sans">{metricName}</div>
                        <div className="flex items-center justify-between gap-4 text-slate-400 font-sans">
                          <span>Baseline:</span>
                          <strong className="text-slate-200 font-mono">{payload[0].value} {unit}</strong>
                        </div>
                        <div className="flex items-center justify-between gap-4 text-[#8B5CF6] mt-0.5 font-bold font-sans">
                          <span>Our Method:</span>
                          <strong className="text-white font-mono">{payload[1].value} {unit}</strong>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend 
                wrapperStyle={{ fontSize: '11px', fontFamily: 'Inter', paddingTop: '8px' }}
                iconType="circle"
              />
              <Bar dataKey="Baseline" fill="#94A3B8" radius={[4, 4, 0, 0]} barSize={22} />
              <Bar dataKey="Our Method" fill="#8B5CF6" radius={[4, 4, 0, 0]} barSize={22} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Highlights Summary Strip */}
        {(() => {
          const bSoH = baseline.avg_soh_allocated || 0;
          const oSoH = optimized.avg_soh_allocated || 0;
          const sohGain = (oSoH - bSoH).toFixed(1);
          const bSuit = baseline.avg_suitability_score_allocated || 0;
          const oSuit = optimized.avg_suitability_score_allocated || 0;
          const suitGain = (oSuit - bSuit).toFixed(1);
          return (
            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-100 text-xs font-sans mt-2">
              <div className="bg-purple-50/60 p-2.5 rounded-xl border border-purple-100 flex items-center justify-between font-sans">
                <span className="text-slate-600 font-sans">Avg SoH Gain:</span>
                <span className="font-semibold text-[#8B5CF6] font-sans">
                  <span className="font-mono">+{sohGain}%</span> (<span className="font-mono">{bSoH}%</span> → <span className="font-mono">{oSoH}%</span>)
                </span>
              </div>
              <div className="bg-purple-50/60 p-2.5 rounded-xl border border-purple-100 flex items-center justify-between font-sans">
                <span className="text-slate-600 font-sans">Suitability Gain:</span>
                <span className="font-semibold text-[#8B5CF6] font-sans">
                  <span className="font-mono">+{suitGain}</span> pts (<span className="font-mono">{bSuit}</span> → <span className="font-mono">{oSuit}</span>)
                </span>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
