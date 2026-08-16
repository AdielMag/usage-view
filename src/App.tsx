import { useState, useEffect, useCallback } from 'react';
import type {
  AccountConfig,
  AccountUsageReport,
  AppSettings,
} from './types/usage';
import {
  fetchAllUsage,
  refreshUsage,
  fetchAccounts,
  deleteAccount,
  fetchSettings,
  saveSettings,
  autoConnectLocalSubscriptions,
  isTauri,
  hideWindow,
} from './lib/api';
import { Header } from './components/Header';
import { AccountCard } from './components/AccountCard';
import { SettingsModal } from './components/SettingsModal';
import { RefreshCw } from 'lucide-react';

export function App() {
  const [reports, setReports] = useState<AccountUsageReport[]>([]);
  const [accounts, setAccounts] = useState<AccountConfig[]>([]);
  const [settings, setSettings] = useState<AppSettings>({
    poll_interval_minutes: 3,
    notify_on_reset: true,
    notify_on_low_quota: true,
    low_quota_threshold_percent: 80,
    launch_at_login: false,
    dark_mode: true,
    auto_detect_cli: true,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>('Just now');

  const updateSyncTimestamp = () => {
    const d = new Date();
    setLastSyncTime(
      d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    );
  };

  // Initial load
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [allUsage, allAccounts, appSettings] = await Promise.all([
        fetchAllUsage(),
        fetchAccounts(),
        fetchSettings(),
      ]);

      setReports(allUsage);
      setAccounts(allAccounts);
      setSettings(appSettings);
      updateSyncTimestamp();
    } catch (err) {
      console.error('Failed to load usage:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleManualRefresh = async () => {
    setIsLoading(true);
    try {
      const refreshed = await refreshUsage();
      setReports(refreshed);
      updateSyncTimestamp();
    } catch (e) {
      console.error('Refresh error:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAutoConnectAll = async () => {
    setIsLoading(true);
    try {
      const updated = await autoConnectLocalSubscriptions();
      setReports(updated);
      const accs = await fetchAccounts();
      setAccounts(accs);
      updateSyncTimestamp();
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAccount = async (id: string) => {
    const updated = await deleteAccount(id);
    setAccounts(updated);
    const updatedReports = await fetchAllUsage();
    setReports(updatedReports);
  };

  const handleSaveSettings = async (newSettings: AppSettings) => {
    const saved = await saveSettings(newSettings);
    setSettings(saved);
  };

  // Keyboard shortcut listener (Esc to close tray)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isSettingsModalOpen) setIsSettingsModalOpen(false);
        else hideWindow();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSettingsModalOpen]);

  // Tauri Event Listeners
  useEffect(() => {
    loadData();

    if (!isTauri()) return;

    let unlistenUsage: (() => void) | null = null;
    let unlistenRefresh: (() => void) | null = null;

    import('@tauri-apps/api/event').then(({ listen }) => {
      listen<AccountUsageReport[]>('usage-updated', (event) => {
        setReports(event.payload);
        updateSyncTimestamp();
      }).then((unsub) => {
        unlistenUsage = unsub;
      });

      listen('trigger-refresh', () => {
        handleManualRefresh();
      }).then((unsub) => {
        unlistenRefresh = unsub;
      });
    });

    return () => {
      if (unlistenUsage) unlistenUsage();
      if (unlistenRefresh) unlistenRefresh();
    };
  }, [loadData]);

  return (
    <div className="w-full h-full flex flex-col bg-[#0b0e14] text-[#e6edf3] select-none overflow-hidden font-sans border border-white/[0.08] rounded-xl shadow-2xl">
      {/* Sleek 1-Tone Header */}
      <Header
        isLoading={isLoading}
        onRefresh={handleManualRefresh}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 p-2.5 overflow-y-auto space-y-2">
        {reports.length > 0 ? (
          <div>
            {reports.map((report) => (
              <AccountCard key={report.account_id} report={report} />
            ))}
          </div>
        ) : (
          /* 1-Tone Empty State */
          <div className="py-10 px-4 text-center flex flex-col items-center justify-center space-y-3">
            <p className="text-xs text-gray-400">No active subscriptions detected.</p>
            <button
              onClick={handleAutoConnectAll}
              disabled={isLoading}
              className="py-1.5 px-3 rounded-lg bg-white/10 hover:bg-white/15 text-white font-medium text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
              {isLoading ? 'Syncing...' : 'Sync Subscriptions'}
            </button>
          </div>
        )}
      </main>

      {/* Sleek 1-Tone Footer */}
      <footer className="px-3 py-1.5 border-t border-white/[0.06] bg-[#0e121a] flex items-center justify-between text-[10px] text-gray-400 font-mono">
        <span>synced {lastSyncTime}</span>
        <span>every {settings.poll_interval_minutes}m</span>
      </footer>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        settings={settings}
        accounts={accounts}
        onSaveSettings={handleSaveSettings}
        onDeleteAccount={handleDeleteAccount}
      />
    </div>
  );
}

export default App;
