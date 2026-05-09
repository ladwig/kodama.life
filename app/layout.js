import "./globals.css";

export const metadata = {
  icons: { icon: "/favicon.ico" },
  title: "sidequest",
  description: "sidequest is a gathering at outskirts of Berlin on 22. August 2026.",
  openGraph: {
    title: "sidequest — 22. August 2026",
    description: "sidequest is a gathering at outskirts of Berlin on 22. August 2026.",
    url: "https://kodama.life",
    siteName: "sidequest",
    type: "website",
    images: [{ url: "/sidequest-logo.png" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "sidequest — 22. August 2026",
    description: "sidequest is a gathering at outskirts of Berlin on 22. August 2026.",
    images: ["/sidequest-logo.png"],
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
