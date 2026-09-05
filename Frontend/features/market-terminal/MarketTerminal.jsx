"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

import Composer from "./components/Composer";
import MarketPanel from "./components/MarketPanel";
import Sidebar from "./components/Sidebar";
import TopBar from "./components/TopBar";
import { DEFAULT_NAV_ID, DEFAULT_THREAD_ID } from "./market-data";
import { DISPLAY_FONT_CLASS, cx } from "./ui-classes";

// Keep this query aligned with the 860px raw Tailwind variants in this feature.
const MOBILE_NAV_QUERY = "(max-width: 860px)";

const WORKSPACE_CONTAINER_CLASS =
  "mx-auto w-full max-w-5xl px-8 [@media(max-width:1180px)]:px-6 [@media(max-width:860px)]:px-3.5";

const THEME_CLASSES = {
  light: [
    "[--paper:#f1ede3]",
    "[--paper-raised:#ebe6dc]",
    "[--ink:#171714]",
    "[--secondary:#6c6861]",
    "[--faint:#aaa49a]",
    "[--line:#bbb4a8]",
    "[--grid:rgba(190,148,100,0.16)]",
    "[--orange:#e77b2b]",
    "[--green:#2ea45f]",
    "[--red:#d94f48]",
    "[--chart-fill:rgba(46,164,95,0.045)]",
    "[--composer:rgba(241,237,227,0.96)]",
    "[--hover:rgba(231,123,43,0.065)]",
    "[color-scheme:light]",
  ].join(" "),
  dark: [
    "[--paper:#0d0e0c]",
    "[--paper-raised:#11120f]",
    "[--ink:#ebe7df]",
    "[--secondary:#77736c]",
    "[--faint:#4e4c46]",
    "[--line:#35322c]",
    "[--grid:rgba(158,88,31,0.16)]",
    "[--orange:#d77a25]",
    "[--green:#39b56a]",
    "[--red:#dd514b]",
    "[--chart-fill:rgba(57,181,106,0.045)]",
    "[--composer:rgba(17,18,15,0.97)]",
    "[--hover:rgba(215,122,37,0.08)]",
    "[color-scheme:dark]",
  ].join(" "),
};

function subscribeToMobileViewport(callback) {
  const mediaQuery = window.matchMedia(MOBILE_NAV_QUERY);
  mediaQuery.addEventListener("change", callback);
  return () => mediaQuery.removeEventListener("change", callback);
}

function getMobileViewportSnapshot() {
  return window.matchMedia(MOBILE_NAV_QUERY).matches;
}

function getServerViewportSnapshot() {
  return false;
}

function useMobileViewport() {
  return useSyncExternalStore(
    subscribeToMobileViewport,
    getMobileViewportSnapshot,
    getServerViewportSnapshot,
  );
}

function NavigationBackdrop({ isOpen, onClose }) {
  const visibility = isOpen
    ? "[@media(max-width:860px)]:pointer-events-auto [@media(max-width:860px)]:opacity-100"
    : "[@media(max-width:860px)]:pointer-events-none [@media(max-width:860px)]:opacity-0";

  return (
    <button
      className={cx(
        "hidden [@media(max-width:860px)]:fixed [@media(max-width:860px)]:inset-x-0 [@media(max-width:860px)]:bottom-0 [@media(max-width:860px)]:top-[var(--topbar-height)] [@media(max-width:860px)]:z-30 [@media(max-width:860px)]:block [@media(max-width:860px)]:border-0 [@media(max-width:860px)]:bg-[rgba(8,8,7,0.48)] [@media(max-width:860px)]:transition-opacity [@media(max-width:860px)]:duration-150 [@media(max-width:860px)]:ease-linear motion-reduce:transition-none",
        visibility,
      )}
      type="button"
      aria-label="Close navigation"
      tabIndex={isOpen ? 0 : -1}
      onClick={onClose}
    />
  );
}

function WorkspaceHeader() {
  return (
    <header className="border-b border-[var(--line)]">
      <div
        className={cx(
          WORKSPACE_CONTAINER_CLASS,
          "pt-[26px] pb-5 [@media(max-width:860px)]:pt-6",
        )}
      >
        <p className="m-0 text-[11px] tracking-[0.08em] text-[var(--orange)]">
          SYSTEM / MARKET CONTEXT
        </p>
        <h1
          className={cx(
            DISPLAY_FONT_CLASS,
            "mt-2.5 mb-0 text-[32px] leading-[0.94] font-extrabold tracking-[0.045em] [@media(max-width:560px)]:text-[30px]",
          )}
          id="workspace-title"
        >
          ARAKAN NDAR
        </h1>
        <p
          className={cx(
            DISPLAY_FONT_CLASS,
            "mt-[7px] mb-0 text-[17px] leading-none tracking-[0.1em] text-[var(--secondary)] [@media(max-width:560px)]:text-[15px]",
          )}
        >
          MARKET ANALYSIS INTERFACE
        </p>
        <p className="mt-2.5 mb-0 text-[12px] text-[var(--faint)]">
          Select a market context or ask a question.
        </p>
      </div>
    </header>
  );
}

