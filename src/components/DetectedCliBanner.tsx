import React from 'react';
import type { DetectedCliAccount } from '../types/usage';
import { Sparkles, Terminal, Check } from 'lucide-react';

interface DetectedCliBannerProps {
  detected: DetectedCliAccount[];
  onImport: (account: DetectedCliAccount) => void;
}

export const DetectedCliBanner: React.FC<DetectedCliBannerProps> = ({ detected, onImport }) => {
  if (detected.length === 0) return null;

  return (
    <div className="mb-3 p-3 rounded-xl bg-gradient-to-r from-blue-950/40 via-purple-950/30 to-amber-950/40 border border-blue-500/30 shadow-md">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-300 mb-1.5">
        <Sparkles className="w-3.5 h-3.5 text-blue-400" />
        <span>Local Sessions Found</span>
      </div>
      <p className="text-[11px] text-gray-300 leading-snug mb-2.5">
        We detected local agent credentials on your machine. Connect them with 1-click:
      </p>

      <div className="space-y-1.5">
        {detected.map((item, idx) => (
          <div
            key={idx}
            className="flex items-center justify-between p-2 rounded-lg bg-surface/80 border border-white/5 text-xs"
          >
            <div className="flex items-center gap-2 min-w-0">
              <Terminal className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              <div className="truncate">
                <p className="text-gray-200 font-medium truncate">{item.detected_name}</p>
                <p className="text-[10px] text-gray-400 font-mono truncate">{item.path}</p>
              </div>
            </div>

            <button
              onClick={() => onImport(item)}
              className="shrink-0 ml-2 px-2.5 py-1 rounded-md bg-blue-600 hover:bg-blue-500 text-white font-medium text-[11px] flex items-center gap-1 transition-colors shadow-sm"
            >
              <Check className="w-3 h-3" />
              Connect
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
