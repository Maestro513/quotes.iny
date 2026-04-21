"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Suspense } from "react";

function SuccessContent() {
  const { planId } = useParams<{ planId: string }>();
  const searchParams = useSearchParams();
  const receipt = searchParams.get("receipt") || "";

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#f5f7fb] flex items-center justify-center p-6">
      <div className="max-w-xl w-full bg-white rounded-2xl shadow-sm border border-black/5 p-8 lg:p-10 text-center">
        <div className="w-16 h-16 rounded-full bg-[#22c55e]/15 flex items-center justify-center mx-auto mb-5">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <h1 className="text-[#1d4ed8] text-2xl font-bold mb-2">Application submitted</h1>
        <p className="text-gray-600 text-sm mb-5">
          Your application is on its way to a licensed Insurance &apos;n You agent.
          They&apos;ll reach out within one business day to walk through next steps and confirm your enrollment.
        </p>
        {receipt && (
          <div className="bg-violet-50/70 border border-violet-100 rounded-lg py-3 px-4 mb-6 inline-block">
            <div className="text-xs text-violet-600 uppercase tracking-wider font-semibold">Receipt</div>
            <div className="text-violet-900 font-mono text-lg font-bold tabular-nums">{receipt}</div>
          </div>
        )}
        <div className="text-gray-600 text-sm space-y-2 text-left bg-gray-50/70 rounded-lg p-4 mb-6">
          <p className="font-semibold text-gray-800">What happens next</p>
          <ol className="list-decimal list-inside space-y-1 ml-1">
            <li>A licensed agent reviews your submission.</li>
            <li>They call the primary contact phone to confirm details.</li>
            <li>Once confirmed, the application is transmitted to the Marketplace.</li>
            <li>You&apos;ll receive an official enrollment notice from the carrier.</li>
          </ol>
        </div>
        <div className="flex gap-3 justify-center flex-wrap">
          <a
            href="tel:18444676968"
            className="px-5 py-2.5 rounded-lg bg-[#22c55e] text-white font-semibold text-sm hover:bg-green-500 transition-colors shadow-[0_2px_8px_rgba(34,197,94,0.25)]"
          >
            Call (844) 467-6968
          </a>
          <Link
            href={`/under-65`}
            className="px-5 py-2.5 rounded-lg bg-white border border-gray-300 text-gray-700 font-semibold text-sm hover:border-gray-500 hover:text-gray-900 transition-colors"
          >
            Back to search
          </Link>
        </div>
        <p className="text-gray-400 text-xs mt-6">
          Save your receipt. Reference it if you call us or the carrier.
          Plan ID: <span className="font-mono">{planId}</span>
        </p>
      </div>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense>
      <SuccessContent />
    </Suspense>
  );
}
