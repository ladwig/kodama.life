import "./globals.css";

export const metadata = {
  title: "sidequest",
  description: "sidequest is a gathering at Kiekebusch See on 22. August 2026.",
  openGraph: {
    title: "Kodama — 22. August 2026",
    description: "sidequest is a gathering at Kiekebusch See on 22. August 2026.",
    url: "https://kodama.life",
    siteName: "sidequest",
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
