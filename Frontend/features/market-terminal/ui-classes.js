export const DISPLAY_FONT_CLASS =
  "[font-family:Impact,Haettenschweiler,'Arial_Narrow_Bold',sans-serif]";

export const FOCUS_RING_CLASS =
  "focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-[-1px] focus-visible:outline-[var(--orange)]";

export const INTERACTIVE_SURFACE_CLASS =
  "hover:bg-[var(--hover)] hover:text-[var(--ink)]";

export function cx(...classNames) {
  return classNames.filter(Boolean).join(" ");
}
