"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api, ApiError } from "@/lib/api";

/**
 * Minimal GET hook with abort-on-unmount and a manual `reload`.
 *
 * `query` is compared by its serialised form rather than by identity, so a
 * caller can pass an inline object literal without causing an infinite
 * fetch loop.
 */
export function useApi<T>(
  path: string | null,
  query?: Record<string, string | number | boolean | undefined | null>,
) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [loading, setLoading] = useState(Boolean(path));
  const controller = useRef<AbortController | null>(null);

  const queryKey = query ? JSON.stringify(query) : "";

  const load = useCallback(async () => {
    if (!path) {
      setLoading(false);
      return;
    }
    controller.current?.abort();
    const active = new AbortController();
    controller.current = active;

    setLoading(true);
    setError(null);
    try {
      const parsed = queryKey ? JSON.parse(queryKey) : undefined;
      const result = await api.get<T>(path, parsed);
      if (!active.signal.aborted) setData(result);
    } catch (caught) {
      if (active.signal.aborted) return;
      setError(
        caught instanceof ApiError
          ? caught
          : new ApiError(0, { code: "unknown", message: "Something went wrong." }),
      );
    } finally {
      if (!active.signal.aborted) setLoading(false);
    }
  }, [path, queryKey]);

  useEffect(() => {
    void load();
    return () => controller.current?.abort();
  }, [load]);

  return { data, error, loading, reload: load, setData };
}
