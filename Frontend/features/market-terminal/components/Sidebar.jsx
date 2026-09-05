import { NAV_ITEMS, THREAD_COUNT, THREAD_GROUPS } from "../market-data";
import {
  DISPLAY_FONT_CLASS,
  FOCUS_RING_CLASS,
  INTERACTIVE_SURFACE_CLASS,
  cx,
} from "../ui-classes";

function ThreadList({ items, onSelect, selectedThreadId }) {
  return (
    <ul className="m-0 grid list-none gap-0.5 p-0">
      {items.map((thread) => {
        const isActive = thread.id === selectedThreadId;

        return (
          <li key={thread.id}>
            <button
              className={cx(
                "grid w-full cursor-pointer grid-cols-[16px_minmax(0,1fr)] items-center border-0 bg-transparent p-[5px] text-left text-[12px] leading-[1.25]",
                isActive
                  ? "font-bold text-[var(--ink)]"
                  : "text-[var(--secondary)]",
                INTERACTIVE_SURFACE_CLASS,
                FOCUS_RING_CLASS,
              )}
              type="button"
              aria-pressed={isActive}
              onClick={() => onSelect(thread)}
            >
              <span
                className={cx(
                  "text-[10px]",
                  isActive
                    ? "text-[var(--orange)]"
                    : "text-[var(--faint)]",
                )}
                aria-hidden="true"
              >
                {isActive ? "▪" : ">"}
              </span>
              <span>{thread.title}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

export default function Sidebar({
  activeNavId,
  isDesktopCollapsed,
  isHidden,
  isMobileOpen,
  onClose,
  onNavChange,
  onNewConversation,
  onOpenSettings,
  onThreadSelect,
  selectedThreadId,
}) {
  const desktopVisibility = isDesktopCollapsed
    ? "pointer-events-none -translate-x-full"
    : "translate-x-0";
  const mobileVisibility = isMobileOpen
    ? "[@media(max-width:860px)]:visible [@media(max-width:860px)]:pointer-events-auto [@media(max-width:860px)]:translate-x-0"
    : "[@media(max-width:860px)]:invisible [@media(max-width:860px)]:pointer-events-none [@media(max-width:860px)]:-translate-x-[101%]";

  return (
    <aside
      className={cx(
        "sticky top-[var(--topbar-height)] flex h-[calc(100vh-var(--topbar-height))] w-[var(--sidebar-width)] flex-col border-r border-[var(--line)] bg-[var(--paper-raised)] transition-transform duration-150 ease-linear supports-[height:100svh]:h-[calc(100svh-var(--topbar-height))] motion-reduce:transition-none [@media(max-width:860px)]:fixed [@media(max-width:860px)]:bottom-0 [@media(max-width:860px)]:left-0 [@media(max-width:860px)]:z-[35] [@media(max-width:860px)]:h-auto [@media(max-width:860px)]:w-[min(300px,calc(100vw-44px))]",
        desktopVisibility,
        mobileVisibility,
      )}
      id="market-sidebar"
      aria-hidden={isHidden || undefined}
      inert={isHidden || undefined}
    >
      <div className="border-b border-[var(--line)] px-4 pt-5 pb-3">
        <div className="flex items-center justify-between">
          <strong
            className={cx(
              DISPLAY_FONT_CLASS,
              "text-[16px] tracking-[0.08em]",
            )}
          >
            ARAKAN NDAR
          </strong>
          <button
            className={cx(
              "cursor-pointer border-0 bg-transparent text-[var(--faint)]",
              FOCUS_RING_CLASS,
            )}
            type="button"
            aria-label="Close navigation"
            onClick={onClose}
          >
            ◂
          </button>
        </div>
        <p className="mt-[13px] mb-0 border-b border-[var(--orange)] pb-[13px] text-[11px] tracking-[0.07em] text-[var(--faint)]">
          AI / MARKET ANALYSIS
        </p>
      </div>

      <button
        className={cx(
          "mx-4 my-3 h-[34px] shrink-0 cursor-pointer border border-[var(--line)] bg-transparent text-left text-[12px] tracking-[0.1em] text-[var(--secondary)]",
          INTERACTIVE_SURFACE_CLASS,
          FOCUS_RING_CLASS,
        )}
        type="button"
        onClick={onNewConversation}
      >
        <span
          className="mr-[7px] ml-2 inline-block align-[-2px] text-[18px] leading-[0]"
          aria-hidden="true"
        >
          ＋
        </span>{" "}
        NEW CONVERSATION
      </button>

      <nav
        className="grid gap-[15px] border-y border-[var(--line)] px-4 py-5"
        aria-label="Primary navigation"
      >
        {NAV_ITEMS.map(({ href, id, label }, index) => {
          const isActive = activeNavId === id;

          return (
            <a
              className={cx(
                "text-[13px] no-underline",
                isActive
                  ? "font-bold text-[var(--ink)]"
                  : "text-[var(--secondary)]",
                INTERACTIVE_SURFACE_CLASS,
                FOCUS_RING_CLASS,
              )}
              href={href}
              key={id}
              aria-current={isActive ? "page" : undefined}
              onClick={() => onNavChange(id)}
            >
              <span className="inline-block w-6 text-[11px] text-[var(--orange)]">
                {String(index + 1).padStart(2, "0")}
              </span>{" "}
              {label}
            </a>
          );
        })}
      </nav>

      <section
        className="min-h-0 flex-1 overflow-y-auto px-4 py-[15px]"
        id="history"
        aria-labelledby="recent-title"
      >
        <div className="flex items-center justify-between">
          <h2
            className="m-0 text-[11px] font-normal tracking-[0.1em] text-[var(--faint)]"
            id="recent-title"
          >
            RECENT
          </h2>
          <span className="text-[11px] font-normal tracking-[0.1em] text-[var(--orange)]">
            / {String(THREAD_COUNT).padStart(2, "0")}
          </span>
        </div>

        {THREAD_GROUPS.map((group) => (
          <div key={group.id}>
            <p className="m-0 px-[10px] pt-[13px] pb-[5px] text-[11px] font-normal tracking-[0.1em] text-[var(--faint)]">
              {group.label}
            </p>
            <ThreadList
              items={group.items}
              selectedThreadId={selectedThreadId}
              onSelect={onThreadSelect}
            />
          </div>
        ))}
      </section>

      <footer className="flex min-h-[60px] items-center justify-between border-t border-[var(--line)] px-4 py-[11px]">
        <div className="grid gap-[3px]">
          <strong
            className={cx(
              DISPLAY_FONT_CLASS,
              "text-[14px] tracking-[0.08em]",
            )}
          >
            RAFIF
          </strong>
          <span className="text-[10px] tracking-[0.05em] text-[var(--faint)]">
            FREE ACCESS
          </span>
        </div>
        <button
          className={cx(
            "cursor-pointer border border-[var(--line)] bg-transparent px-[10px] py-1.5 text-[10px] tracking-[0.05em] text-[var(--faint)]",
            INTERACTIVE_SURFACE_CLASS,
            FOCUS_RING_CLASS,
          )}
          type="button"
          onClick={onOpenSettings}
        >
          [SETTINGS]
        </button>
      </footer>
    </aside>
  );
}
