import React, { useState } from 'react';
import type { AccountConfig, AppSettings } from '../types/usage';
import { Settings, Trash2, Bell, RefreshCw, Power, X, Check, ShieldCheck } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  accounts: AccountConfig[];
  onSaveSettings: (settings: AppSettings) => Promise<void>;
  onDeleteAccount: (id: string) => Promise<void>;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  accounts,
  onSaveSettings,
  onDeleteAccount,
}) => {
  const [currentSettings, setCurrentSettings] = useState<AppSettings>(settings);
  const [activeTab, setActiveTab] = useState<'general' | 'accounts'>('general');
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSaveSettings(currentSettings);
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-md rounded-2xl bg-surface border border-surfaceBorder shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-surfaceBorder/80 bg-surfaceHover/30">
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4 text-blue-400" />
            <h3 className="text-xs font-semibold text-gray-100">Preferences</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-200 p-1 rounded-md transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex border-b border-surfaceBorder px-4 pt-2 gap-4 text-xs font-medium bg-surface">
          <button
            onClick={() => setActiveTab('general')}
            className={`pb-2 border-b-2 transition-all ${
              activeTab === 'general'
                ? 'border-blue-500 text-blue-400 font-semibold'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            General & Alerts
          </button>
          <button
            onClick={() => setActiveTab('accounts')}
            className={`pb-2 border-b-2 transition-all ${
              activeTab === 'accounts'
                ? 'border-blue-500 text-blue-400 font-semibold'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            Connected Accounts ({accounts.length})
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto space-y-4">
          {activeTab === 'general' ? (
            <div className="space-y-4">
              {/* Polling Interval */}
              <div>
                <label className="flex items-center gap-1.5 text-xs font-medium text-gray-200 mb-1.5">
                  <RefreshCw className="w-3.5 h-3.5 text-gray-400" />
                  Background Refresh Frequency
                </label>
                <select
                  value={currentSettings.poll_interval_minutes}
                  onChange={(e) =>
                    setCurrentSettings({
                      ...currentSettings,
                      poll_interval_minutes: Number(e.target.value),
                    })
                  }
                  className="w-full px-3 py-1.5 rounded-lg bg-surfaceBorder/40 border border-surfaceBorder focus:border-blue-500 text-xs text-gray-200 focus:outline-none"
                >
                  <option value={1}>Every 1 minute (Fast)</option>
                  <option value={3}>Every 3 minutes (Recommended)</option>
                  <option value={5}>Every 5 minutes</option>
                  <option value={15}>Every 15 minutes (Low network)</option>
                </select>
              </div>

              {/* Notification Toggles */}
              <div className="space-y-2.5 pt-2 border-t border-surfaceBorder/60">
                <label className="flex items-center gap-1.5 text-xs font-medium text-gray-200">
                  <Bell className="w-3.5 h-3.5 text-gray-400" />
                  Desktop Notifications
                </label>

                <label className="flex items-center justify-between p-2 rounded-lg bg-surfaceBorder/20 hover:bg-surfaceBorder/40 cursor-pointer transition-colors">
                  <span className="text-xs text-gray-300">Notify when session resets (100% capacity)</span>
                  <input
                    type="checkbox"
                    checked={currentSettings.notify_on_reset}
                    onChange={(e) =>
                      setCurrentSettings({
                        ...currentSettings,
                        notify_on_reset: e.target.checked,
                      })
                    }
                    className="rounded text-blue-600 focus:ring-0"
                  />
                </label>
              </div>

              {/* Startup & Keyring info */}
              <div className="space-y-2.5 pt-2 border-t border-surfaceBorder/60">
                <label className="flex items-center justify-between p-2 rounded-lg bg-surfaceBorder/20 hover:bg-surfaceBorder/40 cursor-pointer transition-colors">
                  <div className="flex items-center gap-1.5">
                    <Power className="w-3.5 h-3.5 text-gray-400" />
                    <span className="text-xs text-gray-300">Launch at System Login</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={currentSettings.launch_at_login}
                    onChange={(e) =>
                      setCurrentSettings({
                        ...currentSettings,
                        launch_at_login: e.target.checked,
                      })
                    }
                    className="rounded text-blue-600 focus:ring-0"
                  />
                </label>

                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-emerald-950/20 border border-emerald-800/30 text-[11px] text-emerald-300">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>
                    Your session keys are protected via native OS Keyring (Windows Credential Manager / macOS Keychain).
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {accounts.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-6">No accounts configured yet.</p>
              ) : (
                accounts.map((acc) => (
                  <div
                    key={acc.id}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-surfaceBorder/30 border border-surfaceBorder"
                  >
                    <div>
                      <p className="text-xs font-semibold text-gray-200">{acc.name}</p>
                      <p className="text-[10px] text-gray-400 font-mono">{acc.provider_type}</p>
                    </div>
                    <button
                      onClick={() => onDeleteAccount(acc.id)}
                      title="Remove Account"
                      className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-950/40 rounded transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-surfaceBorder/80 bg-surfaceHover/30 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg text-xs text-gray-400 hover:text-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <Check className="w-3.5 h-3.5" />
            {isSaving ? 'Saving...' : 'Apply Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};
