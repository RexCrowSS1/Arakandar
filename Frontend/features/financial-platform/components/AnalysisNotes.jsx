import { useId } from "react";
import { FOCUS_RING, cx } from "../ui";

export default function AnalysisNotes({
  label,
  placeholder,
  value,
  onChange,
  rows = 5,
}) {
  const id = useId();

  return (
    <div>
      <label
        htmlFor={id}
        className="mb-2 block font-mono text-[10px] tracking-[0.16em] text-accent"
      >
        {label}
      </label>
      <textarea
        id={id}
        rows={rows}
        className={cx(
          "block w-full resize-y border border-line bg-surface/60 px-3 py-2.5 text-[14px] leading-relaxed text-ink placeholder:text-muted/65",
          FOCUS_RING,
        )}
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      <p className="mt-1.5 font-mono text-[9px] text-muted/60">
        Session notes · kept while switching workspaces
      </p>
    </div>
  );
}
