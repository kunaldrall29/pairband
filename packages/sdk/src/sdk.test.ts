import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  assertManifestAllowsActions,
  assertLpInventorySeparateFromBacking,
  buildCollectFeesPlan,
  buildDecreaseLiquidityPlan,
  buildMintPositionPlan,
  decodeQuoteResult,
  encodeBuyExactOutput,
  encodeSellExactInput,
  encodeVaultExercise,
  encodeVaultMint,
  encodeVaultRedeem,
  POSM_ACTIONS,
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

  const mint = encodeVaultMint(1_000_000n);
  assert.equal(mint.signature, 'mint(uint256)');
  assert.equal(mint.args[0], 1_000_000n);
  assert.equal(encodeVaultExercise(2n).args[0], 2n);
  assert.equal(encodeVaultRedeem(3n).args[0], 3n);
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

test('POSM Action planner builders', () => {
  const poolKey = {
    currency0: ('0x' + '11'.repeat(20)) as `0x${string}`,
    currency1: ('0x' + '22'.repeat(20)) as `0x${string}`,
    fee: 3000,
    tickSpacing: 60,
    hooks: ('0x' + '33'.repeat(20)) as `0x${string}`,
  };
  const mint = buildMintPositionPlan({
    poolKey,
    tickLower: -60,
    tickUpper: 60,
    liquidity: 1_000_000n,
    amount0Max: 10n ** 18n,
    amount1Max: 10n ** 18n,
    owner: ('0x' + '44'.repeat(20)) as `0x${string}`,
  });
  assert.deepEqual(mint.actions, [
    POSM_ACTIONS.MINT_POSITION,
    POSM_ACTIONS.CLOSE_CURRENCY,
    POSM_ACTIONS.CLOSE_CURRENCY,
  ]);
  const dec = buildDecreaseLiquidityPlan({
    tokenId: 1n,
    liquidity: 500n,
    amount0Min: 0n,
    amount1Min: 0n,
    currency0: poolKey.currency0,
    currency1: poolKey.currency1,
  });
  assert.equal(dec.actions[0], POSM_ACTIONS.DECREASE_LIQUIDITY);
  const collect = buildCollectFeesPlan({
    tokenId: 1n,
    currency0: poolKey.currency0,
    currency1: poolKey.currency1,
  });
  assert.equal(collect.decreaseParams.liquidity, 0n);
  assertLpInventorySeparateFromBacking({
    vaultAccountedUSDC6: 11_000_000_000n,
    makerFreeUSDC6: 1_000_000n,
    makerFreeOptions6: 500_000n,
    writerReceipt6: 100_000_000n,
  });
});
