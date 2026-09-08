import { cx } from "../ui";

export default function ChartDrawings({
  drawings,
  toX,
  toY,
  arrowId,
  left,
  right,
}) {
  return drawings.map((drawing) => {
    const { id, tool, start, end } = drawing;
    const x1 = toX(start.index);
    const y1 = toY(start.value);
    const x2 = end ? toX(end.index) : x1;
    const y2 = end ? toY(end.value) : y1;
    const color =
      tool === "SUPPORT"
        ? "stroke-positive"
        : tool === "RESISTANCE"
          ? "stroke-negative"
          : "stroke-accent";

    if (tool === "RECT") {
      return (
        <rect
          key={id}
          x={Math.min(x1, x2)}
          y={Math.min(y1, y2)}
          width={Math.abs(x2 - x1)}
          height={Math.abs(y2 - y1)}
          className="fill-accent/10 stroke-accent"
          strokeWidth={1}
        />
      );
    }

    const horizontal = ["H-LINE", "SUPPORT", "RESISTANCE"].includes(tool);
    return (
      <line
        key={id}
        x1={horizontal ? left : x1}
        y1={y1}
        x2={horizontal ? right : x2}
        y2={horizontal ? y1 : y2}
        className={cx("fill-none", color)}
        strokeWidth={1.5}
        strokeDasharray={horizontal ? "4 3" : undefined}
        markerEnd={tool === "ARROW" ? `url(#${arrowId})` : undefined}
      />
    );
  });
}
