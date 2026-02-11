import { CursorCloudAgentClient } from "@/core/cursor/cloud-agent-client";
import { useCallback, useEffect, useRef, useState } from "react";

const CURSOR_CLOUD_AGENT_COUNT = {
  POLL_INTERVAL_MS: 30_000,
} as const;

interface CursorCloudAgentCountClient {
  listAgents: () => Promise<{ agents: unknown }>;
}

export interface UseCursorCloudAgentCountOptions {
  enabled?: boolean;
  pollIntervalMs?: number;
  createClient?: () => CursorCloudAgentCountClient;
}

export interface UseCursorCloudAgentCountResult {
  count: number | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useCursorCloudAgentCount(
  options: UseCursorCloudAgentCountOptions = {}
): UseCursorCloudAgentCountResult {
  const {
    enabled = false,
    pollIntervalMs = CURSOR_CLOUD_AGENT_COUNT.POLL_INTERVAL_MS,
    createClient = () => new CursorCloudAgentClient(),
  } = options;
  const [count, setCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const inFlightRef = useRef(false);
  const clientRef = useRef<CursorCloudAgentCountClient | null>(null);
  const createClientRef = useRef(createClient);

  useEffect(() => {
    createClientRef.current = createClient;
  }, [createClient]);

  const refresh = useCallback(async () => {
    if (!enabled || inFlightRef.current) {
      return;
    }

    inFlightRef.current = true;
    setError(null);
    try {
      const cloudClient = clientRef.current ?? createClientRef.current();
      if (!clientRef.current) {
        clientRef.current = cloudClient;
      }
      const response = await cloudClient.listAgents();
      const agentCount = Array.isArray(response.agents) ? response.agents.length : 0;
      setCount(agentCount);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setCount(null);
    } finally {
      setLoading(false);
      inFlightRef.current = false;
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      setCount(null);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
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

  return { count, loading, error, refresh };
}
