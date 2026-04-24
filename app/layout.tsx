import type { Metadata } from "next";
import { IBM_Plex_Sans, Fraunces, Figtree } from "next/font/google";
import "./globals.css";
import Nav from "@/components/nav";

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-ibm-plex",
});

// Used by the Medicare plan cards — Fraunces for the plan name + premium
// numeral (editorial serif with opsz + SOFT axes), Figtree for body text
// (clean geometric sans that still feels distinctive against Inter/IBM Plex).
const fraunces = Fraunces({
  subsets: ["latin"],
  axes: ["SOFT", "opsz"],
  variable: "--font-fraunces",
  display: "swap",
});

const figtree = Figtree({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-figtree",
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
      <body className={`${ibmPlexSans.variable} ${fraunces.variable} ${figtree.variable} antialiased`}>
        <Nav />
        {children}
      </body>
    </html>
  );
}
