import "./globals.css";

export const metadata = {
  title: "Arakan Ndar — Market Intelligence",
  description: "A focused market analysis interface for Indonesian and global indices.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
