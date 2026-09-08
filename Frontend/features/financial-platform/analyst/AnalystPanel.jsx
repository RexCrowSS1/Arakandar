import { useEffect, useId, useRef, useState } from "react";
import { CONTROL, FOCUS_RING, SCROLL_AREA, cx } from "../ui";
import { createSampleReply, INITIAL_MESSAGES } from "./messages";
import MessageContent from "./MessageContent";

const clock = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Asia/Jakarta",
});

export default function AnalystPanel({
  mode,
  ticker,
  expanded,
  onExpand,
  mobileVisible,
}) {
  const [messages, setMessages] = useState(INITIAL_MESSAGES);
  const [draft, setDraft] = useState("");
  const [fullscreen, setFullscreen] = useState(false);
  const [status, setStatus] = useState("");
  const inputId = useId();
  const panelRef = useRef(null);
  const messagesRef = useRef(null);

  useEffect(() => {
    const area = messagesRef.current;
    if (area) area.scrollTop = area.scrollHeight;
  }, [messages]);

  useEffect(() => {
    function syncFullscreen() {
      setFullscreen(document.fullscreenElement === panelRef.current);
    }
    document.addEventListener("fullscreenchange", syncFullscreen);
    return () =>
      document.removeEventListener("fullscreenchange", syncFullscreen);
  }, []);

  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement === panelRef.current) {
        await document.exitFullscreen();
      } else if (panelRef.current.requestFullscreen) {
        await panelRef.current.requestFullscreen();
      } else {
        setStatus("Fullscreen is unavailable in this browser.");
      }
    } catch {
      setStatus(
        "Fullscreen could not be opened. You can still expand this panel.",
      );
    }
  }

  function submit(event) {
    event.preventDefault();
    const question = draft.trim();
    if (!question) return;
    const time = clock.format(new Date());
    setMessages((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        role: "user",
        time,
        blocks: [{ type: "text", content: question }],
      },
      {
        id: crypto.randomUUID(),
        role: "assistant",
        time,
        blocks: createSampleReply({ mode, ticker }),
      },
    ]);
    setDraft("");
  }

  return (
    <aside
      ref={panelRef}
      aria-label="AI analyst"
      className={cx(
        "min-h-0 min-w-0 flex-col overflow-hidden border-line bg-[#10100E]/55 lg:flex lg:border-l [&:fullscreen]:flex [&:fullscreen]:h-dvh [&:fullscreen]:w-screen [&:fullscreen]:bg-canvas",
        mobileVisible ? "flex" : "hidden",
      )}
    >
      <header className="flex shrink-0 items-center justify-between gap-2 border-b border-line px-3.5 py-2.5">
        <div>
          <h2 className="font-display text-[16px] leading-none font-bold tracking-[0.07em]">
            ARAKAN NDAR
          </h2>
          <p className="mt-1 flex items-center gap-1.5 font-mono text-[10px] tracking-[0.1em] text-muted">
            AI ANALYST
            <span className="flex items-center gap-1 text-[9px] text-accent">
              <span
                className="size-[5px] rounded-full bg-accent"
                aria-hidden="true"
              />
              DEMO
            </span>
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <button
            type="button"
            className={cx(CONTROL, "hidden px-2 py-0.5 text-[9px] lg:block")}
            aria-pressed={expanded}
            onClick={onExpand}
          >
            {expanded ? "COLLAPSE" : "EXPAND"}
          </button>
          <button
            type="button"
            className={cx(CONTROL, "px-2 py-0.5 text-[9px]")}
            aria-pressed={fullscreen}
            onClick={toggleFullscreen}
          >
            {fullscreen ? "EXIT FULLSCREEN" : "FULLSCREEN"}
          </button>
        </div>
      </header>
      <div
        ref={messagesRef}
        className={cx(
          "min-h-0 flex-1 overflow-y-auto px-3.5 py-3.5",
          SCROLL_AREA,
        )}
        role="log"
        aria-label="Analyst conversation"
        aria-live="polite"
        aria-relevant="additions"
      >
        {messages.map((message) => (
          <article key={message.id} className="mb-5 last:mb-0">
            <header className="mb-2 flex items-center gap-1.5 font-mono text-[10px]">
              <span
                className={cx(
                  "tracking-[0.12em]",
                  message.role === "assistant" ? "text-accent" : "text-muted",
                )}
              >
                {message.role === "assistant" ? "ARAKAN NDAR" : "YOU"}
              </span>
              <time className="text-muted/55">{message.time}</time>
            </header>
            <div
              className={message.role === "user" ? "text-ink/65" : "text-ink"}
            >
              <MessageContent blocks={message.blocks} />
            </div>
          </article>
        ))}
      </div>
      {status && (
        <p className="px-3.5 pb-2 text-[12px] text-accent" role="status">
          {status}
        </p>
      )}
      <form
        onSubmit={submit}
        className="flex shrink-0 items-center gap-2 border-t border-line bg-canvas/60 px-3.5 py-2.5"
      >
        <span
          className="animate-cursor font-mono text-[15px] leading-none text-accent motion-reduce:animate-none"
          aria-hidden="true"
        >
          &gt;
        </span>
        <label htmlFor={inputId} className="sr-only">
          Ask Arakan Ndar
        </label>
        <input
          id={inputId}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && event.nativeEvent.isComposing)
              event.preventDefault();
          }}
          placeholder="ASK ARAKAN NDAR..."
          className={cx(
            "min-w-0 flex-1 bg-transparent py-1 text-[13px] placeholder:text-muted/70",
            FOCUS_RING,
          )}
        />
        <button
          type="submit"
          disabled={!draft.trim()}
          className={cx(
            "shrink-0 cursor-pointer border border-accent bg-accent px-2.5 py-1 font-display text-[11px] font-bold tracking-[0.1em] text-canvas disabled:cursor-not-allowed disabled:border-line disabled:bg-transparent disabled:text-muted",
            FOCUS_RING,
          )}
        >
          SEND
        </button>
      </form>
    </aside>
  );
}
