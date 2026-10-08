import Link from "next/link";
import Image from "next/image";
import TerminalPreview from "./TerminalPreview";
import styles from "./landing.module.css";

const features = [
  {
    number: "01",
    name: "Follow the market.",
    description:
      "Follow the IHSG, your watchlist, regional indices, and exchange rates. Check price movements alongside their update times.",
    detail: "INDICES / WATCHLIST / SECTORS",
  },
  {
    number: "02",
    name: "Examine the chart.",
    description:
      "Read candlesticks and volume across time ranges. Add indicators, zoom into the chart, and mark the levels you want to watch.",
    detail: "MA / RSI / MACD / BOLLINGER",
  },
  {
    number: "03",
    name: "Take the analysis further.",
    description:
      "Ask Arakandar about the stock and chart you have open. Follow news sources and pick up the discussion from your saved conversations.",
    detail: "CHART CONTEXT / NEWS SOURCES / HISTORY",
  },
];

function Brand({ footer = false }) {
  return (
    <Link href="/" className={styles.brand} aria-label="Arakan Ndar — home">
      <Image
        className={styles.brandMark}
        src="/arakan-ndar-logo.png"
        width={72}
        height={48}
        alt=""
        preload={!footer}
      />
      <span>
        ARAKAN NDAR{!footer && <small>INDONESIAN MARKET TERMINAL</small>}
      </span>
    </Link>
  );
}

export default function LandingPage() {
  return (
    <div className={styles.page} lang="en">
      <a href="#main" className={styles.skipLink}>
        Skip to content
      </a>
      <header className={styles.header}>
        <div className={`${styles.container} ${styles.navbar}`}>
          <Brand />
          <nav aria-label="Main navigation" className={styles.sectionNav}>
            <a href="#terminal">Terminal</a>
            <a href="#fitur">Features</a>
            <a href="#mulai">Get started</a>
          </nav>
          <div className={styles.accountNav}>
            <Link href="/sign-in">Sign in</Link>
            <Link href="/sign-up" className={styles.navSignup}>
              Sign up <span aria-hidden="true">↗</span>
            </Link>
          </div>
        </div>
      </header>
      <main id="main">
        <section
          className={`${styles.container} ${styles.hero}`}
          aria-labelledby="hero-title"
        >
          <div className={styles.heroEyebrow}>
            <span>
              <i aria-hidden="true" /> BUILT FOR INDONESIAN INVESTORS
            </span>
            <span>PRICES, CHARTS & CONTEXT</span>
          </div>
          <div className={styles.heroGrid}>
            <h1 id="hero-title">
              Indonesian markets.
              <br />
              <span>One workspace.</span>
            </h1>
            <div className={styles.heroCopy}>
              <p>
                Track prices, read charts, and discuss your analysis with
                Arakandar. Start with the stocks you follow.
              </p>
              <div className={styles.heroActions}>
                <Link href="/sign-up" className={styles.primaryLink}>
                  Create account <span aria-hidden="true">↗</span>
                </Link>
                <a href="#terminal" className={styles.textLink}>
                  Explore the terminal <span aria-hidden="true">↓</span>
                </a>
              </div>
            </div>
          </div>
          <div className={styles.heroFootnote}>
            <span>MARKET OVERVIEW</span>
            <span>TECHNICAL CHARTS</span>
            <span>AI ANALYST</span>
            <a href="#tentang-data">
              About the data <span aria-hidden="true">↙</span>
            </a>
          </div>
        </section>
        <section
          id="terminal"
          className={`${styles.container} ${styles.previewSection}`}
          aria-labelledby="preview-title"
        >
          <div className={styles.sectionCaption}>
            <h2 id="preview-title">
              <span>01 /</span> INSIDE THE TERMINAL
            </h2>
            <p>Choose a stock and time range to try the chart.</p>
          </div>
          <TerminalPreview />
          <div className={styles.previewCaption}>
            <span>Prices and charts from connected market feeds.</span>
            <Link href="/analysis">
              Open the full workspace <span aria-hidden="true">↗</span>
            </Link>
          </div>
        </section>
        <section
          id="fitur"
          className={styles.features}
          aria-labelledby="features-title"
        >
          <div className={styles.container}>
            <div className={styles.featureIntro}>
              <div>
                <p className={styles.eyebrow}>02 / YOUR TOOLKIT</p>
                <h2 id="features-title">
                  From price movements
                  <br />
                  to a considered view.
                </h2>
              </div>
              <p>
                Start with the market overview, look at the technical details,
                then ask questions. Each part connects in one workspace.
              </p>
            </div>
            <div>
              {features.map((feature) => (
                <article key={feature.number} className={styles.featureRow}>
                  <span className={styles.featureNumber}>{feature.number}</span>
                  <h3>{feature.name}</h3>
                  <div>
                    <p>{feature.description}</p>
                    <span className={styles.featureDetail}>
                      {feature.detail}
                    </span>
                  </div>
                </article>
              ))}
            </div>
            <aside
              id="tentang-data"
              className={styles.dataNote}
              aria-labelledby="data-title"
            >
              <h3 id="data-title">ABOUT THE DATA</h3>
              <p>
                Prices reflect exchange feed delays. Sources and update times
                are shown in the terminal. Broker summaries and foreign flow
                data are not yet available.
              </p>
            </aside>
          </div>
        </section>
        <section
          id="mulai"
          className={`${styles.container} ${styles.startSection}`}
          aria-labelledby="start-title"
        >
          <div className={styles.startHeading}>
            <p className={styles.eyebrow}>03 / GET STARTED</p>
            <h2 id="start-title">
              Create an account.
              <br />
              Pick your first stock.
            </h2>
            <p>
              Your conversations are saved to your account, so you can return to
              an analysis whenever you need to.
            </p>
            <Link href="/sign-up" className={styles.primaryLink}>
              Start your analysis <span aria-hidden="true">↗</span>
            </Link>
            <p className={styles.signinNote}>
              Already have an account? <Link href="/sign-in">Sign in</Link>
            </p>
          </div>
          <ol className={styles.steps}>
            <li>
              <span>01</span>
              <div>
                <h3>Sign up and verify your email</h3>
                <p>Create an account with your name, email, and password.</p>
              </div>
            </li>
            <li>
              <span>02</span>
              <div>
                <h3>Choose a stock you follow</h3>
                <p>Select a ticker and time range in the workspace.</p>
              </div>
            </li>
            <li>
              <span>03</span>
              <div>
                <h3>Start a conversation with Arakandar</h3>
                <p>Ask about price movements, indicators, or related news.</p>
              </div>
            </li>
          </ol>
        </section>
      </main>
      <footer className={styles.footer}>
        <div className={`${styles.container} ${styles.footerTop}`}>
          <Brand footer />
          <p>
            A workspace for market analysis.
            <br />
            Built for Indonesian investors.
          </p>
          <a href="#main">
            Back to top <span aria-hidden="true">↑</span>
          </a>
        </div>
        <div className={`${styles.container} ${styles.footerBottom}`}>
          <span>© {new Date().getFullYear()} Arakan Ndar</span>
          <span>BUILT FOR THE INDONESIAN MARKET</span>
          <Link href="/sign-in">
            Sign in to your account <span aria-hidden="true">↗</span>
          </Link>
        </div>
      </footer>
    </div>
  );
}
