import React from "react";
import { Plus, Minus, ArrowLeft, ArrowRight, Save, ShieldAlert } from "lucide-react";
import { Player, Round } from "../types";
import { motion } from "motion/react";

interface PlayProps {
  round: Round;
  currentHole: number;
  onSetCurrentHole: (hole: number) => void;
  onUpdateScore: (playerId: string, hole: number, score: number) => void;
  onUpdatePar: (hole: number, par: number) => void;
  onFinishRound: () => void;
}

export default function Play({
  round,
  currentHole,
  onSetCurrentHole,
  onUpdateScore,
  onUpdatePar,
  onFinishRound,
}: PlayProps) {
  const { holesCount, pars, players, scores, courseName } = round;
  const currentPar = pars[currentHole] || 4;

  const handlePrevHole = () => {
    if (currentHole > 1) {
      onSetCurrentHole(currentHole - 1);
    }
  };

  const handleNextHole = () => {
    if (currentHole < holesCount) {
      onSetCurrentHole(currentHole + 1);
    }
  };

  // Safe gross total selector: only scores > 0 are summed
  const calculateGrossTotal = (playerId: string) => {
    let total = 0;
    for (let h = 1; h <= holesCount; h++) {
      const s = scores[playerId]?.[h];
      if (s && s > 0) total += s;
    }
    return total;
  };

  // Only relative vs par on holes played (score > 0)
  const calculateGrossRelationToPar = (playerId: string) => {
    let relation = 0;
    let holesPlayed = 0;
    for (let h = 1; h <= holesCount; h++) {
      const s = scores[playerId]?.[h];
      const p = pars[h] || 4;
      if (s && s > 0) {
        relation += s - p;
        holesPlayed++;
      }
    }
    if (holesPlayed === 0) return "E";
    if (relation === 0) return "E";
    return relation > 0 ? `+${relation}` : `${relation}`;
  };

  // Helper score term labels
  const getScoreTerm = (score: number, par: number) => {
    if (!score || score === 0) return "";
    const diff = score - par;
    if (diff === -3) return "Albatross";
    if (diff === -2) return "Eagle";
    if (diff === -1) return "Birdie";
    if (diff === 0) return "Par";
    if (diff === 1) return "Bogey";
    if (diff === 2) return "Double Bogey";
    if (diff >= 3) return `+${diff}`;
    return "";
  };

  // Theme badges for custom terms
  const getScoreTermStyles = (score: number, par: number) => {
    if (!score || score === 0) return "bg-zinc-900 text-zinc-400 border-zinc-850";
    const diff = score - par;
    if (diff < 0) return "bg-green-950/40 text-green-400 border-green-800/40";
    if (diff === 0) return "bg-indigo-950/40 text-indigo-400 border-indigo-800/45";
    if (diff === 1) return "bg-amber-955/40 text-amber-500 border-amber-805/40";
    if (diff >= 2) return "bg-rose-955/40 text-rose-400 border-rose-805/45";
    return "bg-zinc-900 border-[#2d302d] text-zinc-300";
  };

  return (
    <div className="space-y-5" id="play-container">
      {/* Hole Selector Bar */}
      <div className="p-4 bg-cybercard border border-[#2d332d] rounded-xl shadow-md space-y-4">
        {/* Course Detail compact header */}
        <div className="flex items-center justify-between">
          <span className="text-base font-black uppercase tracking-widest text-volt">
            {courseName}
          </span>
          <span className="text-xs sm:text-sm text-zinc-450 font-mono font-bold uppercase" id="play-game-date">
            {round.date}
          </span>
        </div>

        {/* 1-N Horizontal Hole Navigation Grid */}
        <div className="overflow-x-auto select-none" id="holes-horizontal-scroll">
          <div className="flex gap-2 pb-1.5" style={{ minWidth: "max-content" }}>
            {Array.from({ length: holesCount }, (_, i) => i + 1).map((h) => {
              // Treated as filled if score is inputted (> 0)
              const isHoleFilled = players.every((p) => {
                const sc = scores[p.id]?.[h];
                return sc !== undefined && sc > 0;
              });
              const isActive = h === currentHole;

              return (
                <button
                  key={h}
                  onClick={() => onSetCurrentHole(h)}
                  className={`w-11 h-11 rounded-xl font-sans text-sm font-black transition-all border flex flex-col items-center justify-center relative cursor-pointer ${
                    isActive
                      ? "bg-volt text-cyberdark border-volt scale-102 font-black shadow-[0_0_10px_rgba(204,255,0,0.25)]"
                      : isHoleFilled
                      ? "bg-zinc-900 text-volt border-volt/20"
                      : "bg-zinc-950 text-zinc-400 border-zinc-900 hover:bg-zinc-910"
                  }`}
                  id={`btn-select-hole-${h}`}
                >
                  <span className="leading-none text-xs sm:text-sm">{h}</span>
                  {!isActive && isHoleFilled && (
                    <span className="absolute bottom-1 w-1 h-1 bg-volt rounded-full" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Active Hole and Par Switcher */}
        <div className="flex flex-col sm:flex-row items-center justify-between p-3 bg-zinc-955 border border-zinc-900 rounded-xl gap-3">
          {/* Previous / Next buttons */}
          <div className="flex gap-2 w-full sm:w-auto justify-between sm:justify-start">
            <button
              onClick={handlePrevHole}
              disabled={currentHole === 1}
              className="px-4 py-2.5 h-11 border border-zinc-800 disabled:opacity-10 rounded-xl hover:bg-zinc-900 text-zinc-200 disabled:cursor-not-allowed font-sans text-xs sm:text-sm font-black flex items-center justify-center gap-1.5 bg-zinc-900 select-none transition-colors cursor-pointer"
              id="btn-prev-hole"
            >
              <ArrowLeft className="w-4 h-4 text-white" /> Prev
            </button>
            <div className="flex items-center justify-center font-mono font-black text-white text-base sm:text-lg uppercase tracking-wider" id="active-hole-indicator">
              Hole {currentHole}/{holesCount}
            </div>
            <button
              onClick={handleNextHole}
              disabled={currentHole === holesCount}
              className="px-4 py-2.5 h-11 border border-zinc-805 disabled:opacity-10 rounded-xl hover:bg-zinc-900 text-zinc-200 disabled:cursor-not-allowed font-sans text-xs sm:text-sm font-black flex items-center justify-center gap-1.5 bg-zinc-900 select-none transition-colors cursor-pointer"
              id="btn-next-hole"
            >
              Next <ArrowRight className="w-4 h-4 text-white" />
            </button>
          </div>

          {/* PAR setting for this hole (Tactile input) */}
          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 pt-3 sm:pt-0 border-zinc-900">
            <span className="text-xs sm:text-sm font-extrabold text-zinc-400 uppercase tracking-wider">
              Par for Hole {currentHole}:
            </span>
            <div className="flex items-center gap-1.5 bg-zinc-905 border border-zinc-850 p-1 rounded-xl">
              <button
                onClick={() => onUpdatePar(currentHole, Math.max(1, currentPar - 1))}
                className="w-9 h-9 rounded-lg bg-zinc-950 hover:bg-zinc-800 text-white flex items-center justify-center transition-colors font-extrabold text-sm cursor-pointer select-none"
                aria-label="Decrease Par"
                id="btn-decrease-par"
              >
                <Minus className="w-4 h-4 text-white" />
              </button>
              <span className="w-9 text-center font-mono font-black text-sm sm:text-base text-white" id="active-par-value">
                {currentPar}
              </span>
              <button
                onClick={() => onUpdatePar(currentHole, Math.min(10, currentPar + 1))}
                className="w-9 h-9 rounded-lg bg-zinc-950 hover:bg-zinc-800 text-white flex items-center justify-center transition-colors font-extrabold text-sm cursor-pointer select-none"
                aria-label="Increase Par"
                id="btn-increase-par"
              >
                <Plus className="w-4 h-4 text-white" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Grid of Players Entry Cards - Bold, highly tactile, mobile-driven */}
      <div className="space-y-3" id="play-players-grid">
        {players.map((player) => {
          const playerScore = scores[player.id]?.[currentHole] || 0;
          const hasScore = playerScore > 0;

          const grossTotal = calculateGrossTotal(player.id);
          const relation = calculateGrossRelationToPar(player.id);

          return (
            <div
              key={player.id}
              className={`p-4 bg-cybercard border rounded-xl transition-all shadow-md flex flex-row items-center justify-between gap-3 sm:gap-4 ${
                hasScore ? "border-volt/30" : "border-zinc-850"
              }`}
              id={`player-entry-card-${player.id}`}
            >
              {/* Names and Scoring Totals */}
              <div className="flex-1 min-w-0 pr-1.5 space-y-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h4 className="font-sans font-black text-lg sm:text-xl text-white leading-tight truncate">
                    {player.name}
                  </h4>
                </div>

                <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs sm:text-sm text-zinc-400 font-semibold">
                  <div>
                    Total Strokes: <span className="font-mono font-black text-white">{grossTotal}</span> <span className="text-volt font-black font-mono">({relation})</span>
                  </div>
                </div>

                {/* Score term badge with stable height */}
                <div className="flex items-center gap-1.5 pt-1 min-h-[24px]" id={`score-status-row-${player.id}`}>
                  {hasScore ? (
                    <span className={`text-[10px] sm:text-xs font-black px-2.5 py-0.5 rounded border uppercase tracking-wider ${getScoreTermStyles(playerScore, currentPar)}`}>
                      {getScoreTerm(playerScore, currentPar)}
                    </span>
                  ) : (
                    <span className="text-[10px] sm:text-xs font-mono font-bold text-zinc-650 uppercase tracking-widest select-none py-0.5">
                      — No strokes entered
                    </span>
                  )}
                </div>
              </div>

              {/* Large, Tactile Counter Inputs Optimized for Mobile Thumb REACH */}
              <div className="flex items-center gap-3 shrink-0">
                <div className="flex items-center gap-1.5 bg-zinc-950 p-1.5 border border-zinc-900 rounded-xl">
                  <button
                    onClick={() => {
                      onUpdateScore(player.id, currentHole, Math.max(0, playerScore - 1));
                    }}
                    className="w-11 h-11 rounded-lg bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-white font-black text-lg flex items-center justify-center transition-all select-none active:scale-90 cursor-pointer"
                    aria-label="Subtract stroke"
                    id={`btn-minus-player-${player.id}`}
                  >
                    <Minus className="w-4.5 h-4.5 text-white" />
                  </button>

                  <span
                    className={`w-11 text-center text-lg sm:text-2xl font-sans font-black select-none ${
                      hasScore ? "text-volt font-mono" : "text-zinc-700"
                    }`}
                    id={`player-score-value-${player.id}`}
                  >
                    {playerScore}
                  </span>

                  <button
                    onClick={() => {
                      onUpdateScore(player.id, currentHole, Math.min(25, playerScore + 1));
                    }}
                    className="w-11 h-11 rounded-lg bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-white font-black text-lg flex items-center justify-center transition-all select-none active:scale-90 cursor-pointer"
                    aria-label="Add stroke"
                    id={`btn-plus-player-${player.id}`}
                  >
                    <Plus className="w-4.5 h-4.5 text-white" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Helper info banner */}
      <div className="flex items-center gap-1.5 text-xs text-zinc-550 font-mono w-full justify-center">
        <ShieldAlert className="w-4 h-4 text-volt" />
        <span>Saves instantly to local system memory</span>
      </div>

      {/* Prominent Next / Finish Multi-CTA Block (Amazing UX) */}
      <div className="pt-2 flex flex-col gap-3">
        {currentHole < holesCount ? (
          <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full">
            {/* The grand, pulsing, ultra-attractive Volt Next Hole CTA */}
            <button
              onClick={handleNextHole}
              className="w-full sm:flex-1 py-4 px-6 bg-volt border border-[#ccff00] hover:bg-volt-hover text-black text-sm sm:text-base font-black rounded-xl shadow-[0_0_18px_rgba(204,255,0,0.3)] select-none uppercase font-sans tracking-wider hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer"
              id="hlight-next-hole-cta"
            >
              <span>Next Hole ▶</span>
            </button>

            {/* Completely non-distracting Finish Match text action (prevents accidental completions) */}
            <button
              onClick={onFinishRound}
              className="w-full sm:w-auto px-4 py-3 bg-zinc-950 border border-zinc-850 hover:bg-zinc-900 text-zinc-500 hover:text-rose-450 text-xs font-bold rounded-xl transition-colors cursor-pointer select-none uppercase tracking-wider"
              id="btn-complete-round"
            >
              Finish Early
            </button>
          </div>
        ) : (
          /* It's the very last hole, so COMPLETE MATCH takes center stage! */
          <button
            onClick={onFinishRound}
            className="w-full py-4 px-6 bg-volt border border-[#ccff00] hover:bg-volt-hover text-black text-sm sm:text-base font-black rounded-xl shadow-[0_0_20px_rgba(204,255,0,0.35)] select-none uppercase font-sans tracking-widest hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer"
            id="btn-complete-round"
          >
            <Save className="w-4.5 h-4.5 text-black shrink-0" />
            <span>Complete Game & Record 🏆</span>
          </button>
        )}
      </div>
    </div>
  );
}
