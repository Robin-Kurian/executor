"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { localToday } from "@executor/domain/dates";
import type { ItemType, Plan } from "@executor/domain/types";
import { lifeApi } from "./api";
import { invalidateLifeCache, lifeCacheKey, loadLifeCache, peekLifeCache } from "./cache";

export type QuickAddDefaults = {
  type?: ItemType;
  planId?: string;
  date?: string | null;
};

type LifeContextValue = {
  date: string;
  setDate: (date: string) => void;
  plans: Plan[];
  refreshPlans: () => Promise<void>;
  addOpen: boolean;
  addDefaults: QuickAddDefaults;
  openAdd: (defaults?: QuickAddDefaults) => void;
  closeAdd: () => void;
  refreshToken: number;
  bump: () => void;
};

const LifeContext = createContext<LifeContextValue | null>(null);

const PLANS_KEY = lifeCacheKey("plans", 0);

export function LifeProvider({ children }: { children: ReactNode }) {
  const [date, setDate] = useState(localToday);
  const [plans, setPlans] = useState<Plan[]>(() => peekLifeCache<Plan[]>(PLANS_KEY) ?? []);
  const [addOpen, setAddOpen] = useState(false);
  const [addDefaults, setAddDefaults] = useState<QuickAddDefaults>({});
  const [refreshToken, setRefreshToken] = useState(0);

  const refreshPlans = useCallback(async () => {
    try {
      setPlans(await loadLifeCache(PLANS_KEY, () => lifeApi.plans(), { force: true }));
    } catch {
      setPlans([]);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    loadLifeCache(PLANS_KEY, () => lifeApi.plans())
      .then((next) => {
        if (!cancelled) setPlans(next);
      })
      .catch(() => {
        if (!cancelled) setPlans([]);
      });
    return () => {
      cancelled = true;
    };
  }, [refreshToken]);

  const bump = useCallback(() => {
    invalidateLifeCache();
    setRefreshToken((n) => n + 1);
  }, []);
  const openAdd = useCallback((defaults?: QuickAddDefaults) => {
    setAddDefaults(defaults ?? { date: localToday() });
    setAddOpen(true);
  }, []);
  const closeAdd = useCallback(() => setAddOpen(false), []);

  const value = useMemo(
    () => ({
      date,
      setDate,
      plans,
      refreshPlans,
      addOpen,
      addDefaults,
      openAdd,
      closeAdd,
      refreshToken,
      bump,
    }),
    [date, plans, refreshPlans, addOpen, addDefaults, openAdd, closeAdd, refreshToken, bump],
  );

  return <LifeContext.Provider value={value}>{children}</LifeContext.Provider>;
}

export function useLife() {
  const ctx = useContext(LifeContext);
  if (!ctx) throw new Error("useLife must be used within LifeProvider");
  return ctx;
}
