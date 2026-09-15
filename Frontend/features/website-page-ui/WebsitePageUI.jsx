"use client";

import {
  useState,
  useRef,
  useEffect,
  createContext,
  useContext,
  useCallback,
} from "react";
import {
  TICKERS,
  HISTORY_ITEMS,
  SEARCH_RESULTS,
  SECTORS,
  TOP_GAINERS,
  TOP_LOSERS,
  BUY_BROKERS,
  SELL_BROKERS,
  NEWS,
  MARKET_CHART_DATA,
  CANDLES,
  RSI_PTS,
  AI_RESPONSES,
} from "./data";
const GROTESK = "var(--font-barlow-condensed), sans-serif";
const MONO = "var(--font-jetbrains), monospace";
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
  const mn = Math.min(...pts) - 20,
    mx = Math.max(...pts) + 20;
  const xs = (W - px * 2) / (pts.length - 1);
  const cs = pts.map((p, i) => ({
    x: px + i * xs,
    y: py + ((mx - p) / (mx - mn)) * (H - py * 2),
  }));
  const line = cs
    .map((c, i) => `${i === 0 ? "M" : "L"}${c.x.toFixed(1)},${c.y.toFixed(1)}`)
    .join(" ");
  const area =
    line + ` L${cs.at(-1).x.toFixed(1)},${H - py} L${px},${H - py} Z`;
  return { line, area, last: cs.at(-1) };
}
function getAIResponse(text, workspace, ticker) {
  const key =
    workspace === "technical"
      ? "technical"
      : text.toUpperCase().includes("BBCA") || ticker === "BBCA"
        ? "BBCA"
        : text.toUpperCase().includes("IHSG") || ticker === "IHSG"
          ? "IHSG"
          : "default";
  const arr = AI_RESPONSES[key];
  return arr[Math.floor(Math.random() * arr.length)];
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
  const { t } = useApp();
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
        LIVE MARKETS <small>DEMO</small>
      </div>
      <div
        className="market-strip-viewport"
        role="region"
        aria-label="Market quotes demo"
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
                  title={`Analyze ${tk.label} · demo quote`}
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
                    {tk.up ? "▲" : "▼"} {tk.change}
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
  setActiveHistId,
}) {
  const { t } = useApp();
  const [search, setSearch] = useState("");
  const [searchFocus, setSF] = useState(false);
  const [profileOpen, setProf] = useState(false);
  const [authOpen, setAuth] = useState(false);
  const [authMode, setAuthMode] = useState("signin");
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
      ? SEARCH_RESULTS[search.toUpperCase()] ||
        HISTORY_ITEMS.filter((h) =>
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
                      onHistoryClick({
                        title: "title" in r ? r.title : r.title,
                        ticker: "ticker" in r ? r.ticker : "IHSG",
                      });
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
            {HISTORY_ITEMS.map((item) => (
              <HistRow
                key={item.id}
                item={item}
                active={activeHistId === item.id}
                onClick={() => {
                  setActiveHistId(item.id);
                  onHistoryClick(item);
                }}
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
        authOpen={authOpen}
        setAuth={setAuth}
        authMode={authMode}
        setAuthMode={setAuthMode}
        settingsOpen={settingsOpen}
        setSet={setSet}
      />

      {/* Auth modal */}
      {authOpen && <AuthModal mode={authMode} onClose={() => setAuth(false)} />}
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
  authOpen,
  setAuth,
  authMode,
  setAuthMode,
  settingsOpen,
  setSet,
}) {
  const { t, mode } = useApp();
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
          {/* Profile menu */}
          {[
            {
              label: "SIGN IN",
              action: () => {
                setAuthMode("signin");
                setAuth(true);
                setProf(false);
              },
            },
            {
              label: "LOG IN",
              action: () => {
                setAuthMode("login");
                setAuth(true);
                setProf(false);
              },
            },
          ].map((item) => (
            <MenuRow
              key={item.label}
              label={item.label}
              onClick={item.action}
            />
          ))}
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
            { label: "Name: Rafif Pratama" },
            { label: "Email: rafif@email.com" },
            { label: "Username: rafif_p" },
            { label: "Account: Free" },
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
          R
        </div>
        {!collapsed && (
          <div className="flex-1 text-left min-w-0">
            <div style={{ fontFamily: MONO, fontSize: "10px", color: t.text }}>
              Rafif Pratama
            </div>
            <div
              style={{
                fontFamily: MONO,
                fontSize: "8.5px",
                color: t.textMut,
                marginTop: "1px",
              }}
            >
              rafif@email.com
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
function AuthModal({ mode, onClose }) {
  const { t } = useApp();
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: t.surface,
          border: `1px solid ${t.border}`,
          padding: "28px",
          width: "340px",
        }}
      >
        <div
          style={{
            fontFamily: GROTESK,
            fontWeight: 700,
            fontSize: "18px",
            letterSpacing: "0.08em",
            color: t.text,
            marginBottom: "20px",
          }}
        >
          {mode === "signin" ? "SIGN IN" : "LOG IN"}
        </div>
        {["EMAIL", "PASSWORD"].map((f) => (
          <div key={f} className="mb-4">
            <Lbl style={{ display: "block", marginBottom: "5px" }}>{f}</Lbl>
            <input
              type={f === "PASSWORD" ? "password" : "email"}
              placeholder={f === "EMAIL" ? "you@example.com" : "••••••••"}
              style={{
                width: "100%",
                fontFamily: MONO,
                fontSize: "11px",
                padding: "8px 10px",
                backgroundColor: t.bg,
                borderTop: "1px solid",
                borderRight: "1px solid",
                borderBottom: "1px solid",
                borderLeft: "1px solid",
                borderColor: t.border,
                color: t.text,
                outline: "none",
              }}
            />
          </div>
        ))}
        <button
          className="w-full py-2 mt-2"
          style={{
            fontFamily: MONO,
            fontSize: "11px",
            letterSpacing: "0.08em",
            backgroundColor: t.orange,
            color: "#fff",
            border: "none",
            cursor: "pointer",
          }}
        >
          CONTINUE
        </button>
        <div
          style={{
            fontFamily: MONO,
            fontSize: "9px",
            color: t.textMut,
            marginTop: "10px",
            textAlign: "center",
          }}
        >
          Forgot password?
        </div>
      </div>
    </div>
  );
}
// ─── MARKET CHART ─────────────────────────────────────────────────────────────
function MarketChart({ tf }) {
  const { t } = useApp();
  const pts = MARKET_CHART_DATA[tf] || MARKET_CHART_DATA["1D"];
  const W = 860,
    H = 200,
    PX = 48,
    PY = 12;
  const { line, area, last } = lineChartPath(pts, W, H, PX, PY);
  const mn = Math.min(...pts),
    mx = Math.max(...pts);
  const ylabels = [mx, mn + (mx - mn) * 0.67, mn + (mx - mn) * 0.33, mn].map(
    (v) => v.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ","),
  );
  const xlabels =
    tf === "1D"
      ? ["09:00", "11:00", "13:00", "15:00"]
      : ["W1", "W2", "W3", "W4"];
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
        const x = PX + (i * (W - PX * 2)) / (pts.length - 1);
        const barH =
          (Math.abs(Math.sin(i * 1.3)) * 0.15 + 0.05) * (H - PY * 2) * 0.18;
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
      {xlabels.map((lbl, i) => (
        <text
          key={lbl}
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
  showRSI,
  annotations,
  pendingAnnotation,
  drawTool,
  onMouseDown,
  onMouseMove,
  onMouseUp,
}) {
  const { t, mode } = useApp();
  const W = 860,
    mainH = showRSI ? 200 : 260,
    rsiH = 65,
    PX = 50,
    PY = 12;
  const totalH = mainH + (showRSI ? rsiH + 14 : 0);
  const prices = CANDLES.flatMap((c) => [c[1], c[2]]);
  const mn = Math.min(...prices) - 40,
    mx = Math.max(...prices) + 40;
  const toY = (p) => PY + ((mx - p) / (mx - mn)) * (mainH - PY * 2);
  const cW = (W - PX * 2) / CANDLES.length,
    bodyW = cW * 0.55;
  const ylabels = [9900, 9800, 9700];
  const rsiMn = 25,
    rsiMx = 80;
  const rsiToY = (v) =>
    mainH + 14 + PY / 2 + ((rsiMx - v) / (rsiMx - rsiMn)) * (rsiH - PY);
  const rsiPath = RSI_PTS.map((v, i) => {
    const x = PX + (i / (RSI_PTS.length - 1)) * (W - PX * 2);
    return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${rsiToY(v).toFixed(1)}`;
  }).join(" ");
  const cursor = drawTool === "cursor" ? "default" : "crosshair";
  const renderAnnotation = (ann, opacity = 1) => {
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
              {Math.abs(ann.x2 - ann.x1).toFixed(0)}px
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
      style={{ display: "block", cursor }}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
    >
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
            {v.toLocaleString()}
          </text>
        </g>
      ))}
      {CANDLES.map(([o, h, l, c], i) => {
        const bull = c >= o,
          color = bull ? t.pos : t.neg;
        const cx = PX + (i + 0.5) * cW;
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
      {["09:00", "10:30", "12:00", "13:30", "15:00"].map((lbl, i) => (
        <text
          key={lbl}
          x={PX + (i / 4) * (W - PX * 2)}
          y={mainH - 2}
          textAnchor="middle"
          fill={t.textMut}
          fontSize="8.5"
          fontFamily={MONO}
        >
          {lbl}
        </text>
      ))}
      {/* Annotations */}
      {annotations.map((ann) => renderAnnotation(ann))}
      {pendingAnnotation && renderAnnotation(pendingAnnotation, 0.5)}
      {/* RSI */}
      {showRSI && (
        <g>
          <line
            x1={PX}
            x2={W - PX}
            y1={mainH + 14}
            y2={mainH + 14}
            stroke={t.border}
            strokeWidth="1"
          />
          <text
            x={PX}
            y={mainH + 12}
            fill={t.textMut}
            fontSize="8"
            fontFamily={MONO}
          >
            RSI(14)
          </text>
          <line
            x1={PX}
            x2={W - PX}
            y1={rsiToY(70)}
            y2={rsiToY(70)}
            stroke={t.neg}
            strokeWidth="1"
            strokeOpacity="0.3"
            strokeDasharray="2,4"
          />
          <line
            x1={PX}
            x2={W - PX}
            y1={rsiToY(30)}
            y2={rsiToY(30)}
            stroke={t.pos}
            strokeWidth="1"
            strokeOpacity="0.3"
            strokeDasharray="2,4"
          />
          <text
            x={W - PX + 2}
            y={rsiToY(70) + 3}
            fill={t.neg}
            fontSize="7.5"
            fontFamily={MONO}
            opacity="0.7"
          >
            70
          </text>
          <text
            x={W - PX + 2}
            y={rsiToY(30) + 3}
            fill={t.pos}
            fontSize="7.5"
            fontFamily={MONO}
            opacity="0.7"
          >
            30
          </text>
          <path
            d={rsiPath}
            stroke={t.orange}
            strokeWidth="1.5"
            fill="none"
            strokeLinecap="round"
          />
        </g>
      )}
    </svg>
  );
}
// ─── MARKET WORKSPACE ─────────────────────────────────────────────────────────
function MarketWorkspace({ onManualAnalysis, setAiQ }) {
  const { t, activeTicker, mode } = useApp();
  const [tf, setTf] = useState("1D");
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

        {/* Market header */}
        <div className="flex items-baseline gap-4 mb-3">
          <div>
            <Lbl>IHSG — JAKARTA COMPOSITE INDEX</Lbl>
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
                7,245.32
              </span>
              <span
                style={{ fontFamily: MONO, fontSize: "12px", color: t.pos }}
              >
                ▲ +0.82%
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
                LIVE
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
          <Lbl>LAST UPDATE / 15:42 WIB · STATIC DEMO DATA</Lbl>
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
              { k: "Current", v: "7,245.32", pos: true },
              { k: "Change", v: "+59.43", pos: true },
              { k: "Change %", v: "+0.82%", pos: true },
              { k: "Volume", v: "18.4B shrs", pos: null },
              { k: "Value", v: "11.2T", pos: null },
              { k: "Frequency", v: "1.28M trades", pos: null },
            ].map((r) => (
              <DataRow key={r.k} label={r.k} value={r.v} pos={r.pos} />
            ))}
          </DataSection>

          {/* Flow */}
          <DataSection title="FUND FLOW">
            <Lbl style={{ display: "block", marginBottom: "4px" }}>FOREIGN</Lbl>
            {[
              { k: "Buy", v: "8.42T", pos: true },
              { k: "Sell", v: "7.16T", pos: false },
              { k: "Net", v: "+1.26T", pos: true },
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
              { k: "Buy", v: "12.4T", pos: true },
              { k: "Sell", v: "11.8T", pos: false },
              { k: "Net", v: "+0.6T", pos: true },
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
                  setAiQ(`Analyze broker ${b.code} activity`);
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
                  setAiQ(`Analyze broker ${b.code} activity`);
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
          <DataSection title="MARKET BREADTH">
            {[
              { k: "Advancing", v: "248", pos: true },
              { k: "Declining", v: "182", pos: false },
              { k: "Unchanged", v: "96", pos: null },
              { k: "New High", v: "32", pos: true },
              { k: "New Low", v: "18", pos: false },
            ].map((r) => (
              <DataRow key={r.k} label={r.k} value={r.v} pos={r.pos} />
            ))}
            <div
              className="flex mt-3"
              style={{ height: "4px", borderRadius: "0" }}
            >
              <div style={{ flex: 248, backgroundColor: t.pos }} />
              <div style={{ flex: 96, backgroundColor: t.textMut + "55" }} />
              <div style={{ flex: 182, backgroundColor: t.neg }} />
            </div>
          </DataSection>
        </div>

        <div
          className="grid grid-cols-2 gap-0"
          style={{ borderBottom: `1px solid ${t.border}` }}
        >
          {/* Sectors */}
          <DataSection
            title="SECTOR PERFORMANCE"
            style={{ borderRight: `1px solid ${t.border}` }}
          >
            {SECTORS.map((s) => (
              <div
                key={s.label}
                onClick={() => {
                  setSelSector(s.label);
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
                    opacity: Math.abs(s.pct) / 2,
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
                  {s.pct > 0 ? "+" : ""}
                  {s.pct.toFixed(2)}%
                </span>
              </div>
            ))}
          </DataSection>

          {/* Top movers */}
          <DataSection title="TOP MOVERS">
            <Lbl style={{ display: "block", marginBottom: "4px" }}>GAINERS</Lbl>
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
                  {m.pct}
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
                  {m.pct}
                </span>
              </div>
            ))}
          </DataSection>
        </div>

        {/* Latest news */}
        <DataSection title="LATEST NEWS">
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
                    {n.body}
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
  const { t } = useApp();
  const [ticker, setTicker] = useState("BBCA");
  const [tickerOpen, setTickerOpen] = useState(false);
  const [tf, setTf] = useState("1D");
  const [indicators, setIndicators] = useState(new Set(["RSI", "MACD"]));
  const [drawTool, setDrawTool] = useState("cursor");
  const [annotations, setAnnotations] = useState([]);
  const [pending, setPending] = useState(null);
  const [drawStart, setDrawStart] = useState(null);
  const [notes, setNotes] = useState("");
  const svgRef = useRef(null);
  const VW = 860,
    VH = indicators.has("RSI") ? 265 : 330;
  const togInd = (k) => {
    setIndicators((prev) => {
      const n = new Set(prev);
      n.has(k) ? n.delete(k) : n.add(k);
      return n;
    });
    setAiQ(`Analyze ${ticker} with ${k} indicator`);
  };
  const svgCoords = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * VW,
      y: ((e.clientY - rect.top) / rect.height) * VH,
    };
  };
  const onMouseDown = (e) => {
    if (drawTool === "cursor") return;
    const p = svgCoords(e);
    setDrawStart(p);
    if (
      drawTool === "horizontal" ||
      drawTool === "support" ||
      drawTool === "resistance"
    ) {
      setAnnotations((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          type: drawTool,
          x1: 0,
          y1: p.y,
          x2: VW,
          y2: p.y,
        },
      ]);
    } else if (drawTool === "text") {
      setAnnotations((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          type: "text",
          x1: p.x,
          y1: p.y,
          x2: p.x,
          y2: p.y,
          label: "Analysis note",
        },
      ]);
    }
  };
  const onMouseMove = (e) => {
    if (!drawStart) return;
    const p = svgCoords(e);
    if (["trendline", "rectangle", "arrow", "measure"].includes(drawTool)) {
      setPending({
        id: "pending",
        type: drawTool,
        x1: drawStart.x,
        y1: drawStart.y,
        x2: p.x,
        y2: p.y,
      });
    }
  };
  const onMouseUp = (e) => {
    if (!drawStart) return;
    const p = svgCoords(e);
    if (pending) {
      setAnnotations((prev) => [
        ...prev,
        { ...pending, id: Date.now().toString() },
      ]);
      setPending(null);
    }
    setDrawStart(null);
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

        {/* Controls row */}
        <div className="flex items-center gap-4 mb-3">
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
                {["BBCA", "BBRI", "BMRI", "TLKM", "ASII", "IHSG"].map((tk) => (
                  <div
                    key={tk}
                    onClick={() => {
                      setTicker(tk);
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
                ))}
              </div>
            )}
          </div>
          {/* Timeframe */}
          <div className="flex items-center gap-0.5">
            {["1M", "5M", "15M", "30M", "1H", "4H", "1D", "1W", "1MTH"].map(
              (f) => (
                <button
                  key={f}
                  onClick={() => {
                    setTf(f);
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
              ),
            )}
          </div>
          {/* Indicators dropdown */}
          <IndicatorMenu indicators={indicators} onToggle={togInd} />
        </div>

        {/* Drawing toolbar + Chart */}
        <div className="flex gap-0" style={{ border: `1px solid ${t.border}` }}>
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
          <div style={{ flex: 1, overflow: "hidden" }}>
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
                  ["O", "9,862"],
                  ["H", "9,910"],
                  ["L", "9,840"],
                  ["C", "9,875"],
                ].map(([k, v]) => (
                  <span key={k} style={{ fontFamily: MONO, fontSize: "10px" }}>
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
                <Lbl>MARKET OPEN</Lbl>
              </div>
            </div>
            <CandleChart
              showRSI={indicators.has("RSI")}
              annotations={annotations}
              pendingAnnotation={pending}
              drawTool={drawTool}
              onMouseDown={onMouseDown}
              onMouseMove={onMouseMove}
              onMouseUp={onMouseUp}
            />
            <div
              className="px-4 py-1.5"
              style={{ borderTop: `1px solid ${t.border}` }}
            >
              <Lbl>
                LAST UPDATE / 15:42 WIB · DEMO DATA ·{" "}
                {DRAW_TOOLS.find(([t]) => t === drawTool)?.[0]?.toUpperCase()}
              </Lbl>
            </div>
          </div>
        </div>

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
            <DataRow label="Preferred TF" value="1D" pos={null} />
            <DataRow label="Watchlist" value="BBCA · BBRI · TLKM" pos={null} />
            <DataRow label="Indicators" value="RSI · MACD · MA20" pos={null} />
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
  panelMode,
  setPanelMode,
  aiInput,
  setAiInput,
  workspace,
  activeTicker,
  indicators,
}) {
  const { t } = useApp();
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
          { k: "IHSG", v: "7,245.32" },
          { k: "FLOW", v: "+1.26T", pos: true },
          { k: "BREADTH", v: "248 / 182", pos: true },
          { k: "TOP SECTOR", v: "Financials +1.42%", pos: true },
        ]
      : [
          { k: "TICKER", v: `BBCA / 1D` },
          { k: "RSI", v: indicators?.has("RSI") ? "ON" : "OFF" },
          { k: "MACD", v: indicators?.has("MACD") ? "ON" : "OFF" },
          { k: "NOTES", v: "-" },
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
              style={{ fontFamily: MONO, fontSize: "8.5px", color: t.textMut }}
            >
              AI ANALYST · DEMO
            </span>
            <div
              style={{ width: "5px", height: "5px", backgroundColor: t.pos }}
            />
            <span style={{ fontFamily: MONO, fontSize: "8.5px", color: t.pos }}>
              LIVE
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
                  ? "Tutup panel AI"
                  : target === "minimized"
                    ? "Minimalkan panel AI"
                    : panelMode === "fullscreen"
                      ? "Kembalikan ukuran panel AI"
                      : "Perbesar panel AI"
              }
              title={
                target === "closed"
                  ? "Tutup panel AI"
                  : target === "minimized"
                    ? "Minimalkan panel AI"
                    : "Ubah ukuran panel AI"
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
        {ctxRows.map((r) => (
          <div key={r.k} className="flex justify-between py-0.5">
            <span
              style={{ fontFamily: MONO, fontSize: "9px", color: t.textMut }}
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
              color: t.textMut,
              lineHeight: "1.6",
            }}
          >
            Ask Arakan Ndar about the market, selected ticker, or chart setup.
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className="mb-4">
            <Lbl
              style={{
                display: "block",
                marginBottom: "4px",
                color: m.role === "ai" ? t.orange : t.textMut,
              }}
            >
              {m.role === "ai" ? "ARAKAN NDAR" : "USER"}
            </Lbl>
            {m.analyzing ? (
              <div className="flex items-center gap-2">
                <span
                  style={{
                    fontFamily: MONO,
                    fontSize: "10px",
                    color: t.textMut,
                  }}
                >
                  ANALYZING...
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
            ) : (
              <p
                style={{
                  fontFamily: MONO,
                  fontSize: "10px",
                  color: m.role === "ai" ? t.textSec : t.text,
                  lineHeight: "1.65",
                  whiteSpace: "pre-line",
                }}
              >
                {m.text}
              </p>
            )}
          </div>
        ))}
        <div ref={endRef} />
      </div>

      {/* Input */}
      <div className="flex-shrink-0 px-3 pb-3">
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
              value={aiInput}
              onChange={(e) => setAiInput(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && aiInput.trim()) {
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
              <Ico.Send /> SEND
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
export default function App() {
  const [mode, setMode] = useState("dark");
  const [workspace, setWorkspace] = useState("market");
  const [activeTicker, setActiveTicker] = useState("IHSG");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobilePanel, setMobilePanel] = useState("workspace");
  const [activeHistId, setActiveHistId] = useState("h2");
  const [messages, setMessages] = useState([]);
  const messageSequence = useRef(0);
  const [aiInput, setAiInput] = useState("");
  const [aiPanelMode, setAIPanelMode] = useState("normal");
  const [aiWidth, setAiWidth] = useState(310);
  const [indicators] = useState(new Set(["RSI", "MACD"]));
  const t = THEME[mode];
  // Listen for theme toggle from sidebar profile menu
  useEffect(() => {
    const handler = () => setMode((m) => (m === "dark" ? "light" : "dark"));
    window.addEventListener("toggleMode", handler);
    return () => window.removeEventListener("toggleMode", handler);
  }, []);
  const sendMessage = useCallback(
    (text) => {
      if (!text.trim()) return;
      const responseId = ++messageSequence.current;
      setMessages((prev) => [
        ...prev,
        { role: "user", text },
        { role: "ai", text: "", analyzing: true, id: responseId },
      ]);
      setAiInput("");
      setTimeout(() => {
        const response = getAIResponse(text, workspace, activeTicker);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === responseId
              ? { role: "ai", text: response, id: responseId }
              : m,
          ),
        );
      }, 1500);
    },
    [workspace, activeTicker],
  );
  const handleTickerClick = (id) => {
    setActiveTicker(id);
    setMobilePanel("analyst");
    setAIPanelMode("normal");
    const tk = TICKERS.find((t) => t.id === id);
    if (tk) setAiInput(`Analyze ${tk.label}`);
  };
  const openAnalyst = () => {
    setAIPanelMode("normal");
    setMobilePanel("analyst");
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
  const handleHistoryClick = (item) => {
    setActiveTicker(item.ticker);
    queueAnalysis(`Analyze ${item.ticker}`);
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
    mode,
    t,
    workspace,
    activeTicker,
    aiInput,
    setAiInput,
    setActiveTicker,
    setWorkspace,
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
            onNewConv={() => {
              setMessages([]);
              setAiInput("");
              setWorkspace("market");
              setActiveHistId("");
              setMobilePanel("workspace");
              setAIPanelMode("normal");
            }}
            onHistoryClick={handleHistoryClick}
            activeHistId={activeHistId}
            setActiveHistId={setActiveHistId}
          />

          {/* MAIN WORKSPACE */}
          {aiPanelMode !== "fullscreen" && (
            <div
              className="platform-workspace flex-1 min-w-0 overflow-auto"
              style={{ backgroundColor: t.bg }}
            >
              {workspace === "market" ? (
                <MarketWorkspace
                  onManualAnalysis={() => setWorkspace("technical")}
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
              className="platform-analyst"
              style={{
                width:
                  aiPanelMode === "fullscreen" ? "100%" : `${aiPanelWidth}px`,
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
                panelMode={aiPanelMode}
                setPanelMode={changePanelMode}
                aiInput={aiInput}
                setAiInput={setAiInput}
                workspace={workspace}
                activeTicker={activeTicker}
                indicators={indicators}
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
