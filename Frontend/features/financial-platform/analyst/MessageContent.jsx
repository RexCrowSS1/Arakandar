export default function MessageContent({ blocks }) {
  return (
    <div className="space-y-2.5">
      {blocks.map((block, index) => {
        if (block.type === "text") {
          return (
            <p key={index} className="text-[14px] leading-[1.65]">
              {block.content}
            </p>
          );
        }
        if (block.type === "data") {
          return (
            <dl key={index} className="border border-line">
              {block.rows.map((row) => (
                <div
                  key={row.label}
                  className="flex flex-wrap items-baseline justify-between gap-1 border-b border-line px-2.5 py-1.5 last:border-b-0"
                >
                  <dt className="font-mono text-[10px] tracking-[0.1em] text-muted">
                    {row.label}
                  </dt>
                  <dd className="flex flex-wrap items-baseline gap-1.5 font-mono">
                    <span className="text-[12px] font-medium text-ink">
                      {row.value}
                    </span>
                    {row.note && (
                      <span className="text-[10px] text-muted/70">
                        {row.note}
                      </span>
                    )}
                  </dd>
                </div>
              ))}
            </dl>
          );
        }
        if (block.type === "numbered") {
          return (
            <ol key={index} className="space-y-2">
              {block.items.map((item) => (
                <li
                  key={item.n}
                  className="grid grid-cols-[22px_1fr] gap-2 border-b border-line/50 pb-2"
                >
                  <span className="pt-px font-mono text-[10px] text-accent">
                    {item.n}
                  </span>
                  <div>
                    <h3 className="mb-0.5 font-display text-[12px] font-bold tracking-[0.12em]">
                      {item.label}
                    </h3>
                    <p className="text-[13px] leading-relaxed text-ink/75">
                      {item.body}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          );
        }
        return null;
      })}
    </div>
  );
}
