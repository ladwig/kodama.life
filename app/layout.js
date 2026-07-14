import "./globals.css";
import AnalyticsFiltered from "./components/AnalyticsFiltered";

export const metadata = {
  metadataBase: new URL("https://kodama.life"),
  icons: { icon: "/favicon.ico" },
  title: "sidequest",
  description: "sidequest — a gathering outside of Berlin, 22. August 2026.",
  openGraph: {
    title: "sidequest — 22. August 2026",
    description: "sidequest — a gathering outside of Berlin, 22. August 2026.",
    url: "https://kodama.life",
    siteName: "sidequest",
    type: "website",
    images: [{ url: "/sidequest-logo.png" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "sidequest — 22. August 2026",
    description: "sidequest — a gathering outside of Berlin, 22. August 2026.",
    images: ["/sidequest-logo.png"],
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
        <AnalyticsFiltered />
      </body>
    </html>
  );
}
