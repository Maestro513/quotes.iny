"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";

const NAV_LINKS = [
  { label: "How It Works", href: "https://insurancenyou.com/how-it-works" },
  { label: "Blog", href: "https://insurancenyou.com/blog" },
  { label: "Who We Are", href: "https://insurancenyou.com/about-us" },
];

const FEATURES_LINKS = [
  { label: "Under 65", href: "/under-65" },
  { label: "Medicare", href: "/medicare" },
  { label: "Life Insurance", href: "/life" },
];

export default function Nav() {
  const [featuresOpen, setFeaturesOpen] = useState(false);

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="https://insurancenyou.com" className="flex items-center shrink-0">
          <Image
            src="/insurance-color-logo.svg"
            alt="Insurance 'n You"
            width={178}
            height={32}
            priority
          />
        </Link>

        {/* Center nav */}
        <div className="hidden lg:flex items-center gap-6 text-sm font-medium text-gray-700">
          {NAV_LINKS.map(({ label, href }) => (
            <a
              key={label}
              href={href}
              className="hover:text-[#3d1f5e] transition-colors"
            >
              {label}
            </a>
          ))}

          {/* Features dropdown */}
          <div className="relative">
            <button
              onClick={() => setFeaturesOpen((o) => !o)}
              className="flex items-center gap-1 hover:text-[#3d1f5e] transition-colors"
            >
              Features
              <svg
                className={`w-4 h-4 transition-transform ${featuresOpen ? "rotate-180" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {featuresOpen && (
              <div className="absolute top-full left-0 mt-2 w-44 bg-white border border-gray-100 rounded-lg shadow-lg py-1">
                {FEATURES_LINKS.map(({ label, href }) => (
                  <Link
                    key={label}
                    href={href}
                    onClick={() => setFeaturesOpen(false)}
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-[#3d1f5e] transition-colors"
                  >
                    {label}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-4 text-sm">
          <a
            href="tel:844-467-6968"
            className="hidden sm:flex flex-col items-end leading-tight hover:text-[#3d1f5e] transition-colors"
          >
            <span className="text-[10px] text-gray-500 font-medium uppercase tracking-wide">Call now</span>
            <span className="font-semibold text-gray-800">844-467-6968</span>
          </a>
          <a
            href="https://app.insurancenyou.com/auth/login"
            className="flex items-center gap-1.5 border border-gray-300 rounded-md px-3 py-1.5 text-gray-700 hover:border-[#3d1f5e] hover:text-[#3d1f5e] transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            Login
          </a>
        </div>
      </div>
    </nav>
  );
}
