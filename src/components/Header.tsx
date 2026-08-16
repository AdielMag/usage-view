import React from 'react';
import { RefreshCw, Settings, X } from 'lucide-react';
import { hideWindow } from '../lib/api';

interface HeaderProps {
  isLoading: boolean;
  onRefresh: () => void;
  onOpenSettings: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  isLoading,
  onRefresh,
  onOpenSettings,
}) => {
  return (
    <header
      data-tauri-drag-region
      className="flex items-center justify-between px-3.5 py-2.5 bg-[#0e121a] border-b border-white/[0.08] select-none cursor-grab active:cursor-grabbing"
    >
      <div data-tauri-drag-region className="flex items-center gap-2 pointer-events-none">
        <span className="text-xs font-semibold tracking-tight text-white">Usage</span>
      </div>

      <div className="flex items-center gap-1" onMouseDown={(e) => e.stopPropagation()}>
        <button
          onClick={onRefresh}
          disabled={isLoading}
          title="Refresh"
          className="p-1 text-gray-400 hover:text-white hover:bg-white/[0.08] rounded transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-white' : ''}`} />
        </button>

        <button
          onClick={onOpenSettings}
          title="Settings"
          className="p-1 text-gray-400 hover:text-white hover:bg-white/[0.08] rounded transition-colors"
        >
          <Settings className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={() => hideWindow()}
          title="Close"
          className="p-1 text-gray-400 hover:text-white hover:bg-white/[0.08] rounded transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </header>
  );
};
