import { FACT_ROTATE_INTERVAL_MS } from "@/config/limits";
import { loadFacts, pickRandomFact } from "@/utils/facts-cache";
import { useEffect, useState } from "react";

export interface UseRandomFactResult {
  /** One random fact text, or null until loaded or if load failed. Stable for the component instance. */
  fact: string | null;
}

export interface UseRotatingFactResult {
  /** Current random fact; rotates every intervalMs while active. */
  fact: string | null;
}

/**
 * Load facts once (cached globally) and return one random fact for this component.
 * The same fact is kept for the lifetime of the component.
 */
export function useRandomFact(): UseRandomFactResult {
  const [fact, setFact] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadFacts().then(() => {
      if (!cancelled) {
        setFact(pickRandomFact());
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return { fact };
}

/**
 * Return a random fact that updates every intervalMs while active (e.g. while agent is streaming).
 * Uses the shared facts cache; only runs the rotation when active is true.
 */
export function useRotatingFact(
  active: boolean,
  intervalMs: number = FACT_ROTATE_INTERVAL_MS
): UseRotatingFactResult {
  const [fact, setFact] = useState<string | null>(null);

  useEffect(() => {
    if (!active) return;

    let cancelled = false;
    let intervalId: ReturnType<typeof setInterval> | undefined;

    loadFacts().then(() => {
      if (!cancelled) {
        setFact(pickRandomFact());
        intervalId = setInterval(() => {
          if (!cancelled) {
            setFact(pickRandomFact());
          }
        }, intervalMs);
      }
    });

    return () => {
      cancelled = true;
      if (intervalId !== undefined) clearInterval(intervalId);
    };
  }, [active, intervalMs]);

  return { fact };
}
