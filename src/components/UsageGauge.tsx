import React from 'react';
import type { LimitStatus } from '../types/usage';

interface UsageGaugeProps {
  percentage: number;
  status: LimitStatus;
}

export const UsageGauge: React.FC<UsageGaugeProps> = ({
  percentage,
  status,
}) => {
  const clampedPct = Math.min(100, Math.max(0, percentage));

  // Determine color theme based on remaining quota %
  let strokeColor = '#10b981'; // Emerald (> 40% left)
  let glowColor = 'rgba(16, 185, 129, 0.4)';

  if (clampedPct <= 10 || status === 'exhausted') {
    strokeColor = '#f43f5e'; // Rose / Red (<= 10% left)
    glowColor = 'rgba(244, 63, 94, 0.5)';
  } else if (clampedPct <= 35 || status === 'warning') {
    strokeColor = '#f59e0b'; // Amber (10% - 35% left)
    glowColor = 'rgba(245, 158, 11, 0.4)';
  }

  const dimensions = 52;
  const strokeWidth = 4.5;
  const radius = (dimensions - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (clampedPct / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center" style={{ width: dimensions, height: dimensions }}>
      <svg className="w-full h-full transform -rotate-90" viewBox={`0 0 ${dimensions} ${dimensions}`}>
        {/* Background Track */}
        <circle
          cx={dimensions / 2}
          cy={dimensions / 2}
          r={radius}
          stroke="rgba(255, 255, 255, 0.08)"
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        {/* Progress Arc */}
        <circle
          cx={dimensions / 2}
          cy={dimensions / 2}
          r={radius}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="transparent"
          style={{
            filter: `drop-shadow(0 0 5px ${glowColor})`,
            transition: 'stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1), stroke 0.3s ease',
          }}
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center">
        <span className="text-[11px] font-mono font-bold text-white tracking-tight">
          {Math.round(clampedPct)}%
        </span>
      </div>
    </div>
  );
};
