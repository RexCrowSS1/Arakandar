"use client";

import {
  useState,
  useRef,
  useEffect,
  useMemo,
  useCallback,
  useId,
  createContext,
  useContext,
} from "react";
import { useConversations } from "./use-conversations";
import { MessageMarkdown } from "./message-markdown.mjs";
import { useMarketResource } from "./use-market.mjs";
import { useChartFullscreen } from "./use-chart-fullscreen.mjs";
import {
  TIMEFRAMES,
  MIN_SPAN,
  MAX_SPAN,
  clamp,
  defaultRange,
  latestTime,
  clampToLatest,
  zoomRange,
  panRange,
  timeframeForSpan,
  visibleData,
  chartGeometry,
  timeTicks,
} from "./chart-viewport.mjs";
import {
  TICKER_CATALOG,
  SECTOR_CATALOG,
  fmt,
  pct,
  dateLabel,
  feedLabel,
  axisLabels,
  technicalSeries,
  priceDomain,
  linePath,
} from "./market-data.mjs";
const GROTESK = "var(--font-barlow-condensed), sans-serif";
const MONO = "var(--font-jetbrains), monospace";
const SECTORS_API_URL_STORAGE_KEY = "bandar-pasar.sectors-api-url";
// ─── THEME ────────────────────────────────────────────────────────────────────
const THEME = {
  dark: {
    bg: "#11110F",
    sidebar: "#141411",
    surface: "#181714",
    surfaceHi: "#201E19",
    navBg: "#0C0C0A",
    text: "#E8E5DE",
    textSec: "#8C8981",
    textMut: "#4A4844",
    border: "#34312B",
    orange: "#E58A3A",
    orangeDim: "rgba(229,138,58,0.15)",
    pos: "#4FAF72",
    neg: "#D85C5C",
    grid: "rgba(229,138,58,0.055)",
  },
  light: {
    bg: "#F4F1EA",
    sidebar: "#ECE8DE",
    surface: "#F8F6F0",
    surfaceHi: "#FFFFFF",
    navBg: "#E8E5DC",
    text: "#20201D",
    textSec: "#6F6B63",
    textMut: "#9C978F",
    border: "#D4CEC2",
    orange: "#B96532",
    orangeDim: "rgba(185,101,50,0.12)",
    pos: "#278451",
    neg: "#C34E4E",
    grid: "rgba(185,101,50,0.07)",
  },
};
const Ctx = createContext({});
const useApp = () => useContext(Ctx);
// ─── UTIL ─────────────────────────────────────────────────────────────────────
function lineChartPath(pts, W, H, px, py) {
  const { min, max } = priceDomain(pts);
  const toX = (i) => px + (i * (W - px * 2)) / Math.max(1, pts.length - 1);
  const toY = (v) => py + ((max - v) / (max - min)) * (H - py * 2);
  const line = linePath(pts, toX, toY);
  const last = pts.length
    ? { x: toX(pts.length - 1), y: toY(pts.at(-1)) }
    : null;
  return {
    line,
    area: last ? `${line} L${last.x},${H - py} L${px},${H - py} Z` : "",
    last,
  };
}
// ─── LOGO ─────────────────────────────────────────────────────────────────────
function LogoMark({ size = 24 }) {
  const { t } = useApp();
  return (
    <svg width={size} height={size} viewBox="0 0 24 22" fill="none">
      <line
        x1="1"
        y1="18"
        x2="23"
        y2="18"
        stroke={t.border}
        strokeWidth="0.6"
      />
      <line
        x1="1"
        y1="12"
        x2="23"
        y2="12"
        stroke={t.border}
        strokeWidth="0.6"
      />
      <polyline
        points="1,17 5,14 9,15 14,8 19,5 22,3"
        stroke="#4FAF72"
        strokeWidth="2"
        fill="none"
        strokeLinecap="square"
        strokeLinejoin="miter"
      />
      <path
        d="M19,2 L23,2 L23,6"
        stroke="#4FAF72"
        strokeWidth="2"
        fill="none"
        strokeLinecap="square"
        strokeLinejoin="miter"
      />
    </svg>
  );
}
// ─── ICONS ────────────────────────────────────────────────────────────────────
const Ico = {
  Search: () => (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
      <circle cx="5.5" cy="5.5" r="4" stroke="currentColor" strokeWidth="1.2" />
      <path
        d="M9 9l3 3"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="square"
      />
    </svg>
  ),
  Plus: () => (
    <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
      <path
        d="M5.5 1v9M1 5.5h9"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="square"
      />
    </svg>
  ),
  CL: () => (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
      <path
        d="M8 10.5L4.5 7 8 3.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="square"
        strokeLinejoin="miter"
      />
    </svg>
  ),
  CR: () => (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
      <path
        d="M5 3.5L8.5 7 5 10.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="square"
        strokeLinejoin="miter"
      />
    </svg>
  ),
  Send: () => (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
      <path
        d="M12 1L1 5.5l4 2.5 2.5 4L12 1Z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
    </svg>
  ),
  Clip: () => (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <path
        d="M10.5 5.5L6 10a3.5 3.5 0 0 1-4.95-4.95l4.5-4.5a2.2 2.2 0 0 1 3.11 3.11L4.18 8.14A.9.9 0 0 1 2.9 6.86L7 2.8"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  ),
  ChevD: () => (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
      <path
        d="M2 3.5l3 3 3-3"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="square"
      />
    </svg>
  ),
  Dots: () => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <circle cx="3" cy="7" r="1.2" fill="currentColor" />
      <circle cx="7" cy="7" r="1.2" fill="currentColor" />
      <circle cx="11" cy="7" r="1.2" fill="currentColor" />
    </svg>
  ),
  Min: () => (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <path
        d="M2 6h8"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="square"
      />
    </svg>
  ),
  Expand: () => (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <path
        d="M7 1h4v4M5 11H1V7M11 5L7 9M1 7l4-4"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="square"
      />
    </svg>
  ),
  Full: () => (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <path
        d="M1 4V1h3M8 1h3v3M11 8v3H8M4 11H1V8"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="square"
      />
    </svg>
  ),
  Close: () => (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <path
        d="M2 2l8 8M10 2l-8 8"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="square"
      />
    </svg>
  ),
  User: () => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <circle cx="7" cy="4.5" r="2.5" stroke="currentColor" strokeWidth="1.2" />
      <path
        d="M1.5 12.5c0-3.04 2.46-5.5 5.5-5.5s5.5 2.46 5.5 5.5"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  ),
  Cursor: () => (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <path
        d="M2 1l8 5-4 1-2 4L2 1Z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  ),
  Line: () => (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <path
        d="M2 10L10 2"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="square"
      />
    </svg>
  ),
  HLine: () => (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <path
        d="M1 6h10"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="square"
      />
    </svg>
  ),
  Rect: () => (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <rect
        x="1.5"
        y="2.5"
        width="9"
        height="7"
        stroke="currentColor"
        strokeWidth="1.2"
      />
    </svg>
  ),
  Arrow: () => (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <path
        d="M2 10L10 2M7 2h3v3"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="square"
      />
    </svg>
  ),
  Text: () => (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <path
        d="M1.5 2.5h9M6 2.5v7M4 9.5h4"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="square"
      />
    </svg>
  ),
  Measure: () => (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <path
        d="M1 6h10M1 4v4M11 4v4"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="square"
      />
    </svg>
  ),
};
// ─── SHARED ATOMS ─────────────────────────────────────────────────────────────
function Div({ v, style }) {
  const { t } = useApp();
  return (
    <div
      style={{
        flexShrink: 0,
        ...(v
          ? { width: "1px", alignSelf: "stretch" }
          : { height: "1px", width: "100%" }),
        backgroundColor: t.border,
        ...style,
      }}
    />
  );
}
function Lbl({ children, accent, style }) {
  const { t } = useApp();
  return (
    <span
      style={{
        fontFamily: MONO,
        fontSize: "9px",
        letterSpacing: "0.1em",
        color: accent ? t.orange : t.textMut,
        ...style,
      }}
    >
      {children}
    </span>
  );
}
function GhostBtn({ children, onClick, active, style }) {
  const { t } = useApp();
  const [h, setH] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      style={{
        fontFamily: MONO,
        fontSize: "9px",
        letterSpacing: "0.06em",
        padding: "3px 8px",
        cursor: "pointer",
        backgroundColor: active
          ? t.orangeDim
          : h
            ? t.surfaceHi + "88"
            : "transparent",
        color: active ? t.orange : h ? t.textSec : t.textMut,
        borderTop: "1px solid",
        borderRight: "1px solid",
        borderBottom: "1px solid",
        borderLeft: "1px solid",
        borderColor: active ? t.orange : h ? t.border : t.border,
        transition: "all 0.1s",
        ...style,
      }}
    >
      {children}
    </button>
  );
}
// ─── TOP TICKER ───────────────────────────────────────────────────────────────
function TopTicker({ onTickerClick, activeTicker }) {
  const { t, overview } = useApp();
  const TICKERS = TICKER_CATALOG.map((item) => {
    const quote = overview.quotes?.[item.id];
    return {
      ...item,
      value: fmt(quote?.price),
      change: pct(quote?.change_percent),
      up: quote?.change_percent >= 0,
      available: Number.isFinite(quote?.price),
      status: feedLabel(
        overview.status === "stale"
          ? { ...quote, status: "stale" }
          : quote || overview,
      ),
    };
  });
  const [paused, setPaused] = useState(false);
  const [fast, setFast] = useState(false);
  return (
    <header
      className="market-strip"
      style={{
        background: t.navBg,
        color: t.text,
        borderBottom: `1px solid ${t.border}`,
      }}
    >
      <div className="market-strip-label" style={{ color: t.orange }}>
        MARKETS{" "}
        <small>
          {overview.status === "stale"
            ? "STALE"
            : overview.status === "loading"
              ? "LOADING"
              : overview.status === "unavailable"
                ? "OFFLINE"
                : "DELAYED"}
        </small>
      </div>
      <div
        className="market-strip-viewport"
        role="region"
        aria-label="Market quotes · exchange-delayed data"
      >
        <div
          className="market-strip-track"
          style={{
            animationDuration: fast ? "24s" : "42s",
            animationPlayState: paused ? "paused" : undefined,
          }}
        >
          {[0, 1].map((copy) => (
            <div
              className="market-strip-group"
              key={copy}
              aria-hidden={copy === 1 ? true : undefined}
            >
              {TICKERS.map((tk) => (
                <button
                  key={tk.id}
                  type="button"
                  tabIndex={copy === 1 ? -1 : 0}
                  aria-pressed={activeTicker === tk.id}
                  title={`Analyze ${tk.label} · ${tk.status}`}
                  onClick={() => onTickerClick(tk.id)}
                  className="market-strip-quote"
                  style={{
                    borderColor: t.border,
                    background:
                      activeTicker === tk.id ? t.orangeDim : "transparent",
                  }}
                >
                  <span
                    style={{
                      color: activeTicker === tk.id ? t.orange : t.textSec,
                    }}
                  >
                    {tk.label}
                  </span>
                  <strong>{tk.value}</strong>
                  <span style={{ color: tk.up ? t.pos : t.neg }}>
                    {tk.available ? (tk.up ? "▲" : "▼") : ""} {tk.change}
                  </span>
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className="market-strip-controls">
        <button
          type="button"
          onClick={() => setPaused((v) => !v)}
          aria-pressed={paused}
          aria-label={paused ? "Lanjutkan ticker" : "Jeda ticker"}
          title={paused ? "Lanjutkan ticker" : "Jeda ticker"}
        >
          {paused ? "▶" : "Ⅱ"}
        </button>
        <button
          type="button"
          onClick={() => setFast((v) => !v)}
          aria-label="Ubah kecepatan ticker"
          title="Ubah kecepatan ticker"
        >
          {fast ? "1.75×" : "1×"}
        </button>
      </div>
    </header>
  );
}

// ─── SIDEBAR ──────────────────────────────────────────────────────────────────
function Sidebar({
  collapsed,
  setCollapsed,
  onNewConv,
  onHistoryClick,
  activeHistId,
  history,
}) {
  const { t } = useApp();
  const [search, setSearch] = useState("");
  const [searchFocus, setSF] = useState(false);
  const [profileOpen, setProf] = useState(false);
  const [settingsOpen, setSet] = useState(false);
  const { mode } = useApp();
  // we need to update mode from the profile menu — bubble up via a local mechanism
  // Mode toggle is handled via the AppCtx — for now store a callback in the parent
  // Actually, we need access to setMode — let's pass it as prop from App
  // For now, use a window event to signal theme change (hack but avoids prop drilling)
  const toggleMode = () => {
    window.dispatchEvent(new CustomEvent("toggleMode"));
  };
  const results =
    search.trim().length > 0
      ? history.filter((h) =>
          h.title.toLowerCase().includes(search.toLowerCase()),
        )
      : [];
  const collapsed_w = "44px";
  const expanded_w = "230px";
  return (
    <aside
      className="flex flex-col flex-shrink-0 relative"
      style={{
        width: collapsed ? collapsed_w : expanded_w,
        backgroundColor: t.sidebar,
        borderRight: `1px solid ${t.border}`,
        transition: "width 0.2s",
        overflow: "hidden",
      }}
    >
      {/* Logo */}
      <div
        className="flex items-center gap-2.5 px-3 py-3 flex-shrink-0"
        style={{ borderBottom: `1px solid ${t.border}`, minHeight: "52px" }}
      >
        <LogoMark size={22} />
        {!collapsed && (
          <div className="flex-1 min-w-0 leading-none">
            <div
              style={{
                fontFamily: GROTESK,
                fontWeight: 700,
                fontSize: "15px",
                letterSpacing: "0.08em",
                color: t.text,
                whiteSpace: "nowrap",
              }}
            >
              ARAKAN NDAR
            </div>
            <div
              style={{
                fontFamily: MONO,
                fontSize: "8.5px",
                color: t.textMut,
                letterSpacing: "0.06em",
                marginTop: "2px",
              }}
            >
              FINANCIAL PLATFORM
            </div>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          style={{
            color: t.textMut,
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: "2px",
            flexShrink: 0,
          }}
        >
          {collapsed ? <Ico.CR /> : <Ico.CL />}
        </button>
      </div>

      {!collapsed && (
        <>
          {/* Search */}
          <div
            className="px-3 py-2 flex-shrink-0"
            style={{ borderBottom: `1px solid ${t.border}` }}
          >
            <div
              className="flex items-center gap-2 px-2 py-1.5"
              style={{
                backgroundColor: t.surface,
                borderTop: "1px solid",
                borderRight: "1px solid",
                borderBottom: "1px solid",
                borderLeft: "1px solid",
                borderColor: searchFocus ? t.orange : t.border,
              }}
            >
              <span style={{ color: t.textMut }}>
                <Ico.Search />
              </span>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onFocus={() => setSF(true)}
                onBlur={() => setTimeout(() => setSF(false), 200)}
                placeholder="Search conversations, ticker..."
                style={{
                  flex: 1,
                  fontFamily: MONO,
                  fontSize: "10px",
                  color: t.text,
                  background: "none",
                  border: "none",
                  outline: "none",
                }}
              />
            </div>
            {results.length > 0 && searchFocus && (
              <div
                style={{
                  backgroundColor: t.surface,
                  border: `1px solid ${t.border}`,
                  borderTop: "none",
                }}
              >
                {results.slice(0, 5).map((r, i) => (
                  <div
                    key={i}
                    onClick={() => {
                      onHistoryClick(r);
                      setSearch("");
                    }}
                    className="flex items-center gap-2 px-3 py-2 cursor-pointer"
                    style={{
                      fontFamily: MONO,
                      fontSize: "10px",
                      color: t.textSec,
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.backgroundColor = t.surfaceHi)
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.backgroundColor = "")
                    }
                  >
                    <span style={{ color: t.orange }}>↗</span>{" "}
                    {"title" in r ? r.title : r.title}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* New conversation */}
          <div
            className="px-3 py-2 flex-shrink-0"
            style={{ borderBottom: `1px solid ${t.border}` }}
          >
            <NewConvBtn onClick={onNewConv} />
          </div>

          {/* History */}
          <div
            className="flex-1 overflow-y-auto px-3 py-2"
            style={{ scrollbarWidth: "none" }}
          >
            <Lbl
              style={{
                paddingLeft: "4px",
                marginBottom: "6px",
                display: "block",
              }}
            >
              RECENT
            </Lbl>
            {history.map((item) => (
              <HistRow
                key={item.id}
                item={item}
                active={activeHistId === item.id}
                onClick={() => onHistoryClick(item)}
              />
            ))}
          </div>
        </>
      )}

      {collapsed && (
        <div
          className="flex flex-col items-center gap-3 py-3 flex-1"
          style={{ scrollbarWidth: "none" }}
        >
          <button
            onClick={() => {
              setCollapsed(false);
            }}
            style={{
              color: t.textMut,
              background: "none",
              border: "none",
              cursor: "pointer",
            }}
          >
            <Ico.Search />
          </button>
          <button
            onClick={onNewConv}
            style={{
              color: t.textMut,
              background: "none",
              border: "none",
              cursor: "pointer",
            }}
          >
            <Ico.Plus />
          </button>
        </div>
      )}

      {/* Profile */}
      <ProfileSection
        collapsed={collapsed}
        profileOpen={profileOpen}
        setProf={setProf}
        onThemeToggle={toggleMode}
        settingsOpen={settingsOpen}
        setSet={setSet}
      />
    </aside>
  );
}
function NewConvBtn({ onClick }) {
  const { t } = useApp();
  const [h, setH] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      className="w-full flex items-center gap-2"
      style={{
        fontFamily: MONO,
        fontSize: "10px",
        letterSpacing: "0.06em",
        padding: "7px 10px",
        cursor: "pointer",
        backgroundColor: "transparent",
        color: h ? t.orange : t.textSec,
        borderTop: `1px solid ${h ? t.orange : t.border}`,
        borderRight: `1px solid ${h ? t.orange : t.border}`,
        borderBottom: `1px solid ${h ? t.orange : t.border}`,
        borderLeft: `1px solid ${h ? t.orange : t.border}`,
      }}
    >
      <Ico.Plus /> NEW CONVERSATION
    </button>
  );
}
function HistRow({ item, active, onClick }) {
  const { t } = useApp();
  const [h, setH] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      className="flex items-center gap-2 px-2 py-1.5 cursor-pointer"
      style={{
        backgroundColor: h || active ? t.surfaceHi + "66" : "transparent",
        borderLeft: active ? `2px solid ${t.orange}` : "2px solid transparent",
      }}
    >
      <span
        style={{
          fontFamily: MONO,
          fontSize: "10px",
          color: active ? t.orange : t.textMut,
        }}
      >
        {active ? "▮" : ">"}
      </span>
      <span
        style={{
          fontFamily: MONO,
          fontSize: "10.5px",
          color: active ? t.text : t.textSec,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {item.title}
      </span>
    </div>
  );
}
function ProfileSection({
  collapsed,
  profileOpen,
  setProf,
  onThemeToggle,
  settingsOpen,
  setSet,
}) {
  const { t, mode, user } = useApp();
  const [signingOut, setSigningOut] = useState(false);
  const [logoutError, setLogoutError] = useState("");
  async function signOut() {
    if (signingOut) return;
    setSigningOut(true);
    setLogoutError("");
    try {
      const response = await fetch("/api/auth/sign-out", { method: "POST" });
      if (!response.ok)
        throw new Error("Could not sign out. Please try again.");
      window.location.replace("/sign-in");
    } catch (error) {
      setLogoutError(error.message);
      setSigningOut(false);
    }
  }

  return (
    <div
      className="flex-shrink-0 relative"
      style={{ borderTop: `1px solid ${t.border}` }}
    >
      {profileOpen && (
        <div
          className="absolute bottom-full left-0 right-0 z-50"
          style={{
            backgroundColor: t.surface,
            border: `1px solid ${t.border}`,
            borderBottom: "none",
            padding: "8px 0",
          }}
        >
          <MenuRow
            label={signingOut ? "KELUAR…" : "SIGN OUT"}
            onClick={signOut}
          />
          {logoutError && (
            <p
              role="alert"
              style={{ color: t.neg, padding: "8px 14px", fontSize: 11 }}
            >
              {logoutError}
            </p>
          )}
          <Div style={{ margin: "4px 0" }} />
          <Lbl
            style={{
              padding: "2px 14px",
              display: "block",
              marginBottom: "2px",
            }}
          >
            PERSONAL INFORMATION
          </Lbl>
          {[
            { label: `Name: ${user?.name || "Pengguna"}` },
            { label: `Email: ${user?.email || ""}` },
            {
              label: `Account: ${user?.role === "admin" ? "Admin" : "Personal"}`,
            },
          ].map((r) => (
            <div
              key={r.label}
              className="px-4 py-1"
              style={{ fontFamily: MONO, fontSize: "9.5px", color: t.textSec }}
            >
              {r.label}
            </div>
          ))}
          <Div style={{ margin: "4px 0" }} />
          <Lbl
            style={{
              padding: "2px 14px",
              display: "block",
              marginBottom: "2px",
            }}
          >
            SETTINGS / THEME
          </Lbl>
          <MenuRow
            label={
              mode === "dark"
                ? "→ SWITCH TO LIGHT MODE"
                : "→ SWITCH TO DARK MODE"
            }
            onClick={() => {
              onThemeToggle();
            }}
          />
          <Div style={{ margin: "4px 0" }} />
          <Lbl
            style={{
              padding: "2px 14px",
              display: "block",
              marginBottom: "2px",
            }}
          >
            PERSONAL INTELLIGENCE
          </Lbl>
          <div
            className="px-4 py-1"
            style={{ fontFamily: MONO, fontSize: "9.5px", color: t.textSec }}
          >
            Preferred TF: 1D
          </div>
          <div
            className="px-4 py-1"
            style={{ fontFamily: MONO, fontSize: "9.5px", color: t.textSec }}
          >
            Watchlist: BBCA · BBRI · TLKM
          </div>
          <div
            className="px-4 py-1"
            style={{ fontFamily: MONO, fontSize: "9.5px", color: t.textSec }}
          >
            Indicators: RSI · MACD · MA20
          </div>
          <Div style={{ margin: "4px 0" }} />
          <MenuRow label="LOG OUT" onClick={() => setProf(false)} danger />
        </div>
      )}
      <button
        onClick={() => setProf(!profileOpen)}
        className="w-full flex items-center gap-3 px-3 py-3"
        style={{ background: "none", border: "none", cursor: "pointer" }}
        onMouseEnter={(e) =>
          (e.currentTarget.style.backgroundColor = t.surfaceHi + "66")
        }
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "")}
      >
        <div
          className="flex items-center justify-center flex-shrink-0"
          style={{
            width: "26px",
            height: "26px",
            borderRadius: "50%",
            backgroundColor: t.surface,
            border: `1px solid ${t.border}`,
            color: t.orange,
            fontSize: "10px",
            fontFamily: GROTESK,
            fontWeight: 700,
          }}
        >
          {(user?.name || "Pengguna").slice(0, 1)}
        </div>
        {!collapsed && (
          <div className="flex-1 text-left min-w-0">
            <div style={{ fontFamily: MONO, fontSize: "10px", color: t.text }}>
              {user?.name || "Pengguna"}
            </div>
            <div
              style={{
                fontFamily: MONO,
                fontSize: "8.5px",
                color: t.textMut,
                marginTop: "1px",
              }}
            >
              {user?.email || ""}
            </div>
          </div>
        )}
        {!collapsed && (
          <span style={{ color: t.textMut }}>
            <Ico.Dots />
          </span>
        )}
      </button>
    </div>
  );
}
function MenuRow({ label, onClick, danger }) {
  const { t } = useApp();
  return (
    <button
      onClick={onClick}
      className="w-full text-left px-4 py-1.5"
      style={{
        fontFamily: MONO,
        fontSize: "10px",
        color: danger ? t.neg : t.textSec,
        background: "none",
        border: "none",
        cursor: "pointer",
      }}
      onMouseEnter={(e) =>
        (e.currentTarget.style.backgroundColor = t.surfaceHi + "88")
      }
      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "")}
    >
      {label}
    </button>
  );
}
// ─── MARKET CHART ─────────────────────────────────────────────────────────────
function MarketChart({ tf }) {
  const { t, chart } = useApp();
  const bars = chart.bars || [];
  const pts = bars.map((bar) => bar.close);
  const W = 860,
    H = 200,
    PX = 48,
    PY = 12;
  const { line, area, last } = lineChartPath(pts, W, H, PX, PY);
  const { min: mn, max: mx } = priceDomain(pts);
  const ylabels = bars.length
    ? [mx, mn + (mx - mn) * 0.67, mn + (mx - mn) * 0.33, mn].map((v) =>
        fmt(v, 0),
      )
    : [];
  const xlabels = axisLabels(bars, chart.timezone, tf === "1D");
  const maxVolume = Math.max(1, ...bars.map((bar) => bar.volume || 0));
  return (
    <svg
      width="100%"
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      style={{ display: "block" }}
    >
      <defs>
        <linearGradient id="mktFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={t.pos} stopOpacity="0.1" />
          <stop offset="100%" stopColor={t.pos} stopOpacity="0.0" />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75].map((f, i) => (
        <line
          key={i}
          x1={PX}
          x2={W - PX}
          y1={PY + f * (H - PY * 2)}
          y2={PY + f * (H - PY * 2)}
          stroke={t.border}
          strokeWidth="1"
          strokeDasharray="2,6"
          strokeOpacity="0.8"
        />
      ))}
      {ylabels.map((v, i) => (
        <text
          key={i}
          x={PX - 4}
          y={PY + (i / (ylabels.length - 1)) * (H - PY * 2) + 4}
          textAnchor="end"
          fill={t.textMut}
          fontSize="8.5"
          fontFamily={MONO}
        >
          {v}
        </text>
      ))}
      <path d={area} fill="url(#mktFill)" />
      <path
        d={line}
        stroke={t.pos}
        strokeWidth="1.5"
        fill="none"
        strokeLinecap="square"
        strokeLinejoin="miter"
      />
      {/* Volume bars */}
      {pts.map((p, i) => {
        const x = PX + (i * (W - PX * 2)) / Math.max(1, pts.length - 1);
        const barH = ((bars[i].volume || 0) / maxVolume) * (H - PY * 2) * 0.18;
        return (
          <rect
            key={i}
            x={x - 2}
            y={H - PY - barH}
            width="4"
            height={barH}
            fill={t.pos}
            opacity="0.25"
          />
        );
      })}
      {last && (
        <g>
          <line
            x1={last.x}
            x2={last.x}
            y1={PY}
            y2={H - PY}
            stroke={t.orange}
            strokeWidth="1"
            strokeDasharray="2,3"
            strokeOpacity="0.5"
          />
          <rect
            x={last.x - 2}
            y={last.y - 2}
            width="4"
            height="4"
            fill={t.orange}
          />
        </g>
      )}
      {!bars.length && (
        <text
          x={W / 2}
          y={H / 2}
          textAnchor="middle"
          fill={t.textSec}
          fontSize="11"
          fontFamily={MONO}
        >
          {feedLabel(chart)}
        </text>
      )}
      {xlabels.map((lbl, i) => (
        <text
          key={i}
          x={PX + (i / (xlabels.length - 1)) * (W - PX * 2)}
          y={H - 1}
          textAnchor="middle"
          fill={t.textMut}
          fontSize="8.5"
          fontFamily={MONO}
        >
          {lbl}
        </text>
      ))}
    </svg>
  );
}
// ─── CANDLESTICK CHART ────────────────────────────────────────────────────────
function CandleChart({
  annotations,
  pendingAnnotation,
  drawTool,
  svgRef,
  range,
  geometry,
  visible,
  pointerHandlers,
  onKeyDown,
}) {
  const { t, chart, indicators, technicalTicker } = useApp();
  const clipId = useId().replace(/:/g, "");
  const { bars, series } = visible;
  const candles = bars.map((bar) => [bar.open, bar.high, bar.low, bar.close]);
  const {
    width: W,
    px: PX,
    py: PY,
    mainH,
    height: totalH,
    panelH,
    oscillators,
    min: mn,
    max: mx,
    toY,
    bodyW,
  } = geometry;
  const rsiH = panelH - 18;
  const toX = (i) => geometry.toX(Date.parse(bars[i].time));
  const overlays = [
    ...(indicators.has("MA") ? [["MA20", series.MA, t.orange]] : []),
    ...(indicators.has("EMA") ? [["EMA20", series.EMA, t.pos]] : []),
    ...(indicators.has("BOLLINGER")
      ? [
          ["BB upper", series.upper, t.textSec],
          ["BB lower", series.lower, t.textSec],
        ]
      : []),
    ...(indicators.has("VWAP") ? [["VWAP", series.VWAP, t.neg]] : []),
  ];
  const ylabels = bars.length
    ? [0.2, 0.5, 0.8].map((f) => mn + f * (mx - mn))
    : [];
  const maxVolume = Math.max(1, ...bars.map((bar) => bar.volume || 0));
  const cursor = drawTool === "cursor" ? "grab" : "crosshair";
  const renderAnnotation = (ann, opacity = 1) => {
    if (ann.ticker !== technicalTicker) return null;
    ann = {
      ...ann,
      x1: geometry.toX(ann.time1),
      x2: geometry.toX(ann.time2),
      y1: toY(ann.price1),
      y2: toY(ann.price2),
    };
    const col =
      ann.type === "support"
        ? t.pos
        : ann.type === "resistance"
          ? t.neg
          : ann.type === "trendline" ||
              ann.type === "arrow" ||
              ann.type === "measure" ||
              ann.type === "rectangle"
            ? t.orange
            : t.textSec;
    switch (ann.type) {
      case "trendline":
        return (
          <line
            key={ann.id}
            x1={ann.x1}
            y1={ann.y1}
            x2={ann.x2}
            y2={ann.y2}
            stroke={col}
            strokeWidth="1.5"
            strokeOpacity={opacity}
          />
        );
      case "horizontal":
        return (
          <line
            key={ann.id}
            x1={PX}
            y1={ann.y1}
            x2={W - PX}
            y2={ann.y1}
            stroke={col}
            strokeWidth="1.2"
            strokeDasharray="4,3"
            strokeOpacity={opacity}
          />
        );
      case "support":
        return (
          <g key={ann.id}>
            <line
              x1={PX}
              y1={ann.y1}
              x2={W - PX}
              y2={ann.y1}
              stroke={col}
              strokeWidth="1.2"
              strokeOpacity={opacity}
            />
            <text
              x={W - PX - 4}
              y={ann.y1 - 3}
              fill={col}
              fontSize="8"
              fontFamily={MONO}
              textAnchor="end"
              opacity={opacity}
            >
              SUPPORT
            </text>
          </g>
        );
      case "resistance":
        return (
          <g key={ann.id}>
            <line
              x1={PX}
              y1={ann.y1}
              x2={W - PX}
              y2={ann.y1}
              stroke={col}
              strokeWidth="1.2"
              strokeOpacity={opacity}
            />
            <text
              x={W - PX - 4}
              y={ann.y1 - 3}
              fill={col}
              fontSize="8"
              fontFamily={MONO}
              textAnchor="end"
              opacity={opacity}
            >
              RESISTANCE
            </text>
          </g>
        );
      case "rectangle":
        return (
          <rect
            key={ann.id}
            x={Math.min(ann.x1, ann.x2)}
            y={Math.min(ann.y1, ann.y2)}
            width={Math.abs(ann.x2 - ann.x1)}
            height={Math.abs(ann.y2 - ann.y1)}
            stroke={col}
            strokeWidth="1.2"
            fill={col}
            fillOpacity={0.06}
            strokeOpacity={opacity}
          />
        );
      case "arrow":
        return (
          <g key={ann.id}>
            <line
              x1={ann.x1}
              y1={ann.y1}
              x2={ann.x2}
              y2={ann.y2}
              stroke={col}
              strokeWidth="1.5"
              strokeOpacity={opacity}
            />
            <circle
              cx={ann.x2}
              cy={ann.y2}
              r="3"
              fill={col}
              opacity={opacity}
            />
          </g>
        );
      case "text":
        return (
          <text
            key={ann.id}
            x={ann.x1}
            y={ann.y1}
            fill={col}
            fontSize="10"
            fontFamily={MONO}
            opacity={opacity}
          >
            Analysis note
          </text>
        );
      case "measure":
        return (
          <g key={ann.id}>
            <rect
              x={Math.min(ann.x1, ann.x2)}
              y={Math.min(ann.y1, ann.y2)}
              width={Math.abs(ann.x2 - ann.x1)}
              height={Math.abs(ann.y2 - ann.y1)}
              stroke={col}
              strokeWidth="1"
              strokeDasharray="3,2"
              fill="none"
              strokeOpacity={opacity}
            />
            <text
              x={(ann.x1 + ann.x2) / 2}
              y={(ann.y1 + ann.y2) / 2}
              fill={col}
              fontSize="9"
              fontFamily={MONO}
              textAnchor="middle"
              opacity={opacity}
            >
              {pct(((ann.price2 - ann.price1) / ann.price1) * 100)}
            </text>
          </g>
        );
      default:
        return null;
    }
  };
  return (
    <svg
      width="100%"
      viewBox={`0 0 ${W} ${totalH}`}
      preserveAspectRatio="none"
      ref={svgRef}
      className="technical-candle-chart"
      data-from={range?.from}
      data-to={range?.to}
      data-bars={bars.length}
      role="application"
      aria-label="Interactive technical chart: scroll or pinch to zoom, drag to pan, use plus/minus to zoom, and press Home to reset"
      tabIndex={0}
      style={{ display: "block", cursor, touchAction: "none" }}
      {...pointerHandlers}
      onKeyDown={onKeyDown}
    >
      <defs>
        <clipPath id={clipId}>
          <rect x={PX} y={PY} width={W - PX * 2} height={mainH - PY * 2 - 14} />
        </clipPath>
      </defs>
      {ylabels.map((v) => (
        <g key={v}>
          <line
            x1={PX}
            x2={W - PX}
            y1={toY(v)}
            y2={toY(v)}
            stroke={t.border}
            strokeWidth="1"
            strokeDasharray="2,6"
            strokeOpacity="0.7"
          />
          <text
            x={PX - 4}
            y={toY(v) + 4}
            textAnchor="end"
            fill={t.textMut}
            fontSize="8.5"
            fontFamily={MONO}
          >
            {fmt(v, 0)}
          </text>
        </g>
      ))}
      <g clipPath={`url(#${clipId})`}>
        {candles.map(([o, h, l, c], i) => {
          const bull = c >= o,
            color = bull ? t.pos : t.neg;
          const cx = toX(i);
          const bTop = toY(Math.max(o, c)),
            bBot = toY(Math.min(o, c));
          return (
            <g key={i}>
              <line
                x1={cx}
                x2={cx}
                y1={toY(h)}
                y2={toY(l)}
                stroke={color}
                strokeWidth="1"
              />
              <rect
                x={cx - bodyW / 2}
                y={bTop}
                width={bodyW}
                height={Math.max(bBot - bTop, 1)}
                fill={color}
                opacity="0.85"
              />
            </g>
          );
        })}
        {overlays.map(([name, values, color]) => (
          <path
            key={name}
            d={linePath(values, toX, toY)}
            stroke={color}
            strokeWidth="1.2"
            fill="none"
          >
            <title>{name}</title>
          </path>
        ))}
        {indicators.has("VOLUME") &&
          bars.map((bar, i) => (
            <rect
              key={bar.time}
              x={toX(i) - bodyW / 2}
              y={mainH - PY - 14 - ((bar.volume || 0) / maxVolume) * 30}
              width={bodyW}
              height={((bar.volume || 0) / maxVolume) * 30}
              fill={bar.close >= bar.open ? t.pos : t.neg}
              opacity="0.25"
            >
              <title>Volume: {fmt(bar.volume, 0)}</title>
            </rect>
          ))}
      </g>
      {!bars.length && (
        <text
          x={W / 2}
          y={mainH / 2}
          textAnchor="middle"
          fill={t.textSec}
          fontSize="11"
          fontFamily={MONO}
        >
          {chart.bars?.length
            ? "No data for this range · use Reset"
            : feedLabel(chart)}
        </text>
      )}
      {bars.length > 0 && (
        <text x={PX} y={10} fill={t.textSec} fontSize="8" fontFamily={MONO}>
          {overlays
            .map(([name, values]) => `${name}: ${fmt(values.at(-1))}`)
            .join(" · ")}
          {indicators.has("VWAP") &&
          !chart.interval?.endsWith("m") &&
          chart.interval !== "4h"
            ? " · VWAP is only available intraday"
            : ""}
        </text>
      )}
      {timeTicks(range, chart.timezone).map(({ time, label }, i) => (
        <text
          key={time}
          x={geometry.toX(time)}
          y={mainH - 3}
          textAnchor={i === 0 ? "start" : i === 4 ? "end" : "middle"}
          fill={t.textSec}
          fontSize="9"
          fontFamily={MONO}
        >
          {label}
        </text>
      ))}
      {/* Annotations */}
      <g clipPath={`url(#${clipId})`}>
        {annotations.map((ann) => renderAnnotation(ann))}
        {pendingAnnotation && renderAnnotation(pendingAnnotation, 0.5)}
      </g>
      {oscillators.map((name, index) => {
        const values = name === "MACD" ? series.MACD.line : series[name];
        const signal = name === "MACD" ? series.MACD.signal : [];
        const domain =
          name === "MACD"
            ? priceDomain([...values, ...signal, 0])
            : { min: 0, max: 100 };
        const top = mainH + index * panelH + 18;
        const toOscY = (v) =>
          top +
          PY / 2 +
          ((domain.max - v) / (domain.max - domain.min)) * (rsiH - PY);
        const thresholds =
          name === "MACD" ? [0] : name === "RSI" ? [30, 70] : [20, 80];
        return (
          <g
            key={name}
            data-indicator={name}
            data-min={domain.min}
            data-max={domain.max}
          >
            <line
              x1={PX}
              x2={W - PX}
              y1={top}
              y2={top}
              stroke={t.border}
              strokeWidth="1"
            />
            <text
              x={PX}
              y={top - 2}
              fill={t.textMut}
              fontSize="8"
              fontFamily={MONO}
            >
              {name === "MACD" ? "MACD(12,26,9)" : `${name}(14)`}{" "}
              {fmt(values.at(-1))}
              {name === "MACD" ? ` · Signal ${fmt(signal.at(-1))}` : ""}
            </text>
            {thresholds.map((v) => (
              <line
                key={v}
                x1={PX}
                x2={W - PX}
                y1={toOscY(v)}
                y2={toOscY(v)}
                stroke={t.orange}
                strokeDasharray="3,4"
                strokeOpacity="0.65"
              />
            ))}
            {(name === "MACD"
              ? [domain.min, 0, domain.max]
              : [0, 25, 50, 75, 100]
            ).map((v) => (
              <g key={v}>
                <line
                  x1={PX}
                  x2={W - PX}
                  y1={toOscY(v)}
                  y2={toOscY(v)}
                  stroke={t.textMut}
                  strokeDasharray="2,4"
                />
                <text
                  x={W - PX + 2}
                  y={toOscY(v) + 3}
                  fill={t.textMut}
                  fontSize="7.5"
                  fontFamily={MONO}
                >
                  {name === "MACD" ? fmt(v) : v}
                </text>
              </g>
            ))}
            <path
              d={linePath(values, toX, toOscY)}
              stroke={t.orange}
              strokeWidth="1.5"
              fill="none"
            />
            {name === "MACD" && (
              <path
                d={linePath(signal, toX, toOscY)}
                stroke={t.pos}
                strokeWidth="1.2"
                fill="none"
              />
            )}
          </g>
        );
      })}
    </svg>
  );
}
// ─── MARKET WORKSPACE ─────────────────────────────────────────────────────────
function MarketWorkspace({ onManualAnalysis, setAiQ }) {
  const {
    t,
    activeTicker,
    marketTf: tf,
    setMarketTf: setTf,
    chart,
    overview,
    sectors,
    news,
    sectorsApiUrl,
    setSectorsApiUrl,
  } = useApp();
  const quote = chart.quote || {};
  const breadth = overview.breadth || {};
  const sectorRows =
    sectors.sectors?.length > 0
      ? sectors.sectors
      : SECTOR_CATALOG.map((sector) => ({ ticker: sector.ticker, label: sector.label }));
  const SECTORS = sectorRows.map((sector) => ({
    ticker: sector.ticker,
    label: sector.label || sector.ticker,
    pct: sector.change_percent,
  }));
  const TOP_GAINERS = overview.gainers || [];
  const TOP_LOSERS = overview.losers || [];
  const BUY_BROKERS = [{ code: "IDX feed required", val: "—" }];
  const SELL_BROKERS = BUY_BROKERS;
  const NEWS = (news.sources || []).map((source) => ({
    category: source.source || "NEWS",
    time: dateLabel(source.published_at),
    headline: source.title,
    body: source.snippet,
    url: source.url,
  }));
  const [openNews, setOpenNews] = useState(null);
  const [selBroker, setSelBroker] = useState(null);
  const [selSector, setSelSector] = useState(null);
  const [selMover, setSelMover] = useState(null);
  const { setActiveTicker } = useApp();
  return (
    <div
      className="flex flex-col h-full overflow-y-auto"
      style={{ scrollbarWidth: "none" }}
    >
      <div className="flex-1 px-6 py-4" style={{ minWidth: 0 }}>
        {/* Workspace header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <Lbl accent style={{ marginBottom: "4px", display: "block" }}>
              SYSTEM / MARKET CONTEXT
            </Lbl>
            <h1
              style={{
                fontFamily: GROTESK,
                fontWeight: 800,
                fontSize: "22px",
                letterSpacing: "0.06em",
                color: t.text,
                lineHeight: 1,
              }}
            >
              ARAKAN NDAR / GENERAL
            </h1>
            <p
              style={{
                fontFamily: GROTESK,
                fontWeight: 500,
                fontSize: "12px",
                letterSpacing: "0.1em",
                color: t.textSec,
                marginTop: "2px",
              }}
            >
              GENERAL MARKET INTELLIGENCE
            </p>
          </div>
          <button
            onClick={onManualAnalysis}
            style={{
              fontFamily: MONO,
              fontSize: "9px",
              letterSpacing: "0.08em",
              padding: "5px 12px",
              cursor: "pointer",
              backgroundColor: "transparent",
              color: t.orange,
              borderTop: `1px solid ${t.orange}`,
              borderRight: `1px solid ${t.orange}`,
              borderBottom: `1px solid ${t.orange}`,
              borderLeft: `1px solid ${t.orange}`,
            }}
          >
            [ MANUAL ANALYSIS ]
          </button>
        </div>
        <div className="flex items-center gap-2 mb-4">
          <input
            aria-label="Custom sectors API URL (optional)"
            placeholder="Custom sectors API URL (optional)"
            value={sectorsApiUrl}
            onChange={(event) => setSectorsApiUrl(event.target.value)}
            style={{
              flex: 1,
              minWidth: 0,
              fontFamily: MONO,
              fontSize: "10px",
              color: t.text,
              backgroundColor: t.surface,
              borderTop: `1px solid ${t.border}`,
              borderRight: `1px solid ${t.border}`,
              borderBottom: `1px solid ${t.border}`,
              borderLeft: `1px solid ${t.border}`,
              padding: "5px 8px",
            }}
          />
          <button
            type="button"
            onClick={() => setSectorsApiUrl("")}
            style={{
              fontFamily: MONO,
              fontSize: "9px",
              letterSpacing: "0.06em",
              padding: "5px 10px",
              cursor: "pointer",
              color: t.orange,
              backgroundColor: "transparent",
              borderTop: `1px solid ${t.orange}`,
              borderRight: `1px solid ${t.orange}`,
              borderBottom: `1px solid ${t.orange}`,
              borderLeft: `1px solid ${t.orange}`,
            }}
          >
            DEFAULT
          </button>
        </div>

        {/* Market header */}
        <div className="flex items-baseline gap-4 mb-3">
          <div>
            <Lbl>
              {activeTicker} — {quote.name || activeTicker}
            </Lbl>
            <div className="flex items-baseline gap-3 mt-1">
              <span
                style={{
                  fontFamily: GROTESK,
                  fontWeight: 700,
                  fontSize: "26px",
                  color: t.text,
                  letterSpacing: "-0.01em",
                }}
              >
                {fmt(quote.price)}
              </span>
              <span
                style={{ fontFamily: MONO, fontSize: "12px", color: t.pos }}
              >
                {pct(quote.change_percent)}
              </span>
              <span
                style={{
                  fontFamily: MONO,
                  fontSize: "9px",
                  color: t.pos,
                  backgroundColor: t.pos + "18",
                  padding: "1px 6px",
                }}
              >
                {quote.status === "ok"
                  ? "DELAYED"
                  : quote.status === "stale"
                    ? "STALE"
                    : "—"}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1 ml-auto">
            {["1D", "5D", "1M", "3M", "6M", "1Y", "ALL"].map((f) => (
              <button
                key={f}
                onClick={() => {
                  setTf(f);
                }}
                style={{
                  fontFamily: MONO,
                  fontSize: "9px",
                  letterSpacing: "0.04em",
                  padding: "2px 7px",
                  cursor: "pointer",
                  backgroundColor: "transparent",
                  color: tf === f ? t.orange : t.textMut,
                  border: "1px solid transparent",
                  borderBottom:
                    tf === f
                      ? `2px solid ${t.orange}`
                      : "2px solid transparent",
                }}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Chart */}
        <div style={{ border: `1px solid ${t.border}`, marginBottom: "1px" }}>
          <MarketChart tf={tf} />
        </div>
        <div
          className="flex justify-between px-1 pb-3"
          style={{ borderBottom: `1px solid ${t.border}` }}
        >
          <Lbl>{feedLabel(chart)} · auto-refresh 60s</Lbl>
        </div>

        {/* Two column data grid */}
        <div
          className="grid grid-cols-2 gap-0 mt-0"
          style={{ borderBottom: `1px solid ${t.border}` }}
        >
          {/* Market Overview */}
          <DataSection
            title="MARKET OVERVIEW"
            style={{ borderRight: `1px solid ${t.border}` }}
          >
            {[
              {
                k: `Current (${quote.currency || "—"})`,
                v: fmt(quote.price),
                pos: null,
              },
              {
                k: "Change",
                v: fmt(quote.change),
                pos: Number.isFinite(quote.change) ? quote.change >= 0 : null,
              },
              {
                k: "Change %",
                v: pct(quote.change_percent),
                pos: Number.isFinite(quote.change) ? quote.change >= 0 : null,
              },
              { k: "Volume", v: fmt(quote.volume, 0), pos: null },
              { k: "Value (IDX feed)", v: "—", pos: null },
              { k: "Frequency (IDX feed)", v: "—", pos: null },
            ].map((r) => (
              <DataRow key={r.k} label={r.k} value={r.v} pos={r.pos} />
            ))}
          </DataSection>

          {/* Flow */}
          <DataSection title="FUND FLOW · IDX FEED REQUIRED">
            <Lbl style={{ display: "block", marginBottom: "4px" }}>FOREIGN</Lbl>
            {[
              { k: "Buy", v: "—", pos: true },
              { k: "Sell", v: "—", pos: false },
              { k: "Net", v: "—", pos: true },
            ].map((r) => (
              <DataRow key={r.k} label={r.k} value={r.v} pos={r.pos} />
            ))}
            <Lbl
              style={{
                display: "block",
                marginTop: "8px",
                marginBottom: "4px",
              }}
            >
              DOMESTIC
            </Lbl>
            {[
              { k: "Buy", v: "—", pos: true },
              { k: "Sell", v: "—", pos: false },
              { k: "Net", v: "—", pos: true },
            ].map((r) => (
              <DataRow key={r.k} label={r.k} value={r.v} pos={r.pos} />
            ))}
          </DataSection>
        </div>

        <div
          className="grid grid-cols-2 gap-0"
          style={{ borderBottom: `1px solid ${t.border}` }}
        >
          {/* Broker Summary */}
          <DataSection
            title="BROKER SUMMARY"
            style={{ borderRight: `1px solid ${t.border}` }}
          >
            <Lbl style={{ display: "block", marginBottom: "4px" }}>TOP BUY</Lbl>
            {BUY_BROKERS.map((b) => (
              <div
                key={b.code}
                onClick={() => {
                  setSelBroker(b.code);
                  setAiQ(
                    "Broker summary data is not available. What data is needed for broker analysis?",
                  );
                }}
                className="flex justify-between py-1 cursor-pointer px-1"
                style={{
                  backgroundColor:
                    selBroker === b.code ? t.orangeDim : "transparent",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.backgroundColor = t.surfaceHi)
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.backgroundColor =
                    selBroker === b.code ? t.orangeDim : "transparent")
                }
              >
                <span
                  style={{
                    fontFamily: MONO,
                    fontSize: "10px",
                    color: t.textSec,
                  }}
                >
                  {b.code}
                </span>
                <span
                  style={{ fontFamily: MONO, fontSize: "10px", color: t.pos }}
                >
                  {b.val}
                </span>
              </div>
            ))}
            <Lbl
              style={{
                display: "block",
                marginTop: "8px",
                marginBottom: "4px",
              }}
            >
              TOP SELL
            </Lbl>
            {SELL_BROKERS.map((b) => (
              <div
                key={b.code}
                onClick={() => {
                  setSelBroker(b.code);
                  setAiQ(
                    "Broker summary data is not available. What data is needed for broker analysis?",
                  );
                }}
                className="flex justify-between py-1 cursor-pointer px-1"
                style={{
                  backgroundColor:
                    selBroker === b.code ? t.orangeDim : "transparent",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.backgroundColor = t.surfaceHi)
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.backgroundColor =
                    selBroker === b.code ? t.orangeDim : "transparent")
                }
              >
                <span
                  style={{
                    fontFamily: MONO,
                    fontSize: "10px",
                    color: t.textSec,
                  }}
                >
                  {b.code}
                </span>
                <span
                  style={{ fontFamily: MONO, fontSize: "10px", color: t.neg }}
                >
                  {b.val}
                </span>
              </div>
            ))}
          </DataSection>

          {/* Market Breadth */}
          <DataSection
            title={`BREADTH · WATCHLIST ${breadth.available ?? 0}/${breadth.total ?? 9}${overview.status === "stale" ? " · STALE" : overview.status === "partial" ? " · PARTIAL" : overview.status === "unavailable" ? " · OFFLINE" : ""}`}
          >
            {[
              { k: "Advancing", v: fmt(breadth.advancing, 0), pos: true },
              { k: "Declining", v: fmt(breadth.declining, 0), pos: false },
              { k: "Unchanged", v: fmt(breadth.unchanged, 0), pos: null },
              { k: "New High", v: "—", pos: true },
              { k: "New Low", v: "—", pos: false },
            ].map((r) => (
              <DataRow key={r.k} label={r.k} value={r.v} pos={r.pos} />
            ))}
            <div
              className="flex mt-3"
              style={{ height: "4px", borderRadius: "0" }}
            >
              <div
                style={{ flex: breadth.advancing || 0, backgroundColor: t.pos }}
              />
              <div
                style={{
                  flex: breadth.unchanged || 0,
                  backgroundColor: t.textMut + "55",
                }}
              />
              <div
                style={{ flex: breadth.declining || 0, backgroundColor: t.neg }}
              />
            </div>
          </DataSection>
        </div>

        <div
          className="grid grid-cols-2 gap-0"
          style={{ borderBottom: `1px solid ${t.border}` }}
        >
          {/* Sectors */}
          <DataSection
            title={`SECTOR PERFORMANCE${sectors.status === "stale" ? " · STALE" : sectors.status === "partial" ? " · PARTIAL" : sectors.status === "unavailable" ? " · OFFLINE" : ""}`}
            style={{ borderRight: `1px solid ${t.border}` }}
          >
            {SECTORS.map((s) => (
              <div
                key={s.label}
                onClick={() => {
                  setSelSector(s.label);
                  setActiveTicker(s.ticker);
                  setAiQ(`Analyze ${s.label} sector`);
                }}
                className="flex items-center gap-2 py-1 cursor-pointer px-1"
                style={{
                  backgroundColor:
                    selSector === s.label ? t.orangeDim : "transparent",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.backgroundColor = t.surfaceHi)
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.backgroundColor =
                    selSector === s.label ? t.orangeDim : "transparent")
                }
              >
                <span
                  style={{
                    fontFamily: MONO,
                    fontSize: "10px",
                    color: t.textSec,
                    flex: 1,
                  }}
                >
                  {s.label}
                </span>
                <div
                  style={{
                    width: "50px",
                    height: "2px",
                    backgroundColor: s.pct > 0 ? t.pos : t.neg,
                    opacity: Number.isFinite(s.pct)
                      ? Math.min(1, Math.abs(s.pct) / 2)
                      : 0,
                  }}
                />
                <span
                  style={{
                    fontFamily: MONO,
                    fontSize: "10px",
                    color: s.pct > 0 ? t.pos : t.neg,
                    minWidth: "44px",
                    textAlign: "right",
                  }}
                >
                  {pct(s.pct)}
                </span>
              </div>
            ))}
          </DataSection>

          {/* Top movers */}
          <DataSection
            title={`TOP MOVERS · WATCHLIST 9${overview.status === "stale" ? " · STALE" : overview.status === "partial" ? " · PARTIAL" : overview.status === "unavailable" ? " · OFFLINE" : ""}`}
          >
            <Lbl style={{ display: "block", marginBottom: "4px" }}>GAINERS</Lbl>
            {!TOP_GAINERS.length && (
              <Lbl>
                {overview.status === "loading"
                  ? "Loading…"
                  : "No gainers data available"}
              </Lbl>
            )}
            {TOP_GAINERS.map((m) => (
              <div
                key={m.ticker}
                onClick={() => {
                  setActiveTicker(m.ticker);
                  setAiQ(`Analyze ${m.ticker}`);
                  setSelMover(m.ticker);
                }}
                className="flex justify-between py-1 cursor-pointer px-1"
                style={{
                  backgroundColor:
                    selMover === m.ticker ? t.orangeDim : "transparent",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.backgroundColor = t.surfaceHi)
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.backgroundColor =
                    selMover === m.ticker ? t.orangeDim : "transparent")
                }
              >
                <span
                  style={{
                    fontFamily: MONO,
                    fontSize: "10px",
                    color: t.textSec,
                  }}
                >
                  {m.ticker}
                </span>
                <span
                  style={{ fontFamily: MONO, fontSize: "10px", color: t.pos }}
                >
                  {pct(m.change_percent)}
                </span>
              </div>
            ))}
            <Lbl
              style={{
                display: "block",
                marginTop: "8px",
                marginBottom: "4px",
              }}
            >
              LOSERS
            </Lbl>
            {!TOP_LOSERS.length && (
              <Lbl>
                {overview.status === "loading"
                  ? "Loading…"
                  : "No losers data available"}
              </Lbl>
            )}
            {TOP_LOSERS.map((m) => (
              <div
                key={m.ticker}
                onClick={() => {
                  setActiveTicker(m.ticker);
                  setAiQ(`Analyze ${m.ticker}`);
                  setSelMover(m.ticker);
                }}
                className="flex justify-between py-1 cursor-pointer px-1"
                style={{
                  backgroundColor:
                    selMover === m.ticker ? t.orangeDim : "transparent",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.backgroundColor = t.surfaceHi)
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.backgroundColor =
                    selMover === m.ticker ? t.orangeDim : "transparent")
                }
              >
                <span
                  style={{
                    fontFamily: MONO,
                    fontSize: "10px",
                    color: t.textSec,
                  }}
                >
                  {m.ticker}
                </span>
                <span
                  style={{ fontFamily: MONO, fontSize: "10px", color: t.neg }}
                >
                  {pct(m.change_percent)}
                </span>
              </div>
            ))}
          </DataSection>
        </div>

        {/* Latest news */}
        <DataSection
          title={`LATEST NEWS · ${activeTicker}${news.status === "stale" ? " · STALE" : ""}`}
        >
          {!NEWS.length && (
            <Lbl>
              {news.status === "loading"
                ? "Loading news…"
                : "News is not available"}
            </Lbl>
          )}
          {NEWS.map((n, i) => (
            <div key={i}>
              <div
                onClick={() => setOpenNews(openNews === i ? null : i)}
                className="flex items-center gap-3 py-2 cursor-pointer"
                style={{ borderBottom: `1px solid ${t.border}` }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.backgroundColor = t.surfaceHi + "66")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.backgroundColor = "")
                }
              >
                <span
                  style={{
                    fontFamily: MONO,
                    fontSize: "8.5px",
                    color: t.orange,
                    minWidth: "80px",
                  }}
                >
                  {n.category}
                </span>
                <span
                  style={{
                    fontFamily: MONO,
                    fontSize: "9px",
                    color: t.textMut,
                    minWidth: "36px",
                  }}
                >
                  {n.time}
                </span>
                <span
                  style={{
                    fontFamily: MONO,
                    fontSize: "10px",
                    color: t.text,
                    flex: 1,
                  }}
                >
                  {n.headline}
                </span>
                <span
                  style={{
                    fontFamily: MONO,
                    fontSize: "10px",
                    color: t.textMut,
                  }}
                >
                  {openNews === i ? "▲" : "▼"}
                </span>
              </div>
              {openNews === i && (
                <div
                  className="py-2 px-1"
                  style={{ borderBottom: `1px solid ${t.border}` }}
                >
                  <p
                    style={{
                      fontFamily: MONO,
                      fontSize: "10px",
                      color: t.textSec,
                      lineHeight: "1.6",
                    }}
                  >
                    {n.body}{" "}
                    {n.url && (
                      <a href={n.url} target="_blank" rel="noreferrer">
                        Read source ↗
                      </a>
                    )}
                  </p>
                </div>
              )}
            </div>
          ))}
        </DataSection>
      </div>
    </div>
  );
}
function DataSection({ title, children, style }) {
  const { t } = useApp();
  return (
    <div
      className="py-3 px-4"
      style={{ borderTop: `1px solid ${t.border}`, ...style }}
    >
      <Lbl accent style={{ display: "block", marginBottom: "8px" }}>
        {title}
      </Lbl>
      {children}
    </div>
  );
}
function DataRow({ label, value, pos }) {
  const { t } = useApp();
  return (
    <div className="flex justify-between py-0.5">
      <span style={{ fontFamily: MONO, fontSize: "10px", color: t.textMut }}>
        {label}
      </span>
      <span
        style={{
          fontFamily: MONO,
          fontSize: "10px",
          color: pos === true ? t.pos : pos === false ? t.neg : t.text,
        }}
      >
        {value}
      </span>
    </div>
  );
}
// ─── TECHNICAL WORKSPACE ──────────────────────────────────────────────────────
const ALL_INDICATORS = [
  "MA",
  "EMA",
  "RSI",
  "MACD",
  "BOLLINGER",
  "VOLUME",
  "STOCHASTIC",
  "VWAP",
];
const DRAW_TOOLS = [
  ["cursor", Ico.Cursor],
  ["trendline", Ico.Line],
  ["horizontal", Ico.HLine],
  ["support", () => <span style={{ fontSize: "9px" }}>S</span>],
  ["resistance", () => <span style={{ fontSize: "9px" }}>R</span>],
  ["rectangle", Ico.Rect],
  ["arrow", Ico.Arrow],
  ["text", Ico.Text],
  ["measure", Ico.Measure],
];
function TechnicalWorkspace({ onBackToMarket, setAiQ }) {
  const {
    t,
    technicalTicker: ticker,
    setTechnicalTicker: setTicker,
    technicalTf: tf,
    setTechnicalTf: setTf,
    indicators,
    setIndicators,
    chart,
    series,
  } = useApp();
  const [tickerOpen, setTickerOpen] = useState(false);
  const [drawTool, setDrawTool] = useState("cursor");
  const [annotations, setAnnotations] = useState([]);
  const [pending, setPending] = useState(null);
  const [notes, setNotes] = useState("");
  const frameRef = useRef(null);
  const svgRef = useRef(null);
  const pointers = useRef(new Map());
  const gesture = useRef(null);
  const { expanded, toggle: toggleFullscreen } = useChartFullscreen(frameRef);
  const [view, setView] = useState(null);
  const viewKey = `${ticker}:${tf}`;
  const latest =
    latestTime(chart.bars || [], chart.quote?.as_of) ??
    (view?.key === viewKey ? view.latest : null);
  const storedView = view?.key === viewKey ? view : null;
  const range = useMemo(
    () =>
      storedView
        ? storedView.followLatest && latest
          ? {
              from: latest - (storedView.range.to - storedView.range.from),
              to: latest,
            }
          : storedView.range
        : defaultRange(chart.bars || [], tf, chart.quote?.as_of),
    [storedView, latest, chart.bars, chart.quote?.as_of, tf],
  );
  const visible = useMemo(
    () => visibleData(chart.bars || [], series, range),
    [chart.bars, series, range],
  );
  const geometry = useMemo(
    () => chartGeometry(visible.bars, visible.series, indicators, range, tf),
    [visible, indicators, range, tf],
  );
  const lastBar = visible.bars.at(-1);
  const span = range ? range.to - range.from : 0;
  const applyRange = useCallback(
    (next, automatic = true) => {
      if (!next) return;
      next = clampToLatest(next, latest);
      const nextTf = automatic ? timeframeForSpan(next.to - next.from) : tf;
      setView({
        key: `${ticker}:${nextTf}`,
        range: next,
        latest,
        followLatest: latest !== null && next.to >= latest - 1,
      });
      if (nextTf !== tf) setTf(nextTf);
      setPending(null);
    },
    [ticker, tf, setTf, latest],
  );
  const zoom = (factor, anchor = 1) =>
    applyRange(zoomRange(range, factor, anchor));
  const resetView = () => {
    setView(null);
    setPending(null);
  };
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const wheel = (event) => {
      if (!range) return;
      event.preventDefault();
      const rect = svg.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * geometry.width;
      const delta =
        event.deltaY *
        (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? rect.height : 1);
      applyRange(
        zoomRange(
          range,
          Math.exp(clamp(delta, -120, 120) * 0.003),
          (x - geometry.px) / (geometry.width - geometry.px * 2),
        ),
      );
    };
    svg.addEventListener("wheel", wheel, { passive: false });
    return () => svg.removeEventListener("wheel", wheel);
  }, [range, geometry, applyRange]);
  const togInd = (k) => {
    setIndicators((prev) => {
      const n = new Set(prev);
      n.has(k) ? n.delete(k) : n.add(k);
      return n;
    });
    setAiQ(`Analyze ${ticker} with ${k} indicator`);
  };
  const svgCoords = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * geometry.width,
      y: ((event.clientY - rect.top) / rect.height) * geometry.height,
    };
  };
  const makeAnnotation = (type, from, to) => ({
    id: "pending",
    type,
    ticker,
    time1: geometry.fromX(from.x),
    price1: geometry.fromY(from.y),
    time2: geometry.fromX(to.x),
    price2: geometry.fromY(to.y),
  });
  const startPinch = () => {
    const [a, b] = [...pointers.current.values()];
    gesture.current = {
      type: "pinch",
      range,
      distance: Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)),
      anchor: clamp(
        ((a.x + b.x) / 2 - geometry.px) / (geometry.width - geometry.px * 2),
        0,
        1,
      ),
    };
    setPending(null);
  };
  const onPointerDown = (event) => {
    if (!range || (event.button != null && event.button !== 0)) return;
    event.currentTarget.focus?.();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    const point = svgCoords(event);
    pointers.current.set(event.pointerId, point);
    if (pointers.current.size === 2) {
      startPinch();
      return;
    }
    if (drawTool === "cursor") gesture.current = { type: "pan", point, range };
    else if (
      point.y >= geometry.py &&
      point.y <= geometry.mainH - geometry.py - 14 &&
      visible.bars.length
    ) {
      const annotation = makeAnnotation(drawTool, point, point);
      gesture.current = { type: "draw", point, annotation };
      setPending(annotation);
    }
  };
  const onPointerMove = (event) => {
    if (!pointers.current.has(event.pointerId)) return;
    const point = svgCoords(event);
    pointers.current.set(event.pointerId, point);
    const current = gesture.current;
    if (!current) return;
    if (pointers.current.size >= 2 && current.type === "pinch") {
      const [a, b] = [...pointers.current.values()];
      const distance = Math.max(1, Math.hypot(a.x - b.x, a.y - b.y));
      applyRange(
        zoomRange(current.range, current.distance / distance, current.anchor),
      );
    } else if (current.type === "pan") {
      applyRange(
        panRange(
          current.range,
          (current.point.x - point.x) / (geometry.width - geometry.px * 2),
        ),
        false,
      );
    } else if (current.type === "draw") {
      current.annotation = makeAnnotation(
        current.annotation.type,
        current.point,
        {
          x: point.x,
          y: clamp(point.y, geometry.py, geometry.mainH - geometry.py - 14),
        },
      );
      setPending(current.annotation);
    }
  };
  const onPointerUp = (event) => {
    const current = gesture.current;
    if (current?.type === "draw")
      setAnnotations((previous) => [
        ...previous,
        { ...current.annotation, id: crypto.randomUUID() },
      ]);
    pointers.current.delete(event.pointerId);
    gesture.current = null;
    setPending(null);
    if (pointers.current.size === 1)
      gesture.current = {
        type: "pan",
        point: [...pointers.current.values()][0],
        range,
      };
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };
  const cancelGesture = () => {
    pointers.current.clear();
    gesture.current = null;
    setPending(null);
  };
  const onChartKeyDown = (event) => {
    if (["+", "="].includes(event.key)) {
      event.preventDefault();
      zoom(0.5);
    } else if (event.key === "-") {
      event.preventDefault();
      zoom(2);
    } else if (event.key === "Home") {
      event.preventDefault();
      resetView();
    } else if (["ArrowLeft", "ArrowRight"].includes(event.key)) {
      event.preventDefault();
      applyRange(
        panRange(range, event.key === "ArrowLeft" ? -0.2 : 0.2),
        false,
      );
    }
  };
  return (
    <div
      className="flex flex-col h-full overflow-y-auto"
      style={{ scrollbarWidth: "none" }}
    >
      <div className="px-6 py-4 flex-1">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div>
            <Lbl accent style={{ display: "block", marginBottom: "4px" }}>
              SYSTEM / TECHNICAL ANALYSIS
            </Lbl>
            <h1
              style={{
                fontFamily: GROTESK,
                fontWeight: 800,
                fontSize: "22px",
                letterSpacing: "0.06em",
                color: t.text,
                lineHeight: 1,
              }}
            >
              ARAKAN NDAR / TECHNICAL
            </h1>
            <p
              style={{
                fontFamily: GROTESK,
                fontWeight: 500,
                fontSize: "12px",
                letterSpacing: "0.1em",
                color: t.textSec,
                marginTop: "2px",
              }}
            >
              MANUAL TECHNICAL ANALYSIS
            </p>
          </div>
          <button
            onClick={onBackToMarket}
            style={{
              fontFamily: MONO,
              fontSize: "9px",
              letterSpacing: "0.08em",
              padding: "5px 12px",
              cursor: "pointer",
              backgroundColor: "transparent",
              color: t.textSec,
              borderTop: `1px solid ${t.border}`,
              borderRight: `1px solid ${t.border}`,
              borderBottom: `1px solid ${t.border}`,
              borderLeft: `1px solid ${t.border}`,
            }}
          >
            ← MARKET VIEW
          </button>
        </div>

        <section
          ref={frameRef}
          className={`technical-chart-frame${expanded ? " is-fullscreen" : ""}`}
          aria-label="Chart analysis"
          style={{
            "--chart-bg": t.bg,
            "--chart-border": t.border,
            "--chart-accent": t.orange,
            "--chart-text": t.textSec,
            "--chart-active": t.orangeDim,
          }}
        >
          {/* Controls row */}
          <div className="technical-chart-controls flex items-center gap-4 mb-3">
            {/* Ticker */}
            <div className="relative">
              <button
                onClick={() => setTickerOpen((v) => !v)}
                className="flex items-center gap-1.5"
                style={{
                  fontFamily: MONO,
                  fontSize: "10px",
                  letterSpacing: "0.06em",
                  padding: "4px 10px",
                  cursor: "pointer",
                  backgroundColor: tickerOpen ? t.orangeDim : "transparent",
                  color: tickerOpen ? t.orange : t.textSec,
                  borderTop: `1px solid ${tickerOpen ? t.orange : t.border}`,
                  borderRight: `1px solid ${tickerOpen ? t.orange : t.border}`,
                  borderBottom: `1px solid ${tickerOpen ? t.orange : t.border}`,
                  borderLeft: `1px solid ${tickerOpen ? t.orange : t.border}`,
                }}
              >
                {ticker} <Ico.ChevD />
              </button>
              {tickerOpen && (
                <div
                  className="absolute left-0 top-full z-20"
                  style={{
                    backgroundColor: t.surface,
                    border: `1px solid ${t.border}`,
                    minWidth: "100px",
                  }}
                >
                  {["BBCA", "BBRI", "BMRI", "TLKM", "ASII", "IHSG"].map(
                    (tk) => (
                      <div
                        key={tk}
                        onClick={() => {
                          setTicker(tk);
                          resetView();
                          setAnnotations([]);
                          setPending(null);
                          setTickerOpen(false);
                          setAiQ(`Analyze ${tk}`);
                        }}
                        className="px-3 py-1.5 cursor-pointer"
                        style={{
                          fontFamily: MONO,
                          fontSize: "10px",
                          color: tk === ticker ? t.orange : t.textSec,
                          backgroundColor:
                            tk === ticker ? t.orangeDim : "transparent",
                        }}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.backgroundColor = t.surfaceHi)
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.backgroundColor =
                            tk === ticker ? t.orangeDim : "transparent")
                        }
                      >
                        {tk}
                      </div>
                    ),
                  )}
                </div>
              )}
            </div>
            {/* Timeframe */}
            <div className="flex items-center gap-0.5">
              {TIMEFRAMES.map((f) => (
                <button
                  key={f}
                  onClick={() => {
                    setTf(f);
                    resetView();
                    setPending(null);
                    setAiQ(`Analyze ${ticker} ${f} chart`);
                  }}
                  style={{
                    fontFamily: MONO,
                    fontSize: "9px",
                    letterSpacing: "0.04em",
                    padding: "3px 7px",
                    cursor: "pointer",
                    backgroundColor: "transparent",
                    color: tf === f ? t.orange : t.textMut,
                    border: "1px solid transparent",
                    borderBottom:
                      tf === f
                        ? `2px solid ${t.orange}`
                        : "2px solid transparent",
                  }}
                >
                  {f}
                </button>
              ))}
            </div>
            {/* Indicators dropdown */}
            <IndicatorMenu indicators={indicators} onToggle={togInd} />
            <div className="chart-navigation" aria-label="Chart navigation">
              <button
                type="button"
                aria-label="Zoom out chart"
                title="Zoom out (−)"
                disabled={!range || span >= MAX_SPAN}
                onClick={() => zoom(2)}
              >
                −
              </button>
              <button
                type="button"
                aria-label="Zoom in chart"
                title="Zoom in (+)"
                disabled={!range || span <= MIN_SPAN}
                onClick={() => zoom(0.5)}
              >
                +
              </button>
              <button
                type="button"
                aria-label="Reset chart zoom"
                title="Return to the latest range (Home)"
                onClick={resetView}
              >
                RESET
              </button>
              <button
                type="button"
                aria-label={
                  expanded ? "Exit chart fullscreen" : "Open chart fullscreen"
                }
                aria-pressed={expanded}
                title={expanded ? "Exit fullscreen (Esc)" : "Chart fullscreen"}
                onClick={toggleFullscreen}
              >
                {expanded ? "EXIT ⛶" : "FULLSCREEN ⛶"}
              </button>
            </div>
          </div>

          {/* Drawing toolbar + Chart */}
          <div
            className="technical-chart-body flex gap-0"
            style={{ border: `1px solid ${t.border}` }}
          >
            {/* Toolbar */}
            <div
              className="flex flex-col flex-shrink-0"
              style={{
                borderRight: `1px solid ${t.border}`,
                backgroundColor: t.sidebar,
              }}
            >
              {DRAW_TOOLS.map(([tool, Icon]) => (
                <button
                  key={tool}
                  onClick={() => setDrawTool(tool)}
                  title={tool.toUpperCase()}
                  className="flex items-center justify-center"
                  style={{
                    width: "32px",
                    height: "32px",
                    cursor: "pointer",
                    border: "none",
                    backgroundColor:
                      drawTool === tool ? t.orangeDim : "transparent",
                    color: drawTool === tool ? t.orange : t.textMut,
                    borderBottom: `1px solid ${t.border}`,
                  }}
                >
                  <Icon />
                </button>
              ))}
              {annotations.length > 0 && (
                <button
                  onClick={() => setAnnotations([])}
                  title="Clear"
                  className="flex items-center justify-center"
                  style={{
                    width: "32px",
                    height: "32px",
                    cursor: "pointer",
                    border: "none",
                    backgroundColor: "transparent",
                    color: t.neg,
                    borderTop: `1px solid ${t.border}`,
                    marginTop: "auto",
                  }}
                >
                  <Ico.Close />
                </button>
              )}
            </div>
            {/* Chart */}
            <div
              className="technical-chart-content"
              style={{ flex: 1, overflow: "hidden" }}
            >
              <div
                className="flex items-center justify-between px-4 py-2"
                style={{ borderBottom: `1px solid ${t.border}` }}
              >
                <div className="flex items-center gap-4">
                  <span
                    style={{
                      fontFamily: MONO,
                      fontSize: "10px",
                      color: t.textMut,
                      letterSpacing: "0.06em",
                    }}
                  >
                    {ticker} / {tf}
                  </span>
                  {[
                    ["O", fmt(lastBar?.open)],
                    ["H", fmt(lastBar?.high)],
                    ["L", fmt(lastBar?.low)],
                    ["C", fmt(lastBar?.close)],
                  ].map(([k, v]) => (
                    <span
                      key={k}
                      style={{ fontFamily: MONO, fontSize: "10px" }}
                    >
                      <span style={{ color: t.textMut }}>{k} </span>
                      <span
                        style={{
                          color: k === "H" ? t.pos : k === "L" ? t.neg : t.text,
                        }}
                      >
                        {v}
                      </span>
                    </span>
                  ))}
                </div>
                <div className="flex items-center gap-1.5">
                  <div
                    style={{
                      width: "5px",
                      height: "5px",
                      backgroundColor: t.pos,
                    }}
                  />
                  <Lbl>
                    {chart.quote?.session === "REGULAR"
                      ? "SESI REGULER · DELAYED"
                      : chart.quote?.session === "CLOSED"
                        ? "MARKET CLOSED"
                        : "STATUS —"}
                  </Lbl>
                </div>
              </div>
              <CandleChart
                annotations={annotations}
                pendingAnnotation={pending}
                drawTool={drawTool}
                svgRef={svgRef}
                range={range}
                geometry={geometry}
                visible={visible}
                pointerHandlers={{
                  onPointerDown,
                  onPointerMove,
                  onPointerUp,
                  onPointerCancel: cancelGesture,
                }}
                onKeyDown={onChartKeyDown}
              />
              <div
                className="px-4 py-1.5"
                style={{ borderTop: `1px solid ${t.border}` }}
              >
                <Lbl>
                  {feedLabel(chart)} ·{" "}
                  {DRAW_TOOLS.find(([t]) => t === drawTool)?.[0]?.toUpperCase()}{" "}
                  · {visible.bars.length} candle · scroll/pinch: zoom · seret:
                  drag{expanded ? " · Esc: exit" : ""}
                </Lbl>
              </div>
            </div>
          </div>
        </section>
        {/* Technical Notes + Personal Intelligence */}
        <div
          className="grid grid-cols-2 gap-0 mt-0"
          style={{ border: `1px solid ${t.border}`, borderTop: "none" }}
        >
          <div className="p-4" style={{ borderRight: `1px solid ${t.border}` }}>
            <Lbl accent style={{ display: "block", marginBottom: "8px" }}>
              TECHNICAL NOTES
            </Lbl>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Write your observation..."
              rows={4}
              style={{
                width: "100%",
                fontFamily: MONO,
                fontSize: "10px",
                color: t.text,
                backgroundColor: t.surfaceHi,
                borderTop: "1px solid",
                borderRight: "1px solid",
                borderBottom: "1px solid",
                borderLeft: "1px solid",
                borderColor: t.border,
                padding: "8px",
                outline: "none",
                resize: "vertical",
              }}
            />
            {notes && (
              <button
                onClick={() => setNotes("")}
                style={{
                  fontFamily: MONO,
                  fontSize: "8.5px",
                  color: t.neg,
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  marginTop: "4px",
                }}
              >
                CLEAR
              </button>
            )}
          </div>
          <div className="p-4">
            <Lbl accent style={{ display: "block", marginBottom: "8px" }}>
              PERSONAL INTELLIGENCE
            </Lbl>
            <DataRow label="Preferred TF" value={tf} pos={null} />
            <DataRow label="Selected ticker" value={ticker} pos={null} />
            <DataRow
              label="Indicators"
              value={[...indicators].join(" · ") || "—"}
              pos={null}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
