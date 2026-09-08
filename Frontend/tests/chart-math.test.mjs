import assert from "node:assert/strict";
import test from "node:test";
import {
  bollingerBands,
  exponentialMovingAverage,
  linePath,
  macd,
  priceDomain,
  relativeStrengthIndex,
  simpleMovingAverage,
} from "../features/financial-platform/chart/chart-math.mjs";

const closes = [
  9720, 9735, 9748, 9762, 9755, 9770, 9758, 9780, 9774, 9790, 9785, 9802, 9795,
  9810, 9820, 9808, 9830, 9825, 9840, 9860, 9855, 9870, 9865, 9875, 9875,
];

function approximately(actual, expected) {
  assert.ok(
    Math.abs(actual - expected) < 0.00001,
    `${actual} differs from ${expected}`,
  );
}

test("SMA and EMA retain warmup positions and match the known BBCA sample", () => {
  const sma = simpleMovingAverage(closes, 5);
  const ema = exponentialMovingAverage(closes, 10);
  assert.equal(sma.length, closes.length);
  assert.deepEqual(sma.slice(0, 4), [null, null, null, null]);
  assert.equal(sma[4], 9744);
  assert.equal(sma.at(-1), 9868);
  assert.ok(ema.slice(0, 9).every((value) => value === null));
  approximately(ema.at(-1), 9851.246822);
});

test("Wilder RSI handles warmup, flat, rising, and falling markets", () => {
  const rsi = relativeStrengthIndex(closes);
  assert.ok(rsi.slice(0, 14).every((value) => value === null));
  approximately(rsi.at(-1), 77.83149);
  assert.equal(relativeStrengthIndex(Array(20).fill(10)).at(-1), 50);
  assert.equal(
    relativeStrengthIndex(Array.from({ length: 20 }, (_, i) => i)).at(-1),
    100,
  );
  assert.equal(
    relativeStrengthIndex(Array.from({ length: 20 }, (_, i) => 20 - i)).at(-1),
    0,
  );
});

test("Bollinger Bands use population deviation and a full 20-price window", () => {
  const bands = bollingerBands(closes);
  assert.ok(bands.slice(0, 19).every((value) => value === null));
  approximately(bands.at(-1).middle, 9819.35);
  approximately(bands.at(-1).lower, 9745.465563);
  approximately(bands.at(-1).upper, 9893.234437);
});

test("MACD does not invent values when fewer than 26 prices exist", () => {
  const result = macd(closes);
  assert.ok(result.line.every((value) => value === null));
  assert.ok(result.signal.every((value) => value === null));
  const full = macd(Array.from({ length: 40 }, (_, index) => 100 + index));
  assert.equal(full.line[24], null);
  assert.ok(Number.isFinite(full.line[25]));
  assert.equal(full.signal[32], null);
  assert.ok(Number.isFinite(full.signal[33]));
});

test("chart domains remain usable for missing, single, and flat prices", () => {
  assert.deepEqual(priceDomain([null, undefined, NaN]), { min: 0, max: 1 });
  for (const values of [[], [0], [100], [100, 100, 100]]) {
    const { min, max } = priceDomain(values);
    assert.ok(Number.isFinite(min) && Number.isFinite(max) && max > min);
  }
  const domain = priceDomain([...closes, 9700, 9900]);
  assert.ok(domain.min < 9700 && domain.max > 9900);
});

test("missing points create separate SVG segments and never become zero", () => {
  assert.equal(
    linePath(
      [10, null, 20],
      (index) => index,
      (value) => value,
    ),
    "M0.00,10.00 M2.00,20.00",
  );
  assert.equal(
    linePath(
      [],
      (value) => value,
      (value) => value,
    ),
    "",
  );
  assert.deepEqual(simpleMovingAverage([1, null, 3], 2), [null, null, null]);
});

test("indicator periods must be positive integers", () => {
  for (const period of [0, -1, 1.5]) {
    assert.throws(() => simpleMovingAverage(closes, period), RangeError);
    assert.throws(() => exponentialMovingAverage(closes, period), RangeError);
    assert.throws(() => relativeStrengthIndex(closes, period), RangeError);
  }
});
