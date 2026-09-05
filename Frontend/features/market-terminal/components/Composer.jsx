import { useId, useRef, useState } from "react";

import {
  FOCUS_RING_CLASS,
  INTERACTIVE_SURFACE_CLASS,
  cx,
} from "../ui-classes";

const COMPOSER_ACTION_CLASS = cx(
  "relative grid cursor-pointer items-end justify-items-center gap-[1px] border-0 border-l border-[var(--line)] bg-transparent px-[3px] pt-[5px] pb-[4px] text-[9px]",
  INTERACTIVE_SURFACE_CLASS,
  FOCUS_RING_CLASS,
);

function AttachmentIcon() {
  return (
    <span
      className="block h-[11px] w-[7px] rotate-[42deg] rounded-[6px] border-[1.5px] border-[var(--faint)] border-t-transparent"
      aria-hidden="true"
    />
  );
}

function MicrophoneIcon({ isActive }) {
  return (
    <span
      className={cx(
        "relative block h-[10px] w-[7px] rounded-[6px] border-[1.5px] after:absolute after:right-[-4px] after:bottom-[-4px] after:left-[-4px] after:h-[6px] after:rounded-[0_0_7px_7px] after:border-r after:border-b after:border-l after:content-['']",
        isActive
          ? "border-[var(--orange)] after:border-[var(--orange)]"
          : "border-[var(--faint)] after:border-[var(--faint)]",
      )}
      aria-hidden="true"
    />
  );
}

function SendIcon() {
  return (
    <span
      className="block h-0 w-0 rotate-[-42deg] border-y-[5px] border-y-transparent border-l-[11px] border-l-[var(--faint)]"
      aria-hidden="true"
    />
  );
}

export default function Composer({
  draft,
  onDraftChange,
  onStatusChange,
  onSubmitPrompt,
  statusMessage,
}) {
  const [isListening, setIsListening] = useState(false);
  const fileInputRef = useRef(null);
  const promptId = useId();
  const promptHintId = useId();

  function handleAttachment(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    onStatusChange(`Attached ${file.name}.`);
    event.target.value = "";
  }

  function handleMicrophoneToggle() {
    const nextState = !isListening;
    setIsListening(nextState);
    onStatusChange(nextState ? "Microphone ready." : "Microphone stopped.");
  }

  function handlePromptKeyDown(event) {
    if (event.nativeEvent.isComposing) return;

    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  }

  function handleSubmit(event) {
    event.preventDefault();
    onSubmitPrompt(draft);
  }

  return (
    <>
      <form
        className="grid h-12 grid-cols-[33px_minmax(0,1fr)_57px_41px_65px] border-t border-[var(--line)] bg-[var(--composer)] [@media(max-width:560px)]:grid-cols-[33px_minmax(0,1fr)_48px]"
        onSubmit={handleSubmit}
      >
        <span
          className="grid place-items-center border-r border-[var(--line)] text-[18px] text-[var(--orange)]"
          aria-hidden="true"
        >
          ›
        </span>

        <label
          className="sr-only"
          htmlFor={promptId}
        >
          Ask Arakan Ndar
        </label>
        <textarea
          className={cx(
            "h-full min-w-0 resize-none border-0 bg-transparent px-[13px] pt-4 pb-0 text-[11px] leading-[1.35] tracking-[0.04em] outline-0 placeholder:text-[rgba(142,137,128,0.42)]",
            FOCUS_RING_CLASS,
          )}
          id={promptId}
          name="prompt"
          aria-describedby={promptHintId}
          rows={1}
          value={draft}
          placeholder="ASK ARAKAN NDAR..."
          onChange={(event) => onDraftChange(event.target.value)}
          onKeyDown={handlePromptKeyDown}
        />

        <input
          className="hidden"
          ref={fileInputRef}
          type="file"
          tabIndex={-1}
          aria-hidden="true"
          onChange={handleAttachment}
        />
        <button
          className={cx(
            COMPOSER_ACTION_CLASS,
            "text-[var(--faint)] [@media(max-width:560px)]:hidden",
          )}
          type="button"
          aria-label="Attach a file"
          onClick={() => fileInputRef.current?.click()}
        >
          <AttachmentIcon />
          ATTACH
        </button>

        <button
          className={cx(
            COMPOSER_ACTION_CLASS,
            "[@media(max-width:560px)]:hidden",
            isListening ? "text-[var(--orange)]" : "text-[var(--faint)]",
          )}
          type="button"
          aria-label={isListening ? "Stop microphone" : "Start microphone"}
          aria-pressed={isListening}
          onClick={handleMicrophoneToggle}
        >
          <MicrophoneIcon isActive={isListening} />
          {isListening ? "STOP" : "MIC"}
        </button>

        <button
          className={cx(
            COMPOSER_ACTION_CLASS,
            "text-[var(--faint)] [@media(max-width:560px)]:col-start-3",
          )}
          type="submit"
          aria-label="Send question"
        >
          <SendIcon />
          SEND ↗
        </button>
      </form>

      <div className="mt-2 -mb-[30px] -ml-px flex min-h-[22px] items-start justify-between gap-5 text-[9px] tracking-[0.05em] text-[var(--faint)]">
        <p className="m-0" id={promptHintId}>
          ENTER TO SEND / SHIFT+ENTER FOR NEW LINE
        </p>
        <p
          className="m-0 max-w-[50%] truncate text-right text-[var(--orange)]"
          aria-live="polite"
        >
          {statusMessage}
        </p>
      </div>
    </>
  );
}
