import { CONTROL, cx } from "../ui";

export default function SegmentedControl({
  label,
  options,
  value,
  onChange,
  unavailable = {},
}) {
  return (
    <div className="isolate flex flex-wrap" role="group" aria-label={label}>
      {options.map((option) => (
        <button
          key={option}
          type="button"
          className={cx(
            CONTROL,
            "relative -ml-px first:ml-0 focus-visible:z-20 aria-pressed:z-10",
          )}
          aria-pressed={option === value}
          disabled={Boolean(unavailable[option])}
          title={unavailable[option] || option}
          onClick={() => onChange(option)}
        >
          {option}
        </button>
      ))}
    </div>
  );
}
