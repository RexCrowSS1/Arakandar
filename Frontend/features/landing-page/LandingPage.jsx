"use client";

import { useState, useEffect, useRef, useCallback } from "react";

// ─── THEME (matches WebsitePageUI exactly) ─────────────────────────────────
const THEME = {
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
};
const GROTESK = "var(--font-barlow-condensed), sans-serif";
const MONO = "var(--font-jetbrains), monospace";
const SANS = "var(--font-barlow), sans-serif";

// ─── LOGO ──────────────────────────────────────────────────────────────────
function LogoMark({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 22" fill="none">
      <line x1="1" y1="18" x2="23" y2="18" stroke={THEME.border} strokeWidth="0.6" />
      <line x1="1" y1="12" x2="23" y2="12" stroke={THEME.border} strokeWidth="0.6" />
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

// ─── TYPEWRITER ────────────────────────────────────────────────────────────
function Typewriter({ lines, speed = 35 }) {
  const [lineIdx, setLineIdx] = useState(0);
  const [charIdx, setCharIdx] = useState(0);
  const [displayed, setDisplayed] = useState([]);

  useEffect(() => {
    if (lineIdx >= lines.length) return;
    const current = lines[lineIdx];
    if (charIdx < current.length) {
      const t = setTimeout(() => setCharIdx((c) => c + 1), speed);
      return () => clearTimeout(t);
    }
    // line finished, move to next after pause
    const t = setTimeout(() => {
      setDisplayed((d) => [...d, current]);
      setLineIdx((l) => l + 1);
      setCharIdx(0);
    }, 600);
    return () => clearTimeout(t);
  }, [lineIdx, charIdx, lines, speed]);

  const activeLine = lineIdx < lines.length ? lines[lineIdx].slice(0, charIdx) : "";
  const showCursor = lineIdx < lines.length;

  return (
    <div style={{ fontFamily: MONO, fontSize: "12px", lineHeight: "1.8" }}>
      {displayed.map((ln, i) => (
        <div key={i} style={{ color: THEME.textSec }}>
          <span style={{ color: THEME.orange, marginRight: "8px" }}>▸</span>
          {ln}
        </div>
      ))}
      {showCursor && (
        <div style={{ color: THEME.text }}>
          <span style={{ color: THEME.orange, marginRight: "8px" }}>▸</span>
          {activeLine}
          <span
            style={{
              display: "inline-block",
              width: "7px",
              height: "14px",
              backgroundColor: THEME.orange,
              marginLeft: "2px",
              verticalAlign: "text-bottom",
              animation: "cursor 1.1s step-end infinite",
            }}
          />
        </div>
      )}
    </div>
  );
}

// ─── ANIMATED COUNTER ──────────────────────────────────────────────────────
function Counter({ end, suffix = "", duration = 2000 }) {
  const [value, setValue] = useState(0);
  const ref = useRef(null);
  const started = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          const start = performance.now();
          const step = (now) => {
            const progress = Math.min((now - start) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setValue(Math.round(eased * end));
            if (progress < 1) requestAnimationFrame(step);
          };
          requestAnimationFrame(step);
        }
      },
      { threshold: 0.3 },
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [end, duration]);

  return (
    <span ref={ref}>
      {value.toLocaleString()}
      {suffix}
    </span>
  );
}

// ─── MINI CHART (decorative sparkline) ─────────────────────────────────────
function Sparkline({ data, width = 120, height = 40, color = THEME.pos }) {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const points = data
    .map(
      (v, i) =>
        `${(i / (data.length - 1)) * width},${height - ((v - min) / range) * height * 0.8 - height * 0.1}`,
    )
    .join(" ");

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} fill="none">
      <polyline
        points={points}
        stroke={color}
        strokeWidth="1.5"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <polyline
        points={`0,${height} ${points} ${width},${height}`}
        fill={`${color}15`}
        stroke="none"
      />
    </svg>
  );
}

// ─── LIVE PRICE TICKER ─────────────────────────────────────────────────────
const MOCK_QUOTES = [
  { label: "IHSG", value: "7,245.32", change: "+0.82%", up: true },
  { label: "BBCA", value: "9,825", change: "+2.49%", up: true },
  { label: "BBRI", value: "5,475", change: "+1.85%", up: true },
  { label: "TLKM", value: "3,850", change: "-0.95%", up: false },
  { label: "ASII", value: "5,200", change: "+1.23%", up: true },
  { label: "USD/IDR", value: "15,842", change: "+0.12%", up: false },
  { label: "GOTO", value: "82", change: "-2.87%", up: false },
  { label: "BMRI", value: "6,325", change: "+1.45%", up: true },
];

