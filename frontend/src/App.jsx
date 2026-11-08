import React from 'react';
import { useLiveAllocations } from './hooks/useLiveAllocations';
import { Navbar } from './components/Navbar';
import { LiveStationOverview } from './components/LiveStationOverview';
import { FleetSnapshot } from './components/FleetSnapshot';
import { SuitabilityScoreDistribution } from './components/SuitabilityScoreDistribution';
import { RecentAllocations } from './components/RecentAllocations';
import { FleetHealthDonut } from './components/FleetHealthDonut';
import { AvgSuitabilityGauge } from './components/AvgSuitabilityGauge';
import { PriorityQueue } from './components/PriorityQueue';
import { BaselineVsOptimized } from './components/BaselineVsOptimized';
import { VerificationBar } from './components/VerificationBar';
import { LoadDatasetPanel } from './components/LoadDatasetPanel';

export default function App() {
  const {
    fleet,
    vehicles,
    metrics,
    verification,
    events,
    status,
    speed,
    runningTotals,
    uploadDataset,
    resetDataset,
    exportSnapshot,
    connectSimulation,
    disconnectSimulation,
    resetSimulation,
    changeSpeed,
  } = useLiveAllocations();

  return (
    <div className="min-h-screen bg-[#F4F6FA] text-[#1A2130] flex flex-col font-sans selection:bg-[#2F6FED]/20 selection:text-[#2F6FED]">
      
      {/* 1. TOP NAV BAR */}
      <Navbar
        status={status}
        speed={speed}
        onConnect={connectSimulation}
        onDisconnect={disconnectSimulation}
        onReset={resetSimulation}
        onSpeedChange={changeSpeed}
        totalEvents={vehicles.length}
        processedEvents={events.length}
      />

      {/* 1b. VERIFICATION BAR */}
      <VerificationBar verification={verification} />

      {/* 2. MAIN DASHBOARD CONTENT GRID */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        
        {/* DYNAMIC UPLOADER CONSOLE */}
        <LoadDatasetPanel
          uploadDataset={uploadDataset}
          resetDataset={resetDataset}
          exportSnapshot={exportSnapshot}
          isSimulating={status === 'CONNECTED' || status === 'CONNECTING'}
        />
        
        {/* ROW 1 — 2 Cards: Card A (40%) + Card B (60%) */}
        <section className="grid grid-cols-12 gap-6">
          <div className="col-span-12 lg:col-span-5">
            <LiveStationOverview 
              runningTotals={runningTotals}
              totalRequests={vehicles.length}
              status={status}
            />
          </div>
          <div className="col-span-12 lg:col-span-7">
            <FleetSnapshot 
              fleet={fleet}
              allocatedCount={runningTotals?.batteries_allocated || 0}
            />
          </div>
        </section>

        {/* ROW 2 — 3 Cards: Card C (Histogram) + Card D (Live Feed) + Card E (Fleet Donut) */}
        <section className="grid grid-cols-12 gap-6">
          <div className="col-span-12 lg:col-span-4">
            <SuitabilityScoreDistribution fleet={fleet} />
          </div>
          <div className="col-span-12 lg:col-span-4">
            <RecentAllocations events={events} />
          </div>
          <div className="col-span-12 lg:col-span-4">
            <FleetHealthDonut 
              fleet={fleet} 
              allocatedCount={runningTotals?.batteries_allocated || 0}
            />
          </div>
        </section>

        {/* ROW 3 — 3 Cards: Card F (Gauge) + Card G (Priority Queue) + Card H (Baseline vs Optimized) */}
        <section className="grid grid-cols-12 gap-6">
          <div className="col-span-12 lg:col-span-4">
            <AvgSuitabilityGauge 
              runningTotals={runningTotals}
              baselineAvgScore={metrics?.baseline?.avg_suitability_score_allocated || 63.6}
            />
          </div>
          <div className="col-span-12 lg:col-span-4">
            <PriorityQueue 
              events={events}
              totalRequests={vehicles.length}
              vehicleQueue={vehicles}
            />
          </div>
          <div className="col-span-12 lg:col-span-4">
            <BaselineVsOptimized 
              metrics={metrics}
              verification={verification}
            />
          </div>
        </section>

      </main>

      {/* FOOTER */}
      <footer className="bg-white border-t border-slate-200/80 py-4 px-6 mt-6">
        <div className="max-w-[1600px] mx-auto flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 font-mono gap-2">
          <div>
            Siemens Energy / IMECE India 2026 &ldquo;Brain Bolt&rdquo; Hackathon Submission
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <span>FastAPI + SciPy Hungarian Algorithm</span>
            <span>•</span>
            <span>{fleet.length} Battery Fleet / {vehicles.length} Vehicle Requests</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
