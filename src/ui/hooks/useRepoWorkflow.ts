import { type RepoWorkflowInfo, getRepoWorkflowInfo } from "@/core/repo-workflow";
import { useCallback, useEffect, useRef, useState } from "react";

export interface UseRepoWorkflowOptions {
  cwd?: string;
  pollIntervalMs?: number;
  enabled?: boolean;
}

export interface UseRepoWorkflowResult {
  info: RepoWorkflowInfo | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useRepoWorkflow(options: UseRepoWorkflowOptions = {}): UseRepoWorkflowResult {
  const { cwd = process.cwd(), pollIntervalMs = 30_000, enabled = true } = options;
  const [info, setInfo] = useState<RepoWorkflowInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const inFlightRef = useRef(false);

  const refresh = useCallback(async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    setError(null);
    try {
      const result = await getRepoWorkflowInfo(cwd);
      setInfo(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setInfo(null);
    } finally {
      setLoading(false);
      inFlightRef.current = false;
    }
  }, [cwd]);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      setInfo(null);
      setError(null);
      return;
    }
    void refresh();
  }, [enabled, refresh]);

  useEffect(() => {
    if (!enabled || pollIntervalMs <= 0) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }
    intervalRef.current = setInterval(() => {
      void refresh();
    }, pollIntervalMs);
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled, pollIntervalMs, refresh]);

  return { info, loading, error, refresh };
}
