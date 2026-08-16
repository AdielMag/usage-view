import React, { useState, useEffect } from 'react';

interface CountdownTimerProps {
  resetsAt: number | null;
  resetInSeconds: number | null;
}

export const CountdownTimer: React.FC<CountdownTimerProps> = ({
  resetsAt,
  resetInSeconds,
}) => {
  const [timeLeft, setTimeLeft] = useState<number>(() => {
    if (resetsAt) {
      const nowSec = Math.floor(Date.now() / 1000);
      return Math.max(0, resetsAt - nowSec);
    }
    return resetInSeconds || 0;
  });

  useEffect(() => {
    if (!resetsAt && !resetInSeconds) return;

    const interval = setInterval(() => {
      let remaining = 0;
      if (resetsAt) {
        const nowSec = Math.floor(Date.now() / 1000);
        remaining = Math.max(0, resetsAt - nowSec);
      } else if (resetInSeconds) {
        remaining = Math.max(0, resetInSeconds);
      }
      setTimeLeft(remaining);
    }, 1000);

    return () => clearInterval(interval);
  }, [resetsAt, resetInSeconds]);

  if (timeLeft <= 0) {
    return <span className="text-[10px] text-emerald-400 font-mono">100% ready</span>;
  }

  const days = Math.floor(timeLeft / 86400);
  const hours = Math.floor((timeLeft % 86400) / 3600);
  const minutes = Math.floor((timeLeft % 3600) / 60);

  const countdownText = [
    days > 0 ? `${days}d` : null,
    hours > 0 || days > 0 ? `${hours}h` : null,
    `${minutes}m`,
  ]
    .filter(Boolean)
    .join(' ');

  // Compute local clock time of reset (e.g. "2:00 AM" or "2:28 AM")
  let localClockStr: string | null = null;
  if (resetsAt) {
    try {
      const d = new Date(resetsAt * 1000);
      localClockStr = d.toLocaleTimeString([], {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      localClockStr = null;
    }
  }

  return (
    <span className="text-[10px] text-gray-400 font-mono tracking-tight">
      resets in <span className="text-gray-200 font-semibold">{countdownText}</span>
      {localClockStr && (
        <span className="text-gray-400/90 ml-1">({localClockStr})</span>
      )}
    </span>
  );
};
