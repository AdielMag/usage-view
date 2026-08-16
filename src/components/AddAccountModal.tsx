import React, { useState } from 'react';
import type { AccountConfig, ProviderType } from '../types/usage';
import { Sparkles, Bot, Globe, X, Check, ExternalLink, HelpCircle } from 'lucide-react';
import { openExternalUrl } from '../lib/api';

interface AddAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (account: AccountConfig) => Promise<void>;
}

export const AddAccountModal: React.FC<AddAccountModalProps> = ({
  isOpen,
  onClose,
  onSave,
}) => {
  const [providerGroup, setProviderGroup] = useState<'claude' | 'antigravity'>('claude');
  const [name, setName] = useState('');
  const [token, setToken] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  if (!isOpen) return null;

  const handleOpenBrowserLogin = () => {
    if (providerGroup === 'claude') {
      openExternalUrl('https://claude.ai');
    } else {
      openExternalUrl('https://aistudio.google.com');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token.trim()) return;

    setIsSubmitting(true);
    const provider_type: ProviderType =
      providerGroup === 'claude' ? 'claude_web' : 'antigravity_api';

    const defaultName =
      name.trim() ||
      (providerGroup === 'claude' ? 'Claude Pro Subscription' : 'Antigravity Workspace');

    const newAccount: AccountConfig = {
      id: `${providerGroup}-${Date.now()}`,
      name: defaultName,
      provider_type,
      enabled: true,
      token: token.trim(),
    };

    try {
      await onSave(newAccount);
      onClose();
      setName('');
      setToken('');
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-sm rounded-2xl bg-[#161b22] border border-[#30363d] shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#30363d] bg-[#21262d]/50">
          <h3 className="text-xs font-semibold text-gray-100 flex items-center gap-1.5">
            Connect AI Subscription Plan
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-200 p-1 rounded-md transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-4 space-y-3.5 overflow-y-auto">
          {/* Provider Selector Tabs */}
          <div>
            <label className="block text-[11px] font-medium text-gray-400 mb-1.5">Subscription Plan</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setProviderGroup('claude')}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-xs font-semibold transition-all ${
                  providerGroup === 'claude'
                    ? 'bg-amber-500/15 border-amber-500/60 text-amber-300 shadow-sm'
                    : 'bg-[#21262d]/60 border-transparent text-gray-400 hover:text-gray-200'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Claude Pro / Team
              </button>

              <button
                type="button"
                onClick={() => setProviderGroup('antigravity')}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-xs font-semibold transition-all ${
                  providerGroup === 'antigravity'
                    ? 'bg-blue-500/15 border-blue-500/60 text-blue-300 shadow-sm'
                    : 'bg-[#21262d]/60 border-transparent text-gray-400 hover:text-gray-200'
                }`}
              >
                <Bot className="w-3.5 h-3.5 text-blue-400" />
                Antigravity / Gemini
              </button>
            </div>
          </div>

          {/* 1-Click Launch Browser Helper Card */}
          <div className="p-3 rounded-xl bg-[#21262d]/60 border border-[#30363d] space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-gray-200 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-blue-400" />
                Step 1: Open in Browser
              </span>
              <button
                type="button"
                onClick={handleOpenBrowserLogin}
                className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium text-[11px] flex items-center gap-1.5 transition-colors shadow-sm"
              >
                <ExternalLink className="w-3 h-3" />
                {providerGroup === 'claude' ? 'Open Claude.ai' : 'Open Antigravity'}
              </button>
            </div>

            <div className="text-[11px] text-gray-300 space-y-1 bg-[#0d1117]/80 p-2.5 rounded-lg border border-white/5 font-sans">
              {providerGroup === 'claude' ? (
                <>
                  <p className="font-medium text-amber-300">How to get your Claude Subscription Key:</p>
                  <ol className="list-decimal list-inside space-y-0.5 text-[10px] text-gray-300">
                    <li>Log in to <strong>Claude.ai</strong> with your account.</li>
                    <li>Press <kbd className="bg-[#21262d] px-1 rounded">F12</kbd> (or right-click &gt; Inspect).</li>
                    <li>Click <strong>Application</strong> &gt; <strong>Cookies</strong> &gt; <code>https://claude.ai</code>.</li>
                    <li>Copy the value of <code className="text-amber-400">sessionKey</code> (starts with <code>sk-ant-sid01-...</code>).</li>
                  </ol>
                </>
              ) : (
                <>
                  <p className="font-medium text-blue-300">How to get your Antigravity / Gemini Key:</p>
                  <ol className="list-decimal list-inside space-y-0.5 text-[10px] text-gray-300">
                    <li>Log in to <strong>Google AI Studio</strong> with your account.</li>
                    <li>Click <strong>Get API key</strong> &gt; <strong>Create API key</strong>.</li>
                    <li>Copy the key and paste it below.</li>
                  </ol>
                </>
              )}
            </div>
          </div>

          {/* Account Label */}
          <div>
            <label className="block text-[11px] font-medium text-gray-400 mb-1">
              Account Name (Optional)
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={providerGroup === 'claude' ? 'e.g. My Claude Pro' : 'e.g. Antigravity Quota'}
              className="w-full px-3 py-1.5 rounded-lg bg-[#0d1117] border border-[#30363d] focus:border-blue-500 focus:outline-none text-xs text-gray-100 placeholder-gray-500"
            />
          </div>

          {/* Token / Key Input */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-semibold text-gray-200">
                Step 2: Paste Subscription Session Key
              </label>
              <button
                type="button"
                onClick={() => setShowHelp(!showHelp)}
                className="text-[10px] text-blue-400 hover:underline flex items-center gap-0.5"
              >
                <HelpCircle className="w-3 h-3" />
                Help
              </button>
            </div>

            <textarea
              required
              rows={3}
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder={
                providerGroup === 'claude'
                  ? 'Paste sessionKey (sk-ant-sid01-...)'
                  : 'Paste Antigravity / Gemini token'
              }
              className="w-full px-3 py-2 rounded-lg bg-[#0d1117] border border-[#30363d] focus:border-blue-500 focus:outline-none text-xs text-gray-100 font-mono placeholder-gray-500 resize-none"
            />

            {showHelp && (
              <div className="mt-1.5 p-2 rounded-lg bg-blue-950/40 border border-blue-800/30 text-[10px] text-blue-200 leading-relaxed">
                <p>Your subscription session key allows Usage View to display your rolling 5-hour limit, message usage percentage, and countdown timer until your next quota reset.</p>
              </div>
            )}
          </div>

          {/* Footer Submit */}
          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg text-xs text-gray-400 hover:text-gray-200 hover:bg-[#21262d] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !token.trim()}
              className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium text-xs flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <Check className="w-3.5 h-3.5" />
              {isSubmitting ? 'Connecting...' : 'Connect Subscription'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