export default function MarketTerminal() {
  const isMobileViewport = useMobileViewport();
  const [theme, setTheme] = useState("light");
  const [activeNavId, setActiveNavId] = useState(DEFAULT_NAV_ID);
  const [selectedThreadId, setSelectedThreadId] = useState(
    DEFAULT_THREAD_ID,
  );
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [statusMessage, setStatusMessage] = useState("");

  const isNavigationOpen = isMobileViewport
    ? mobileNavOpen
    : !sidebarCollapsed;
  const themeClasses = THEME_CLASSES[theme];

  useEffect(() => {
    if (!mobileNavOpen) return undefined;

    function closeOnEscape(event) {
      if (event.key === "Escape") setMobileNavOpen(false);
    }

    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [mobileNavOpen]);

  function toggleNavigation() {
    if (isMobileViewport) {
      setMobileNavOpen((isOpen) => !isOpen);
      return;
    }

    setSidebarCollapsed((isCollapsed) => !isCollapsed);
  }

  function closeNavigation() {
    if (isMobileViewport) {
      setMobileNavOpen(false);
      return;
    }

    setSidebarCollapsed(true);
  }

  function startNewConversation() {
    setActiveNavId(DEFAULT_NAV_ID);
    setSelectedThreadId(null);
    setDraft("");
    setStatusMessage("New conversation ready.");
    if (isMobileViewport) setMobileNavOpen(false);
  }

  function selectThread(thread) {
    setSelectedThreadId(thread.id);
    setActiveNavId(DEFAULT_NAV_ID);
    setStatusMessage(`Opened ${thread.title}.`);
    if (isMobileViewport) setMobileNavOpen(false);
  }

  function selectNavigation(navId) {
    setActiveNavId(navId);
    if (isMobileViewport) setMobileNavOpen(false);
  }

  function openSettings() {
    setStatusMessage("Settings are not connected in this prototype.");
  }

  function submitPrompt(rawPrompt) {
    const question = rawPrompt.trim();

    if (!question) {
      setStatusMessage("Type a market question first.");
      return;
    }

    setActiveNavId(DEFAULT_NAV_ID);
    setSelectedThreadId(null);
    setStatusMessage(`Question queued: ${question}`);
    setDraft("");
  }

  const appFrameColumns = sidebarCollapsed
    ? "grid-cols-[0_minmax(0,1fr)]"
    : "grid-cols-[var(--sidebar-width)_minmax(0,1fr)]";

  return (
    <div
      className={cx(
        themeClasses,
        "min-h-screen min-h-svh min-w-80 bg-[var(--paper)] font-mono text-[var(--ink)] [--sidebar-width:250px] [--topbar-height:50px] [text-rendering:geometricPrecision] [@media(max-width:1180px)]:[--sidebar-width:220px] [@media(max-width:860px)]:[--topbar-height:48px]",
      )}
      data-theme={theme}
    >
      <TopBar
        theme={theme}
        isNavigationOpen={isNavigationOpen}
        onThemeChange={setTheme}
        onToggleNavigation={toggleNavigation}
      />

      <div
        className={cx(
          "grid min-h-[calc(100vh-var(--topbar-height))] supports-[height:100svh]:min-h-[calc(100svh-var(--topbar-height))] [@media(max-width:860px)]:grid-cols-1",
          appFrameColumns,
        )}
      >
        <NavigationBackdrop
          isOpen={mobileNavOpen}
          onClose={closeNavigation}
        />

        <Sidebar
          activeNavId={activeNavId}
          isDesktopCollapsed={sidebarCollapsed}
          isHidden={!isNavigationOpen}
          isMobileOpen={mobileNavOpen}
          selectedThreadId={selectedThreadId}
          onClose={closeNavigation}
          onNavChange={selectNavigation}
          onNewConversation={startNewConversation}
          onOpenSettings={openSettings}
          onThreadSelect={selectThread}
        />

        <main
          className="min-w-0 [background-image:linear-gradient(to_right,var(--grid)_1px,transparent_1px),linear-gradient(to_bottom,var(--grid)_1px,transparent_1px)] [background-position:-1px_-1px] [background-size:48px_48px]"
          id="workspace"
          aria-labelledby="workspace-title"
          inert={(isMobileViewport && mobileNavOpen) || undefined}
        >
          <WorkspaceHeader />

          <div
            className={cx(
              WORKSPACE_CONTAINER_CLASS,
              "pt-5 pb-12 [@media(max-width:860px)]:pt-[18px]",
            )}
          >
            <div className="border border-[var(--line)]" id="market">
              <MarketPanel />
              <Composer
                draft={draft}
                statusMessage={statusMessage}
                onDraftChange={setDraft}
                onStatusChange={setStatusMessage}
                onSubmitPrompt={submitPrompt}
              />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
