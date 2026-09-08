function assertPeriod(period) {
  if (!Number.isInteger(period) || period < 1) {
    throw new RangeError("Indicator period must be a positive integer.");
  }
}

export function simpleMovingAverage(values, period) {
  assertPeriod(period);
  return values.map((_, index) => {
    if (index < period - 1) return null;
    const window = values.slice(index - period + 1, index + 1);
    if (!window.every(Number.isFinite)) return null;
    return window.reduce((sum, value) => sum + value, 0) / period;
  });
}

export function exponentialMovingAverage(values, period) {
  assertPeriod(period);
  const seed = simpleMovingAverage(values, period);
  const smoothing = 2 / (period + 1);
  let previous = null;

  return values.map((value, index) => {
    if (!Number.isFinite(value)) {
      previous = null;
      return null;
    }
    previous =
      previous === null
        ? seed[index]
        : value * smoothing + previous * (1 - smoothing);
    return previous;
  });
}

export function relativeStrengthIndex(values, period = 14) {
  assertPeriod(period);
  const result = Array(values.length).fill(null);
  let averageGain = 0;
  let averageLoss = 0;
  let changes = 0;

  for (let index = 1; index < values.length; index += 1) {
    if (
      !Number.isFinite(values[index]) ||
      !Number.isFinite(values[index - 1])
    ) {
      averageGain = 0;
      averageLoss = 0;
      changes = 0;
      continue;
    }
    const change = values[index] - values[index - 1];
    const gain = Math.max(0, change);
    const loss = Math.max(0, -change);
    changes += 1;
    if (changes <= period) {
      averageGain += gain / period;
      averageLoss += loss / period;
    } else {
      averageGain = (averageGain * (period - 1) + gain) / period;
      averageLoss = (averageLoss * (period - 1) + loss) / period;
    }
    if (changes >= period) {
      result[index] =
        averageLoss === 0
          ? averageGain === 0
            ? 50
            : 100
          : 100 - 100 / (1 + averageGain / averageLoss);
    }
  }
  return result;
}

export function bollingerBands(values, period = 20, deviations = 2) {
  return simpleMovingAverage(values, period).map((middle, index) => {
    if (middle === null) return null;
    const window = values.slice(index - period + 1, index + 1);
    const variance =
      window.reduce((sum, value) => sum + (value - middle) ** 2, 0) / period;
    const spread = Math.sqrt(variance) * deviations;
    return { lower: middle - spread, middle, upper: middle + spread };
  });
}

export function macd(values) {
  const fast = exponentialMovingAverage(values, 12);
  const slow = exponentialMovingAverage(values, 26);
  const line = values.map((_, index) =>
    fast[index] === null || slow[index] === null
      ? null
      : fast[index] - slow[index],
  );
  const signal = exponentialMovingAverage(line, 9);
  return { line, signal };
}

export function priceDomain(values) {
  const valid = values.filter(Number.isFinite);
  if (!valid.length) return { min: 0, max: 1 };
  const lowest = Math.min(...valid);
  const highest = Math.max(...valid);
  const padding = Math.max(
    (highest - lowest) * 0.08,
    Math.abs(highest) * 0.001,
    1,
  );
  return { min: lowest - padding, max: highest + padding };
}

export function linePath(values, toX, toY) {
  let segmentStart = true;
  return values
    .map((value, index) => {
      if (!Number.isFinite(value)) {
        segmentStart = true;
        return "";
      }
      const point = `${segmentStart ? "M" : "L"}${toX(index).toFixed(2)},${toY(value).toFixed(2)}`;
      segmentStart = false;
      return point;
    })
    .filter(Boolean)
    .join(" ");
}

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
