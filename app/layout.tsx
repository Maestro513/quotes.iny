import type { Metadata } from "next";
import { IBM_Plex_Sans, Radley } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import Nav from "@/components/nav";

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-ibm-plex",
});

// Radley — editorial serif for Medicare plan card plan name + premium
// numeral. Google Fonts only ships one weight (400) plus italic; that's
// intentional for the display voice.
const radley = Radley({
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
  variable: "--font-radley",
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
      <body className={`${ibmPlexSans.variable} ${radley.variable} ${satoshi.variable} antialiased`}>
        <Nav />
        {children}
      </body>
    </html>
  );
}