function TickerStrip() {
  return (
    <div
      style={{
        overflow: "hidden",
        borderBottom: `1px solid ${THEME.border}`,
        background: THEME.navBg,
        height: "40px",
        display: "flex",
        alignItems: "center",
      }}
    >
      <div
        style={{
          fontFamily: MONO,
          fontSize: "9px",
          letterSpacing: "0.1em",
          color: THEME.orange,
          padding: "0 14px",
          flexShrink: 0,
        }}
      >
        MARKETS
        <br />
        <span style={{ fontSize: "7px", opacity: 0.7 }}>DELAYED</span>
      </div>
      <div style={{ flex: 1, minWidth: 0, overflow: "hidden" }}>
        <div
          style={{
            display: "flex",
            width: "max-content",
            animation: "market-scroll 42s linear infinite",
          }}
        >
          {[0, 1].map((copy) => (
            <div key={copy} style={{ display: "flex", flexShrink: 0 }}>
              {MOCK_QUOTES.map((q) => (
                <div
                  key={q.label}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "9px",
                    padding: "0 18px",
                    height: "40px",
                    whiteSpace: "nowrap",
                    borderRight: `1px solid ${THEME.border}`,
                    fontFamily: MONO,
                    fontSize: "10px",
                    color: THEME.text,
                  }}
                >
                  <span style={{ color: THEME.textSec }}>{q.label}</span>
                  <strong>{q.value}</strong>
                  <span style={{ color: q.up ? THEME.pos : THEME.neg }}>
                    {q.up ? "▲" : "▼"} {q.change}
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── FEATURE CARD ──────────────────────────────────────────────────────────
function FeatureCard({ icon, title, description, index }) {
  const [hovered, setHovered] = useState(false);
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setVisible(true);
      },
      { threshold: 0.15 },
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: "28px 24px",
        backgroundColor: hovered ? THEME.surfaceHi : THEME.surface,
        border: `1px solid ${hovered ? THEME.orange : THEME.border}`,
        transition: "all 0.25s ease",
        cursor: "default",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(20px)",
        transitionDelay: `${index * 80}ms`,
        transitionProperty: "all",
      }}
    >
      <div
        style={{
          width: "36px",
          height: "36px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: THEME.orangeDim,
          border: `1px solid ${THEME.orange}40`,
          marginBottom: "16px",
          color: THEME.orange,
          fontSize: "16px",
        }}
      >
        {icon}
      </div>
      <h3
        style={{
          fontFamily: GROTESK,
          fontSize: "16px",
          fontWeight: 700,
          letterSpacing: "0.06em",
          color: THEME.text,
          marginBottom: "8px",
        }}
      >
        {title}
      </h3>
      <p
        style={{
          fontFamily: SANS,
          fontSize: "13px",
          lineHeight: "1.7",
          color: THEME.textSec,
        }}
      >
        {description}
      </p>
    </div>
  );
}

// ─── SIMULATED TERMINAL DEMO ───────────────────────────────────────────────
function TerminalDemo() {
  const DEMO_CHART = [
    7100, 7120, 7115, 7140, 7165, 7150, 7180, 7195, 7210, 7205, 7230, 7248, 7240, 7260, 7245,
  ];

  return (
    <div
      style={{
        backgroundColor: THEME.surface,
        border: `1px solid ${THEME.border}`,
        overflow: "hidden",
        maxWidth: "640px",
        width: "100%",
      }}
    >
      {/* Title bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "8px 14px",
          borderBottom: `1px solid ${THEME.border}`,
          background: THEME.navBg,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <LogoMark size={16} />
          <span
            style={{
              fontFamily: GROTESK,
              fontSize: "11px",
              fontWeight: 700,
              letterSpacing: "0.08em",
              color: THEME.text,
            }}
          >
            ARAKAN NDAR
          </span>
          <span
            style={{
              fontFamily: MONO,
              fontSize: "8px",
              color: THEME.textMut,
              letterSpacing: "0.06em",
            }}
          >
            TERMINAL
          </span>
        </div>
        <div style={{ display: "flex", gap: "6px" }}>
          {["#4A4844", "#4A4844", "#4A4844"].map((c, i) => (
            <div
              key={i}
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                background: c,
              }}
            />
          ))}
        </div>
      </div>
      {/* Content */}
      <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
        {/* Chart area */}
        <div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "8px",
            }}
          >
            <div>
              <span
                style={{
                  fontFamily: MONO,
                  fontSize: "9px",
                  letterSpacing: "0.1em",
                  color: THEME.orange,
                }}
              >
                IHSG
              </span>
              <span
                style={{
                  fontFamily: MONO,
                  fontSize: "9px",
                  color: THEME.textMut,
                  marginLeft: "8px",
                }}
              >
                1D
              </span>
            </div>
            <div style={{ display: "flex", gap: "4px" }}>
              {["1D", "5D", "1M", "3M"].map((tf) => (
                <span
                  key={tf}
                  style={{
                    fontFamily: MONO,
                    fontSize: "8px",
                    padding: "2px 6px",
                    border: `1px solid ${tf === "1D" ? THEME.orange : THEME.border}`,
                    color: tf === "1D" ? THEME.orange : THEME.textMut,
                    background: tf === "1D" ? THEME.orangeDim : "transparent",
                  }}
                >
                  {tf}
                </span>
              ))}
            </div>
          </div>
          <Sparkline data={DEMO_CHART} width={580} height={80} color={THEME.pos} />
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginTop: "4px",
            }}
          >
            <span style={{ fontFamily: MONO, fontSize: "8px", color: THEME.textMut }}>09:00</span>
            <span style={{ fontFamily: MONO, fontSize: "8px", color: THEME.textMut }}>15:00</span>
          </div>
        </div>

        {/* AI response */}
        <div
          style={{
            borderTop: `1px solid ${THEME.border}`,
            paddingTop: "14px",
          }}
        >
          <div
            style={{
              fontFamily: MONO,
              fontSize: "8px",
              letterSpacing: "0.1em",
              color: THEME.orange,
              marginBottom: "8px",
            }}
          >
            ARAKANDAR ANALYST
          </div>
          <Typewriter
            lines={[
              "IHSG di 7,245 — di atas support 7,150.",
              "Sektor finansial memimpin kenaikan hari ini.",
              "Net buy asing +1.26T mendukung rally.",
              "Momentum tetap positif. Pantau resistance 7,300.",
            ]}
            speed={30}
          />
        </div>
      </div>
    </div>
  );
}

