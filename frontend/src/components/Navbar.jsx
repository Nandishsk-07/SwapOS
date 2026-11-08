import React from 'react';
import { 
  Zap, 
  Search, 
  Play, 
  Pause, 
  RotateCcw, 
  Sliders
} from 'lucide-react';

export function Navbar({ 
  status, 
  speed, 
  onConnect, 
  onDisconnect, 
  onReset, 
  onSpeedChange,
  totalEvents,
  processedEvents
}) {
  const isConnected = status === 'CONNECTED';
  const isCompleted = status === 'COMPLETED';

  return (
    <header className="sticky top-0 z-50 bg-[#0F1C2E] text-white shadow-md border-b border-slate-800">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        
        {/* Left: Branding & Hackathon Badge */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#2F6FED] to-[#22C55E] p-0.5 flex items-center justify-center shadow-lg shadow-[#2F6FED]/20">
            <div className="w-full h-full bg-[#0F1C2E] rounded-[10px] flex items-center justify-center">
              <Zap className="w-5 h-5 text-[#22C55E]" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold tracking-tight text-white font-sans">
                SwapOS — Battery Allocation Console
              </h1>
              <span className="hidden md:inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-[#2F6FED]/20 text-[#2F6FED] border border-[#2F6FED]/30 font-sans">
                Siemens Energy IMECE 2026
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden md:block font-sans">
              Real-Time Health Assessment & Hungarian Algorithm Dynamic Allocation
            </p>
          </div>
        </div>

        {/* Center: Search Bar */}
        <div className="hidden lg:flex items-center flex-1 max-w-md mx-4 font-sans">
          <div className="relative w-full">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-slate-400" />
            </div>
            <input
              type="text"
              placeholder="Search Battery ID, Vehicle Request ID, Chemistry..."
              className="block w-full pl-9 pr-4 py-1.5 text-xs bg-slate-800/80 border border-slate-700/80 rounded-xl text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2F6FED] focus:border-transparent transition-all font-sans"
            />
          </div>
        </div>

        {/* Right: Simulation Controls & Connection Status */}
        <div className="flex items-center gap-3 font-sans">
          
          {/* Speed Selector */}
          <div className="hidden sm:flex items-center bg-slate-800/90 rounded-xl p-1 border border-slate-700/60 font-sans">
            <Sliders className="w-3.5 h-3.5 text-slate-400 ml-2 mr-1" />
            <span className="text-[11px] font-medium text-slate-300 mr-1.5 font-sans">Interval:</span>
            {[
              { label: '0.5s', val: 0.5 },
              { label: '1.5s', val: 1.5 },
              { label: '3s', val: 3.0 },
            ].map((item) => (
              <button
                key={item.label}
                onClick={() => onSpeedChange(item.val)}
                className={`px-2 py-0.5 text-xs font-mono font-medium rounded-lg transition-all ${
                  speed === item.val
                    ? 'bg-[#2F6FED] text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Play / Pause / Reset Buttons */}
          <div className="flex items-center gap-1.5 font-sans">
            {!isConnected ? (
              <button
                onClick={() => onConnect(speed)}
                disabled={isCompleted}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-[#2F6FED] hover:bg-[#255bc4] text-white shadow-md shadow-[#2F6FED]/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-sans"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>{isCompleted ? 'Finished' : processedEvents > 0 ? 'Resume' : 'Start Simulation'}</span>
              </button>
            ) : (
              <button
                onClick={onDisconnect}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-amber-600 hover:bg-amber-700 text-white shadow-md transition-all font-sans"
              >
                <Pause className="w-3.5 h-3.5 fill-current" />
                <span>Pause</span>
              </button>
            )}

            <button
              onClick={onReset}
              title="Reset Simulation"
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/80 transition-all font-sans"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          {/* Connection Status Badge */}
          <div className="flex items-center gap-2 pl-2 border-l border-slate-700/80 font-sans">
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-sans font-medium border ${
              isConnected
                ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/80'
                : isCompleted
                ? 'bg-blue-950/60 text-blue-400 border-blue-800/80'
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}>
              <span className={`w-2 h-2 rounded-full ${
                isConnected
                  ? 'bg-emerald-400 live-pulse'
                  : isCompleted
                  ? 'bg-blue-400'
                  : 'bg-slate-500'
              }`} />
              <span className="font-sans text-[11px] tracking-wide">
                {isConnected ? 'WS LIVE' : isCompleted ? 'FINISHED' : status}
              </span>
            </div>
          </div>

        </div>

      </div>
    </header>
  );
}
