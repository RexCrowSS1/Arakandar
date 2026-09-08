import "./globals.css";
import { barlow, barlowCondensed, jetbrainsMono } from "./fonts";

export const metadata = {
  title: "Arakan Ndar — AI Financial Platform",
  description:
    "Market intelligence, technical charts, and an analyst workspace for Indonesian markets.",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${barlow.variable} ${barlowCondensed.variable} ${jetbrainsMono.variable} h-full bg-canvas [color-scheme:dark]`}
    >
      <body className="h-full bg-canvas font-sans text-[13px] text-ink antialiased">
        {children}
      </body>
    </html>
  );
}
