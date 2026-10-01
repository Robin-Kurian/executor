"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
type Theme = "dark" | "light";
const ThemeContext = createContext({ theme: "dark" as Theme, toggle: () => {} });
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>("dark");
  useEffect(() => { const stored = localStorage.getItem("executor-theme") as Theme | null; const next = stored ?? "dark"; setTheme(next); document.documentElement.dataset.theme = next; }, []);
  const value = useMemo(() => ({ theme, toggle: () => setTheme((current) => { const next = current === "dark" ? "light" : "dark"; document.documentElement.dataset.theme = next; localStorage.setItem("executor-theme", next); return next; }) }), [theme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
export const useTheme = () => useContext(ThemeContext);
