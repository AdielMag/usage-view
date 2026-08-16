pub mod claude;
pub mod antigravity;

use crate::models::{AccountConfig, AccountUsageReport, DetectedCliAccount, ProviderType};
use self::claude::ClaudeAdapter;
use self::antigravity::AntigravityAdapter;

pub struct AdapterRegistry;

impl AdapterRegistry {
    pub async fn fetch_usage_for_account(account: &AccountConfig) -> AccountUsageReport {
        match account.provider_type {
            ProviderType::ClaudeWeb | ProviderType::ClaudeApi | ProviderType::ClaudeCli => {
                ClaudeAdapter::fetch_usage(account).await
            }
            ProviderType::AntigravityApi | ProviderType::AntigravityCli | ProviderType::GeminiApi => {
                AntigravityAdapter::fetch_usage(account).await
            }
        }
    }

    pub fn scan_all_local_credentials() -> Vec<DetectedCliAccount> {
        let mut results = Vec::new();
        results.extend(ClaudeAdapter::detect_local_cli());
        results.extend(AntigravityAdapter::detect_local_cli());
        results
    }
}
