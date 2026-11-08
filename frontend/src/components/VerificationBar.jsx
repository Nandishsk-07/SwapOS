import React, { useMemo } from 'react';
import { CheckCircle2, XCircle, ShieldCheck } from 'lucide-react';

export function VerificationBar({ verification = [] }) {
  const checksMap = {
    "No unsafe batteries allocated": {
      id: 'unsafe',
      label: 'Unsafe allocations = 0',
    },
    "No duplicate battery assignment": {
      id: 'duplicates',
      label: 'No duplicate batteries',
    },
    "No vehicle received multiple batteries": {
      id: 'multi-battery',
      label: 'No vehicle with >1 battery',
    },
    "All allocations meet minimum SoC": {
      id: 'min-soc',
      label: 'All allocations meet min SoC',
    }
  };

  const checks = useMemo(() => {
    // If no verification data is loaded yet, render empty placeholders in neutral state
    if (verification.length === 0) {
      return Object.entries(checksMap).map(([name, mapping]) => ({
        id: mapping.id,
        label: mapping.label,
        passed: true,
        detail: 'Awaiting checks...',
      }));
    }

    return verification.map(c => {
      const mapping = checksMap[c.name] || { id: c.name, label: c.name };
      return {
        id: mapping.id,
        label: mapping.label,
        passed: c.passed,
        detail: c.detail,
      };
    });
  }, [verification]);

  const allPassed = checks.length > 0 ? checks.every(c => c.passed) : true;

  return (
    <section className="bg-white border-b border-slate-200/80 shadow-2xs font-sans py-2.5 px-4 sm:px-6 lg:px-8">
      <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3">
        
        {/* Left: Summary Title */}
        <div className="flex items-center gap-2">
          <div className={`p-1 rounded-lg ${allPassed ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}>
            <ShieldCheck className="w-4 h-4" />
          </div>
          <span className="text-xs font-bold text-slate-700">
            Real-Time Allocation Constraint Guard:
          </span>
          <span className={`text-xs font-semibold ${allPassed ? 'text-emerald-600' : 'text-red-500'}`}>
            {allPassed ? 'All Constraints Verified' : 'Constraint Violation Detected'}
          </span>
        </div>

        {/* Right: The 4 PASS/FAIL pills */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {checks.map(check => (
            <div
              key={check.id}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all duration-300 ${
                check.passed
                  ? 'bg-emerald-50/50 text-emerald-700 border-emerald-200/60'
                  : 'bg-red-50/50 text-red-700 border-red-200/60 animate-pulse'
              }`}
              title={check.detail}
            >
              {check.passed ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-[#22C55E]" />
              ) : (
                <XCircle className="w-3.5 h-3.5 text-[#EF4444]" />
              )}
              <span>{check.label}</span>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
