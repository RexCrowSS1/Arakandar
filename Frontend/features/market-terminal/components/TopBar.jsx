import { MARKET_TAPE } from "../market-data";
import {
  DISPLAY_FONT_CLASS,
  FOCUS_RING_CLASS,
  cx,
} from "../ui-classes";

const THEME_OPTIONS = [
  { value: "light", label: "LIGHT" },
  { value: "dark", label: "DARK" },
];

function BrandMark() {
  return (
    <span
      className="relative h-[18px] w-[18px] border border-[var(--line)] before:absolute before:top-px before:right-px before:h-[9px] before:w-[9px] before:border before:border-[var(--line)] before:content-[''] [@media(max-width:560px)]:h-4 [@media(max-width:560px)]:w-4"
      aria-hidden="true"
    >
      <span className="absolute -right-px -bottom-px h-[9px] w-[9px] border-2 border-[var(--orange)] bg-[var(--paper-raised)]" />
    </span>
  );
}

function MarketTapeItem({ item }) {
  const indicator = item.direction === "up" ? "▲" : "▼";
  const directionColor =
    item.direction === "up" ? "text-[var(--green)]" : "text-[var(--red)]";

  return (
    <li className="flex shrink-0 items-center gap-[9px] border-r border-[var(--line)] px-[13px] [@media(max-width:1180px)]:px-[11px] [@media(max-width:860px)]:[&:nth-child(n+2)]:hidden [@media(max-width:560px)]:gap-[7px] [@media(max-width:560px)]:px-1">
      <span className="text-[11px] text-[var(--faint)] [@media(max-width:560px)]:hidden">
        {item.symbol}
      </span>
      <strong className="text-[13px]">{item.value}</strong>
      <em
        className={`text-[11px] not-italic [@media(max-width:560px)]:hidden ${directionColor}`}
      >
        {indicator} {item.percentChange}
      </em>
    </li>
  );
}

function ThemeSwitch({ theme, onChange }) {
  return (
    <div
      className="flex shrink-0 items-center pr-[19px] [@media(560px<width<=860px)]:pr-[10px] [@media(max-width:560px)]:ml-auto [@media(max-width:560px)]:pr-2"
      role="group"
      aria-label="Color theme"
    >
      {THEME_OPTIONS.map(({ label, value }, index) => {
        const isActive = theme === value;

        return (
          <button
            className={cx(
              "h-6 min-w-[46px] cursor-pointer border border-[var(--line)] bg-transparent text-[10px] tracking-[0.09em] text-[var(--faint)] aria-pressed:border-b-2 aria-pressed:border-b-[var(--orange)] aria-pressed:bg-[rgba(255,255,255,0.32)] aria-pressed:text-[var(--orange)] [@media(560px<width<=860px)]:min-w-[42px] [@media(max-width:560px)]:min-w-10",
              index > 0 && "border-l-0",
              FOCUS_RING_CLASS,
            )}
            type="button"
            key={value}
            aria-pressed={isActive}
            onClick={() => onChange(value)}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

export default function TopBar({
  isNavigationOpen,
  onThemeChange,
  onToggleNavigation,
  theme,
}) {
  return (
    <header className="sticky top-0 z-20 flex h-[var(--topbar-height)] items-stretch overflow-hidden whitespace-nowrap border-t-2 border-b border-t-[var(--ink)] border-b-[var(--line)] bg-[var(--paper-raised)] text-[13px] tracking-[0.04em] [@media(max-width:560px)]:text-[12px]">
      <div
        className={cx(
          DISPLAY_FONT_CLASS,
          "flex shrink-0 basis-[var(--sidebar-width)] items-center gap-[10px] border-r border-[var(--line)] px-5 text-[17px] tracking-[0.12em] [@media(560px<width<=860px)]:basis-[190px] [@media(560px<width<=860px)]:px-4 [@media(max-width:560px)]:basis-[160px] [@media(max-width:560px)]:gap-2 [@media(max-width:560px)]:px-3 [@media(max-width:560px)]:text-[15px]",
        )}
      >
        <button
          className={cx(
            "grid shrink-0 cursor-pointer border-0 bg-transparent p-0",
            FOCUS_RING_CLASS,
          )}
          type="button"
          aria-controls="market-sidebar"
          aria-expanded={isNavigationOpen}
          aria-label={isNavigationOpen ? "Close navigation" : "Open navigation"}
          onClick={onToggleNavigation}
        >
          <BrandMark />
        </button>
        <a
          className={cx(
            "text-[var(--ink)] no-underline",
            FOCUS_RING_CLASS,
          )}
          href="#workspace"
        >
          ARAKAN NDAR
        </a>
      </div>

      <div className="flex shrink-0 items-center border-r border-[var(--line)] px-[18px] text-[11px] text-[var(--faint)] [@media(max-width:1180px)]:hidden">
        MARKET INTELLIGENCE / V1.0
      </div>

      <ul
        className="m-0 flex min-w-0 flex-1 list-none overflow-hidden p-0"
        aria-label="Market summary"
      >
        {MARKET_TAPE.map((item) => (
          <MarketTapeItem item={item} key={item.symbol} />
        ))}
      </ul>

      <div className="flex shrink-0 items-center gap-1.5 border-l border-[var(--line)] px-3.5 text-[11px] text-[var(--green)] [@media(max-width:860px)]:px-2.5 [@media(max-width:560px)]:hidden">
        <span className="text-[7px]" aria-hidden="true">
          ■
        </span>{" "}
        OPEN
      </div>
      <ThemeSwitch theme={theme} onChange={onThemeChange} />
    </header>
  );
}
