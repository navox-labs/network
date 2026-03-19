"use client";

import { useState, useEffect } from "react";

const MOBILE_BREAKPOINT = 768;

/**
 * Returns true when the viewport width is below 768px.
 * Uses matchMedia for performance — no resize event spam.
 * Returns false during SSR to avoid hydration mismatch.
 */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const handleChange = (e: MediaQueryListEvent | MediaQueryList) => {
      setIsMobile(e.matches);
    };
    // Set initial value
    handleChange(mql);
    mql.addEventListener("change", handleChange as (e: MediaQueryListEvent) => void);
    return () => mql.removeEventListener("change", handleChange as (e: MediaQueryListEvent) => void);
  }, []);

  return isMobile;
}
