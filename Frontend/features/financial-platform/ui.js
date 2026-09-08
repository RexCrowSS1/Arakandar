export function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

export const FOCUS_RING =
  "focus-visible:outline-1 focus-visible:outline-accent focus-visible:outline-offset-2";

export const CONTROL = cx(
  "cursor-pointer border border-line bg-transparent px-2 py-1 font-mono text-[10px] tracking-[0.06em] text-muted transition-colors hover:border-muted/50 hover:text-ink disabled:cursor-not-allowed disabled:opacity-35 aria-pressed:border-accent aria-pressed:bg-accent/10 aria-pressed:text-accent motion-reduce:transition-none",
  FOCUS_RING,
);

export const SCROLL_AREA =
  "overscroll-contain [scrollbar-width:thin] [scrollbar-color:#34312B_transparent]";
