"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

type ThemeMode = "light" | "dark";

interface ThemeContextValue {
  theme: ThemeMode;
  toggleTheme: () => void;
  setTheme: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);
const STORAGE_KEY = "notes-theme";

const getPreferredTheme = (): ThemeMode => {
  if (typeof window !== "undefined" && window.matchMedia) {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return "light";
};

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    if (typeof window === "undefined") return "light";
    const stored = window.localStorage.getItem(STORAGE_KEY) as ThemeMode | null;
    return stored ?? getPreferredTheme();
  });

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = theme;
    window.localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      if (!window.localStorage.getItem(STORAGE_KEY)) {
        setThemeState(mediaQuery.matches ? "dark" : "light");
      }
    };
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  const value = useMemo(
    () => ({
      theme,
      toggleTheme: () => setThemeState((prev) => (prev === "light" ? "dark" : "light")),
      setTheme: (mode: ThemeMode) => setThemeState(mode),
    }),
    [theme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
};
