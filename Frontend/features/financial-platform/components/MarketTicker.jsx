import { useState, useSyncExternalStore } from "react";
import { MARKET_TICKER } from "../data/markets";
import { FOCUS_RING, cx } from "../ui";

const clock = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Asia/Jakarta",
});

function subscribeClock(onChange) {
  const timer = setInterval(onChange, 1000);
  return () => clearInterval(timer);
}

function getTime() {
  return clock.format(new Date());
}
function getServerTime() {
  return "--:--";
}

export default function MarketTicker() {
  const [paused, setPaused] = useState(false);
  const time = useSyncExternalStore(subscribeClock, getTime, getServerTime);

  return (
    <header className="flex h-9 min-w-0 items-center overflow-hidden border-b border-line bg-canvas/95">
      <button
        type="button"
        aria-label={paused ? "Resume market ticker" : "Pause market ticker"}
        aria-pressed={paused}
        onClick={() => setPaused((value) => !value)}
        className={cx(
          "h-full shrink-0 cursor-pointer border-r border-line px-3.5 font-display text-[11px] tracking-[0.14em] text-muted hover:text-accent",
          FOCUS_RING,
        )}
        title="Sample market quotes · click to pause or resume"
      >
        MARKETS <span className="ml-1 text-accent/80">/ DEMO</span>
      </button>
      <div className="group min-w-0 flex-1 overflow-hidden">
        <div
          className={cx(
            "flex w-max animate-ticker group-hover:[animation-play-state:paused] motion-reduce:animate-none",
            paused && "[animation-play-state:paused]",
          )}
        >
          {[0, 1].map((copy) => (
            <ul
              key={copy}
              className="flex shrink-0"
              aria-label={copy === 0 ? "Sample market quotes" : undefined}
              aria-hidden={copy === 1 || undefined}
            >
              {MARKET_TICKER.map((item) => (
                <li
                  key={item.symbol}
                  className="flex h-9 shrink-0 items-center gap-2 whitespace-nowrap border-r border-line px-5 font-mono"
                >
                  <span className="text-[10px] tracking-[0.08em] text-muted">
                    {item.symbol}
                  </span>
                  <span className="text-[13px]">{item.value}</span>
                  <span
                    className={cx(
                      "text-[12px]",
                      item.direction === "up"
                        ? "text-positive"
                        : "text-negative",
                    )}
                  >
                    {item.change}
                  </span>
                </li>
              ))}
            </ul>
          ))}
        </div>
      </div>
      <time
        className="flex h-full shrink-0 items-center border-l border-line px-3.5 font-mono text-[11px] tracking-[0.06em] text-muted"
        title="Current time in Jakarta"
      >
        {time} WIB
      </time>
    </header>
  );
}