function IndicatorMenu({ indicators, onToggle }) {
  const { t } = useApp();
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5"
        style={{
          fontFamily: MONO,
          fontSize: "9px",
          letterSpacing: "0.06em",
          padding: "4px 10px",
          cursor: "pointer",
          backgroundColor: open ? t.orangeDim : "transparent",
          color: open ? t.orange : t.textSec,
          borderTop: `1px solid ${open ? t.orange : t.border}`,
          borderRight: `1px solid ${open ? t.orange : t.border}`,
          borderBottom: `1px solid ${open ? t.orange : t.border}`,
          borderLeft: `1px solid ${open ? t.orange : t.border}`,
        }}
      >
        INDICATORS ({indicators.size}) <Ico.ChevD />
      </button>
      {open && (
        <div
          className="absolute left-0 top-full z-20"
          style={{
            backgroundColor: t.surface,
            border: `1px solid ${t.border}`,
            minWidth: "160px",
          }}
        >
          {ALL_INDICATORS.map((ind) => (
            <button
              key={ind}
              onClick={() => onToggle(ind)}
              className="w-full flex items-center justify-between px-3 py-1.5"
              style={{
                fontFamily: MONO,
                fontSize: "9.5px",
                color: indicators.has(ind) ? t.orange : t.textSec,
                backgroundColor: "transparent",
                border: "none",
                cursor: "pointer",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.backgroundColor = t.surfaceHi)
              }
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "")}
            >
              <span>{ind}</span>
              <span style={{ color: indicators.has(ind) ? t.pos : t.textMut }}>
                {indicators.has(ind) ? "[ON]" : "[OFF]"}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
// ─── AI PANEL ─────────────────────────────────────────────────────────────────
function AIPanel({
  messages,
  onSend,
  isSending,
  error,
  panelMode,
  setPanelMode,
  aiInput,
  setAiInput,
  workspace,
  activeTicker,
  indicators,
  useWeb,
  setUseWeb,
}) {
  const {
    t,
    mode,
    user,
    chart,
    technicalTicker,
    technicalTf,
    series,
    overview,
  } = useApp();
  const accountName = user?.name?.trim() || "Pengguna";
  const messageText = mode === "dark" ? "#F3EFE7" : t.text;
  const secondaryText = mode === "dark" ? "#BEB8AD" : t.textSec;
  const [focused, setFocused] = useState(false);
  const endRef = useRef(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);
  const hasText = aiInput.trim().length > 0;
  const ctxRows =
    workspace === "market"
      ? [
          { k: "TICKER", v: activeTicker },
          { k: "PRICE", v: fmt(chart.quote?.price) },
          { k: "CHANGE", v: pct(chart.quote?.change_percent) },
          { k: "FLOW", v: "IDX feed required" },
          {
            k: "WATCHLIST ↑ / ↓",
            v: `${fmt(overview.breadth?.advancing, 0)} / ${fmt(overview.breadth?.declining, 0)}`,
          },
        ]
      : [
          { k: "TICKER", v: `${technicalTicker} / ${technicalTf}` },
          { k: "PRICE", v: fmt(chart.quote?.price) },
          {
            k: "RSI(14)",
            v: indicators?.has("RSI") ? fmt(series.RSI.at(-1)) : "OFF",
          },
          {
            k: "MACD",
            v: indicators?.has("MACD") ? fmt(series.MACD.line.at(-1)) : "OFF",
          },
        ];
  return (
    <div
      className="flex flex-col h-full"
      style={{ backgroundColor: t.sidebar }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2 flex-shrink-0"
        style={{ borderBottom: `1px solid ${t.border}` }}
      >
        <div>
          <div
            style={{
              fontFamily: GROTESK,
              fontWeight: 700,
              fontSize: "13px",
              letterSpacing: "0.08em",
              color: t.text,
            }}
          >
            ARAKAN NDAR
          </div>
          <div className="flex items-center gap-1.5">
            <span
              style={{
                fontFamily: MONO,
                fontSize: "8.5px",
                color: secondaryText,
              }}
            >
              AI ANALYST · ARAKANDAR
            </span>
            <div
              style={{ width: "5px", height: "5px", backgroundColor: t.pos }}
            />
            <span style={{ fontFamily: MONO, fontSize: "8.5px", color: t.pos }}>
              LOCAL
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {[
            ["min", "minimized"],
            ["expand", "fullscreen"],
            ["full", "fullscreen"],
            ["close", "closed"],
          ].map(([icon, target]) => (
            <button
              key={icon}
              aria-label={
                target === "closed"
                  ? "Close AI panel"
                  : target === "minimized"
                    ? "Minimize AI panel"
                    : panelMode === "fullscreen"
                      ? "Restore AI panel size"
                      : "Expand AI panel"
              }
              title={
                target === "closed"
                  ? "Close AI panel"
                  : target === "minimized"
                    ? "Minimize AI panel"
                    : "Resize AI panel"
              }
              onClick={() =>
                setPanelMode(panelMode === target ? "normal" : target)
              }
              style={{
                color: panelMode === target ? t.orange : t.textMut,
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "3px",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = t.textSec)}
              onMouseLeave={(e) =>
                (e.currentTarget.style.color =
                  panelMode === target ? t.orange : t.textMut)
              }
            >
              {icon === "min" ? (
                <Ico.Min />
              ) : icon === "expand" ? (
                <Ico.Expand />
              ) : icon === "full" ? (
                <Ico.Full />
              ) : (
                <Ico.Close />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Context */}
      <div
        className="flex-shrink-0 px-3 py-2"
        style={{ borderBottom: `1px solid ${t.border}` }}
      >
        <Lbl accent style={{ display: "block", marginBottom: "6px" }}>
          {workspace === "market" ? "MARKET CONTEXT" : "TECHNICAL CONTEXT"}
        </Lbl>
        <p style={{ fontFamily: MONO, fontSize: "9px", color: secondaryText }}>
          {feedLabel(chart)}
        </p>
        {ctxRows.map((r) => (
          <div key={r.k} className="flex justify-between py-0.5">
            <span
              style={{
                fontFamily: MONO,
                fontSize: "9px",
                color: secondaryText,
              }}
            >
              {r.k}
            </span>
            <span
              style={{
                fontFamily: MONO,
                fontSize: "9px",
                color: "pos" in r && r.pos ? t.pos : t.text,
              }}
            >
              {r.v}
            </span>
          </div>
        ))}
      </div>

      {/* Messages */}
      <div
        className="flex-1 overflow-y-auto px-3 py-3"
        style={{ scrollbarWidth: "none" }}
      >
        {messages.length === 0 && (
          <div
            style={{
              fontFamily: MONO,
              fontSize: "10px",
              color: secondaryText,
              lineHeight: "1.6",
            }}
          >
            Ask Arakan Ndar about the market, selected ticker, or chart setup.
          </div>
        )}
        {messages.map((m, i) => (
          <div
            key={m.id || i}
            className={m.role === "user" ? "chat-user-message mb-4" : "mb-4"}
            style={
              m.role === "user"
                ? {
                    "--chat-bubble-bg": t.surfaceHi,
                    "--chat-bubble-tint": t.orangeDim,
                    "--chat-bubble-border": t.orange + "88",
                  }
                : undefined
            }
          >
            <div
              className={
                m.role === "user" ? "chat-user-message-content" : undefined
              }
            >
              <Lbl
                style={{
                  display: "block",
                  marginBottom: "4px",
                  color: t.orange,
                  overflowWrap: "anywhere",
                }}
              >
                {m.role === "ai" ? "ARAKAN NDAR" : accountName}
              </Lbl>
              {m.analyzing ? (
                <div className="flex items-center gap-2">
                  <span
                    style={{
                      fontFamily: MONO,
                      fontSize: "10px",
                      color: secondaryText,
                    }}
                  >
                    {useWeb ? "SEARCHING WEB & ANALYZING..." : "ANALYZING..."}
                  </span>
                  <div style={{ display: "flex", gap: "3px" }}>
                    {[0, 1, 2].map((d) => (
                      <div
                        key={d}
                        style={{
                          width: "3px",
                          height: "3px",
                          backgroundColor: t.orange,
                          animation: `pulse 1s ${d * 0.3}s infinite`,
                        }}
                      />
                    ))}
                  </div>
                </div>
              ) : m.role === "ai" ? (
                <MessageMarkdown
                  text={m.text}
                  style={{
                    fontFamily: MONO,
                    fontSize: "11px",
                    color: messageText,
                    "--markdown-accent": t.orange,
                    "--markdown-border": t.border,
                    "--markdown-surface": t.surfaceHi,
                  }}
                />
              ) : (
                <p
                  style={{
                    fontFamily: MONO,
                    fontSize: "11px",
                    color: messageText,
                    lineHeight: "1.75",
                    whiteSpace: "pre-wrap",
                    overflowWrap: "anywhere",
                  }}
                >
                  {m.text}
                </p>
              )}
              {m.web && !m.analyzing && (
                <div
                  style={{
                    marginTop: "8px",
                    fontFamily: MONO,
                    fontSize: "9px",
                    lineHeight: "1.6",
                    color: secondaryText,
                    overflowWrap: "anywhere",
                  }}
                >
                  <p>
                    {m.web.status === "ok"
                      ? "Web search sources"
                      : m.web.status === "disabled"
                        ? "Web search is off"
                        : m.web.status === "empty"
                          ? "No usable web sources"
                          : "Web search failed · current information is unverified"}
                  </p>
                  {m.web.searched_at && (
                    <time dateTime={m.web.searched_at}>
                      Searched:{" "}
                      {new Date(m.web.searched_at).toLocaleString("en-GB")}
                    </time>
                  )}
                  {m.web.sources.map((source) => (
                    <a
                      key={source.id}
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={source.snippet}
                      style={{
                        display: "block",
                        color: t.orange,
                        marginTop: "4px",
                      }}
                    >
                      [{source.id}] {source.title} ↗
                      {source.published_at && (
                        <span
                          style={{ display: "block", color: secondaryText }}
                        >
                          Published:{" "}
                          {new Date(source.published_at).toLocaleDateString(
                            "en-GB",
                          )}
                        </span>
                      )}
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      {/* Input */}
      <div className="flex-shrink-0 px-3 pb-3">
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            fontFamily: MONO,
            fontSize: "10px",
            color: t.textSec,
            marginBottom: "4px",
          }}
        >
          <input
            type="checkbox"
            checked={useWeb}
            disabled={isSending}
            onChange={(event) => setUseWeb(event.target.checked)}
          />
          Search the web
        </label>
        {useWeb && (
          <p style={{ color: t.textSec, fontSize: "9px", marginBottom: "8px" }}>
            Only your latest question and ticker are sent to the search engine.
          </p>
        )}
        {error && (
          <p
            role="alert"
            style={{ color: t.neg, fontSize: "11px", marginBottom: "8px" }}
          >
            {error}
          </p>
        )}
        <div
          style={{
            borderTop: `${focused ? 2 : 1}px solid ${focused ? t.orange : t.border}`,
            borderRight: `1px solid ${focused ? t.orange : t.border}`,
            borderBottom: `1px solid ${focused ? t.orange : t.border}`,
            borderLeft: `1px solid ${focused ? t.orange : t.border}`,
            backgroundColor: t.surface,
          }}
        >
          <div className="flex items-center px-2 pt-2 pb-1">
            <span
              style={{
                fontFamily: MONO,
                fontSize: "12px",
                color: t.orange,
                marginRight: "6px",
              }}
            >
              ›
            </span>
            <input
              aria-label="Message for Arakandar"
              maxLength={8000}
              value={aiInput}
              onChange={(e) => setAiInput(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              onKeyDown={(e) => {
                if (
                  e.key === "Enter" &&
                  !e.nativeEvent.isComposing &&
                  aiInput.trim() &&
                  !isSending
                ) {
                  onSend(aiInput);
                }
              }}
              placeholder="ASK ARAKAN NDAR..."
              style={{
                flex: 1,
                fontFamily: MONO,
                fontSize: "10px",
                color: t.text,
                background: "none",
                border: "none",
                outline: "none",
              }}
            />
          </div>
          <div className="flex items-center justify-end gap-1 px-2 pb-1.5">
            <button
              style={{
                fontFamily: MONO,
                fontSize: "8.5px",
                color: t.textMut,
                background: "none",
                border: "none",
                cursor: "pointer",
              }}
            >
              ATTACH
            </button>
            <Div v style={{ height: "10px", margin: "0 2px" }} />
            <button
              disabled={isSending || !hasText}
              onClick={() => {
                if (aiInput.trim()) onSend(aiInput);
              }}
              className="flex items-center gap-1"
              style={{
                fontFamily: MONO,
                fontSize: "8.5px",
                letterSpacing: "0.06em",
                padding: "2px 8px",
                cursor: "pointer",
                backgroundColor: hasText ? t.orangeDim : "transparent",
                color: hasText ? t.orange : t.textMut,
                borderTop: `1px solid ${hasText ? t.orange : t.border}`,
                borderRight: `1px solid ${hasText ? t.orange : t.border}`,
                borderBottom: `1px solid ${hasText ? t.orange : t.border}`,
                borderLeft: `1px solid ${hasText ? t.orange : t.border}`,
              }}
            >
              <Ico.Send /> {isSending ? "WAIT..." : "SEND"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
// ─── RESIZE HANDLE ────────────────────────────────────────────────────────────
function ResizeHandle({ onResizeStart }) {
  const { t } = useApp();
  const [h, setH] = useState(false);
  return (
    <div
      onMouseDown={onResizeStart}
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      style={{
        width: "4px",
        flexShrink: 0,
        cursor: "col-resize",
        backgroundColor: h ? t.orange : t.border,
        transition: "background-color 0.15s",
        zIndex: 10,
      }}
    />
  );
}
// ─── APP ──────────────────────────────────────────────────────────────────────
export default function App({ initialUser }) {
  const [mode, setMode] = useState("dark");
  const [workspace, setWorkspace] = useState("market");
  const [activeTicker, setActiveTicker] = useState("IHSG");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobilePanel, setMobilePanel] = useState("workspace");
  const [useWeb, setUseWeb] = useState(true);
  const [aiPanelMode, setAIPanelMode] = useState("normal");
  const [aiWidth, setAiWidth] = useState(310);
  const [indicators, setIndicators] = useState(new Set(["RSI", "MACD"]));
  const [sectorsApiUrl, setSectorsApiUrl] = useState(() => {
    if (typeof window === "undefined") return "";
    try {
      return window.localStorage.getItem(SECTORS_API_URL_STORAGE_KEY) || "";
    } catch {
      return "";
    }
  });
  const [marketTf, setMarketTf] = useState("1D");
  const [technicalTf, setTechnicalTf] = useState("1D");
  const [technicalTicker, setTechnicalTicker] = useState("BBCA");
  const selectedTicker =
    workspace === "technical" ? technicalTicker : activeTicker;
  const selectedTf = workspace === "technical" ? technicalTf : marketTf;
  const overview = useMarketResource("/api/market/overview");
  const sectorsSourceUrl = sectorsApiUrl.trim();
  const sectors = useMarketResource(
    sectorsSourceUrl
      ? `/api/market/sectors?${new URLSearchParams({ source_url: sectorsSourceUrl })}`
      : "/api/market/sectors",
  );
  const chart = useMarketResource(
    `/api/market/chart?${new URLSearchParams({ ticker: selectedTicker, timeframe: selectedTf, mode: workspace })}`,
  );
  const news = useMarketResource(
    `/api/market/news?ticker=${encodeURIComponent(selectedTicker)}`,
    300_000,
  );
  const series = useMemo(
    () =>
      technicalSeries(
        chart.bars || [],
        chart.timezone,
        ["1m", "5m", "15m", "30m", "60m", "4h"].includes(chart.interval),
      ),
    [chart.bars, chart.timezone, chart.interval],
  );
  const t = THEME[mode];
  useEffect(() => {
    const handler = () => setMode((m) => (m === "dark" ? "light" : "dark"));
    window.addEventListener("toggleMode", handler);
    return () => window.removeEventListener("toggleMode", handler);
  }, []);
  useEffect(() => {
    try {
      if (sectorsApiUrl.trim()) {
        window.localStorage.setItem(
          SECTORS_API_URL_STORAGE_KEY,
          sectorsApiUrl.trim(),
        );
      } else {
        window.localStorage.removeItem(SECTORS_API_URL_STORAGE_KEY);
      }
    } catch {
      /* Storage is optional. */
    }
  }, [sectorsApiUrl]);
  const openAnalyst = () => {
    setAIPanelMode("normal");
    setMobilePanel("analyst");
  };
  const {
    history,
    user,
    activeId: activeHistId,
    messages,
    draft: aiInput,
    setDraft: setAiInput,
    error: chatError,
    isSending,
    newConversation,
    openConversation,
    send: sendMessage,
  } = useConversations({
    initialUser,
    context: {
      workspace,
      ticker: selectedTicker,
      timeframe: selectedTf,
      indicators: workspace === "technical" ? [...indicators] : [],
      sectors_api_url: sectorsSourceUrl || null,
    },
    setWorkspace,
    setActiveTicker,
    setTechnicalTicker,
    setTechnicalTf,
    setMarketTf,
    setIndicators,
    setSectorsApiUrl,
    useWeb,
    setUseWeb,
    openAnalyst,
  });
  const handleTickerClick = (id) => {
    setActiveTicker(id);
    openAnalyst();
    if (workspace === "technical") setTechnicalTicker(id);
    const tk = TICKER_CATALOG.find((t) => t.id === id);
    if (tk) setAiInput(`Analyze ${tk.label}`);
  };
  const queueAnalysis = (question) => {
    setAiInput(question);
    openAnalyst();
  };
  const changePanelMode = (nextMode) => {
    setAIPanelMode(nextMode);
    setMobilePanel(
      nextMode === "closed" || nextMode === "minimized"
        ? "workspace"
        : "analyst",
    );
  };
  const onResizeStart = (e) => {
    e.preventDefault();
    const startX = e.clientX,
      startW = aiWidth;
    const onMove = (e) => {
      const delta = startX - e.clientX;
      setAiWidth(Math.max(220, Math.min(560, startW + delta)));
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };
  const appState = {
    overview,
    sectors,
    chart,
    news,
    series,
    marketTf,
    setMarketTf,
    technicalTf,
    setTechnicalTf,
    technicalTicker,
    setTechnicalTicker,
    indicators,
    setIndicators,
    user,
    mode,
    t,
    workspace,
    activeTicker,
    aiInput,
    setAiInput,
    setActiveTicker,
    setWorkspace,
    sectorsApiUrl,
    setSectorsApiUrl,
  };
  // Minimized AI floating button
  const AiFloatBtn = () => (
    <button
      onClick={openAnalyst}
      style={{
        position: "fixed",
        bottom: "20px",
        right: "20px",
        zIndex: 50,
        fontFamily: MONO,
        fontSize: "9px",
        letterSpacing: "0.08em",
        padding: "8px 14px",
        backgroundColor: t.surface,
        color: t.orange,
        borderTop: `1px solid ${t.orange}`,
        borderRight: `1px solid ${t.orange}`,
        borderBottom: `1px solid ${t.orange}`,
        borderLeft: `1px solid ${t.orange}`,
        cursor: "pointer",
      }}
    >
      ARAKAN NDAR ↗
    </button>
  );
  const showAI = aiPanelMode === "normal" || aiPanelMode === "fullscreen";
  const aiPanelWidth = aiPanelMode === "fullscreen" ? undefined : aiWidth;
  return (
    <Ctx.Provider value={appState}>
      <div
        className={`imported-platform mobile-${mobilePanel} flex flex-col h-dvh w-full overflow-hidden`}
        style={{ fontFamily: MONO, backgroundColor: t.bg, color: t.text }}
      >
        {/* Background grid */}
        <div
          className="fixed inset-0 pointer-events-none"
          style={{
            zIndex: 0,
            backgroundImage: `linear-gradient(${t.grid} 1px, transparent 1px), linear-gradient(90deg, ${t.grid} 1px, transparent 1px)`,
            backgroundSize: "48px 48px",
          }}
        />

        {/* Pulse animation */}
        <style>{`@keyframes pulse { 0%,100%{opacity:0.3} 50%{opacity:1} }`}</style>

        {/* TOP TICKER */}
        <div className="relative z-10 flex-shrink-0">
          <TopTicker
            onTickerClick={handleTickerClick}
            activeTicker={activeTicker}
          />
        </div>

        <nav
          className="mobile-platform-nav"
          aria-label="Panel navigasi"
          style={{
            background: t.sidebar,
            borderBottom: `1px solid ${t.border}`,
          }}
        >
          {[
            ["menu", "MENU"],
            ["workspace", "WORKSPACE"],
            ["analyst", "AI ANALYST"],
          ].map(([id, label]) => (
            <button
              key={id}
              aria-pressed={mobilePanel === id}
              onClick={() => {
                setMobilePanel(id);
                if (id === "analyst") setAIPanelMode("normal");
                if (id === "workspace" && aiPanelMode === "fullscreen")
                  setAIPanelMode("normal");
                if (id === "menu") setSidebarCollapsed(false);
              }}
              style={{ color: mobilePanel === id ? t.orange : t.textSec }}
            >
              {label}
            </button>
          ))}
        </nav>
        {/* BODY */}
        <div className="platform-body relative z-10 flex min-h-0 flex-1 overflow-hidden">
          {/* SIDEBAR */}
          <Sidebar
            collapsed={sidebarCollapsed}
            setCollapsed={setSidebarCollapsed}
            onNewConv={newConversation}
            onHistoryClick={openConversation}
            activeHistId={activeHistId}
            history={history}
          />

          {/* MAIN WORKSPACE */}
          {aiPanelMode !== "fullscreen" && (
            <div
              className="platform-workspace flex-1 min-w-0 overflow-auto"
              style={{ backgroundColor: t.bg }}
            >
              {workspace === "market" ? (
                <MarketWorkspace
                  onManualAnalysis={() => {
                    setTechnicalTicker(activeTicker);
                    setWorkspace("technical");
                  }}
                  setAiQ={queueAnalysis}
                />
              ) : (
                <TechnicalWorkspace
                  onBackToMarket={() => setWorkspace("market")}
                  setAiQ={queueAnalysis}
                />
              )}
            </div>
          )}

          {/* RESIZE HANDLE */}
          {showAI && aiPanelMode !== "fullscreen" && (
            <ResizeHandle onResizeStart={onResizeStart} />
          )}

          {/* AI PANEL */}
          {showAI && (
            <div
              className="platform-analyst min-w-0"
              style={{
                width: aiPanelWidth,
                flexGrow: aiPanelMode === "fullscreen" ? 1 : 0,
                flexBasis: aiPanelMode === "fullscreen" ? 0 : "auto",
                flexShrink: 0,
                borderLeft: `1px solid ${t.border}`,
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
              }}
            >
              <AIPanel
                messages={messages}
                onSend={sendMessage}
                isSending={isSending}
                error={chatError}
                panelMode={aiPanelMode}
                setPanelMode={changePanelMode}
                aiInput={aiInput}
                setAiInput={setAiInput}
                workspace={workspace}
                activeTicker={activeTicker}
                indicators={indicators}
                useWeb={useWeb}
                setUseWeb={setUseWeb}
              />
            </div>
          )}
        </div>

        {/* Minimized float button */}
        {(aiPanelMode === "minimized" || aiPanelMode === "closed") &&
          AiFloatBtn()}
      </div>
    </Ctx.Provider>
  );
}
