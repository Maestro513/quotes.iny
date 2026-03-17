"use client";

import { useState, useEffect, useRef } from "react";

interface Suggestion {
  id: string;   // npi or rxcui
  label: string;
  sub: string;
}

interface CoverageSearchProps {
  type: "provider" | "drug";
  zip?: string;
  selectedId: string | null;
  selectedLabel: string;
  onSelect: (id: string, label: string) => void;
  onClear: () => void;
  loading?: boolean;
}

const sidebarInput =
  "w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-[#22c55e]/60 focus:bg-white/10 transition-colors";

export default function CoverageSearch({
  type, zip, selectedId, selectedLabel, onSelect, onClear, loading,
}: CoverageSearchProps) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [fetching, setFetching] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!selectedId) setQuery("");
  }, [selectedId]);

  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    if (query.length < 2) { setSuggestions([]); setOpen(false); return; }

    debounce.current = setTimeout(async () => {
      setFetching(true);
      try {
        const endpoint = type === "provider"
          ? `/api/under65/providers/autocomplete?q=${encodeURIComponent(query)}&zip=${zip ?? ""}`
          : `/api/under65/drugs/autocomplete?q=${encodeURIComponent(query)}`;
        const res = await fetch(endpoint);
        const data = await res.json();

        const mapped: Suggestion[] = type === "provider"
          ? data.map((p: { npi: string; name: string; specialty: string }) => ({
              id: p.npi, label: p.name, sub: p.specialty,
            }))
          : data.map((d: { rxcui: string; name: string; detail: string }) => ({
              id: d.rxcui, label: d.name, sub: d.detail,
            }));

        setSuggestions(mapped);
        setOpen(mapped.length > 0);
      } finally {
        setFetching(false);
      }
    }, 300);
  }, [query, type, zip]);

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  if (selectedId) {
    return (
      <div className="flex items-center justify-between rounded-lg px-3 py-2 text-sm" style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.3)" }}>
        <div className="min-w-0">
          <div className="text-[#22c55e] font-medium text-xs truncate">{selectedLabel}</div>
          {loading && <div className="text-white/40 text-[10px]">Checking coverage…</div>}
        </div>
        <button type="button" onClick={onClear} className="text-white/40 hover:text-white ml-2 shrink-0 cursor-pointer">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        className={sidebarInput}
        placeholder={type === "provider" ? "Search by name…" : "Search medication…"}
      />
      {fetching && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          <div className="w-3 h-3 border border-white/30 border-t-white/70 rounded-full animate-spin" />
        </div>
      )}
      {open && suggestions.length > 0 && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 rounded-lg overflow-hidden shadow-xl" style={{ background: "#1e0f36", border: "1px solid rgba(218,202,239,0.2)" }}>
          {suggestions.map((s) => (
            <button
              key={s.id}
              type="button"
              onMouseDown={() => { onSelect(s.id, s.label); setOpen(false); setQuery(""); }}
              className="w-full text-left px-3 py-2.5 hover:bg-white/10 transition-colors cursor-pointer border-b border-white/[0.05] last:border-0"
            >
              <div className="text-white text-sm font-medium truncate">{s.label}</div>
              {s.sub && <div className="text-white/40 text-xs truncate">{s.sub}</div>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