// ─── HOW IT WORKS STEP ─────────────────────────────────────────────────────
function Step({ number, title, description, index }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setVisible(true);
      },
      { threshold: 0.15 },
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{
        display: "flex",
        gap: "20px",
        alignItems: "flex-start",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateX(0)" : "translateX(-30px)",
        transition: `all 0.5s ease ${index * 120}ms`,
      }}
    >
      <div
        style={{
          width: "40px",
          height: "40px",
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: GROTESK,
          fontSize: "18px",
          fontWeight: 700,
          color: THEME.orange,
          border: `1px solid ${THEME.orange}`,
          background: THEME.orangeDim,
        }}
      >
        {number}
      </div>
      <div>
        <h4
          style={{
            fontFamily: GROTESK,
            fontSize: "15px",
            fontWeight: 700,
            letterSpacing: "0.05em",
            color: THEME.text,
            marginBottom: "6px",
          }}
        >
          {title}
        </h4>
        <p
          style={{
            fontFamily: SANS,
            fontSize: "13px",
            lineHeight: "1.7",
            color: THEME.textSec,
          }}
        >
          {description}
        </p>
      </div>
    </div>
  );
}

// ─── CAPABILITIES SECTION ──────────────────────────────────────────────────
const CAPABILITIES = [
  {
    icon: "◈",
    title: "MARKET OVERVIEW",
    description:
      "Data IHSG, indeks regional, dan kurs mata uang dalam satu tampilan. Heatmap sektor, top gainers/losers, dan broker summary — semua update otomatis dengan delay bursa.",
  },
  {
    icon: "◰",
    title: "TECHNICAL ANALYSIS",
    description:
      "Chart candlestick interaktif dengan MA, RSI, MACD, dan Bollinger Bands. Drawing tools lengkap — trendline, support/resistance, fibonacci. Zoom, pan, dan fullscreen.",
  },
  {
    icon: "⊞",
    title: "AI ANALYST",
    description:
      "Tanya apa saja tentang pasar. Arakandar membaca data real-time, menganalisis pattern teknikal, dan mencarikan berita terbaru dari internet sebelum menjawab.",
  },
  {
    icon: "↗",
    title: "FOREIGN FLOW",
    description:
      "Pantau aliran dana asing secara real-time. Net buy/sell harian, akumulasi mingguan, dan korelasi dengan pergerakan harga — data yang biasanya hanya tersedia di terminal berbayar.",
  },
  {
    icon: "◉",
    title: "BROKER SUMMARY",
    description:
      "Siapa yang sedang beli dan jual? Lihat top broker per saham, net value, dan pola akumulasi/distribusi. Deteksi pergerakan smart money sebelum harga bergerak.",
  },
  {
    icon: "⬡",
    title: "INTERNET SEARCH",
    description:
      "Arakandar secara otomatis mencari berita dan analisis terbaru dari internet sebelum memberikan jawaban. Sumber ditampilkan transparan dengan link dan tanggal publikasi.",
  },
];

