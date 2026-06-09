import React, { useState, useEffect } from "react";
import { Flag, Compass, History, Trophy, RotateCcw, Mail, Download } from "lucide-react";
import { Player, Round } from "./types";
import Setup from "./components/setup";
import Play from "./components/play";
import Stats from "./components/stats";
import ConfirmModal from "./components/confirm-modal";
import { motion, AnimatePresence } from "motion/react";

export default function App() {
  // -------------------- STATE DECLARATIONS --------------------
  const [rounds, setRounds] = useState<Round[]>(() => {
    try {
      const saved = localStorage.getItem("golf_scorecard_rounds");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [activeRoundId, setActiveRoundId] = useState<string | null>(() => {
    try {
      const saved = localStorage.getItem("golf_scorecard_active_id");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [currentHole, setCurrentHole] = useState<number>(() => {
    try {
      const saved = localStorage.getItem("golf_scorecard_current_hole");
      return saved ? parseInt(saved, 10) : 1;
    } catch {
      return 1;
    }
  });

  const [currentTab, setCurrentTab] = useState<"setup" | "play" | "stats">(() => {
    try {
      const saved = localStorage.getItem("golf_scorecard_current_tab");
      return (saved as "setup" | "play" | "stats") || "setup";
    } catch {
      return "setup";
    }
  });

  // Modal control states
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isNewRoundWarningOpen, setIsNewRoundWarningOpen] = useState(false);
  const [deleteTargetRoundId, setDeleteTargetRoundId] = useState<string | null>(null);
  
  // Pending parameters for new sessions
  const [pendingNewGame, setPendingNewGame] = useState<{
    courseName: string;
    holesCount: number;
    players: Player[];
    isMiniGolf: boolean;
  } | null>(null);

  const [isFinishConfirmOpen, setIsFinishConfirmOpen] = useState(false);

  // Theme support
  const [theme, setTheme] = useState<"volt" | "fairway" | "light">(() => {
    try {
      const saved = localStorage.getItem("golf_scorecard_theme");
      if (saved === "amber") return "light"; // Migrate sunset amber to light theme
      return (saved as "volt" | "fairway" | "light") || "volt";
    } catch {
      return "volt";
    }
  });

  useEffect(() => {
    localStorage.setItem("golf_scorecard_theme", theme);
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  // Scroll to top of viewport on tab changes
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [currentTab]);

  // -------------------- STORAGE STORAGE SYNC --------------------
  useEffect(() => {
    localStorage.setItem("golf_scorecard_rounds", JSON.stringify(rounds));
  }, [rounds]);

  useEffect(() => {
    localStorage.setItem("golf_scorecard_active_id", JSON.stringify(activeRoundId));
  }, [activeRoundId]);

  useEffect(() => {
    localStorage.setItem("golf_scorecard_current_hole", currentHole.toString());
  }, [currentHole]);

  useEffect(() => {
    localStorage.setItem("golf_scorecard_current_tab", currentTab);
  }, [currentTab]);

  const activeRound = rounds.find((r) => r.id === activeRoundId) || null;

  // -------------------- RUN START/OVERWRITES WORKFLOWS --------------------
  const handleStartRound = (courseName: string, holesCount: number, players: Player[], isMiniGolf: boolean = false) => {
    const startNewGameFlow = () => {
      // Defaulting pars (2 for mini golf defaults, 4 for standard)
      const defaultPars: Record<number, number> = {};
      for (let h = 1; h <= holesCount; h++) {
        defaultPars[h] = isMiniGolf ? 2 : 4;
      }

      // Default scores dictionary (0 represents unplayed/untouched)
      const initialScores: Record<string, Record<number, number>> = {};
      players.forEach((p) => {
        initialScores[p.id] = {};
        for (let h = 1; h <= holesCount; h++) {
          initialScores[p.id][h] = 0; // Initialize to zero (0)
        }
      });

      const newId = `rnd_${Date.now()}`;
      const newRound: Round = {
        id: newId,
        courseName,
        date: new Date().toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
        }),
        holesCount,
        pars: defaultPars,
        players,
        scores: initialScores,
        completed: false,
      };

      setRounds((prev) => [newRound, ...prev]);
      setActiveRoundId(newId);
      setCurrentHole(1);
      setCurrentTab("play");
    };

    if (activeRound) {
      setPendingNewGame({ courseName, holesCount, players, isMiniGolf });
      setIsNewRoundWarningOpen(true);
    } else {
      startNewGameFlow();
    }
  };

  const handleConfirmNewRoundOverride = () => {
    if (!pendingNewGame) return;

    // Concurrently complete existing match so it archives
    setRounds((prev) =>
      prev.map((r) => (r.id === activeRoundId ? { ...r, completed: true } : r))
    );

    const { courseName, holesCount, players, isMiniGolf } = pendingNewGame;
    
    const defaultPars: Record<number, number> = {};
    for (let h = 1; h <= holesCount; h++) {
      defaultPars[h] = isMiniGolf ? 2 : 4;
    }

    const initialScores: Record<string, Record<number, number>> = {};
    players.forEach((p) => {
      initialScores[p.id] = {};
      for (let h = 1; h <= holesCount; h++) {
        initialScores[p.id][h] = 0; // Default to zero (0)
      }
    });

    const newId = `rnd_${Date.now()}`;
    const newRound: Round = {
      id: newId,
      courseName,
      date: new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      }),
      holesCount,
      pars: defaultPars,
      players,
      scores: initialScores,
      completed: false,
    };

    setRounds((prev) => [newRound, ...prev]);
    setActiveRoundId(newId);
    setCurrentHole(1);
    setIsNewRoundWarningOpen(false);
    setPendingNewGame(null);
    setCurrentTab("play");
  };

  const handleUpdateScore = (playerId: string, hole: number, score: number) => {
    setRounds((prev) =>
      prev.map((r) => {
        if (r.id !== activeRoundId) return r;
        const nextScores = { ...r.scores };
        nextScores[playerId] = { ...nextScores[playerId], [hole]: score };
        return { ...r, scores: nextScores };
      })
    );
  };

  const handleUpdatePar = (hole: number, par: number) => {
    setRounds((prev) =>
      prev.map((r) => {
        if (r.id !== activeRoundId) return r;
        return { ...r, pars: { ...r.pars, [hole]: par } };
      })
    );
  };

  const handleFinishRound = () => {
    setIsFinishConfirmOpen(true);
  };

  const handleConfirmFinishRound = () => {
    setRounds((prev) =>
      prev.map((r) => (r.id === activeRoundId ? { ...r, completed: true } : r))
    );
    setActiveRoundId(null);
    setIsFinishConfirmOpen(false);
    setCurrentTab("stats");
  };

  const handleDeleteRound = (id: string) => {
    setDeleteTargetRoundId(id);
  };

  const handleConfirmDeleteRound = () => {
    if (!deleteTargetRoundId) return;
    setRounds((prev) => prev.filter((r) => r.id !== deleteTargetRoundId));
    if (activeRoundId === deleteTargetRoundId) {
      setActiveRoundId(null);
    }
    setDeleteTargetRoundId(null);
  };

  const handleMasterAppReset = () => {
    setIsResetModalOpen(true);
  };

  const handleConfirmMasterReset = () => {
    setRounds([]);
    setActiveRoundId(null);
    setCurrentHole(1);
    setCurrentTab("setup");
    setIsResetModalOpen(false);
    localStorage.clear();
  };

  const handleDownloadStandalone = async () => {
    try {
      // In production built directory, Vite copies public assets to root.
      const response = await fetch('/standalone.html');
      if (!response.ok) throw new Error("Fetch failed");
      const text = await response.text();
      const blob = new Blob([text], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'leaderboard9000_offline.html';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      alert("Failed to compile stand-alone package. Try downloading leaderboard9000_offline.html directly from standard system files instead!");
    }
  };

  return (
    <div className="min-h-screen bg-cyberdark text-white flex flex-col justify-between selection:bg-volt/30">
      {/* -------------------- MAIN APP TERMINAL HEADER -------------------- */}
      <header className="sticky top-0 z-40 bg-zinc-950 border-b border-zinc-850 py-3 px-4 md:px-8 shadow-lg">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          
          {/* Logo brand */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-volt text-[#0a0b0a] flex items-center justify-center font-black text-sm shadow-[0_0_12px_rgba(204,255,0,0.25)] select-none animate-pulse">
              9K
            </div>
            <div>
              <h1 className="font-sans font-black text-lg text-white tracking-tight leading-none uppercase">
                LEADERBOARD<span className="text-volt">9000</span>
              </h1>
              <p className="text-xs font-mono font-bold text-zinc-450 uppercase tracking-widest mt-0.5">
                💎 PRECISION GOLF SCORER 💎
              </p>
            </div>
          </div>

          {/* Theme switcher and Time tracker */}
          <div className="flex items-center gap-4 shrink-0">
            {/* Dynamic theme buttons */}
            <div className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 p-1 rounded-lg">
              <button
                onClick={() => setTheme("volt")}
                className={`w-5 h-5 rounded bg-[#ccff00] border transition-all cursor-pointer ${
                  theme === "volt" ? "border-white" : "border-white/10 hover:scale-105"
                }`}
                title="Cyber Volt"
                aria-label="Cyber Volt Theme"
              />
              <button
                onClick={() => setTheme("fairway")}
                className={`w-5 h-5 rounded bg-[#10b981] border transition-all cursor-pointer ${
                  theme === "fairway" ? "border-white" : "border-white/10 hover:scale-105"
                }`}
                title="Classic Fairway"
                aria-label="Classic Fairway Theme"
              />
              <button
                onClick={() => setTheme("light")}
                className={`w-5 h-5 rounded bg-white border transition-all cursor-pointer ${
                  theme === "light" ? "border-zinc-800" : "border-white/10 hover:scale-105"
                }`}
                title="Sleek Light"
                aria-label="Sleek Light Theme"
              />
            </div>


          </div>
        </div>
      </header>

      {/* -------------------- TAB NAVIGATION (Dynamic Cyber design) -------------------- */}
      <nav className="bg-zinc-950 px-4 md:px-8 py-2 border-b border-zinc-900 shadow-sm">
        <div className="max-w-7xl mx-auto">
          <div className="flex bg-zinc-900 border border-zinc-850 p-1 rounded-xl gap-1 w-full max-w-lg mx-auto" id="applet-nav-tablist">
            
            {/* Setup View */}
            <button
              onClick={() => setCurrentTab("setup")}
              className={`flex-1 py-2 px-3 rounded-lg font-sans text-xs font-black uppercase tracking-wider leading-none transition-all flex items-center justify-center gap-1.5 select-none ${
                currentTab === "setup"
                  ? "bg-volt text-black font-black"
                  : "text-zinc-400 hover:text-white"
              }`}
              id="tab-nv-setup"
            >
              <Compass className="w-4 h-4" />
              <span>SETUP</span>
            </button>

            {/* Play Score Game */}
            <button
              onClick={() => {
                if (!activeRound) {
                  alert("No active session currently. Please set up a course and draft rosters in Setup tab first!");
                  setCurrentTab("setup");
                  return;
                }
                setCurrentTab("play");
              }}
              className={`flex-1 py-2 px-3 rounded-lg font-sans text-xs font-black uppercase tracking-wider leading-none transition-all flex items-center justify-center gap-1.5 relative select-none ${
                currentTab === "play"
                  ? "bg-volt text-black font-black"
                  : "text-zinc-400 hover:text-white"
              }`}
              id="tab-nv-play"
            >
              <Flag className="w-4 h-4" />
              <span>RECORD</span>
              {activeRound && (
                <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-volt rounded-full border border-zinc-950 animate-ping" />
              )}
            </button>

            {/* Stats Summary */}
            <button
              onClick={() => setCurrentTab("stats")}
              className={`flex-1 py-2 px-3 rounded-lg font-sans text-xs font-black uppercase tracking-wider leading-none transition-all flex items-center justify-center gap-1.5 select-none ${
                currentTab === "stats"
                  ? "bg-volt text-black"
                  : "text-zinc-400 hover:text-white"
              }`}
              id="tab-nv-stats"
            >
              <Trophy className="w-4 h-4" />
              <span>STATS</span>
            </button>
          </div>
        </div>
      </nav>

      {/* -------------------- MAIN PAGE CONTAINER -------------------- */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6" id="main-content-canvas">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="w-full"
            id={`tab-wrapper-${currentTab}`}
          >
            {currentTab === "setup" && (
              <Setup
                activeRound={activeRound}
                onStartRound={handleStartRound}
                onResumeRound={() => setCurrentTab("play")}
              />
            )}

            {currentTab === "play" && activeRound && (
              <Play
                round={activeRound}
                currentHole={currentHole}
                onSetCurrentHole={setCurrentHole}
                onUpdateScore={handleUpdateScore}
                onUpdatePar={handleUpdatePar}
                onFinishRound={handleFinishRound}
              />
            )}

            {currentTab === "stats" && (
              <Stats
                rounds={rounds}
                activeRound={activeRound}
                onDeleteRound={handleDeleteRound}
                onSelectCurrentHole={setCurrentHole}
                onSetTab={setCurrentTab}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* -------------------- FOOTER ACTION METRICS -------------------- */}
      <footer className="bg-zinc-950 border-t border-zinc-900 py-5 px-4 md:px-8 mt-10">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          
          <div className="text-xs text-zinc-500 font-mono text-center sm:text-left select-none uppercase">
            © 2026 LEADERBOARD9000. FOR HIGH-OCTANE SCOREBOARD TELEMETRY.
          </div>

          {/* Quick Utility buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
            {/* Download Standalone Single-page HTML score tracker app */}
            <button
              onClick={handleDownloadStandalone}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-black text-black bg-volt hover:bg-volt-hover rounded-lg transition-all cursor-pointer uppercase select-none h-10"
              id="btn-download-standalone"
              title="Download offline bundle"
            >
              <Download className="w-4 h-4 text-black" />
              Download Standalone Offline App (.html)
            </button>

            {/* Master Reset Button */}
            <button
              onClick={handleMasterAppReset}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-bold text-red-400 hover:text-red-500 hover:bg-red-950/20 rounded-lg transition-all cursor-pointer uppercase select-none h-10 border border-red-950/30"
              id="btn-master-erase"
            >
              <RotateCcw className="w-4 h-4" />
              Purge Database
            </button>
          </div>
        </div>
      </footer>

      {/* -------------------- MODAL ALERTS -------------------- */}
      <ConfirmModal
        isOpen={isResetModalOpen}
        title="Wipe Scorecard Storage?"
        message="This operation is absolute. You will permanently lose the active tournament, squad handicap configs, and the entire history of matches from your browser cache memory."
        confirmText="Yes, Wipe Database"
        cancelText="Keep My Scores"
        onConfirm={handleConfirmMasterReset}
        onCancel={() => setIsResetModalOpen(false)}
      />

      <ConfirmModal
        isOpen={deleteTargetRoundId !== null}
        title="Delete Matches Record?"
        message="Are you certain you wish to discard this specific round from your archived history list? All metrics and metrics records will be deleted forever."
        confirmText="Yes, Discard Record"
        cancelText="Cancel"
        onConfirm={handleConfirmDeleteRound}
        onCancel={() => setDeleteTargetRoundId(null)}
      />

      <ConfirmModal
        isOpen={isNewRoundWarningOpen}
        title="Active Round Override!"
        message="You currently have a live session in progress! Starting a new match will automatically finalize the current round and save it to the historical archive list. Continue?"
        confirmText="Yes, Archive & Start New"
        cancelText="Resume Active Scorer"
        onConfirm={handleConfirmNewRoundOverride}
        onCancel={() => {
          setIsNewRoundWarningOpen(false);
          setPendingNewGame(null);
          setCurrentTab("play");
        }}
      />

      <ConfirmModal
        isOpen={isFinishConfirmOpen}
        title="Finish and Record Game?"
        message="Are you certain you wish to finalize this scorecard? Once recorded, this match is safely archived in your Tournament Vault list and is locked for edits."
        confirmText="Yes, Complete Match 🏆"
        cancelText="Keep Playing"
        onConfirm={handleConfirmFinishRound}
        onCancel={() => setIsFinishConfirmOpen(false)}
      />
    </div>
  );
}
