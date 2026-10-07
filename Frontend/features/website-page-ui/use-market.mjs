"use client";

import { useEffect, useState } from "react";

// A changed URL cannot briefly show data from the previously selected symbol.
export function useMarketResource(url, refreshMs = 60_000) {
  const [snapshot, setSnapshot] = useState(null);
  useEffect(() => {
    let disposed = false;
    let running = false;
    let timer;
    let controller;
    async function update() {
      if (disposed || running || document.hidden) return;
      running = true;
      clearTimeout(timer);
      controller = new AbortController();
      try {
        const response = await fetch(url, {
          cache: "no-store",
          signal: AbortSignal.any([
            controller.signal,
            AbortSignal.timeout(50_000),
          ]),
        });
        if (!response.ok) throw new Error("Feed pasar belum dapat diperbarui.");
        const data = await response.json();
        if (!disposed) setSnapshot({ url, data, receivedAt: Date.now() });
      } catch {
        if (!disposed)
          setSnapshot((previous) => {
            const retain =
              previous?.url === url &&
              previous.data.status !== "unavailable" &&
              Date.now() - previous.receivedAt < 600_000;
            return {
              url,
              receivedAt: retain ? previous.receivedAt : 0,
              data: {
                ...(retain ? previous.data : {}),
                status: retain ? "stale" : "unavailable",
                error: "Feed pasar belum dapat diperbarui.",
              },
            };
          });
      } finally {
        running = false;
        if (!disposed) timer = setTimeout(update, refreshMs);
      }
    }
    void update();
    document.addEventListener("visibilitychange", update);
    window.addEventListener("focus", update);
    return () => {
      disposed = true;
      clearTimeout(timer);
      controller?.abort();
      document.removeEventListener("visibilitychange", update);
      window.removeEventListener("focus", update);
    };
  }, [url, refreshMs]);
  return snapshot?.url === url ? snapshot.data : { status: "loading" };
}
