"use client";

import { useState, useEffect } from "react";
import { fetchUnder65Plans } from "@/lib/under65/adapter";
import type { Under65Plan } from "@/types/under65";

interface SearchParams {
  zip: string;
  dob: string;
  gender: string;
  income: string;
  tobacco: boolean;
  householdSize: number;
  coverageStart: string;
}

export function usePlanSearch(initial: SearchParams) {
  const [params, setParams] = useState(initial);
  const [allPlans, setAllPlans] = useState<Under65Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  async function loadPlans(overrides?: Partial<SearchParams>) {
    const p = overrides ? { ...params, ...overrides } : params;
    setLoading(true);
    setError(false);
    try {
      const results = await fetchUnder65Plans({
        zip: p.zip,
        dob: p.dob,
        gender: p.gender,
        income: p.income,
        tobacco: p.tobacco,
        householdSize: p.householdSize,
        coverageStartDate: p.coverageStart,
      });
      setAllPlans(results);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadPlans(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return { allPlans, loading, error, params, setParams, loadPlans };
}
