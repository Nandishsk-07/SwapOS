import React, { useMemo } from 'react';
import { ListOrdered, Clock, ChevronRight, ShieldAlert } from 'lucide-react';

export function PriorityQueue({ events = [], totalRequests = 50, vehicleQueue = [] }) {
  const processedIds = useMemo(() => new Set(events.map(e => e.request_id)), [events]);
  const processedCount = events.length;

  // Pending requests: vehicles from the real queue that haven't been processed yet
  const pendingRequests = useMemo(() => {
    if (vehicleQueue.length > 0) {
      return vehicleQueue.filter(r => !processedIds.has(r.vehicle_id));
    }
    // If no vehicleQueue data yet, show a placeholder based on total - processed
    const remaining = totalRequests - processedCount;
    if (remaining <= 0) return [];
    return Array.from({ length: remaining }, (_, i) => ({
      vehicle_id: `REQ-${String(processedCount + i + 1).padStart(3, '0')}`,
      priority: 'Normal',
      vehicle_type: 'Pending...',
      min_acceptable_soc: '--',
    }));
  }, [vehicleQueue, processedIds, totalRequests, processedCount]);

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case 'Critical':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-50 text-[#EF4444] border border-red-200">Critical</span>;
      case 'High':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-[#F5A524] border border-amber-200">High</span>;
      case 'Normal':
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-[#2F6FED] border border-blue-200">Normal</span>;
    }
  };

  const getArrivalCountdownStr = (reqTimeStr) => {
    if (!reqTimeStr) return '--';
    
    // Current simulated time
    // If simulation hasn't started yet, use the first vehicle's arrival time as the baseline
    const currentSimTimeStr = events[0]?.timestamp || vehicleQueue[0]?.arrival_time;
    if (!currentSimTimeStr) return '--';
    
    const currentVal = new Date(currentSimTimeStr).getTime();
    const targetVal = new Date(reqTimeStr).getTime();
    
    const diffMs = targetVal - currentVal;
    const diffMin = Math.round(diffMs / 60000);
    
    if (diffMin < 0) {
      return 'Passed';
    } else if (diffMin === 0) {
      return 'Arriving now';
    } else {
      return `+${diffMin} min`;
    }
  };

  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-100 card-shadow flex flex-col justify-between h-full font-sans">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-[#2F6FED]/10 text-[#2F6FED]">
              <ListOrdered className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#1A2130]">Priority Demand Queue</h3>
              <p className="text-xs text-[#8A94A6]">Incoming vehicle requests &amp; prioritization</p>
            </div>
          </div>
          <span className="text-xs text-[#2F6FED] font-bold bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100 font-sans">
            <span className="font-mono">{pendingRequests.length}</span> Pending
          </span>
        </div>

        {/* Pending Requests Queue Feed */}
        <div className="h-64 overflow-y-auto pr-1 space-y-2">
          {pendingRequests.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 bg-emerald-50/50 rounded-xl border border-emerald-100 font-sans">
              <ShieldAlert className="w-8 h-8 text-emerald-500 mb-2" />
              <span className="text-xs font-bold text-emerald-800">Queue Fully Processed</span>
              <span className="text-[11px] text-emerald-600 mt-0.5">All <span className="font-mono">{totalRequests}</span> vehicle requests allocated</span>
            </div>
          ) : (
            pendingRequests.map((req, idx) => {
              const vehicleId = req.vehicle_id || req.id;
              const priority = req.priority || 'Normal';
              const vehicleType = req.vehicle_type || 'Unknown';

              return (
                <div
                  key={vehicleId}
                  className={`p-2.5 rounded-xl border transition-all flex items-center justify-between gap-2 text-xs font-sans ${
                    idx === 0
                      ? 'bg-gradient-to-r from-blue-50/80 to-indigo-50/80 border-[#2F6FED]/40 ring-1 ring-[#2F6FED]/20 shadow-xs'
                      : 'bg-slate-50/60 border-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 font-sans text-[11px] w-4">#{processedCount + idx + 1}</span>
                    <span className="font-bold text-slate-900 font-mono">{vehicleId}</span>
                    {getPriorityBadge(priority)}
                    <span className="text-slate-500 font-sans text-[11px] truncate max-w-[110px]" title={vehicleType}>
                      {vehicleType}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    {req.arrival_time && (
                      <span className="text-[11px] text-slate-500 font-sans">
                        Time: <strong className="text-slate-800 font-mono">{getArrivalCountdownStr(req.arrival_time)}</strong>
                      </span>
                    )}
                    {idx === 0 && (
                      <span className="flex items-center gap-0.5 text-[10px] font-bold text-[#2F6FED] bg-white px-2 py-0.5 rounded-md border border-blue-200 shadow-2xs font-sans">
                        NEXT <ChevronRight className="w-3 h-3" />
                      </span>
                    )}
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
