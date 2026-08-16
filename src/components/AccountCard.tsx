import React from 'react';
import type { AccountUsageReport } from '../types/usage';
import { CountdownTimer } from './CountdownTimer';
import { Sparkles, Terminal } from 'lucide-react';

interface AccountCardProps {
  report: AccountUsageReport;
}

export const AccountCard: React.FC<AccountCardProps> = ({ report }) => {
  const isClaude = report.provider_type.startsWith('claude');
  const primaryPct = Math.round(report.primary_limit.percentage);

  return (
    <div className="bg-[#12161f] border border-white/[0.08] rounded-xl overflow-hidden mb-2.5">
      {/* Account Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-[#161b26] border-b border-white/[0.06]">
        <div className="flex items-center gap-2 min-w-0">
          {isClaude ? (
            <Sparkles className="w-3.5 h-3.5 text-gray-300 shrink-0 stroke-[1.5]" />
          ) : (
            <Terminal className="w-3.5 h-3.5 text-gray-300 shrink-0 stroke-[1.5]" />
          )}
          <span className="text-xs font-semibold text-white tracking-tight truncate">
            {report.account_name}
          </span>
        </div>

        {report.tier_name && (
          <span className="text-[10px] text-gray-400 font-mono truncate max-w-[150px]">
            {report.tier_name}
          </span>
        )}
      </div>

      {/* Quota Rows */}
      <div className="p-3 space-y-3">
        {/* 5-Hour Session */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-300 font-medium text-[11px]">5-Hour Session</span>
            <div className="flex items-center gap-2">
              <CountdownTimer
                resetsAt={report.primary_limit.resets_at}
                resetInSeconds={report.primary_limit.reset_in_seconds}
              />
              <span className="font-mono font-bold text-white text-xs">
                {primaryPct}%
              </span>
            </div>
          </div>

          {/* Minimal 1-Tone Progress Bar */}
          <div className="w-full bg-white/[0.08] rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                primaryPct === 0 ? 'bg-white/10' : 'bg-white/90'
              }`}
              style={{ width: `${Math.min(100, Math.max(0, primaryPct))}%` }}
            />
          </div>
        </div>

        {/* Secondary Limits (Weekly, etc.) */}
        {report.secondary_limits.map((limit, idx) => {
          const secPct = Math.round(limit.percentage);
          return (
            <div key={idx} className="space-y-1.5 pt-1 border-t border-white/[0.04]">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-300 font-medium text-[11px]">{limit.name}</span>
                <div className="flex items-center gap-2">
                  {(limit.resets_at || limit.reset_in_seconds) && (
                    <CountdownTimer
                      resetsAt={limit.resets_at}
                      resetInSeconds={limit.reset_in_seconds}
                    />
                  )}
                  <span className="font-mono font-bold text-white text-xs">
                    {secPct}%
                  </span>
                </div>
              </div>

              {/* Minimal 1-Tone Progress Bar */}
              <div className="w-full bg-white/[0.08] rounded-full h-1.5 overflow-hidden">
                <div
                  className="h-full rounded-full bg-white/70 transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(0, secPct))}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
