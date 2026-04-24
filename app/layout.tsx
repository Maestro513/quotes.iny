import type { Metadata } from "next";
import { IBM_Plex_Sans, Lancelot } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import Nav from "@/components/nav";

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-ibm-plex",
});

// Lancelot — calligraphic serif for Medicare plan card plan name +
// premium numeral. Single weight (400), distinctive voice.
const lancelot = Lancelot({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-lancelot",
  display: "swap",
});

// Satoshi — Indian Type Foundry sans, shipped alongside Recia in our
// MedConcierge stack. Loaded locally because Satoshi isn't on Google
// Fonts; WOFF2 files live in /app/fonts.
const satoshi = localFont({
  src: [
    { path: "./fonts/Satoshi-Light.woff2", weight: "300", style: "normal" },
    { path: "./fonts/Satoshi-Regular.woff2", weight: "400", style: "normal" },
    { path: "./fonts/Satoshi-Medium.woff2", weight: "500", style: "normal" },
    { path: "./fonts/Satoshi-Bold.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-satoshi",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Insurance Quotes | Insurance 'n You",
  description: "Compare health, Medicare, and life insurance plans.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${ibmPlexSans.variable} ${lancelot.variable} ${satoshi.variable} antialiased`}>
        <Nav />
        {children}
      </body>
    </html>
  );
}
