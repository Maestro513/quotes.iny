interface EmptyStateProps {
  type: "no-results" | "error" | "coming-soon";
  onRetry?: () => void;
}

const CONFIG = {
  "no-results": {
    icon: (
      <svg className="w-10 h-10 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 15.803 7.5 7.5 0 0016.803 16.803z" />
      </svg>
    ),
    heading: "No plans found",
    body: "Try adjusting your filters — or speak with one of our licensed agents to find the right plan.",
  },
  error: {
    icon: (
      <svg className="w-10 h-10 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
      </svg>
    ),
    heading: "Something went wrong",
    body: "We couldn't load plans right now. Please try again or call us directly.",
  },
  "coming-soon": {
    icon: (
      <svg className="w-10 h-10 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    heading: "Life plans coming soon",
    body: "We're finalizing our life insurance integrations. Speak to an agent today for immediate coverage options.",
  },
};

export default function EmptyState({ type, onRetry }: EmptyStateProps) {
  const { icon, heading, body } = CONFIG[type];

  return (
    <div className="flex flex-col items-center justify-center py-20 text-center px-6">
      <div className="w-20 h-20 rounded-full bg-white/[0.06] border border-white/10 flex items-center justify-center mb-5 backdrop-blur-sm">
        {icon}
      </div>
      <h3 className="text-white text-xl font-semibold mb-2">{heading}</h3>
      <p className="text-white/50 text-sm mb-7 max-w-sm leading-relaxed">{body}</p>
      <div className="flex flex-col sm:flex-row gap-3">
        <a
          href="tel:844-467-6968"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#22c55e] text-white rounded-lg font-semibold text-sm hover:bg-green-400 transition-colors shadow-[0_0_16px_rgba(34,197,94,0.25)] cursor-pointer"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
          </svg>
          Speak to an Agent
        </a>
        {type === "error" && onRetry && (
          <button
            onClick={onRetry}
            className="px-5 py-2.5 border border-white/20 text-white/60 rounded-lg text-sm hover:border-white/50 hover:text-white transition-colors cursor-pointer"
          >
            Try Again
          </button>
        )}
      </div>
    </div>
  );
}
