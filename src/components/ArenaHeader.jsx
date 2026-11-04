import React from 'react';
import OdometerPrice from './OdometerPrice';

const ArenaHeader = ({
  lowestBid,
  marketAvg,
  displaySavings,
  timeLeft,
  phase,
  timeWarpMode,
  setTimeWarpMode,
  settlementStep,
  maxSpendCap
}) => {
  // Circular SVG Countdown Ring Geometry
  const ringRadius = 18;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringDashoffset = ringCircumference * (1 - timeLeft / 15.0);

  return (
    <div className="py-5 border-b border-white/[0.06] flex flex-col lg:flex-row lg:items-center justify-between gap-6">
      {/* Left Group: 56px Best Live Bid & 40px Buyer Savings */}
      <div className="flex flex-wrap items-end gap-10">
        <div>
          <span className="block ui-label mb-1.5">Best Live Bid</span>
          <div className="flex items-baseline gap-2.5">
            <OdometerPrice
              value={lowestBid}
              className="text-[56px] leading-none font-semibold text-[#F2F4F8]"
            />
            {lowestBid < marketAvg && (
              <span className="text-xs font-mono text-[#34D399]">
                -{(((marketAvg - lowestBid) / marketAvg) * 100).toFixed(1)}%
              </span>
            )}
          </div>
        </div>

        <div className="pb-0.5">
          <span className="block ui-label mb-1.5">Buyer Savings</span>
          <div className="flex items-baseline gap-2">
            <OdometerPrice
              value={displaySavings}
              className={`text-[40px] leading-none font-semibold ${
                displaySavings > 0 ? 'text-[#34D399]' : 'text-[#9AA3B2]/40'
              }`}
            />
          </div>
        </div>
      </div>

      {/* Right Group: Timer Ring + Round 1 Chip + PayPal Stepper */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
        {/* Circular Countdown Ring + Round 1 Chip + 15s Time-Warp Toggle */}
        <div className="flex items-center gap-3">
          <div className="relative w-12 h-12 flex items-center justify-center shrink-0">
            <svg className="w-12 h-12 -rotate-90" viewBox="0 0 44 44">
              <circle
                cx="22"
                cy="22"
                r={ringRadius}
                fill="none"
                stroke="rgba(255,255,255,0.06)"
                strokeWidth="2.5"
              />
              <circle
                cx="22"
                cy="22"
                r={ringRadius}
                fill="none"
                stroke={
                  phase === 'voided'
                    ? '#F87171'
                    : phase === 'captured'
                    ? '#34D399'
                    : '#38BDF8'
                }
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeDasharray={ringCircumference}
                strokeDashoffset={ringDashoffset}
                style={{
                  transition: 'stroke-dashoffset 60ms linear, stroke 300ms ease'
                }}
              />
            </svg>
            <span className="absolute font-mono text-xs font-medium text-[#F2F4F8]">
              {timeLeft.toFixed(1)}s
            </span>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 rounded bg-[#0F1117] border border-white/[0.06] text-[11px] font-medium text-[#F2F4F8]">
                Round 1
              </span>
              <span className="ui-label">Auction Window</span>
            </div>
            <button
              onClick={() => setTimeWarpMode(!timeWarpMode)}
              className="inline-flex items-center gap-1.5 text-xs text-[#9AA3B2] hover:text-[#F2F4F8] transition-colors"
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  timeWarpMode ? 'bg-[#38BDF8]' : 'bg-[#9AA3B2]/40'
                }`}
              />
              <span>Window: 15s Demo Time-Warp</span>
            </button>
          </div>
        </div>

        {/* Large High-Contrast Three-Step PayPal Settlement Stepper */}
        <div className="px-4 py-3 rounded-xl bg-[#0F1117] border border-white/[0.06] flex items-center gap-3">
          {[
            { step: 1, title: 'Authorize', amount: `$${maxSpendCap.toFixed(2)}` },
            { step: 2, title: 'Capture', amount: '$223.50' },
            { step: 3, title: 'Release', amount: '$16.50' }
          ].map((item, i) => {
            const done = settlementStep >= item.step;
            return (
              <React.Fragment key={item.step}>
                <div className="flex items-center gap-2">
                  <span
                    className={`w-5 h-5 rounded-full flex items-center justify-center border transition-all duration-300 ${
                      done
                        ? 'border-[#34D399] bg-[#34D399]/15 text-[#34D399]'
                        : 'border-white/15 bg-[#08090C] text-transparent'
                    }`}
                  >
                    {done && (
                      <svg viewBox="0 0 12 12" className="w-3 h-3">
                        <path
                          d="M2.5 6.2 L5 8.6 L9.5 3.5"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="animate-check-draw"
                        />
                      </svg>
                    )}
                  </span>
                  <div className="leading-tight">
                    <span
                      className={`block text-xs font-medium ${
                        done ? 'text-[#F2F4F8]' : 'text-[#9AA3B2]'
                      }`}
                    >
                      {item.title}
                    </span>
                    <span
                      className={`block text-xs font-mono ${
                        done ? 'text-[#34D399] font-semibold' : 'text-[#9AA3B2]/60'
                      }`}
                    >
                      {item.amount}
                    </span>
                  </div>
                </div>
                {i < 2 && <span className="text-[#9AA3B2]/40 font-mono text-xs">→</span>}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ArenaHeader;
