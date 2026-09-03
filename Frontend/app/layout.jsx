import "./globals.css";

export const metadata = {
  title: "Bandar Pasar",
  description: "Frontend Bandar Pasar",
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
