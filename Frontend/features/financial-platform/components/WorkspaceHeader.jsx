import { SNAPSHOT_DATE, SNAPSHOT_TIME } from "../data/markets";

export default function WorkspaceHeader({ mode }) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-5 py-2.5 font-mono text-[10px] tracking-[0.1em]">
      <h1 className="flex items-center gap-1.5 font-normal">
        <span className="text-muted">ARAKAN NDAR</span>
        <span className="text-muted/40" aria-hidden="true">
          /
        </span>
        <span className="text-accent">
          {mode === "market" ? "GENERAL" : "TECHNICAL"}
        </span>
      </h1>
      <div className="flex flex-wrap items-center gap-2 text-[9px]">
        <span className="flex items-center gap-1.5 text-accent">
          <span className="size-[5px] bg-accent" aria-hidden="true" />
          SAMPLE DATA
        </span>
        <span className="text-muted/60">
          {SNAPSHOT_DATE} · {SNAPSHOT_TIME}
        </span>
      </div>
    </header>
  );
}
