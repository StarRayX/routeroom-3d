import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./states.css";

const siteUrl = "https://routeroom3d.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "RouteRoom 3D",
    template: "%s · RouteRoom 3D",
  },
  description:
    "A shared commute decision room where a human sets priorities and a WebMCP agent searches, compares, and stress-tests routes in a low-poly 3D city scene. The human keeps control of saving, sharing, and publishing.",
  openGraph: {
    title: "RouteRoom 3D",
    description:
      "A human and an agent plan a city trip together in the same live 3D scene, using WebMCP tools instead of a chat bubble over a map.",
    url: siteUrl,
    siteName: "RouteRoom 3D",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#f3efe6",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
