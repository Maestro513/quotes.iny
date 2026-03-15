interface EmptyStateProps {
  type: "no-results" | "error" | "coming-soon";
  onRetry?: () => void;
}

export default function EmptyState({ type, onRetry }: EmptyStateProps) {
  const messages = {
    "no-results": {
      heading: "No plans found",
      body: "Try adjusting your search filters or speak with one of our agents.",
    },
    error: {
      heading: "Something went wrong",
      body: "We couldn't load plans right now. Please try again.",
    },
    "coming-soon": {
      heading: "Plans coming soon",
      body: "Our life insurance plans are being set up. Speak to an agent for immediate assistance.",
    },
  };

  const { heading, body } = messages[type];

  return (
    <div className="flex flex-col items-center justify-center py-20 text-center px-6">
      <h3 className="text-white text-xl font-semibold mb-2">{heading}</h3>
      <p className="text-white/60 text-sm mb-6 max-w-sm">{body}</p>
      <div className="flex flex-col sm:flex-row gap-3">
        <a
          href="tel:844-467-6968"
          className="px-5 py-2.5 bg-[#22c55e] text-white rounded-md font-semibold text-sm hover:bg-green-500 transition-colors"
        >
          Speak to an Agent
        </a>
        {type === "error" && onRetry && (
          <button
            onClick={onRetry}
            className="px-5 py-2.5 border border-white/30 text-white/70 rounded-md text-sm hover:border-white/60 hover:text-white transition-colors"
          >
            Try Again
          </button>
        )}
      </div>
    </div>
  );
}
