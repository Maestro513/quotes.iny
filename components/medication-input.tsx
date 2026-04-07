"use client";

import { useState, useRef, useEffect } from "react";

export interface SelectedDrug {
  name: string;
  rxcui: string;
}

interface MedicationInputProps {
  selectedDrugs: SelectedDrug[];
  onAdd: (drug: SelectedDrug) => void;
  onRemove: (rxcui: string) => void;
  loading?: boolean;
}

interface Suggestion {
  name: string;
  rxcui: string;
}

/** Extract a readable short name from RxNorm full name like "apixaban 5 MG Oral Tablet [Eliquis]" → "Eliquis 5mg" */
function simplifyDrugName(fullName: string): string {
  // Try to extract brand name from brackets: [BrandName]
  const brandMatch = fullName.match(/\[([^\]]+)\]/);
  const dosageMatch = fullName.match(/(\d+(?:\.\d+)?)\s*MG/i);
  if (brandMatch) {
    return dosageMatch ? `${brandMatch[1]} ${dosageMatch[1]}mg` : brandMatch[1];
  }
  // No brand name — use first word + dosage
  const firstWord = fullName.split(" ")[0];
  return dosageMatch ? `${firstWord} ${dosageMatch[1]}mg` : firstWord;
}

const sidebarInput =
  "w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-[#22c55e]/60 focus:bg-white/10 transition-colors";

export default function MedicationInput({ selectedDrugs, onAdd, onRemove, loading }: MedicationInputProps) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleChange(value: string) {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (value.length < 2) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch("/api/medicare/drugs/autocomplete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: value }),
        });
        const data: Suggestion[] = await res.json();
        setSuggestions(data);
        setShowDropdown(data.length > 0);
      } catch {
        setSuggestions([]);
      } finally {
        setSearching(false);
      }
    }, 300);
  }

  function handleSelect(drug: Suggestion) {
    if (!selectedDrugs.some((d) => d.rxcui === drug.rxcui)) {
      onAdd({ name: drug.name, rxcui: drug.rxcui });
    }
    setQuery("");
    setSuggestions([]);
    setShowDropdown(false);
  }

  return (
    <div ref={wrapperRef}>
      {/* Input */}
      <div className="relative">
        <input
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => suggestions.length > 0 && setShowDropdown(true)}
          className={sidebarInput}
          placeholder="Search medications..."
        />
        {searching && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-white/20 border-t-[#22c55e] rounded-full animate-spin" />
          </div>
        )}

        {/* Dropdown */}
        {showDropdown && (
          <div
            className="absolute z-50 top-full left-0 right-0 mt-1 rounded-lg overflow-hidden shadow-xl max-h-60 overflow-y-auto"
            style={{ background: "#1e0f36", border: "1px solid rgba(218,202,239,0.2)" }}
          >
            {suggestions.map((s) => (
              <button
                key={s.rxcui}
                type="button"
                onClick={() => handleSelect(s)}
                className="w-full text-left px-3 py-2 text-sm text-white/80 hover:bg-white/10 hover:text-white transition-colors cursor-pointer truncate"
              >
                {s.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Selected drugs as chips */}
      {selectedDrugs.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2.5">
          {selectedDrugs.map((drug) => (
            <span
              key={drug.rxcui}
              className="inline-flex items-center gap-1 text-xs font-medium bg-[#22c55e]/15 text-[#22c55e] border border-[#22c55e]/30 rounded-full px-2.5 py-1"
            >
              {simplifyDrugName(drug.name)}
              <button
                type="button"
                onClick={() => onRemove(drug.rxcui)}
                className="ml-0.5 hover:text-white transition-colors cursor-pointer"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Loading indicator for estimates */}
      {loading && selectedDrugs.length > 0 && (
        <p className="text-white/30 text-[11px] mt-1.5">Estimating costs...</p>
      )}
    </div>
  );
}
