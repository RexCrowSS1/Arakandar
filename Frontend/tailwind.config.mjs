const config = {
  theme: {
    extend: {
      colors: {
        canvas: "#11110F",
        surface: "#181714",
        ink: "#E8E5DE",
        muted: "#8C8981",
        line: "#34312B",
        accent: "#E58A3A",
        positive: "#4CAF72",
        negative: "#C94040",
        info: "#4DA3FF",
        panel: "#161613",
        hover: "#1E1C18",
      },
      fontFamily: {
        sans: ["var(--font-barlow)", "sans-serif"],
        display: ["var(--font-barlow-condensed)", "sans-serif"],
        mono: ["var(--font-jetbrains)", "monospace"],
      },
      animation: {
        ticker: "ticker 32s linear infinite",
        cursor: "cursor 1.1s step-end infinite",
      },
      keyframes: {
        ticker: {
          from: { transform: "translateX(0)" },
          to: { transform: "translateX(-50%)" },
        },
        cursor: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0" },
        },
      },
    },
  },
};

export default config;
