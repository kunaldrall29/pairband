import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  assertManifestAllowsActions,
  decodeQuoteResult,
  encodeBuyExactOutput,
  encodeSellExactInput,
  usdcPerWholeOption,
  wholeOptionsToRaw6,
} from './index.js';

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

test('encodes buy/sell builders with 6-decimal amounts', () => {
  const seriesId = ('0x' + '11'.repeat(32)) as `0x${string}`;
  const buy = encodeBuyExactOutput({
    seriesId,
    optionUnits: wholeOptionsToRaw6(1),
    maxUSDC6: wholeOptionsToRaw6(0.5),
    deadline: 1_700_000_000n,
  });
  assert.equal(buy.args[1], 1_000_000n);
  assert.equal(buy.args[2], 500_000n);

  const sell = encodeSellExactInput({
    seriesId,
    optionUnits: wholeOptionsToRaw6('2.5'),
    minUSDC6: 100_000n,
    deadline: 1_700_000_000n,
  });
  assert.equal(sell.args[1], 2_500_000n);
});

test('premium is USDC per option not FX spot', () => {
  // 0.12 USDC per whole option
  const premium = usdcPerWholeOption(120_000n, 1_000_000n);
  assert.ok(Math.abs(premium - 0.12) < 1e-12);
});

test('decodeQuoteResult reads ABI words after selector', () => {
  // fake selector + 5 words
  const sel = 'bcb8b8fb';
  const u = (n: bigint) => n.toString(16).padStart(64, '0');
  const hex =
    '0x' +
    sel +
    u(55_000n) +
    u(50_000n) +
    u(1n) +
    'ab'.repeat(32) +
    u(42n);
  const q = decodeQuoteResult(hex);
  assert.equal(q.usdc6, 55_000n);
  assert.equal(q.optionUnits6, 50_000n);
  assert.equal(q.isBuy, true);
  assert.equal(q.blockNumber, 42n);
});
