import { useId, useState } from "react";
import { FOCUS_RING, SCROLL_AREA, cx } from "../ui";
import ChartDrawings from "./ChartDrawings";
import {
  bollingerBands,
  clamp,
  exponentialMovingAverage,
  linePath,
  macd,
  priceDomain,
  relativeStrengthIndex,
  simpleMovingAverage,
} from "./chart-math.mjs";

const WIDTH = 900;
const PRICE_HEIGHT = 184;
const LEFT = 8;
const RIGHT = 56;
const TOP = 12;
const BOTTOM = PRICE_HEIGHT - 6;
const number = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

function FrameSelector({ frames, frame, onFrame }) {
  return (
    <div
      className="flex border-b border-line"
      role="group"
      aria-label="Chart timeframe"
    >
      {frames.map((item) => (
        <button
          type="button"
          key={item}
          aria-pressed={frame === item}
          onClick={() => onFrame(item)}
          className={cx(
            "-mb-px cursor-pointer border-b border-transparent px-2.5 py-1.5 font-mono text-[11px] tracking-[0.08em] text-muted hover:text-ink aria-pressed:border-accent aria-pressed:text-accent",
            FOCUS_RING,
          )}
        >
          {item}
        </button>
      ))}
    </div>
  );
}

export default function PriceChart({
  instrument,
  frames,
  frame,
  onFrame,
  chartType = "AREA",
  indicators = [],
  activeTool = null,
  drawings = [],
  onAddDrawing,
}) {
  const chartId = useId();
  const [anchor, setAnchor] = useState(null);
  const [cursor, setCursor] = useState(null);
  const prices = instrument?.closes || [];
  const available = instrument && frame === "1D" && prices.length > 0;
  const showVol = indicators.includes("VOL") && instrument?.volumes;
  const showRSI = indicators.includes("RSI");
  const showMACD = indicators.includes("MACD") && prices.length >= 26;
  const ma = indicators.includes("MA") ? simpleMovingAverage(prices, 5) : [];
  const ema = indicators.includes("EMA")
    ? exponentialMovingAverage(prices, 10)
    : [];
  const bands = indicators.includes("BB") ? bollingerBands(prices) : [];
  const rsi = showRSI ? relativeStrengthIndex(prices) : [];
  const macdValues = showMACD ? macd(prices) : null;
  const levels =
    instrument?.levels.filter((level) => level.label.endsWith("1")) || [];
  const { min, max } = priceDomain([
    ...prices,
    ...ma,
    ...ema,
    ...bands.flatMap((band) => (band ? [band.lower, band.upper] : [])),
    ...levels.map((level) => level.value),
  ]);
  const toX = (index) =>
    LEFT + (index / Math.max(prices.length - 1, 1)) * (WIDTH - LEFT - RIGHT);
  const toY = (value) => TOP + ((max - value) / (max - min)) * (BOTTOM - TOP);
  const path = linePath(prices, toX, toY);
  const area = prices.length
    ? `${path} L${toX(prices.length - 1)},${BOTTOM} L${LEFT},${BOTTOM} Z`
    : "";
  const volumeTop = PRICE_HEIGHT + 14;
  const rsiTop = PRICE_HEIGHT + (showVol ? 54 : 0) + 14;
  const macdTop = rsiTop + (showRSI ? 68 : 0);
  const height =
    PRICE_HEIGHT +
    (showVol ? 54 : 0) +
    (showRSI ? 68 : 0) +
    (showMACD ? 68 : 0);
  const rsiY = (value) => rsiTop + ((100 - value) / 100) * 50;
  const maxVolume = Math.max(1, ...(instrument?.volumes || []));
  const pending =
    anchor && cursor && activeTool
      ? [{ id: "pending", tool: activeTool, start: anchor, end: cursor }]
      : [];

  function pointFromEvent(event) {
    const svg = event.currentTarget;
    const matrix = svg.getScreenCTM();
    if (!matrix) return null;
    const point = svg.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    const local = point.matrixTransform(matrix.inverse());
    if (
      local.x < LEFT ||
      local.x > WIDTH - RIGHT ||
      local.y < TOP ||
      local.y > BOTTOM
    )
      return null;
    return {
      index: clamp(
        ((local.x - LEFT) / (WIDTH - LEFT - RIGHT)) * (prices.length - 1),
        0,
        prices.length - 1,
      ),
      value: max - ((local.y - TOP) / (BOTTOM - TOP)) * (max - min),
    };
  }

  function placePoint(point) {
    if (!point || !activeTool || !onAddDrawing) return;
    if (["H-LINE", "SUPPORT", "RESISTANCE"].includes(activeTool)) {
      onAddDrawing({ id: crypto.randomUUID(), tool: activeTool, start: point });
    } else if (anchor) {
      onAddDrawing({
        id: crypto.randomUUID(),
        tool: activeTool,
        start: anchor,
        end: point,
      });
      setAnchor(null);
      setCursor(null);
    } else {
      setAnchor(point);
      setCursor(point);
    }
  }

  function handleDrawingKey(event) {
    if (!activeTool) return;
    const current = cursor || {
      index: (prices.length - 1) / 2,
      value: (min + max) / 2,
    };
    const indexStep = Math.max((prices.length - 1) / 40, 0.1);
    const priceStep = (max - min) / 40;
    if (event.key === "Escape") {
      setAnchor(null);
      setCursor(null);
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      placePoint(current);
    } else if (event.key.startsWith("Arrow")) {
      event.preventDefault();
      setCursor({
        index: clamp(
          current.index +
            (event.key === "ArrowRight"
              ? indexStep
              : event.key === "ArrowLeft"
                ? -indexStep
                : 0),
          0,
          prices.length - 1,
        ),
        value: clamp(
          current.value +
            (event.key === "ArrowUp"
              ? priceStep
              : event.key === "ArrowDown"
                ? -priceStep
                : 0),
          min,
          max,
        ),
      });
    }
  }

  return (
    <div>
      <FrameSelector frames={frames} frame={frame} onFrame={onFrame} />
      {!available ? (
        <div className="grid min-h-[230px] place-content-center gap-2 px-5 text-center">
          <p className="font-display text-lg font-semibold text-ink">
            No {frame} snapshot available
          </p>
          <p className="text-[13px] text-muted">
            This preview includes intraday data for IHSG and BBCA.
          </p>
        </div>
      ) : (
        <>
          {activeTool && (
            <p className="py-2 font-mono text-[10px] text-accent" role="status">
              {activeTool} ·{" "}
              {anchor ? "Choose the second point" : "Choose a point"} · Click or
              use arrow keys + Enter · Escape to cancel
            </p>
          )}
          <div className={cx("overflow-x-auto", SCROLL_AREA)}>
            <svg
              viewBox={`0 0 ${WIDTH} ${height}`}
              className={cx(
                "block w-full min-w-[480px] font-mono text-[11px]",
                activeTool && "cursor-crosshair touch-manipulation",
                FOCUS_RING,
              )}
              role={activeTool ? "group" : "img"}
              aria-label={`${instrument.symbol} ${frame} sample price chart${activeTool ? ". Drawing tool active. Use arrow keys and Enter to place points, Escape to cancel." : ""}`}
              tabIndex={activeTool ? 0 : undefined}
              onClick={(event) => placePoint(pointFromEvent(event))}
              onPointerMove={(event) => {
                if (anchor) setCursor(pointFromEvent(event));
              }}
              onKeyDown={handleDrawingKey}
            >
              <defs>
                <linearGradient
                  id={`${chartId}-fill`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="0%"
                    className="[stop-color:#4CAF72] [stop-opacity:0.18]"
                  />
                  <stop
                    offset="100%"
                    className="[stop-color:#4CAF72] [stop-opacity:0.01]"
                  />
                </linearGradient>
                <clipPath id={`${chartId}-clip`}>
                  <rect
                    x={LEFT}
                    y={TOP}
                    width={WIDTH - LEFT - RIGHT}
                    height={BOTTOM - TOP}
                  />
                </clipPath>
                <marker
                  id={`${chartId}-arrow`}
                  viewBox="0 0 10 10"
                  refX="9"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M0 0 L10 5 L0 10 Z" className="fill-accent" />
                </marker>
              </defs>
              {[0, 1, 2, 3].map((index) => {
                const value = max - (index / 3) * (max - min);
                return (
                  <g key={index}>
                    <line
                      x1={LEFT}
                      y1={toY(value)}
                      x2={WIDTH - RIGHT}
                      y2={toY(value)}
                      className="stroke-line/50"
                      strokeDasharray="2 5"
                    />
                    <text
                      x={WIDTH - RIGHT + 6}
                      y={toY(value) + 4}
                      className="fill-muted/80"
                    >
                      {number.format(value)}
                    </text>
                  </g>
                );
              })}
              {levels.map((level) => (
                <g
                  key={level.label}
                  className={
                    level.direction === "up"
                      ? "fill-positive stroke-positive"
                      : "fill-negative stroke-negative"
                  }
                >
                  <line
                    x1={LEFT}
                    y1={toY(level.value)}
                    x2={WIDTH - RIGHT}
                    y2={toY(level.value)}
                    strokeDasharray="4 3"
                    className="opacity-50"
                  />
                  <text
                    x={LEFT + 4}
                    y={toY(level.value) - 4}
                    className="stroke-none text-[10px] opacity-80"
                  >
                    {level.label[0]} {number.format(level.value)}
                  </text>
                </g>
              ))}
              {chartType === "AREA" && (
                <path d={area} fill={`url(#${chartId}-fill)`} />
              )}
              <path
                d={path}
                className="fill-none stroke-positive"
                strokeWidth={1.5}
                strokeLinejoin="round"
              />
              {ma.length > 0 && (
                <path
                  d={linePath(ma, toX, toY)}
                  className="fill-none stroke-accent/85"
                />
              )}
              {ema.length > 0 && (
                <path
                  d={linePath(ema, toX, toY)}
                  className="fill-none stroke-info/80"
                  strokeDasharray="3 2"
                />
              )}
              {["lower", "upper"].map(
                (bound) =>
                  bands.length > 0 && (
                    <path
                      key={bound}
                      d={linePath(
                        bands.map((band) => band?.[bound]),
                        toX,
                        toY,
                      )}
                      className="fill-none stroke-info/50"
                      strokeDasharray="4 3"
                    />
                  ),
              )}
              <circle
                cx={toX(prices.length - 1)}
                cy={toY(prices.at(-1))}
                r={3}
                className="fill-positive"
              />
              <g clipPath={`url(#${chartId}-clip)`}>
                <ChartDrawings
                  drawings={[...drawings, ...pending]}
                  toX={toX}
                  toY={toY}
                  arrowId={`${chartId}-arrow`}
                  left={LEFT}
                  right={WIDTH - RIGHT}
                />
                {activeTool && cursor && (
                  <circle
                    cx={toX(cursor.index)}
                    cy={toY(cursor.value)}
                    r={4}
                    className="fill-canvas stroke-accent"
                  />
                )}
              </g>
              {showVol && (
                <g>
                  <text
                    x={LEFT}
                    y={volumeTop - 3}
                    className="fill-muted/65 text-[10px]"
                  >
                    VOLUME
                  </text>
                  {instrument.volumes.map((value, index) => {
                    const barHeight = (value / maxVolume) * 32;
                    return (
                      <rect
                        key={index}
                        x={toX(index) - 5}
                        y={volumeTop + 32 - barHeight}
                        width={10}
                        height={barHeight}
                        className="fill-positive/25"
                      />
                    );
                  })}
                </g>
              )}
              {showRSI && (
                <g>
                  <text
                    x={LEFT}
                    y={rsiTop - 3}
                    className="fill-muted/65 text-[10px]"
                  >
                    RSI (14)
                  </text>
                  {[30, 50, 70].map((level) => (
                    <g key={level}>
                      <line
                        x1={LEFT}
                        y1={rsiY(level)}
                        x2={WIDTH - RIGHT}
                        y2={rsiY(level)}
                        className="stroke-line/65"
                        strokeDasharray="2 5"
                      />
                      <text
                        x={WIDTH - RIGHT + 6}
                        y={rsiY(level) + 4}
                        className="fill-muted/70 text-[10px]"
                      >
                        {level}
                      </text>
                    </g>
                  ))}
                  <path
                    d={linePath(rsi, toX, rsiY)}
                    className="fill-none stroke-accent"
                    strokeWidth={1.2}
                  />
                </g>
              )}
              {showMACD && (
                <MacdPane values={macdValues} top={macdTop} toX={toX} />
              )}
            </svg>
          </div>
        </>
      )}
    </div>
  );
}

function MacdPane({ values, top, toX }) {
  const { min, max } = priceDomain([...values.line, ...values.signal, 0]);
  const toY = (value) => top + ((max - value) / (max - min)) * 50;
  return (
    <g>
      <text x={LEFT} y={top - 3} className="fill-muted/65 text-[10px]">
        MACD (12, 26, 9)
      </text>
      <line
        x1={LEFT}
        x2={WIDTH - RIGHT}
        y1={toY(0)}
        y2={toY(0)}
        className="stroke-line"
      />
      <path
        d={linePath(values.line, toX, toY)}
        className="fill-none stroke-info"
      />
      <path
        d={linePath(values.signal, toX, toY)}
        className="fill-none stroke-accent"
      />
    </g>
  );
}
