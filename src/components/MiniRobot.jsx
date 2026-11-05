import React from 'react';
import { Crown } from 'lucide-react';

// Minimalist precision vector robot avatars + winner crown
export const MiniRobot = ({ variant = 'apex', state = 'idle' }) => {
  const isWinner = state === 'winner';
  const isFloor = state === 'floor';
  const isActive = state === 'bidding' || state === 'scanning';

  // Strict semantic palette: Cyan (#38BDF8) live, Gold (#F5B94A) winner, Red (#F87171) floor
  const strokeColor = isWinner
    ? '#F5B94A'
    : isFloor
    ? '#F87171'
    : isActive
    ? '#38BDF8'
    : '#9AA3B2';

  return (
    <div
      className={`bidbounty-robot relative w-10 h-10 rounded-lg flex items-center justify-center shrink-0 transition-colors duration-300 border ${
        isWinner
          ? 'bg-[#0F1117] border-[#F5B94A]/50'
          : isFloor
          ? 'bg-[#0F1117] border-[#F87171]/30'
          : isActive
          ? 'bg-[#0F1117] border-[#38BDF8]/35'
          : 'bg-[#0F1117] border-white/[0.06]'
      }`}
    >
      {isWinner && (
        <span className="bidbounty-crown absolute -top-2 -right-2 w-4 h-4 rounded-full bg-[#0F1117] border border-[#F5B94A]/60 flex items-center justify-center shadow-sm animate-crown-pop">
          <Crown className="w-2.5 h-2.5 text-[#F5B94A]" />
        </span>
      )}
      <svg viewBox="0 0 36 36" className="w-6 h-6">
        <line
          x1="18"
          y1="4"
          x2="18"
          y2="9"
          stroke={strokeColor}
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <circle cx="18" cy="3.5" r="1.5" fill={strokeColor} />

        <rect
          x="7"
          y="9"
          width="22"
          height="19"
          rx="5"
          fill="#08090C"
          stroke={strokeColor}
          strokeWidth="1.5"
        />

        <rect x="10.5" y="13" width="15" height="8" rx="2.5" fill="#0F1117" />

        {isFloor ? (
          <g stroke="#F87171" strokeWidth="1.4" strokeLinecap="round">
            <line x1="13" y1="15.5" x2="15.5" y2="18.5" />
            <line x1="15.5" y1="15.5" x2="13" y2="18.5" />
            <line x1="20.5" y1="15.5" x2="23" y2="18.5" />
            <line x1="23" y1="15.5" x2="20.5" y2="18.5" />
          </g>
        ) : isWinner ? (
          <g stroke="#F5B94A" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12.5 18 L14.2 15.5 L16 18" />
            <path d="M20 18 L21.8 15.5 L23.5 18" />
          </g>
        ) : variant === 'wave' ? (
          <line
            x1="13"
            y1="17"
            x2="23"
            y2="17"
            stroke={strokeColor}
            strokeWidth="2"
            strokeLinecap="round"
          />
        ) : variant === 'metro' ? (
          <g fill={strokeColor}>
            <rect x="13" y="15.5" width="2.5" height="2.5" rx="0.5" />
            <rect x="20.5" y="15.5" width="2.5" height="2.5" rx="0.5" />
          </g>
        ) : (
          <g fill={strokeColor}>
            <circle cx="14.2" cy="17" r="1.5" />
            <circle cx="21.8" cy="17" r="1.5" />
          </g>
        )}

        <line
          x1="15"
          y1="24"
          x2="21"
          y2="24"
          stroke={strokeColor}
          strokeWidth="1.2"
          strokeLinecap="round"
          opacity="0.6"
        />
      </svg>
    </div>
  );
};

export default MiniRobot;
