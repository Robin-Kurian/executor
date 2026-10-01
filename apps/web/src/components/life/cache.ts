"use client";

import { useCallback, useEffect, useRef, useState, type SetStateAction } from "react";

type CacheEntry = {
  data: unknown;
  gen: number;
};

let gen = 0;
const store = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<unknown>>();
const MAX_LIFE_CACHE_ENTRIES = 12;

export function peekLifeCache<T>(key: string): T | undefined {
  return store.get(key)?.data as T | undefined;
}

export function isLifeCacheFresh(key: string): boolean {
  const entry = store.get(key);
  return !!entry && entry.gen === gen;
}

function pruneLifeCache(protect: string[] = []) {
  const protectSet = new Set(protect);
  for (const key of [...store.keys()]) {
    if (protectSet.has(key) || inflight.has(key)) continue;
    const entry = store.get(key);
    if (!entry || entry.gen !== gen) store.delete(key);
  }
  for (const key of [...store.keys()]) {
    if (store.size <= MAX_LIFE_CACHE_ENTRIES) return;
    if (protectSet.has(key) || inflight.has(key)) continue;
    store.delete(key);
  }
}

function rememberLifeCache(key: string, data: unknown, entryGen: number) {
  store.delete(key);
  store.set(key, { data, gen: entryGen });
  pruneLifeCache([key]);
}

export function writeLifeCache<T>(key: string, data: T) {
  rememberLifeCache(key, data, gen);
}

export function invalidateLifeCache(options?: { keep?: string[] }) {
  gen += 1;
  if (options?.keep?.length) {
    const keep = new Set(options.keep);
    for (const key of [...store.keys()]) {
      if (!keep.has(key)) store.delete(key);
    }
    for (const key of options.keep) {
      const entry = store.get(key);
      if (entry) store.set(key, { data: entry.data, gen });
    }
  }
}

export function loadLifeCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  options?: { force?: boolean },
): Promise<T> {
  if (!options?.force && isLifeCacheFresh(key)) {
    return Promise.resolve(peekLifeCache<T>(key) as T);
  }

  const pending = inflight.get(key);
  if (pending && !options?.force) return pending as Promise<T>;

  const startedGen = gen;
  const request = fetcher()
    .then((data) => {
      rememberLifeCache(key, data, startedGen);
      return data;
    })
    .finally(() => {
      if (inflight.get(key) === request) inflight.delete(key);
    });

  inflight.set(key, request);
  return request;
}

export function lifeCacheKey(resource: string, id: string | number | boolean = "") {
  return `${resource}:${id}`;
}

export function useLifeQuery<T>(key: string, fetcher: () => Promise<T>, refreshToken: number) {
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const [data, setDataState] = useState<T | undefined>(() => peekLifeCache<T>(key));
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(() => peekLifeCache<T>(key) === undefined);
  const [activeKey, setActiveKey] = useState(key);

  if (activeKey !== key) {
    const cached = peekLifeCache<T>(key);
    setActiveKey(key);
    setDataState(cached);
    setError(null);
    setLoading(cached === undefined);
  }

  const setData = useCallback(
    (update: SetStateAction<T | undefined>) => {
      setDataState((current) => {
        const next = typeof update === "function" ? (update as (value: T | undefined) => T | undefined)(current) : update;
        if (next !== undefined) writeLifeCache(key, next);
        return next;
      });
    },
    [key],
  );

  useEffect(() => {
    let cancelled = false;
    const cached = peekLifeCache<T>(key);

    if (cached !== undefined && isLifeCacheFresh(key)) {
      setDataState(cached);
      setError(null);
      setLoading(false);
      return;
    }

    if (cached !== undefined) {
      setDataState(cached);
      setLoading(false);
    } else {
      setLoading(true);
    }

    loadLifeCache(key, () => fetcherRef.current())
      .then((next) => {
        if (cancelled) return;
        setDataState(next);
        setError(null);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load");
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [key, refreshToken]);

  return { data, loading, error, setData };
}
