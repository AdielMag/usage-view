import type { AccountConfig, AccountUsageReport, AppSettings, DetectedCliAccount } from '../types/usage';

// Check if running inside Tauri desktop webview
export const isTauri = () => {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
};

// Fallback mock data when running standalone in browser development
const MOCK_REPORTS: AccountUsageReport[] = [
  {
    account_id: 'claude-pro-1',
    account_name: 'Claude Pro Subscription',
    provider_type: 'claude_web',
    is_connected: true,
    last_updated: Math.floor(Date.now() / 1000),
    primary_limit: {
      name: '5-Hour Rolling Limit',
      used: 32,
      total: 100,
      percentage: 32,
      unit: '%',
      resets_at: Math.floor(Date.now() / 1000) + 7540,
      reset_in_seconds: 7540,
      status: 'normal',
    },
    secondary_limits: [
      {
        name: 'Thinking Budget (Sonnet 3.7)',
        used: 18,
        total: 100,
        percentage: 18,
        unit: '%',
        resets_at: Math.floor(Date.now() / 1000) + 7540,
        reset_in_seconds: 7540,
        status: 'normal',
      },
    ],
    models: [
      {
        model_id: 'claude-3-7-sonnet',
        display_name: 'Claude 3.7 Sonnet (Thinking)',
        tokens_used: 142500,
        requests_used: 52,
      },
      {
        model_id: 'claude-3-5-sonnet',
        display_name: 'Claude 3.5 Sonnet',
        tokens_used: 320000,
        requests_used: 118,
      },
    ],
    error_message: null,
    tier_name: 'Claude Pro Subscription',
  },
  {
    account_id: 'antigravity-1',
    account_name: 'Antigravity Subscription',
    provider_type: 'antigravity_api',
    is_connected: true,
    last_updated: Math.floor(Date.now() / 1000),
    primary_limit: {
      name: 'Daily Request Allowance',
      used: 630,
      total: 1500,
      percentage: 42.0,
      unit: 'reqs',
      resets_at: Math.floor(Date.now() / 1000) + 14820,
      reset_in_seconds: 14820,
      status: 'normal',
    },
    secondary_limits: [
      {
        name: 'Thinking Token Pool',
        used: 420000,
        total: 1000000,
        percentage: 42.0,
        unit: 'tokens',
        resets_at: Math.floor(Date.now() / 1000) + 14820,
        reset_in_seconds: 14820,
        status: 'normal',
      },
      {
        name: 'Rate Limit (RPM)',
        used: 4,
        total: 15,
        percentage: 26.6,
        unit: 'RPM',
        resets_at: Math.floor(Date.now() / 1000) + 45,
        reset_in_seconds: 45,
        status: 'normal',
      },
    ],
    models: [
      {
        model_id: 'gemini-2.0-flash',
        display_name: 'Gemini 2.0 Flash (Antigravity)',
        tokens_used: 680000,
        requests_used: 412,
      },
      {
        model_id: 'gemini-2.0-pro-exp',
        display_name: 'Gemini 2.0 Pro Experimental',
        tokens_used: 245000,
        requests_used: 120,
      },
    ],
    error_message: null,
    tier_name: 'Antigravity Workspace',
  },
];

export async function fetchAllUsage(): Promise<AccountUsageReport[]> {
  if (isTauri()) {
    const { invoke } = await import('@tauri-apps/api/core');
    return invoke<AccountUsageReport[]>('get_all_usage');
  }
  return MOCK_REPORTS;
}

export async function refreshUsage(): Promise<AccountUsageReport[]> {
  if (isTauri()) {
    const { invoke } = await import('@tauri-apps/api/core');
    return invoke<AccountUsageReport[]>('refresh_usage');
  }
  return MOCK_REPORTS;
}

export async function autoConnectLocalSubscriptions(): Promise<AccountUsageReport[]> {
  if (isTauri()) {
    const { invoke } = await import('@tauri-apps/api/core');
    return invoke<AccountUsageReport[]>('auto_connect_local_subscriptions');
  }
  return MOCK_REPORTS;
}

export async function fetchAccounts(): Promise<AccountConfig[]> {
  if (isTauri()) {
    const { invoke } = await import('@tauri-apps/api/core');
    return invoke<AccountConfig[]>('get_accounts');
  }
  return [
    { id: 'claude-pro-1', name: 'Claude Pro Subscription', provider_type: 'claude_web', enabled: true },
    { id: 'antigravity-1', name: 'Antigravity Subscription', provider_type: 'antigravity_api', enabled: true },
  ];
}

export async function saveAccount(account: AccountConfig): Promise<AccountConfig[]> {
  if (isTauri()) {
    const { invoke } = await import('@tauri-apps/api/core');
    return invoke<AccountConfig[]>('save_account', { account });
  }
  return [account];
}

export async function deleteAccount(id: string): Promise<AccountConfig[]> {
  if (isTauri()) {
    const { invoke } = await import('@tauri-apps/api/core');
    return invoke<AccountConfig[]>('delete_account', { id });
  }
  return [];
}

export async function fetchSettings(): Promise<AppSettings> {
  if (isTauri()) {
    const { invoke } = await import('@tauri-apps/api/core');
    return invoke<AppSettings>('get_settings');
  }
  return {
    poll_interval_minutes: 3,
    notify_on_reset: true,
    notify_on_low_quota: true,
    low_quota_threshold_percent: 80,
    launch_at_login: false,
    dark_mode: true,
    auto_detect_cli: true,
  };
}

export async function saveSettings(settings: AppSettings): Promise<AppSettings> {
  if (isTauri()) {
    const { invoke } = await import('@tauri-apps/api/core');
    return invoke<AppSettings>('save_settings', { settings });
  }
  return settings;
}

export async function detectLocalCli(): Promise<DetectedCliAccount[]> {
  if (isTauri()) {
    const { invoke } = await import('@tauri-apps/api/core');
    return invoke<DetectedCliAccount[]>('detect_local_cli');
  }
  return [
    {
      provider_type: 'claude_cli',
      detected_name: 'Claude Code Subscription (~/.claude.json)',
      path: '~/.claude.json',
      has_credentials: true,
      preview_token: 'claude_oauth_active',
    },
    {
      provider_type: 'antigravity_cli',
      detected_name: 'Antigravity Session (~/.pi/agent/auth.json)',
      path: '~/.pi/agent/auth.json',
      has_credentials: true,
      preview_token: 'pi_antigravity_active',
    },
  ];
}

export async function hideWindow(): Promise<void> {
  if (isTauri()) {
    const { invoke } = await import('@tauri-apps/api/core');
    await invoke('hide_window');
  }
}

export async function openExternalUrl(url: string): Promise<void> {
  if (isTauri()) {
    const { invoke } = await import('@tauri-apps/api/core');
    await invoke('open_external_url', { url });
  } else {
    window.open(url, '_blank');
  }
}