// ─── MAIN LANDING ──────────────────────────────────────────────────────────
export default function LandingPage() {
  const [scrollY, setScrollY] = useState(0);
  const heroRef = useRef(null);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const parallaxOffset = scrollY * 0.15;

  return (
    <div
      style={{
        backgroundColor: THEME.bg,
        color: THEME.text,
        minHeight: "100dvh",
        position: "relative",
        overflowX: "hidden",
      }}
    >
      {/* Background grid */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          pointerEvents: "none",
          zIndex: 0,
          backgroundImage: `linear-gradient(${THEME.grid} 1px, transparent 1px), linear-gradient(90deg, ${THEME.grid} 1px, transparent 1px)`,
          backgroundSize: "48px 48px",
        }}
      />

      {/* Radial glow */}
      <div
        style={{
          position: "fixed",
          top: "-200px",
          left: "50%",
          transform: "translateX(-50%)",
          width: "800px",
          height: "800px",
          background: `radial-gradient(circle, ${THEME.orange}08 0%, transparent 70%)`,
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      <style>{`
        @keyframes cursor {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        @keyframes market-scroll {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes scanline {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100vh); }
        }
        .landing-section {
          position: relative;
          z-index: 1;
        }
        .hover-lift:hover {
          transform: translateY(-2px);
        }
        @media (max-width: 768px) {
          .landing-grid-3 {
            grid-template-columns: 1fr !important;
          }
          .landing-grid-2 {
            grid-template-columns: 1fr !important;
          }
          .hero-title {
            font-size: 36px !important;
          }
          .hero-subtitle {
            font-size: 14px !important;
          }
          .section-padding {
            padding-left: 20px !important;
            padding-right: 20px !important;
          }
        }
        @media (max-width: 480px) {
          .hero-title {
            font-size: 28px !important;
          }
        }
      `}</style>

      {/* ── TOP TICKER ─────────────────────────────────────────────────── */}
      <div className="landing-section" style={{ position: "sticky", top: 0, zIndex: 20 }}>
        <TickerStrip />
      </div>

      {/* ── NAV BAR ────────────────────────────────────────────────────── */}
      <nav
        className="landing-section"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 40px",
          borderBottom: `1px solid ${THEME.border}`,
          background: `${THEME.bg}E6`,
          backdropFilter: "blur(12px)",
          position: "sticky",
          top: "40px",
          zIndex: 20,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <LogoMark size={22} />
          <div>
            <div
              style={{
                fontFamily: GROTESK,
                fontWeight: 700,
                fontSize: "15px",
                letterSpacing: "0.08em",
                color: THEME.text,
              }}
            >
              ARAKAN NDAR
            </div>
            <div
              style={{
                fontFamily: MONO,
                fontSize: "8px",
                color: THEME.textMut,
                letterSpacing: "0.06em",
                marginTop: "1px",
              }}
            >
              FINANCIAL PLATFORM
            </div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <a
            href="/"
            style={{
              fontFamily: MONO,
              fontSize: "10px",
              letterSpacing: "0.06em",
              padding: "8px 18px",
              color: THEME.bg,
              backgroundColor: THEME.orange,
              border: `1px solid ${THEME.orange}`,
              textDecoration: "none",
              cursor: "pointer",
              fontWeight: 600,
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "#D07A2E";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = THEME.orange;
            }}
          >
            BUKA TERMINAL →
          </a>
        </div>
      </nav>

      {/* ── HERO ───────────────────────────────────────────────────────── */}
      <section
        ref={heroRef}
        className="landing-section section-padding"
        style={{
          padding: "100px 40px 80px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
          animation: "fadeUp 0.8s ease both",
        }}
      >
        {/* Status badge */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            padding: "6px 14px",
            border: `1px solid ${THEME.border}`,
            backgroundColor: THEME.surface,
            marginBottom: "32px",
          }}
        >
          <div
            style={{
              width: "6px",
              height: "6px",
              borderRadius: "50%",
              backgroundColor: THEME.pos,
              animation: "cursor 2s ease infinite",
            }}
          />
          <span
            style={{
              fontFamily: MONO,
              fontSize: "9px",
              letterSpacing: "0.1em",
              color: THEME.textSec,
            }}
          >
            ARAKANDAR MODEL ACTIVE — LOCAL INFERENCE
          </span>
        </div>

        <h1
          className="hero-title"
          style={{
            fontFamily: GROTESK,
            fontSize: "56px",
            fontWeight: 700,
            letterSpacing: "0.04em",
            lineHeight: "1.1",
            color: THEME.text,
            maxWidth: "800px",
            marginBottom: "20px",
          }}
        >
          SATU TERMINAL UNTUK
          <br />
          <span style={{ color: THEME.orange }}>SELURUH PASAR INDONESIA</span>
        </h1>

        <p
          className="hero-subtitle"
          style={{
            fontFamily: SANS,
            fontSize: "17px",
            lineHeight: "1.7",
            color: THEME.textSec,
            maxWidth: "580px",
            marginBottom: "40px",
          }}
        >
          Data market real-time, chart teknikal interaktif, dan AI analyst yang bisa membaca 
          berita terbaru dari internet — semua jalan di satu tempat, tanpa biaya langganan.
        </p>

        {/* CTA buttons */}
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", justifyContent: "center" }}>
          <a
            href="/"
            className="hover-lift"
            style={{
              fontFamily: MONO,
              fontSize: "11px",
              letterSpacing: "0.06em",
              padding: "12px 28px",
              color: THEME.bg,
              backgroundColor: THEME.orange,
              border: `1px solid ${THEME.orange}`,
              textDecoration: "none",
              cursor: "pointer",
              fontWeight: 600,
              transition: "all 0.2s",
            }}
          >
            MULAI SEKARANG →
          </a>
          <a
            href="#capabilities"
            className="hover-lift"
            style={{
              fontFamily: MONO,
              fontSize: "11px",
              letterSpacing: "0.06em",
              padding: "12px 28px",
              color: THEME.textSec,
              backgroundColor: "transparent",
              border: `1px solid ${THEME.border}`,
              textDecoration: "none",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
          >
            LIHAT FITUR
          </a>
        </div>

        {/* Stats bar */}
        <div
          style={{
            display: "flex",
            gap: "1px",
            marginTop: "60px",
            backgroundColor: THEME.border,
            border: `1px solid ${THEME.border}`,
            flexWrap: "wrap",
            justifyContent: "center",
          }}
        >
          {[
            { value: <Counter end={800} suffix="+" />, label: "SAHAM IDX" },
            { value: <Counter end={54} suffix="" />, label: "INDIKATOR TEKNIKAL" },
            { value: "LOCAL", label: "AI MODEL" },
            { value: "GRATIS", label: "BIAYA AKSES" },
          ].map((s, i) => (
            <div
              key={i}
              style={{
                padding: "18px 32px",
                backgroundColor: THEME.surface,
                textAlign: "center",
                minWidth: "140px",
              }}
            >
              <div
                style={{
                  fontFamily: GROTESK,
                  fontSize: "22px",
                  fontWeight: 700,
                  color: THEME.orange,
                  letterSpacing: "0.04em",
                }}
              >
                {s.value}
              </div>
              <div
                style={{
                  fontFamily: MONO,
                  fontSize: "8px",
                  letterSpacing: "0.12em",
                  color: THEME.textMut,
                  marginTop: "4px",
                }}
              >
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── TERMINAL DEMO ──────────────────────────────────────────────── */}
      <section
        className="landing-section section-padding"
        style={{
          padding: "60px 40px 80px",
          display: "flex",
          justifyContent: "center",
        }}
      >
        <TerminalDemo />
      </section>

      {/* ── WHAT IS ARAKAN NDAR ────────────────────────────────────────── */}
      <section
        className="landing-section section-padding"
        style={{
          padding: "80px 40px",
          borderTop: `1px solid ${THEME.border}`,
        }}
      >
        <div style={{ maxWidth: "900px", margin: "0 auto" }}>
          <div
            style={{
              fontFamily: MONO,
              fontSize: "9px",
              letterSpacing: "0.12em",
              color: THEME.orange,
              marginBottom: "16px",
            }}
          >
            APA ITU ARAKAN NDAR
          </div>
          <div
            className="landing-grid-2"
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "40px",
              alignItems: "start",
            }}
          >
            <div>
              <h2
                style={{
                  fontFamily: GROTESK,
                  fontSize: "28px",
                  fontWeight: 700,
                  letterSpacing: "0.04em",
                  lineHeight: "1.2",
                  color: THEME.text,
                  marginBottom: "16px",
                }}
              >
                PLATFORM ANALISIS PASAR YANG DIBANGUN UNTUK INVESTOR INDONESIA
              </h2>
            </div>
            <div>
              <p
                style={{
                  fontFamily: SANS,
                  fontSize: "14px",
                  lineHeight: "1.8",
                  color: THEME.textSec,
                  marginBottom: "16px",
                }}
              >
                Arakan Ndar menggabungkan tiga hal yang biasanya terpisah: data market real-time, 
                chart teknikal lengkap, dan AI yang mengerti konteks pasar Indonesia. 
              </p>
              <p
                style={{
                  fontFamily: SANS,
                  fontSize: "14px",
                  lineHeight: "1.8",
                  color: THEME.textSec,
                  marginBottom: "16px",
                }}
              >
                Model AI-nya — Arakandar — jalan secara lokal di server. Dia membaca data harga, 
                volume, broker summary, dan bahkan mencari berita terbaru dari internet sebelum 
                memberikan analisis. Bukan chatbot generik yang cuma hafalin teks — tapi analyst 
                yang punya akses ke data nyata.
              </p>
              <p
                style={{
                  fontFamily: SANS,
                  fontSize: "14px",
                  lineHeight: "1.8",
                  color: THEME.textSec,
                }}
              >
                Semua fitur — chart, data, AI — tersedia tanpa biaya langganan. Data pasar 
                menggunakan delay standar bursa (10 menit untuk IDX).
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── CAPABILITIES ───────────────────────────────────────────────── */}
      <section
        id="capabilities"
        className="landing-section section-padding"
        style={{
          padding: "80px 40px",
          borderTop: `1px solid ${THEME.border}`,
        }}
      >
        <div style={{ maxWidth: "900px", margin: "0 auto" }}>
          <div
            style={{
              fontFamily: MONO,
              fontSize: "9px",
              letterSpacing: "0.12em",
              color: THEME.orange,
              marginBottom: "12px",
            }}
          >
            CAPABILITIES
          </div>
          <h2
            style={{
              fontFamily: GROTESK,
              fontSize: "28px",
              fontWeight: 700,
              letterSpacing: "0.04em",
              color: THEME.text,
              marginBottom: "40px",
            }}
          >
            SEMUA YANG KAMU BUTUHKAN, SATU LAYAR
          </h2>
          <div
            className="landing-grid-3"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: "1px",
              backgroundColor: THEME.border,
            }}
          >
            {CAPABILITIES.map((cap, i) => (
              <FeatureCard
                key={i}
                icon={cap.icon}
                title={cap.title}
                description={cap.description}
                index={i}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ───────────────────────────────────────────────── */}
      <section
        className="landing-section section-padding"
        style={{
          padding: "80px 40px",
          borderTop: `1px solid ${THEME.border}`,
        }}
      >
        <div style={{ maxWidth: "600px", margin: "0 auto" }}>
          <div
            style={{
              fontFamily: MONO,
              fontSize: "9px",
              letterSpacing: "0.12em",
              color: THEME.orange,
              marginBottom: "12px",
            }}
          >
            CARA KERJA
          </div>
          <h2
            style={{
              fontFamily: GROTESK,
              fontSize: "28px",
              fontWeight: 700,
              letterSpacing: "0.04em",
              color: THEME.text,
              marginBottom: "40px",
            }}
          >
            TIGA LANGKAH KE ANALISIS
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
            <Step
              number="01"
              title="PILIH SAHAM DARI TICKER"
              description="Klik ticker di strip atas atau cari lewat sidebar. Data market langsung tampil — harga, volume, pergerakan intraday."
              index={0}
            />
            <div style={{ height: "1px", background: THEME.border, marginLeft: "60px" }} />
            <Step
              number="02"
              title="ANALISIS DI WORKSPACE"
              description="Buka chart teknikal dengan candlestick, pasang indikator (MA, RSI, MACD), gambar trendline. Semua alat tersedia, tidak ada yang dikunci."
              index={1}
            />
            <div style={{ height: "1px", background: THEME.border, marginLeft: "60px" }} />
            <Step
              number="03"
              title="TANYA KE ARAKANDAR"
              description='Buka panel AI Analyst, ketik pertanyaan. "Gimana prospek BBCA?", "Sektor mana yang kuat hari ini?", "Ada berita apa soal IHSG?" — Arakandar menjawab dengan data.'
              index={2}
            />
          </div>
        </div>
      </section>

      {/* ── WHAT ARAKANDAR CAN DO ──────────────────────────────────────── */}
      <section
        className="landing-section section-padding"
        style={{
          padding: "80px 40px",
          borderTop: `1px solid ${THEME.border}`,
        }}
      >
        <div style={{ maxWidth: "900px", margin: "0 auto" }}>
          <div
            style={{
              fontFamily: MONO,
              fontSize: "9px",
              letterSpacing: "0.12em",
              color: THEME.orange,
              marginBottom: "12px",
            }}
          >
            AI ANALYST
          </div>
          <h2
            style={{
              fontFamily: GROTESK,
              fontSize: "28px",
              fontWeight: 700,
              letterSpacing: "0.04em",
              color: THEME.text,
              marginBottom: "16px",
            }}
          >
            ARAKANDAR BUKAN CHATBOT BIASA
          </h2>
          <p
            style={{
              fontFamily: SANS,
              fontSize: "14px",
              lineHeight: "1.8",
              color: THEME.textSec,
              marginBottom: "40px",
              maxWidth: "600px",
            }}
          >
            Model Arakandar jalan lokal di server — bukan API pihak ketiga. Dia punya akses 
            langsung ke data market, chart, dan internet search. Ini bukan template jawaban, 
            tapi analisis yang dihasilkan dari data yang sedang kamu lihat.
          </p>

          <div
            className="landing-grid-2"
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "1px",
              backgroundColor: THEME.border,
              border: `1px solid ${THEME.border}`,
            }}
          >
            {[
              {
                q: '"Gimana kondisi BBCA hari ini?"',
                a: "Arakandar membaca harga terkini, volume, RSI, dan broker summary BBCA, lalu memberikan market read berdasarkan data yang ada di layar.",
              },
              {
                q: '"Ada berita apa soal sektor banking?"',
                a: "Arakandar mencari Google News terbaru tentang banking Indonesia, menampilkan sumber dan tanggal, lalu merangkum implikasinya terhadap portofolio.",
              },
              {
                q: '"Support dan resistance IHSG di mana?"',
                a: "Arakandar menganalisis chart IHSG dari data OHLCV, menghitung level teknikal, dan menjelaskan kenapa level tersebut penting.",
              },
              {
                q: '"Bandingkan BBRI dan BMRI."',
                a: "Arakandar mengambil data fundamental dan teknikal kedua saham, lalu membandingkan valuasi, profitabilitas, dan momentum harga secara head-to-head.",
              },
            ].map((item, i) => (
              <div key={i} style={{ padding: "24px", backgroundColor: THEME.surface }}>
                <div
                  style={{
                    fontFamily: MONO,
                    fontSize: "12px",
                    color: THEME.orange,
                    marginBottom: "10px",
                  }}
                >
                  {item.q}
                </div>
                <p
                  style={{
                    fontFamily: SANS,
                    fontSize: "13px",
                    lineHeight: "1.7",
                    color: THEME.textSec,
                  }}
                >
                  {item.a}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TECH STACK ─────────────────────────────────────────────────── */}
      <section
        className="landing-section section-padding"
        style={{
          padding: "80px 40px",
          borderTop: `1px solid ${THEME.border}`,
        }}
      >
        <div style={{ maxWidth: "900px", margin: "0 auto" }}>
          <div
            style={{
              fontFamily: MONO,
              fontSize: "9px",
              letterSpacing: "0.12em",
              color: THEME.orange,
              marginBottom: "12px",
            }}
          >
            UNDER THE HOOD
          </div>
          <h2
            style={{
              fontFamily: GROTESK,
              fontSize: "28px",
              fontWeight: 700,
              letterSpacing: "0.04em",
              color: THEME.text,
              marginBottom: "40px",
            }}
          >
            DIBANGUN DENGAN STACK MODERN
          </h2>
          <div
            className="landing-grid-2"
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "24px",
            }}
          >
            {[
              {
                label: "FRONTEND",
                items: ["Next.js + React 19", "Tailwind CSS", "Real-time WebSocket feeds", "Canvas-based charting"],
              },
              {
                label: "BACKEND",
                items: ["FastAPI + Python", "Arakandar local model", "Yahoo Finance OHLCV", "Google News RSS (no API key)"],
              },
              {
                label: "DATA",
                items: ["Supabase conversation storage", "IDX delayed market data", "Multi-timeframe OHLCV", "Broker flow analysis"],
              },
              {
                label: "AI MODEL",
                items: ["Local inference (no cloud API)", "Context-aware market analysis", "Internet search integration", "Conversation memory via Supabase"],
              },
            ].map((block, i) => (
              <div
                key={i}
                style={{
                  padding: "20px",
                  backgroundColor: THEME.surface,
                  border: `1px solid ${THEME.border}`,
                }}
              >
                <div
                  style={{
                    fontFamily: MONO,
                    fontSize: "9px",
                    letterSpacing: "0.12em",
                    color: THEME.orange,
                    marginBottom: "12px",
                  }}
                >
                  {block.label}
                </div>
                {block.items.map((item, j) => (
                  <div
                    key={j}
                    style={{
                      fontFamily: MONO,
                      fontSize: "11px",
                      color: THEME.textSec,
                      padding: "5px 0",
                      borderBottom: j < block.items.length - 1 ? `1px solid ${THEME.border}` : "none",
                    }}
                  >
                    <span style={{ color: THEME.textMut, marginRight: "8px" }}>▸</span>
                    {item}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ────────────────────────────────────────────────────────── */}
      <section
        className="landing-section section-padding"
        style={{
          padding: "100px 40px",
          borderTop: `1px solid ${THEME.border}`,
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontFamily: MONO,
            fontSize: "9px",
            letterSpacing: "0.12em",
            color: THEME.orange,
            marginBottom: "16px",
          }}
        >
          READY
        </div>
        <h2
          style={{
            fontFamily: GROTESK,
            fontSize: "36px",
            fontWeight: 700,
            letterSpacing: "0.04em",
            color: THEME.text,
            marginBottom: "16px",
          }}
        >
          BUKA TERMINAL
        </h2>
        <p
          style={{
            fontFamily: SANS,
            fontSize: "15px",
            color: THEME.textSec,
            marginBottom: "32px",
            maxWidth: "500px",
            margin: "0 auto 32px",
            lineHeight: "1.7",
          }}
        >
          Tidak perlu daftar. Tidak perlu bayar. Langsung buka dan mulai analisis.
        </p>
        <a
          href="/"
          className="hover-lift"
          style={{
            display: "inline-block",
            fontFamily: MONO,
            fontSize: "12px",
            letterSpacing: "0.06em",
            padding: "14px 36px",
            color: THEME.bg,
            backgroundColor: THEME.orange,
            border: `1px solid ${THEME.orange}`,
            textDecoration: "none",
            cursor: "pointer",
            fontWeight: 600,
            transition: "all 0.2s",
          }}
        >
          BUKA ARAKAN NDAR →
        </a>
      </section>

      {/* ── FOOTER ─────────────────────────────────────────────────────── */}
      <footer
        className="landing-section section-padding"
        style={{
          padding: "24px 40px",
          borderTop: `1px solid ${THEME.border}`,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <LogoMark size={16} />
          <span
            style={{
              fontFamily: GROTESK,
              fontSize: "12px",
              fontWeight: 700,
              letterSpacing: "0.06em",
              color: THEME.textMut,
            }}
          >
            ARAKAN NDAR
          </span>
        </div>
        <div
          style={{
            fontFamily: MONO,
            fontSize: "9px",
            letterSpacing: "0.06em",
            color: THEME.textMut,
          }}
        >
          DATA PASAR TERTUNDA SESUAI STANDAR BURSA · BUKAN REKOMENDASI INVESTASI
        </div>
      </footer>
    </div>
  );
}
