import React from 'react';
import { Radio, ArrowRight, AlertTriangle, ShieldCheck, CheckCircle2 } from 'lucide-react';

export function RecentAllocations({ events = [] }) {
  const getPriorityStyle = (priority) => {
    switch (priority) {
      case 'Critical':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'High':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'Normal':
      default:
        return 'bg-blue-100 text-blue-700 border-blue-200';
    }
  };

  const getClassificationDot = (classification) => {
    if (!classification) return null;
    let dotColor = '#2F6FED';
    if (classification.includes('Safe')) dotColor = '#2F6FED';
    else if (classification.includes('Degraded')) dotColor = '#F5A524';
    else dotColor = '#EF4444';
    
    return (
      <span 
        className="w-2.5 h-2.5 rounded-full inline-block cursor-help transition-all duration-200 hover:scale-110" 
        style={{ backgroundColor: dotColor }}
        title={classification}
      />
    );
  };

  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-100 card-shadow flex flex-col justify-between h-full font-sans">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-50 text-[#22C55E]">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#1A2130]">Recent Allocations</h3>
              <p className="text-xs text-[#8A94A6]">Live stream of Hungarian optimal assignments</p>
            </div>
          </div>
          <span className="text-xs text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full font-sans">
            <span className="font-mono">{events.length}</span> Events
          </span>
        </div>

        {/* Live Feed List */}
        <div className="h-64 overflow-y-auto pr-1 space-y-2.5">
          {events.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
              <Radio className="w-8 h-8 mb-2 stroke-1 text-slate-300" />
              <p className="text-xs font-medium">Awaiting simulation events...</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Click "Start Simulation" in top navbar</p>
            </div>
          ) : (
            events.map((evt, idx) => {
              const {
                request_id,
                vehicle_type,
                priority,
                battery_id,
                suitability_score,
                classification,
                status,
              } = evt;

              const isServed = status === 'SERVED' && battery_id;

              return (
                <div
                  key={`${request_id}-${idx}`}
                  className={`p-3 rounded-xl border transition-all ${
                    idx === 0
                      ? 'bg-blue-50/40 border-blue-200 shadow-sm animate-slide-in'
                      : 'bg-slate-50/50 border-slate-100 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    
                    {/* Left block: vehicle_type & priority badge */}
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="text-slate-700 font-medium truncate max-w-[120px]" title={vehicle_type}>
                        {vehicle_type}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${getPriorityStyle(priority)}`}>
                        {priority}
                      </span>
                    </div>

                    {/* Right block: -> battery_id, score, classification dot */}
                    <div className="flex items-center gap-1.5 text-slate-500 font-sans">
                      {isServed ? (
                        <>
                          <span className="text-slate-400 font-sans">→</span>
                          <span className="font-bold text-[#2F6FED] font-mono">{battery_id}</span>
                          <span className="text-slate-400 text-[10px] pl-1">Score:</span>
                          <span className="font-bold text-emerald-600 font-mono">{suitability_score}</span>
                          {getClassificationDot(classification)}
                        </>
                      ) : (
                        <>
                          <span className="text-slate-400 font-sans">→</span>
                          <span className="text-[#EF4444]/80 font-medium text-[11px] font-sans">No eligible battery</span>
                        </>
                      )}
                    </div>
                    
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
