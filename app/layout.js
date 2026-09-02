import "./globals.css";
import AnalyticsFiltered from "./components/AnalyticsFiltered";

// The favicon comes from app/icon.jpg (Next's file convention) — no icons entry.
export const metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"),
  title: "coppi",
  openGraph: {
    title: "coppi",
    siteName: "coppi",
    type: "website",
    images: [{ url: "/logo.png" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "coppi",
    images: ["/logo.png"],
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
