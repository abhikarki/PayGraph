import { useState, useEffect, useCallback } from "react";
import type {
  GraphData,
  RoutesData,
  HistoryData,
  StatusData,
  OptimizeMode,
} from "./types";

const API_BASE = "http://localhost:8000";

async function apiFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export function useGraph(refreshInterval = 60_000) {
  const [data, setData] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch_ = useCallback(async () => {
    try {
      const g = await apiFetch<GraphData>("/graph");
      setData(g);
      setError(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch_();
    const id = setInterval(fetch_, refreshInterval);
    return () => clearInterval(id);
  }, [fetch_, refreshInterval]);

  return { data, loading, error, refetch: fetch_ };
}

export function useRoutes(
  fromToken: string | null,
  toToken: string | null,
  optimize: OptimizeMode
) {
  const [data, setData] = useState<RoutesData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!fromToken || !toToken || fromToken === toToken) {
      setData(null);
      return;
    }
    setLoading(true);
    apiFetch<RoutesData>(
      `/routes?from_token=${fromToken}&to_token=${toToken}&optimize=${optimize}`
    )
      .then((d) => {
        setData(d);
        setError(null);
      })
      .catch((e: unknown) =>
        setError(e instanceof Error ? e.message : String(e))
      )
      .finally(() => setLoading(false));
  }, [fromToken, toToken, optimize]);

  return { data, loading, error };
}

export function useHistory(pairId: string | null, hours: number) {
  const [data, setData] = useState<HistoryData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!pairId) return;
    setLoading(true);
    apiFetch<HistoryData>(`/history/${pairId}?hours=${hours}`)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [pairId, hours]);

  return { data, loading };
}

export function useStatus(refreshInterval = 15_000) {
  const [data, setData] = useState<StatusData | null>(null);

  useEffect(() => {
    const fetch_ = () =>
      apiFetch<StatusData>("/status")
        .then(setData)
        .catch(() => {});
    fetch_();
    const id = setInterval(fetch_, refreshInterval);
    return () => clearInterval(id);
  }, [refreshInterval]);

  return data;
}