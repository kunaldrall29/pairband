import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import {
  DEFAULT_STRIKE_PER_UNIT_6,
  DomainError,
  SeriesAccountingModel,
  educationalPayoffs,
  eurcDelivery6,
  formatRaw6,
  issuanceFee6,
  mintObligations,
  optionUnitsFromEurcExposure,
  parseWholeOptions,
  phaseAt,
  redeemPayout,
  usdcBacking6,
} from './index.js';

const fixturesPath = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../../docs/fixtures/accounting-vectors.json',
);
const fixtures = JSON.parse(readFileSync(fixturesPath, 'utf8')) as {
  largeExample: Record<string, string>;
  partialExercise: {
    mintUnits: string;
    exerciseUnits: string;
    writerClaims: { units: string; usdc6: string; eurc6: string }[];
  };
  dustExample: {
    mintUnits: string;
    exerciseUnits: string;
    claims: { units: string; usdc6: string; eurc6: string }[];
  };
  nonzeroFeeFixture: Record<string, number | string>;
  phaseBoundaries: {
    tradingStart: number;
    exerciseStart: number;
    exerciseEnd: number;
    expected: Record<string, string>;
  };
  payoffs: {
    spot: string;
    unprotectedUSDC: string;
    protectedAfterPremiumUSDC: string;
    longOnlyPnLUSDC: string;
    writerPnLUSDC: string;
  }[];
  distributedRoundingExample: {
    mintUnits: string;
    exerciseUnits: string;
    claims: { units: string; usdc6: string; eurc6: string }[];
  };
};

test('large example units', () => {
  const q = BigInt(fixtures.largeExample.optionUnits!);
  assert.equal(eurcDelivery6(q), BigInt(fixtures.largeExample.eurcDelivery6!));
  assert.equal(
    usdcBacking6(q, DEFAULT_STRIKE_PER_UNIT_6),
    BigInt(fixtures.largeExample.usdcBacking6!),
  );
  assert.equal(parseWholeOptions(fixtures.largeExample.wholeOptions!), q);
});

test('phase boundaries from fixtures', () => {
  const { tradingStart, exerciseStart, exerciseEnd, expected } = fixtures.phaseBoundaries;
  for (const [stamp, want] of Object.entries(expected)) {
    assert.equal(
      phaseAt(BigInt(stamp), BigInt(tradingStart), BigInt(exerciseStart), BigInt(exerciseEnd)),
      want,
    );
  }
});

test('nonzero fee fixture', () => {
  const q = BigInt(String(fixtures.nonzeroFeeFixture.optionUnits));
  const feeBps = Number(fixtures.nonzeroFeeFixture.feeBps);
  const m = mintObligations(q, DEFAULT_STRIKE_PER_UNIT_6, feeBps);
  assert.equal(m.collateral6, BigInt(String(fixtures.nonzeroFeeFixture.backing6)));
  assert.equal(m.fee6, BigInt(String(fixtures.nonzeroFeeFixture.fee6)));
  assert.equal(m.totalDebitBeforeGas6, BigInt(String(fixtures.nonzeroFeeFixture.totalDebitBeforeGas6)));
  assert.equal(issuanceFee6(m.collateral6, feeBps), m.fee6);
});

test('partial exercise redemption claims', () => {
  const W = BigInt(fixtures.partialExercise.mintUnits);
  const X = BigInt(fixtures.partialExercise.exerciseUnits);
  const U = (W - X) * DEFAULT_STRIKE_PER_UNIT_6;
  const E = X * 100n;
  let R = 0n;
  for (const row of fixtures.partialExercise.writerClaims) {
    const q = BigInt(row.units);
    const out = redeemPayout(W, U, E, R, q);
    assert.equal(out.usdc6, BigInt(row.usdc6));
    assert.equal(out.eurc6, BigInt(row.eurc6));
    R = out.nextR;
  }
});

test('dust and distributed rounding fixtures', () => {
  for (const key of ['dustExample', 'distributedRoundingExample'] as const) {
    const x = fixtures[key];
    const W = BigInt(x.mintUnits);
    const X = BigInt(x.exerciseUnits);
    const U = (W - X) * DEFAULT_STRIKE_PER_UNIT_6;
    const E = X * 100n;
    let R = 0n;
    let sumU = 0n;
    let sumE = 0n;
    for (const row of x.claims) {
      const out = redeemPayout(W, U, E, R, BigInt(row.units));
      assert.equal(out.usdc6, BigInt(row.usdc6));
      assert.equal(out.eurc6, BigInt(row.eurc6));
      sumU += out.usdc6;
      sumE += out.eurc6;
      R = out.nextR;
    }
    assert.equal(sumU, U);
    assert.equal(sumE, E);
  }
});

test('educational payoffs match fixture table', () => {
  for (const row of fixtures.payoffs) {
    const out = educationalPayoffs({
      exposureEurc: 10_000n,
      strikeUsdcPerEurc: '1.10',
      premiumUsdc: 200n,
      spotUsdcPerEurc: row.spot,
    });
    assert.equal(out.unprotectedUsdc, BigInt(row.unprotectedUSDC));
    assert.equal(out.protectedAfterPremiumUsdc, BigInt(row.protectedAfterPremiumUSDC));
    assert.equal(out.longOnlyPnLUsdc, BigInt(row.longOnlyPnLUSDC));
    assert.equal(out.writerPnLUsdc, BigInt(row.writerPnLUSDC));
  }
});

test('missed exercise zeroes option component', () => {
  const out = educationalPayoffs({
    exposureEurc: 10_000n,
    strikeUsdcPerEurc: '1.10',
    premiumUsdc: 200n,
    spotUsdcPerEurc: '1.00',
    missedExercise: true,
  });
  assert.equal(out.longOnlyPnLUsdc, -200n);
  assert.equal(out.protectedAfterPremiumUsdc, 9_800n);
});

test('EURC exposure conversion and finer precision remainder', () => {
  const exact = optionUnitsFromEurcExposure('10000');
  assert.equal(exact.optionUnits, 100_000_000n);
  const fine = optionUnitsFromEurcExposure('10000.00001');
  assert.equal(fine.rejectedFinerPrecision, true);
  assert.equal(fine.optionUnits, 100_000_000n);
  assert.ok(fine.unprotectedRemainder6 > 0n);
});

test('rejects excess option quantity precision', () => {
  assert.throws(() => parseWholeOptions('1.0000001'), DomainError);
});

test('independent model conserves through mint/exercise/redeem', () => {
  const model = new SeriesAccountingModel(DEFAULT_STRIKE_PER_UNIT_6, 10n ** 12n, 10);
  model.mint(1_000_000n);
  model.noteDonation('USDC', 999n);
  model.exercise(400_000n);
  assert.equal(model.accountedUsdc6, 66_000_000n);
  assert.equal(model.accountedEurc6, 40_000_000n);
  const a = model.redeem(250_000n);
  const b = model.redeem(750_000n);
  assert.equal(a.usdc6 + b.usdc6, 66_000_000n);
  assert.equal(a.eurc6 + b.eurc6, 40_000_000n);
  assert.equal(model.accountedUsdc6, 0n);
  assert.equal(model.accountedEurc6, 0n);
  assert.equal(model.feePaid6, 110_000n);
});

test('formatRaw6', () => {
  assert.equal(formatRaw6(11_000_000_000n), '11000');
  assert.equal(formatRaw6(110_000n), '0.11');
});
