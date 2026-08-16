export type ProviderType =
  | 'claude_web'
  | 'claude_api'
  | 'claude_cli'
  | 'antigravity_api'
  | 'antigravity_cli'
  | 'gemini_api';

export type LimitStatus = 'normal' | 'warning' | 'exhausted' | 'unknown';

export interface SessionLimit {
  name: string;
  used: number;
  total: number;
  percentage: number;
  unit: string;
  resets_at: number | null;
  reset_in_seconds: number | null;
  status: LimitStatus;
}

export interface ModelUsage {
  model_id: string;
  display_name: string;
  tokens_used: number;
  requests_used: number;
}

export interface AccountUsageReport {
  account_id: string;
  account_name: string;
  provider_type: ProviderType;
  is_connected: boolean;
  last_updated: number;
  primary_limit: SessionLimit;
  secondary_limits: SessionLimit[];
  models: ModelUsage[];
  error_message: string | null;
  tier_name: string | null;
}

export interface AccountConfig {
  id: string;
  name: string;
  provider_type: ProviderType;
  enabled: boolean;
  token?: string;
  org_id?: string;
  custom_endpoint?: string;
}

export interface AppSettings {
  poll_interval_minutes: number;
  notify_on_reset: boolean;
  notify_on_low_quota: boolean;
  low_quota_threshold_percent: number;
  launch_at_login: boolean;
  dark_mode: boolean;
  auto_detect_cli: boolean;
}

export interface DetectedCliAccount {
  provider_type: ProviderType;
  detected_name: string;
  path: string;
  has_credentials: boolean;
  preview_token?: string;
}
