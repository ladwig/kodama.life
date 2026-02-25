import "./globals.css";

export const metadata = {
  title: "Kodama — 22. August 2026 — Kiekebusch See",
  description: "Kodama is a gathering at Kiekebusch See on 22. August 2026.",
  openGraph: {
    title: "Kodama — 22. August 2026",
    description: "Kodama is a gathering at Kiekebusch See on 22. August 2026.",
    url: "https://kodama.life",
    siteName: "Kodama",
    type: "website",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
