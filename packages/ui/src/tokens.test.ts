import assert from 'node:assert/strict';
import { test } from 'node:test';
import { tokens } from './index.js';

test('tokens include action color', () => {
  assert.equal(tokens.action, '#087F75');
});
