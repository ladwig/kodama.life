import "./globals.css";
import AnalyticsFiltered from "./components/AnalyticsFiltered";
import { areSoundsEnabled } from "@/lib/config";

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

export default async function RootLayout({ children }) {
  // lib/sounds.js reads this attribute — one server-side lookup for every page.
  const sounds = await areSoundsEnabled();

  return (
    <html lang="en">
      <body data-sounds={sounds ? "on" : "off"}>
        {children}
        <AnalyticsFiltered />
      </body>
    </html>
  );
}
