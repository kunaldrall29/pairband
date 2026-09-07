import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  DEFAULT_STRIKE_PER_UNIT_6,
  eurcDelivery6,
  phaseAt,
  usdcBacking6,
} from './index.js';

test('100 whole options cover 10_000 EURC and 11_000 USDC at strike 1.10', () => {
  const q = 100_000_000n;
  assert.equal(eurcDelivery6(q), 10_000_000_000n);
  assert.equal(usdcBacking6(q, DEFAULT_STRIKE_PER_UNIT_6), 11_000_000_000n);
});

test('phase boundaries', () => {
  assert.equal(phaseAt(999n, 1000n, 2000n, 3000n), 'scheduled');
  assert.equal(phaseAt(1000n, 1000n, 2000n, 3000n), 'trading');
  assert.equal(phaseAt(2000n, 1000n, 2000n, 3000n), 'exercise');
  assert.equal(phaseAt(3000n, 1000n, 2000n, 3000n), 'matured');
});
