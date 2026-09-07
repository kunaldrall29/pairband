import assert from 'node:assert/strict';
import { test } from 'node:test';
import { financialActionsAllowed, loadEnv } from './index.js';

test('defaults to preview mode', () => {
  const env = loadEnv({});
  assert.equal(env.PAIRBAND_MODE, 'preview');
  assert.equal(env.EMAIL_PROVIDER, 'disabled');
});

test('preview never allows financial actions', () => {
  assert.equal(financialActionsAllowed('preview', true), false);
  assert.equal(financialActionsAllowed('testnet', false), false);
  assert.equal(financialActionsAllowed('testnet', true), true);
  assert.equal(financialActionsAllowed('mainnet', false), false);
});
