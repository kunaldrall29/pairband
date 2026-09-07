"""Validate the proposed reference model and fixtures; not deployed-contract tests."""
import json
from pathlib import Path
from decimal import Decimal
from random import Random

base = Path(__file__).resolve().parent
fixture = base / 'accounting-vectors.json'
f = json.loads(fixture.read_text())
A = int(f['units']['underlyingPerUnit6'])
C = int(f['units']['strikePerUnit6'])
large = f['largeExample']
q = int(large['optionUnits'])
assert q * A == int(large['eurcDelivery6'])
assert q * C == int(large['usdcBacking6'])
assert Decimal(q) / 10**6 == Decimal(large['wholeOptions'])

def payouts(W, U, E, quantities):
    R = 0
    result = []
    for q in quantities:
        assert q > 0 and R + q <= W
        result.append(((R + q) * U // W - R * U // W, (R + q) * E // W - R * E // W))
        R += q
    return result

for key in ['partialExercise', 'dustExample', 'distributedRoundingExample']:
    x = f[key]
    W = int(x['mintUnits'])
    X = int(x['exerciseUnits'])
    rows = x.get('writerClaims', x.get('claims'))
    out = payouts(W, (W - X) * C, X * A, [int(r['units']) for r in rows])
    assert out == [(int(r['usdc6']), int(r['eurc6'])) for r in rows], (key, out)
    assert sum(a for a, b in out) == (W - X) * C
    assert sum(b for a, b in out) == X * A

fee = f['nonzeroFeeFixture']
back = int(fee['optionUnits']) * C
paid = (back * fee['feeBps'] + 9999) // 10000
assert paid == int(fee['fee6'])
assert back + paid == int(fee['totalDebitBeforeGas6'])

phase = f['phaseBoundaries']
for stamp, expected in phase['expected'].items():
    t = int(stamp)
    actual = (
        'scheduled' if t < phase['tradingStart'] else
        'trading' if t < phase['exerciseStart'] else
        'exercise' if t < phase['exerciseEnd'] else
        'matured'
    )
    assert actual == expected

for x in f['payoffs']:
    spot = Decimal(x['spot'])
    N = Decimal(10000)
    K = Decimal('1.10')
    P = Decimal(200)
    gross = N * max(K - spot, 0)
    assert N * spot == Decimal(x['unprotectedUSDC'])
    assert N * spot + gross - P == Decimal(x['protectedAfterPremiumUSDC'])
    assert gross - P == Decimal(x['longOnlyPnLUSDC'])
    assert P - gross == Decimal(x['writerPnLUSDC'])

rng = Random(20260907)
for trial in range(2000):
    W = rng.randint(1, 10**9)
    X = rng.randint(0, W)
    strike = rng.randint(1, 2000)
    U = (W - X) * strike
    E = X * A
    remaining = W
    chunks = []
    while remaining:
        part = rng.randint(1, remaining)
        chunks.append(part)
        remaining -= part
    out = payouts(W, U, E, chunks)
    carryU = carryE = 0
    totalU = totalE = 0
    for part, (paidU, paidE) in zip(chunks, out):
        altU, carryU = divmod(part * U + carryU, W)
        altE, carryE = divmod(part * E + carryE, W)
        assert (altU, altE) == (paidU, paidE)
        assert abs(paidU * W - part * U) < W
        assert abs(paidE * W - part * E) < W
        totalU += paidU
        totalE += paidE
        assert totalU <= U and totalE <= E
    assert (totalU, totalE, carryU, carryE) == (U, E, 0, 0)
print('Reference fixtures and 2,000 randomized allocation/conservation cases passed. These are specification checks, not Solidity or Arc tests.')
