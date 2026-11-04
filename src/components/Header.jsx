import React from 'react';
import { Sliders, RotateCcw } from 'lucide-react';

const Header = ({
  activeView,
  setActiveView,
  scenario,
  selectScenario,
  apiLogsCount
}) => {
  return (
    <header className="sticky top-0 z-30 h-12 border-b border-white/[0.06] bg-[#08090C]/85 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-6 h-full flex items-center justify-between gap-4">
        {/* Left: Logo Mark */}
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-[#0F1117] border border-white/[0.06] flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-4 h-4">
              <line
                x1="12"
                y1="18.5"
                x2="20"
                y2="18.5"
                stroke="#9AA3B2"
                strokeWidth="1.75"
                strokeLinecap="round"
              />
              <path
                d="M4 6.5 L10 12.5 L15.5 18.5"
                fill="none"
                stroke="#38BDF8"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx="15.5" cy="18.5" r="2" fill="#38BDF8" />
            </svg>
          </div>
          <span className="font-semibold tracking-tight text-sm text-[#F2F4F8]">BidBounty</span>
          <span className="text-xs text-[#9AA3B2] hidden sm:inline">
            / Autonomous RFQ Terminal
          </span>
        </div>

        {/* Center: 3 Top-Level Navigation Tabs */}
        <nav className="flex items-center gap-1">
          {[
            { id: 'arena', label: 'Live Arena' },
            { id: 'studio', label: 'Merchant Studio (3)' },
            { id: 'logs', label: `PayPal API Logs${apiLogsCount ? ` (${apiLogsCount})` : ''}` }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveView(tab.id)}
              className={`relative px-3 py-1.5 rounded-md text-xs font-medium transition-colors duration-200 ${
                activeView === tab.id
                  ? 'text-[#F2F4F8] bg-[#0F1117]'
                  : 'text-[#9AA3B2] hover:text-[#F2F4F8]'
              }`}
            >
              {tab.label}
              {activeView === tab.id && (
                <span className="absolute bottom-0 left-2.5 right-2.5 h-[1.5px] bg-[#38BDF8] rounded-full" />
              )}
            </button>
          ))}
        </nav>

        {/* Right: Scenario Toggle */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-[#9AA3B2] hidden md:inline">Scenario:</span>
          <div className="inline-flex items-center rounded-lg bg-[#0F1117] p-0.5 border border-white/[0.06]">
            <button
              onClick={() => selectScenario('happy')}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                scenario === 'happy'
                  ? 'bg-[#38BDF8]/15 text-[#38BDF8]'
                  : 'text-[#9AA3B2] hover:text-[#F2F4F8]'
              }`}
            >
              Happy path
            </button>
            <span className="text-white/10 select-none">|</span>
            <button
              onClick={() => selectScenario('lowball')}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                scenario === 'lowball'
                  ? 'bg-[#F87171]/15 text-[#F87171]'
                  : 'text-[#9AA3B2] hover:text-[#F2F4F8]'
              }`}
            >
              Lowball
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
