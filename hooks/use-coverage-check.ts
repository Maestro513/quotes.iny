"use client";

import { useState } from "react";

interface CoverageResult {
  coveredIds: Set<string>;
  address: string | null;
}

export function useCoverageCheck(allPlanIds: string[]) {
  const [doctorNpi, setDoctorNpi] = useState<string | null>(null);
  const [doctorLabel, setDoctorLabel] = useState("");
  const [doctorAddress, setDoctorAddress] = useState<string | null>(null);
  const [doctorLoading, setDoctorLoading] = useState(false);

  const [drugRxcui, setDrugRxcui] = useState<string | null>(null);
  const [drugLabel, setDrugLabel] = useState("");
  const [drugLoading, setDrugLoading] = useState(false);

  async function checkCoverage(type: "provider" | "drug", id: string): Promise<CoverageResult> {
    if (!allPlanIds.length) return { coveredIds: new Set<string>(), address: null };
    const res = await fetch("/api/under65/coverage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, id, planIds: allPlanIds, year: new Date().getFullYear() }),
    });
    const data = await res.json();
    return { coveredIds: new Set<string>(data.coveredIds ?? []), address: data.address ?? null };
  }

  async function handleDoctorSelect(
    npi: string,
    label: string,
    onCovered: (ids: Set<string>) => void,
  ) {
    setDoctorNpi(npi);
    setDoctorLabel(label);
    setDoctorAddress(null);
    setDoctorLoading(true);
    const { coveredIds, address } = await checkCoverage("provider", npi);
    onCovered(coveredIds);
    setDoctorAddress(address);
    setDoctorLoading(false);
  }

  async function handleDrugSelect(
    rxcui: string,
    label: string,
    onCovered: (ids: Set<string>) => void,
  ) {
    setDrugRxcui(rxcui);
    setDrugLabel(label);
    setDrugLoading(true);
    const { coveredIds } = await checkCoverage("drug", rxcui);
    onCovered(coveredIds);
    setDrugLoading(false);
  }

  function clearDoctor(onClear: () => void) {
    setDoctorNpi(null);
    setDoctorLabel("");
    setDoctorAddress(null);
    onClear();
  }

  function clearDrug(onClear: () => void) {
    setDrugRxcui(null);
    setDrugLabel("");
    onClear();
  }

  return {
    doctorNpi, doctorLabel, doctorAddress, doctorLoading,
    drugRxcui, drugLabel, drugLoading,
    handleDoctorSelect, handleDrugSelect,
    clearDoctor, clearDrug,
  };
}
