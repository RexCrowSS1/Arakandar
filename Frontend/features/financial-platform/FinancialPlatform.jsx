"use client";

import { useRef, useState } from "react";
import AnalystPanel from "./analyst/AnalystPanel";
import MarketTicker from "./components/MarketTicker";
import Sidebar from "./components/Sidebar";
import MarketWorkspace from "./workspaces/MarketWorkspace";
import TechnicalWorkspace from "./workspaces/TechnicalWorkspace";
import { CONTROL, SCROLL_AREA, cx } from "./ui";

export default function FinancialPlatform() {
  const [mode, setMode] = useState("market");
  const [ticker, setTicker] = useState("BBCA");
  const [marketFrame, setMarketFrame] = useState("1D");
  const [technicalFrame, setTechnicalFrame] = useState("1D");
  const [selectedAnalysisId, setSelectedAnalysisId] = useState(null);
  const [notes, setNotes] = useState({});
  const [drawings, setDrawings] = useState({});
  const [analystExpanded, setAnalystExpanded] = useState(false);
  const [mobileView, setMobileView] = useState("workspace");
  const drawerRef = useRef(null);
  const technicalNoteKey = `technical:${ticker}`;
  const drawingKey = `${ticker}:${technicalFrame}`;

  function changeMode(nextMode) {
    setMode(nextMode);
    setMobileView("workspace");
    setSelectedAnalysisId(null);
    drawerRef.current?.close();
  }

  function openAnalysis(analysis) {
    setMode(analysis.mode);
    if (analysis.ticker) setTicker(analysis.ticker);
    setTechnicalFrame("1D");
    setSelectedAnalysisId(analysis.id);
    setMobileView("workspace");
    drawerRef.current?.close();
  }

  function changeTicker(symbol) {
    setTicker(symbol);
    setTechnicalFrame("1D");
    setSelectedAnalysisId(null);
  }

  function updateNotes(key, value) {
    setNotes((current) => ({ ...current, [key]: value }));
  }

  const sidebarProps = {
    mode,
    selectedAnalysisId,
    onModeChange: changeMode,
    onAnalysisSelect: openAnalysis,
  };

  return (
    <div className="grid h-dvh min-h-0 grid-rows-[36px_auto_minmax(0,1fr)] overflow-hidden bg-canvas lg:grid-rows-[36px_minmax(0,1fr)]">
      <MarketTicker />
      <div className="flex min-h-10 items-center justify-between gap-2 border-b border-line bg-surface px-3 lg:hidden">
        <button
          type="button"
          className={CONTROL}
          aria-haspopup="dialog"
          aria-controls="navigation-dialog"
          onClick={() => drawerRef.current?.showModal()}
        >
          MENU
        </button>
        <p className="font-display text-[15px] font-bold tracking-wider">
          ARAKAN NDAR
        </p>
        <button
          type="button"
          className={CONTROL}
          aria-pressed={mobileView === "analyst"}
          onClick={() =>
            setMobileView((current) =>
              current === "workspace" ? "analyst" : "workspace",
            )
          }
        >
          {mobileView === "analyst" ? "WORKSPACE" : "AI ANALYST"}
        </button>
      </div>
      <div
        className={cx(
          "grid min-h-0 grid-cols-1 overflow-hidden",
          analystExpanded
            ? "lg:grid-cols-[220px_minmax(0,1fr)_420px] xl:grid-cols-[240px_minmax(0,1fr)_480px]"
            : "lg:grid-cols-[240px_minmax(0,1fr)_300px]",
        )}
      >
        <Sidebar {...sidebarProps} mobileOpen={false} />
        <main
          id="workspace"
          className={cx(
            "@container/workspace min-h-0 min-w-0 overflow-y-auto [background-image:linear-gradient(to_right,rgba(229,138,58,0.045)_1px,transparent_1px),linear-gradient(to_bottom,rgba(229,138,58,0.045)_1px,transparent_1px)] [background-size:32px_32px] lg:block",
            SCROLL_AREA,
            mobileView === "workspace" ? "block" : "hidden",
          )}
        >
          <div hidden={mode !== "market"}>
            <MarketWorkspace
              frame={marketFrame}
              onFrameChange={setMarketFrame}
              notes={notes.market || ""}
              onNotesChange={(value) => updateNotes("market", value)}
            />
          </div>
          <div hidden={mode !== "technical"}>
            <TechnicalWorkspace
              key={ticker}
              ticker={ticker}
              onTickerChange={changeTicker}
              frame={technicalFrame}
              onFrameChange={setTechnicalFrame}
              notes={notes[technicalNoteKey] || ""}
              onNotesChange={(value) => updateNotes(technicalNoteKey, value)}
              drawings={drawings[drawingKey] || []}
              onDrawingsChange={(value) =>
                setDrawings((current) => ({ ...current, [drawingKey]: value }))
              }
            />
          </div>
        </main>
        <AnalystPanel
          mode={mode}
          ticker={ticker}
          expanded={analystExpanded}
          onExpand={() => setAnalystExpanded((current) => !current)}
          mobileVisible={mobileView === "analyst"}
        />
      </div>
      <dialog
        ref={drawerRef}
        id="navigation-dialog"
        aria-label="Analysis navigation"
        className="fixed inset-0 m-0 h-dvh max-h-none w-[min(300px,calc(100vw-24px))] max-w-none border-r border-line bg-canvas text-ink backdrop:bg-black/60"
        onClick={(event) => {
          if (event.target === event.currentTarget) event.currentTarget.close();
        }}
      >
        <div className="flex h-full flex-col">
          <div className="flex justify-end border-b border-line p-2">
            <button
              type="button"
              className={CONTROL}
              onClick={() => drawerRef.current?.close()}
            >
              CLOSE
            </button>
          </div>
          <Sidebar {...sidebarProps} mobileOpen />
        </div>
      </dialog>
    </div>
  );
}
