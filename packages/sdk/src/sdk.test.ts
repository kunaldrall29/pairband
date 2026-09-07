import assert from 'node:assert/strict';
import { test } from 'node:test';
import { assertManifestAllowsActions } from './index.js';

test('blocks unverified and preview manifests', () => {
  assert.throws(() =>
    assertManifestAllowsActions({
      schemaVersion: 2,
      mode: 'preview',
      verified: true,
      chainId: 5042002,
    }),
  );
  assert.throws(() =>
    assertManifestAllowsActions({
      schemaVersion: 2,
      mode: 'testnet',
      verified: false,
      chainId: 5042002,
    }),
  );
});

test('blocks null mainnet chainId', () => {
  assert.throws(() =>
    assertManifestAllowsActions({
      schemaVersion: 2,
      mode: 'mainnet',
      verified: true,
      chainId: null,
    }),
  );
});
