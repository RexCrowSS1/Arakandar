import { useId, useState } from "react";
import { RECENT_ANALYSES } from "../data/history";
import { FOCUS_RING, SCROLL_AREA, cx } from "../ui";

const MODES = [
  { id: "technical", label: "TECHNICAL" },
  { id: "market", label: "MARKET" },
];

export default function Sidebar({
  mode,
  onModeChange,
  selectedAnalysisId,
  onAnalysisSelect,
  mobileOpen,
}) {
  const [query, setQuery] = useState("");
  const searchId = useId();
  const recentTitleId = useId();
  const normalizedQuery = query.trim().toLowerCase();
  const analyses = RECENT_ANALYSES.filter((item) =>
    `${item.ticker} ${item.title} ${item.date}`
      .toLowerCase()
      .includes(normalizedQuery),
  );

  return (
    <aside
      aria-label="Analysis navigation"
      className={cx(
        "min-h-0 flex-1 flex-col overflow-hidden border-r border-line bg-[#10100E]/65 lg:flex",
        mobileOpen ? "flex border-b lg:border-b-0" : "hidden",
      )}
    >
      <div className="shrink-0 border-b border-line px-4 pt-4 pb-3.5">
        <p className="font-display text-[19px] leading-none font-bold tracking-[0.05em]">
          ARAKAN NDAR
        </p>
        <p className="mt-1 font-mono text-[10px] tracking-[0.12em] text-muted">
          AI FINANCIAL PLATFORM
        </p>
      </div>
      <div className="shrink-0 border-b border-line px-3 py-2.5">
        <label
          htmlFor={searchId}
          className="mb-1.5 block font-mono text-[10px] tracking-[0.14em] text-muted/75"
        >
          SEARCH
        </label>
        <div className="flex items-center gap-1.5 border border-line bg-panel/70 px-2 py-1.5 focus-within:border-accent">
          <span
            className="text-sm leading-none text-muted/65"
            aria-hidden="true"
          >
            ⌕
          </span>
          <input
            id={searchId}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search analysis, ticker, history..."
            className="min-w-0 flex-1 bg-transparent text-[13px] text-ink outline-none placeholder:text-muted/65"
          />
        </div>
      </div>
      <nav
        className="shrink-0 border-b border-line pt-2.5 pb-2"
        aria-label="Manual analysis"
      >
        <p className="px-4 pb-1.5 font-mono text-[10px] tracking-[0.14em] text-muted/70">
          MANUAL ANALYSIS
        </p>
        {MODES.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-pressed={mode === item.id}
            onClick={() => onModeChange(item.id)}
            className={cx(
              "block w-full cursor-pointer border-l-2 border-transparent px-4 py-2 text-left font-display text-[14px] font-semibold tracking-[0.1em] text-muted transition-colors hover:bg-hover aria-pressed:border-accent aria-pressed:bg-accent/[0.07] aria-pressed:text-accent motion-reduce:transition-none",
              FOCUS_RING,
            )}
          >
            {item.label}
          </button>
        ))}
      </nav>
      <section
        className={cx("min-h-0 flex-1 overflow-y-auto", SCROLL_AREA)}
        aria-labelledby={recentTitleId}
      >
        <h2
          id={recentTitleId}
          className="px-4 pt-2.5 pb-1.5 font-mono text-[10px] font-normal tracking-[0.14em] text-muted/70"
        >
          RECENT
        </h2>
        <ul>
          {analyses.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                aria-pressed={selectedAnalysisId === item.id}
                onClick={() => onAnalysisSelect(item)}
                className={cx(
                  "group block w-full cursor-pointer px-4 py-2 text-left transition-colors hover:bg-hover aria-pressed:bg-hover motion-reduce:transition-none",
                  FOCUS_RING,
                )}
                title={`${item.ticker} ${item.title}`.trim()}
              >
                <span className="mb-0.5 flex min-w-0 items-center gap-1.5">
                  {item.ticker && (
                    <span className="shrink-0 font-mono text-[10px] tracking-[0.08em] text-accent">
                      {item.ticker}
                    </span>
                  )}
                  <span className="truncate text-[13px] text-muted group-hover:text-ink group-aria-pressed:text-ink">
                    {item.title}
                  </span>
                </span>
                <span className="font-mono text-[10px] text-muted/55">
                  {item.date}
                </span>
              </button>
            </li>
          ))}
        </ul>
        {analyses.length === 0 && (
          <p className="px-4 py-3 text-[13px] text-muted" role="status">
            No analysis matches “{query}”.
          </p>
        )}
      </section>
      <footer className="shrink-0 border-t border-line px-4 py-2 font-mono text-[10px] tracking-[0.06em] text-muted/55">
        v0.1.0-alpha · IDX · AN-1
      </footer>
    </aside>
  );
}
