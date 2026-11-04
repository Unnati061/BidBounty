import React from 'react';

const DealToast = ({ showDealToast }) => {
  return (
    <div
      className={`fixed bottom-5 left-1/2 -translate-x-1/2 z-50 transition-all duration-400 pointer-events-none ${
        showDealToast ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}
      style={{ transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)' }}
    >
      <div className="px-5 py-2.5 rounded-full bg-[#0F1117]/95 backdrop-blur-md border border-white/[0.08] shadow-2xl flex items-center gap-3 text-xs">
        <span className="w-2 h-2 rounded-full bg-[#34D399]" />
        <span className="font-medium text-[#F2F4F8]">
          Deal locked · You saved <strong className="font-mono text-[#34D399] font-semibold">$27.50</strong>
        </span>
        <span className="text-white/15">·</span>
        <span className="font-mono text-[#9AA3B2]">
          Captured $223.50 / Released $16.50
        </span>
        <span className="text-white/15 hidden sm:inline">·</span>
        <span className="font-mono text-[#9AA3B2]/70 hidden sm:inline">
          SIM-SBX-443844607820
        </span>
      </div>
    </div>
  );
};

export default DealToast;
