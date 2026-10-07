"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export function useChartFullscreen(frameRef) {
  const [expanded, setExpanded] = useState(false);
  const intended = useRef(false);
  const previousFocus = useRef(null);
  const close = useCallback(() => {
    intended.current = false;
    setExpanded(false);
    if (
      document.fullscreenElement === frameRef.current &&
      document.exitFullscreen
    ) {
      void document.exitFullscreen().catch(() => {});
    }
    previousFocus.current?.focus?.();
  }, [frameRef]);
  const toggle = useCallback(async () => {
    if (intended.current) {
      close();
      return;
    }
    previousFocus.current = document.activeElement;
    intended.current = true;
    setExpanded(true);
    try {
      await frameRef.current?.requestFullscreen?.();
      if (
        !intended.current &&
        document.fullscreenElement === frameRef.current
      ) {
        await document.exitFullscreen();
      }
    } catch {
      // The same chart expands within the page if native fullscreen is unsupported.
    }
  }, [close, frameRef]);
  useEffect(() => {
    const onChange = () => {
      if (intended.current && !document.fullscreenElement) close();
    };
    const onKey = (event) => {
      if (event.key === "Escape" && intended.current) {
        event.preventDefault();
        close();
      }
    };
    document.addEventListener("fullscreenchange", onChange);
    window.addEventListener("keydown", onKey);
    return () => {
      intended.current = false;
      document.removeEventListener("fullscreenchange", onChange);
      window.removeEventListener("keydown", onKey);
    };
  }, [close]);
  return { expanded, toggle, close };
}
