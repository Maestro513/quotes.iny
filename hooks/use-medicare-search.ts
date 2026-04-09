"use client";

import { useState, useEffect } from "react";
import { fetchMedicarePlans } from "@/lib/medicare/adapter";
import type { MedicarePlan } from "@/types/medicare";

const PAGE_SIZE = 20;

export function useMedicareSearch(initialZip: string) {
  const [zip, setZip] = useState(initialZip);
  const [allPlans, setAllPlans] = useState<MedicarePlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  async function loadPlans(currentZip = zip) {
    setLoading(true);
    setError(false);
    try {
      const first = await fetchMedicarePlans({ zip: currentZip, page: 1 });
      let plans = first.plans;
      const totalPlans = first.total;

      if (plans.length < totalPlans) {
        const pages = Math.ceil(totalPlans / PAGE_SIZE);
        const rest = await Promise.all(
          Array.from({ length: pages - 1 }, (_, i) =>
            fetchMedicarePlans({ zip: currentZip, page: i + 2 })
          )
        );
        for (const r of rest) plans = [...plans, ...r.plans];
      }

      setAllPlans(plans);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadPlans(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return { zip, setZip, allPlans, loading, error, loadPlans };
}
