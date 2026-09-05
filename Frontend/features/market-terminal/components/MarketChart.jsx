const INTRADAY_LABELS = ["09:00", "11:00", "13:00", "15:00"];
const RANGE_LABELS = ["START", "1/3", "2/3", "NOW"];
const CHART_DIMENSIONS = {
  width: 1102,
  height: 240,
};

function toSvgPoints(series) {
  const lastIndex = series.length - 1;

  return series
    .map((y, index) => {
      const x = Math.round((index / lastIndex) * CHART_DIMENSIONS.width);
      return `${x},${y}`;
    })
    .join(" ");
}

export default function MarketChart({ market, period, series }) {
  const linePoints = toSvgPoints(series);
  const areaPoints = [
    `0,${CHART_DIMENSIONS.height}`,
    linePoints,
    `${CHART_DIMENSIONS.width},${CHART_DIMENSIONS.height}`,
  ].join(" ");
  const xAxisLabels = period === "1D" ? INTRADAY_LABELS : RANGE_LABELS;
  const trendDirection = market.direction === "up" ? "upward" : "downward";

  return (
    <div
      className="relative h-[247px] overflow-hidden border-b border-[var(--line)] [@media(max-width:560px)]:h-[238px]"
      role="img"
      aria-label={`${market.symbol} ${period} line chart showing a ${trendDirection} market trend`}
    >
      <div
        className="absolute inset-x-[39px] top-[76px] bottom-[64px] z-0 flex flex-col justify-between [&>span]:border-t [&>span]:border-dashed [&>span]:border-[rgba(141,135,125,0.3)]"
        aria-hidden="true"
      >
        <span />
        <span />
        <span />
      </div>

      <div
        className="absolute top-[21px] bottom-[23px] left-[5px] z-[2] flex flex-col justify-between text-[10px] text-[var(--faint)]"
        aria-hidden="true"
      >
        {market.axisTicks.map((tick) => (
          <span key={tick}>{tick}</span>
        ))}
      </div>

      <svg
        className="absolute top-[23px] right-[39px] bottom-[23px] left-[39px] z-[1] h-[calc(100%_-_46px)] w-[calc(100%_-_78px)] overflow-visible [@media(max-width:560px)]:right-[15px] [@media(max-width:560px)]:left-[36px] [@media(max-width:560px)]:w-[calc(100%_-_51px)]"
        viewBox={`0 0 ${CHART_DIMENSIONS.width} ${CHART_DIMENSIONS.height}`}
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <polygon points={areaPoints} className="[fill:var(--chart-fill)]" />
        <polyline
          points={linePoints}
          className="[fill:none] [stroke:var(--green)] [stroke-linecap:square] [stroke-linejoin:miter] [stroke-width:1.5] [vector-effect:non-scaling-stroke]"
        />
        <line
          x1={CHART_DIMENSIONS.width}
          y1="0"
          x2={CHART_DIMENSIONS.width}
          y2={CHART_DIMENSIONS.height}
          className="[stroke:var(--orange)] [stroke-dasharray:3_4] [stroke-width:1] [vector-effect:non-scaling-stroke]"
        />
        <rect
          x={CHART_DIMENSIONS.width - 3}
          y={series.at(-1) - 3}
          width="6"
          height="6"
          className="[fill:var(--orange)]"
        />
      </svg>

      <div
        className="absolute right-[22px] bottom-[2px] left-[22px] z-[2] flex justify-between text-[10px] text-[var(--faint)]"
        aria-hidden="true"
      >
        {xAxisLabels.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>
    </div>
  );
}
