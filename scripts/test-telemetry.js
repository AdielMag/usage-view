import assert from 'node:assert';

console.log('🧪 Starting Usage View Telemetry Test Suite...\n');

// 1. Test Percentage Math & Status Classification
function computeLimitStatus(percentage) {
  if (percentage >= 95.0) return 'exhausted';
  if (percentage >= 75.0) return 'warning';
  return 'normal';
}

function clampPercentage(used, total) {
  if (total <= 0) return 0;
  return Math.min(100, Math.max(0, (used / total) * 100));
}

// 2. Test Live Countdown Formatting
function formatCountdown(seconds) {
  if (seconds <= 0) return 'Reset Complete (100% Ready)';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return [h > 0 ? `${h}h` : null, `${m}m`, `${s.toString().padStart(2, '0')}s`]
    .filter(Boolean)
    .join(' ');
}

// 3. Test Rate Limit Threshold Notifications
function shouldTriggerResetAlert(previousStatus, currentStatus) {
  return (
    (previousStatus === 'exhausted' || previousStatus === 'warning') &&
    currentStatus === 'normal'
  );
}

function shouldTriggerQuotaWarning(percentage, threshold = 80) {
  return percentage >= threshold;
}

// Run Test Cases
console.log('Testing Percentage Clamping & Math...');
assert.strictEqual(clampPercentage(34, 100), 34);
assert.strictEqual(clampPercentage(150, 100), 100);
assert.strictEqual(clampPercentage(-10, 100), 0);
assert.strictEqual(clampPercentage(0, 0), 0);
console.log('✓ Percentage clamping passed');

console.log('Testing Status Classifications...');
assert.strictEqual(computeLimitStatus(45), 'normal');
assert.strictEqual(computeLimitStatus(75), 'warning');
assert.strictEqual(computeLimitStatus(88), 'warning');
assert.strictEqual(computeLimitStatus(95), 'exhausted');
assert.strictEqual(computeLimitStatus(99), 'exhausted');
console.log('✓ Status classifications passed');

console.log('Testing Countdown Timer Formatting...');
assert.strictEqual(formatCountdown(0), 'Reset Complete (100% Ready)');
assert.strictEqual(formatCountdown(45), '0m 45s');
assert.strictEqual(formatCountdown(125), '2m 05s');
assert.strictEqual(formatCountdown(3665), '1h 1m 05s');
console.log('✓ Countdown timer formatting passed');

console.log('Testing Notification Triggers...');
assert.strictEqual(shouldTriggerResetAlert('exhausted', 'normal'), true);
assert.strictEqual(shouldTriggerResetAlert('warning', 'normal'), true);
assert.strictEqual(shouldTriggerResetAlert('normal', 'normal'), false);
assert.strictEqual(shouldTriggerQuotaWarning(85, 80), true);
assert.strictEqual(shouldTriggerQuotaWarning(72, 80), false);
console.log('✓ Notification triggers passed');

console.log('\n🎉 All 15 telemetry assertions passed successfully!');
