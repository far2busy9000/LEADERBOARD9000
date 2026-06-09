import React, { useState } from "react";
import { Download, Trash2, Trophy, BarChart3, Calendar, MapPin, Award, User, Sheet } from "lucide-react";
import { Player, Round } from "../types";
import { motion } from "motion/react";

interface StatsProps {
  rounds: Round[];
  activeRound: Round | null;
  onDeleteRound: (id: string) => void;
  onSelectCurrentHole: (holeNum: number) => void;
  onSetTab: (tab: "setup" | "play" | "stats") => void;
}

export default function Stats({
  rounds,
  activeRound,
  onDeleteRound,
  onSelectCurrentHole,
  onSetTab,
}: StatsProps) {
  const [focusedRoundId, setFocusedRoundId] = useState<string | null>(null);

  const allRounds = [...rounds];
  const completedRounds = allRounds.filter(r => r.completed);
  const totalRoundsPlayed = completedRounds.length;

  const resultsRound = completedRounds.find(r => r.id === focusedRoundId) || completedRounds[0] || null;

  // 1. Safe global metric calculations
  const calculateGlobalStats = () => {
    let playedHolesCount = 0;
    let totalGrossStrokes = 0;
    let totalParStrokes = 0;
    let birdiesCount = 0;
    let eaglesOrBetter = 0;
    let parsCount = 0;
    let bogeysCount = 0;
    let doublesOrWorse = 0;

    allRounds.forEach((r) => {
      if (!r.completed) return;
      r.players.forEach((player) => {
        for (let h = 1; h <= r.holesCount; h++) {
          const score = r.scores[player.id]?.[h];
          const par = r.pars[h] || 4;
          if (score !== undefined && score > 0) {
            playedHolesCount++;
            totalGrossStrokes += score;
            totalParStrokes += par;

            const diff = score - par;
            if (diff <= -2) eaglesOrBetter++;
            else if (diff === -1) birdiesCount++;
            else if (diff === 0) parsCount++;
            else if (diff === 1) bogeysCount++;
            else if (diff >= 2) doublesOrWorse++;
          }
        }
      });
    });

    // Calculate average gross score and relative difference per individual round played
    let totalParticipations = 0;
    allRounds.forEach((r) => {
      if (!r.completed) return;
      r.players.forEach((player) => {
        let playerParticipatedInRound = false;
        for (let h = 1; h <= r.holesCount; h++) {
          const score = r.scores[player.id]?.[h];
          if (score !== undefined && score > 0) {
            playerParticipatedInRound = true;
          }
        }
        if (playerParticipatedInRound) {
          totalParticipations++;
        }
      });
    });

    const averageScore = totalParticipations > 0 ? (totalGrossStrokes / totalParticipations) : 0;
    const averageDiff = totalParticipations > 0 ? (totalGrossStrokes - totalParStrokes) / totalParticipations : 0;

    return {
      playedHolesCount,
      averageScore: averageScore.toFixed(1),
      averageDiff: averageDiff.toFixed(1),
      birdiesCount,
      eaglesOrBetter,
      parsCount,
      bogeysCount,
      doublesOrWorse,
    };
  };

  const globalStats = calculateGlobalStats();

  // 2. Safe round subtotal calculations
  const getSubtotals = (round: Round, playerId: string) => {
    let outScore = 0;
    let inScore = 0;
    let outPar = 0;
    let inPar = 0;

    const limit = Math.min(9, round.holesCount);
    for (let h = 1; h <= limit; h++) {
      const s = round.scores[playerId]?.[h];
      const p = round.pars[h] || 4;
      if (s && s > 0) outScore += s;
      outPar += p;
    }

    if (round.holesCount > 9) {
      for (let h = 10; h <= round.holesCount; h++) {
        const s = round.scores[playerId]?.[h];
        const p = round.pars[h] || 4;
        if (s && s > 0) inScore += s;
        inPar += p;
      }
    }

    const totalGross = outScore + inScore;
    const totalPar = outPar + inPar;

    return { outScore, inScore, totalGross, outPar, inPar, totalPar };
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
    if (diff === 2) return "DB";
    if (diff >= 3) return `+${diff}`;
    return "";
  };

  // Theme badges for custom terms
  const getScoreTermStyles = (score: number, par: number) => {
    if (!score || score === 0) return "bg-zinc-900 border-zinc-800 text-zinc-400";
    const diff = score - par;
    if (diff < 0) return "bg-green-950/40 text-green-400 border-green-800/40";
    if (diff === 0) return "bg-indigo-950/40 text-indigo-400 border-indigo-805/40";
    if (diff === 1) return "bg-amber-955/40 text-amber-500 border-amber-805/40";
    if (diff >= 2) return "bg-rose-955/40 text-rose-450 border-rose-805/40";
    return "bg-zinc-900 border-[#2d302d] text-zinc-350";
  };

  // 3. EXPORTS: Raw CSV compilation (no handicaps)
  const exportActiveRoundCSV = () => {
    if (!activeRound) return;
    const round = activeRound;
    
    let csvContent = "";
    csvContent += `Course Name,${round.courseName}\n`;
    csvContent += `Date,${round.date}\n`;
    csvContent += `Holes Count,${round.holesCount}\n\n`;

    const holeHeaders = Array.from({ length: round.holesCount }, (_, i) => `Hole ${i+1}`).join(",");
    csvContent += `Player Name,${holeHeaders},Total Score,Total Par,Total Difference\n`;

    const parValues = Array.from({ length: round.holesCount }, (_, h) => round.pars[h+1] || 4).join(",");
    const totalParsSum = Object.values(round.pars).reduce((a, b) => a + b, 0);
    csvContent += `Course Par,${parValues},${totalParsSum},,\n`;

    round.players.forEach((player) => {
      const scoreValues = Array.from({ length: round.holesCount }, (_, h) => {
        const sc = round.scores[player.id]?.[h+1];
        return sc && sc > 0 ? sc : "";
      }).join(",");
      const { totalGross } = getSubtotals(round, player.id);
      const diff = totalGross - totalParsSum;
      const diffStr = diff === 0 ? "E" : diff > 0 ? `+${diff}` : diff;
      csvContent += `"${player.name.replace(/"/g, '""')}",${scoreValues},${totalGross},${totalParsSum},${diffStr}\n`;
    });

    downloadCSVFile(csvContent, `leaderboard9000_${round.courseName.toLowerCase().replace(/\s+/g, '_')}.csv`);
  };

  const exportAllHistoryCSV = () => {
    if (rounds.length === 0) return;
    
    let csvContent = "LEADERBOARD9000 Cumulative History Summary\n\n";
    
    rounds.forEach((round, index) => {
      csvContent += `ROUND ${index+1}: ${round.courseName} (${round.date})\n`;
      const holeHeaders = Array.from({ length: round.holesCount }, (_, i) => `H${i+1}`).join(",");
      csvContent += `Player Name,${holeHeaders},Total Score,Completed\n`;
      
      round.players.forEach((player) => {
        const scoresString = Array.from({ length: round.holesCount }, (_, h) => {
          const sc = round.scores[player.id]?.[h+1];
          return sc && sc > 0 ? sc : "-";
        }).join(",");
        const { totalGross } = getSubtotals(round, player.id);
        csvContent += `"${player.name.replace(/"/g, '""')}",${scoresString},${totalGross},${round.completed ? "YES" : "NO"}\n`;
      });
      csvContent += "\n";
    });

    downloadCSVFile(csvContent, "leaderboard9000_history.csv");
  };

  const downloadCSVFile = (csvString: string, filename: string) => {
    const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6" id="stats-container">

      {/* -------------------- PROMINENT RECENT MATCH RESULTS SCREEN (WINNER CELEBRATION) -------------------- */}
      {resultsRound ? (
        <div className="p-4 sm:p-5 bg-zinc-950 border-2 border-volt/40 rounded-xl shadow-[0_0_20px_rgba(204,255,0,0.15)] space-y-5" id="results-screen-celebration">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-900 pb-3 gap-3">
            <div>
              <span className="font-mono text-xs font-bold uppercase tracking-widest text-volt">
                🏆 OFFICIAL MATCH RESULTS 🏆
              </span>
              <h2 className="font-sans font-black text-xl text-white mt-1">
                {resultsRound.courseName} <span className="text-sm text-zinc-500 font-normal">({resultsRound.date})</span>
              </h2>
            </div>
            
            <span className="px-3 py-1 bg-zinc-900 border border-zinc-800 rounded-lg text-xs font-mono font-bold text-zinc-400 self-start sm:self-center">
              {resultsRound.holesCount} Holes Scored
            </span>
          </div>

          {/* Winner Celebration Banner */}
          {(() => {
            const playerStats = resultsRound.players.map(p => {
              const { totalGross, totalPar } = getSubtotals(resultsRound, p.id);
              const totalGrossCalculated = Object.values(resultsRound.scores[p.id] || {}).reduce((a, b) => a + b, 0);
              return {
                id: p.id,
                name: p.name,
                totalGross,
                totalPar,
                played: totalGrossCalculated > 0
              };
            }).filter(p => p.played);

            if (playerStats.length === 0) return null;

            // Sort purely by totalGross ascending (lowest raw score wins!)
            const sortedPlayers = [...playerStats].sort((a, b) => a.totalGross - b.totalGross);
            const bestGross = sortedPlayers[0].totalGross;
            const winners = sortedPlayers.filter(p => p.totalGross === bestGross);
            const isTie = winners.length > 1;

            return (
              <div className="space-y-4">
                {/* Winner Card layout */}
                <div className="p-4 bg-zinc-900/40 border border-volt/20 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left shadow-lg">
                  <div className="flex flex-col sm:flex-row items-center gap-3.5">
                    <div className="w-14 h-14 rounded-full bg-volt text-black flex items-center justify-center font-black text-2xl shadow-[0_0_15px_rgba(204,255,0,0.35)] animate-bounce select-none">
                      👑
                    </div>
                    <div>
                      <span className="text-xs font-mono font-bold text-volt uppercase tracking-wider block">
                        {isTie ? "🏅 JOINT WINNERS CELEBRATED" : "🥇 OFFICIAL CHAMPION"}
                      </span>
                      <h3 className="font-sans font-black text-2xl sm:text-3xl text-white tracking-tight">
                        {winners.map(w => w.name).join(" & ")}
                      </h3>
                      <p className="text-xs text-zinc-400 mt-1">
                        Claimed victory on <span className="text-volt font-bold">{resultsRound.courseName}</span>!
                      </p>
                    </div>
                  </div>

                  <div className="bg-zinc-950 px-5 py-2.5 rounded-lg border border-zinc-850 text-center shrink-0 w-full sm:w-auto">
                    <span className="text-[10px] font-mono font-bold text-zinc-500 uppercase block tracking-wider">
                      Winning Score
                    </span>
                    <span className="text-3xl font-black font-mono text-volt">
                      {bestGross}
                    </span>
                    <span className="block text-[10px] text-zinc-400 font-mono mt-0.5 uppercase font-bold">
                      Diff: {winners[0].totalGross - winners[0].totalPar >= 0 ? `+${winners[0].totalGross - winners[0].totalPar}` : winners[0].totalGross - winners[0].totalPar} vs Par
                    </span>
                  </div>
                </div>

                {/* Hole-by-Hole Score Breakdown Spreadsheet */}
                <div className="space-y-2">
                  <h3 className="font-sans font-black text-xs sm:text-sm text-zinc-300 uppercase tracking-wider flex items-center gap-1.5 pt-1">
                    <span>⛳</span> Hole-by-Hole Score breakdown
                  </h3>
                  
                  <div className="overflow-x-auto rounded-xl border border-zinc-900 bg-zinc-950">
                    <table className="w-full border-collapse font-sans text-xs text-zinc-300">
                      <thead>
                        <tr className="bg-zinc-900 border-b border-zinc-850 text-zinc-400 font-semibold uppercase font-mono text-[10px]">
                          <th className="p-2.5 text-left font-bold min-w-[100px] sticky left-0 bg-zinc-900 z-10 shadow-[1px_0_3px_rgba(0,0,0,0.5)] uppercase tracking-wider">
                            PLAYER
                          </th>
                          {Array.from({ length: resultsRound.holesCount }, (_, h) => h + 1).map((h) => (
                            <th key={h} className="p-2 text-center font-bold min-w-[28px] font-mono">
                              {h}
                            </th>
                          ))}
                          <th className="p-2 text-center font-bold bg-[#ccff00] text-black min-w-[50px] uppercase">SCORE</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-900/60">
                        {/* Course Par Row */}
                        <tr className="bg-zinc-950 text-zinc-400 font-medium h-9">
                          <td className="p-2.5 font-bold uppercase tracking-wider text-[10px] sticky left-0 bg-zinc-950 z-10 shadow-[1px_0_3px_rgba(0,0,0,0.5)] font-mono">
                            Course Par
                          </td>
                          {Array.from({ length: resultsRound.holesCount }, (_, h) => h + 1).map((h) => (
                            <td key={h} className="p-2 text-center font-bold text-zinc-300 font-mono">
                              {resultsRound.pars[h] || 4}
                            </td>
                          ))}
                          <td className="p-2 text-center font-extrabold bg-zinc-900 text-zinc-200 font-mono">
                            {Object.values(resultsRound.pars).reduce((a, b) => a + b, 0)}
                          </td>
                        </tr>

                        {/* Players Rows */}
                        {playerStats.map((pStat) => {
                          const isPlayerWinner = winners.some(w => w.id === pStat.id);
                          return (
                            <tr key={pStat.id} className={`hover:bg-zinc-900/30 transition-colors h-9 ${isPlayerWinner ? "bg-volt/[0.02]" : ""}`}>
                              <td className="p-2.5 font-black text-white sticky left-0 bg-zinc-950 z-10 shadow-[1px_0_3px_rgba(0,0,0,0.5)] whitespace-nowrap">
                                <span className="flex items-center gap-1.5">
                                  {isPlayerWinner && <span className="text-volt">👑</span>}
                                  <span className="text-sm font-black">{pStat.name}</span>
                                </span>
                              </td>
                              {Array.from({ length: resultsRound.holesCount }, (_, h) => {
                                const s = resultsRound.scores[pStat.id]?.[h+1];
                                const isScoreInputed = s !== undefined && s > 0;
                                const par = resultsRound.pars[h+1] || 4;
                                
                                let colorClass = "text-zinc-650 animate-pulse";
                                if (isScoreInputed) {
                                  colorClass = getScoreTermStyles(s, par);
                                }

                                return (
                                  <td key={h} className="p-1 text-center font-mono">
                                    <span className={`text-xs font-black px-1.5 py-0.5 rounded ${colorClass}`} title={isScoreInputed ? `${getScoreTerm(s, par)} (Par ${par})` : ""}>
                                      {isScoreInputed ? s : "-"}
                                    </span>
                                  </td>
                                );
                              })}
                              {/* Total Score Column (volt highlighted on winner) */}
                              <td className={`p-2 text-center font-bold font-mono text-sm leading-tight ${isPlayerWinner ? "bg-volt text-black font-black winner-score-cell" : "bg-zinc-900 text-zinc-200"}`}>
                                {pStat.totalGross}
                                <span className={`block text-[9px] font-bold ${isPlayerWinner ? "text-zinc-850" : "text-volt"}`}>
                                  {pStat.totalGross - pStat.totalPar === 0 ? "E" : pStat.totalGross - pStat.totalPar >= 0 ? `+${pStat.totalGross - pStat.totalPar}` : pStat.totalGross - pStat.totalPar}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      ) : null}
      
      {/* -------------------- DYNAMIC SCORECARD FOR ACTIVE (LIVE) ROUND -------------------- */}
      {activeRound ? (
        <div className="p-4 bg-cybercard border border-[#2d332d] rounded-xl shadow-md space-y-3.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-805 pb-3 gap-2">
            <div>
              <div className="flex items-center gap-1.5 text-volt">
                <Sheet className="w-5 h-5 text-volt" />
                <h3 className="font-sans font-black text-white text-sm sm:text-base uppercase tracking-wider">Live Game Scorecard</h3>
              </div>
              <p className="text-xs text-zinc-450 font-mono mt-0.5">
                Course: <span className="text-volt font-bold">{activeRound.courseName}</span> ({activeRound.holesCount} holes) — Tap scores to edit!
              </p>
            </div>
            
            <button
              onClick={exportActiveRoundCSV}
              className="h-9 px-3 text-xs font-black text-black bg-volt hover:bg-volt-hover rounded-lg transition-all flex items-center justify-center gap-1.5 uppercase select-none w-full sm:w-auto cursor-pointer font-sans"
              id="btn-export-active-csv"
            >
              <Download className="w-3.5 h-3.5 text-black shrink-0" />
              Export Live CSV
            </button>
          </div>

          {/* Horizontally scrollable spreadsheet scorecard */}
          <div className="overflow-x-auto rounded-xl border border-zinc-900 bg-zinc-950" id="live-scorecard-table-scroll">
            <table className="w-full border-collapse font-sans text-xs text-zinc-300">
              <thead>
                <tr className="bg-zinc-900 border-b border-zinc-850 text-zinc-400 font-semibold uppercase font-mono text-[10px]">
                  <th className="p-2 text-left font-bold min-w-[90px] sticky left-0 bg-zinc-900 z-10 shadow-[1px_0_3px_rgba(0,0,0,0.5)]">
                    PLAYER
                  </th>
                  {Array.from({ length: activeRound.holesCount }, (_, h) => h + 1).map((h) => (
                    <th key={h} className="p-1.5 text-center font-bold min-w-[28px] hover:bg-zinc-850 transition-colors font-mono hover:text-volt">
                      <button onClick={() => { onSelectCurrentHole(h); onSetTab("play"); }} className="w-full h-full font-bold focus:underline text-zinc-300 hover:text-volt cursor-pointer" id={`th-hole-${h}`}>
                        {h}
                      </button>
                    </th>
                  ))}
                  <th className="p-1.5 text-center font-bold bg-[#ccff00] text-black min-w-[45px] uppercase font-sans">SCORE</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900">
                {/* Pars Row */}
                <tr className="bg-zinc-950 text-zinc-405 font-medium h-8">
                  <td className="p-2 font-bold uppercase tracking-wider text-[10px] sticky left-0 bg-zinc-950 z-10 shadow-[1px_0_3px_rgba(0,0,0,0.5)] font-mono">
                    Course Par
                  </td>
                  {Array.from({ length: activeRound.holesCount }, (_, h) => h + 1).map((h) => (
                    <td key={h} className="p-1.5 text-center font-bold text-zinc-300 font-mono">
                      {activeRound.pars[h] || 4}
                    </td>
                  ))}
                  <td className="p-1.5 text-center font-black bg-zinc-900 text-zinc-200 font-mono">
                    {Object.values(activeRound.pars).reduce((a, b) => a + b, 0)}
                  </td>
                </tr>

                {/* Players Scores Row */}
                {activeRound.players.map((player) => {
                  const { totalGross, totalPar } = getSubtotals(activeRound, player.id);
                  const relPar = totalGross - totalPar;
                  const relationString = totalGross === 0 ? "E" : relPar === 0 ? "E" : relPar > 0 ? `+${relPar}` : `${relPar}`;

                  return (
                    <tr key={player.id} className="hover:bg-zinc-900/30 transition-colors h-8" id={`table-score-row-${player.id}`}>
                      <td className="p-2 font-black text-sm text-white sticky left-0 bg-zinc-950 z-10 shadow-[1px_0_3px_rgba(0,0,0,0.5)] whitespace-nowrap">
                        {player.name}
                      </td>
                      {Array.from({ length: activeRound.holesCount }, (_, h) => {
                        const s = activeRound.scores[player.id]?.[h];
                        const isScoreInputed = s !== undefined && s > 0;
                        const par = activeRound.pars[h] || 4;
                        
                        let colorClass = "text-zinc-650";
                        if (isScoreInputed) {
                          const diff = s - par;
                          if (diff === -1) colorClass = "text-green-400 bg-green-950/30 rounded font-bold font-mono";
                          else if (diff <= -2) colorClass = "text-volt bg-zinc-900 border border-volt/20 font-black rounded font-mono";
                          else if (diff === 0) colorClass = "text-indigo-400 font-bold bg-indigo-950/20 font-mono";
                          else if (diff === 1) colorClass = "text-amber-500 font-bold bg-amber-950/10 font-mono";
                          else if (diff >= 2) colorClass = "text-rose-450 bg-rose-955/10 font-mono";
                        }

                        return (
                          <td key={h} className="p-0.5 text-center">
                            <button
                              onClick={() => {
                                onSelectCurrentHole(h);
                                onSetTab("play");
                              }}
                              className={`w-full py-1 text-sm font-black transition-transform hover:scale-110 focus:outline-none cursor-pointer ${colorClass}`}
                              title={`Edit Hole ${h}`}
                              id={`score-btn-h${h}-p${player.id}`}
                            >
                              {isScoreInputed ? s : "-"}
                            </button>
                          </td>
                        );
                      })}
                      {/* Total Score Column, neon volt highlighted block */}
                      <td className="p-1 text-center font-black text-black bg-[#ccff00] font-mono select-none">
                        {totalGross}
                        <span className="block text-[9px] font-mono font-bold text-zinc-800">
                          {relationString}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="p-4 bg-zinc-950 border border-zinc-900 rounded-xl flex items-center gap-2.5 text-zinc-440 font-semibold shadow-inner">
          <Calendar className="w-5 h-5 text-volt animate-pulse shrink-0" />
          <p className="text-xs text-zinc-450 uppercase font-mono font-bold">
            No live tournament active. Customize your settings under <strong>SETUP</strong> to start your game!
          </p>
        </div>
      )}

      {/* -------------------- CUMULATIVE ANALYTICS & STATS SUMMARY -------------------- */}
      {totalRoundsPlayed > 0 && (
        <div className="p-4 bg-cybercard border border-zinc-850 rounded-xl shadow-md space-y-4">
          <div className="flex items-center gap-2 text-volt border-b border-zinc-900 pb-2">
            <BarChart3 className="w-5 h-5 text-volt" />
            <h3 className="font-sans font-black text-white text-sm uppercase tracking-wider">
              Cumulative Metrics ({totalRoundsPlayed} saved rounds)
            </h3>
          </div>

          {/* Quick Metrics Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5" id="stats-metrics-cards">
            <div className="p-3 bg-zinc-950 border border-zinc-900 rounded-lg flex flex-col justify-between h-20 shadow-inner">
              <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider font-mono">
                Total Matches
              </span>
              <span className="text-2xl font-black font-mono text-white" id="metrics-total-rounds">
                {totalRoundsPlayed}
              </span>
            </div>
            <div className="p-3 bg-zinc-950 border border-zinc-900 rounded-lg flex flex-col justify-between h-20 shadow-inner">
              <span className="text-xs font-bold text-zinc-450 uppercase tracking-wider font-mono">
                Holes Tracked
              </span>
              <span className="text-2xl font-black font-mono text-white" id="metrics-holes-recorded">
                {globalStats.playedHolesCount}
              </span>
            </div>
            <div className="p-3 bg-zinc-950 border border-zinc-900 rounded-lg flex flex-col justify-between h-20 shadow-inner">
              <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider font-mono">
                Avg Round Gross
              </span>
              <span className="text-2xl font-black font-mono text-volt" id="metrics-avg-gross">
                {globalStats.averageScore}
              </span>
            </div>
            <div className="p-3 bg-zinc-950 border border-zinc-900 rounded-lg flex flex-col justify-between h-20 shadow-inner">
              <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider font-mono">
                Avg vs Par
              </span>
              <span className="text-2xl font-black font-mono text-indigo-400" id="metrics-avg-par">
                {parseFloat(globalStats.averageDiff) === 0 ? "E" : parseFloat(globalStats.averageDiff) > 0 ? `+${globalStats.averageDiff}` : globalStats.averageDiff}
              </span>
            </div>
          </div>

          {/* Stacked distribution chart */}
          <div className="space-y-2 pt-1">
            <h4 className="text-xs sm:text-sm font-extrabold text-zinc-400 uppercase tracking-wider font-mono">
              Aggregate Shots breakdown
            </h4>
            
            <div className="w-full h-5 rounded hover:brightness-110 overflow-hidden flex bg-zinc-900 border border-zinc-950" id="stats-stacked-distribution-bar">
              {globalStats.playedHolesCount === 0 ? (
                <div className="w-full h-full flex items-center justify-center text-xs text-zinc-650 font-mono font-bold">
                  No stats generated, score holes manually!
                </div>
              ) : (
                <>
                  {globalStats.eaglesOrBetter > 0 && (
                    <div
                      style={{ width: `${(globalStats.eaglesOrBetter / globalStats.playedHolesCount) * 100}%` }}
                      className="bg-purple-650 h-full hover:brightness-125 transition-all cursor-pointer"
                      title={`Eagles: ${globalStats.eaglesOrBetter}`}
                    />
                  )}
                  {globalStats.birdiesCount > 0 && (
                    <div
                      style={{ width: `${(globalStats.birdiesCount / globalStats.playedHolesCount) * 100}%` }}
                      className="bg-volt h-full hover:brightness-125 transition-all cursor-pointer"
                      title={`Birdies: ${globalStats.birdiesCount}`}
                    />
                  )}
                  {globalStats.parsCount > 0 && (
                    <div
                      style={{ width: `${(globalStats.parsCount / globalStats.playedHolesCount) * 100}%` }}
                      className="bg-sky-500 h-full hover:brightness-125 transition-all cursor-pointer"
                      title={`Pars: ${globalStats.parsCount}`}
                    />
                  )}
                  {globalStats.bogeysCount > 0 && (
                    <div
                      style={{ width: `${(globalStats.bogeysCount / globalStats.playedHolesCount) * 100}%` }}
                      className="bg-[#dcae1d] h-full hover:brightness-125 transition-all cursor-pointer"
                      title={`Bogeys: ${globalStats.bogeysCount}`}
                    />
                  )}
                  {globalStats.doublesOrWorse > 0 && (
                    <div
                      style={{ width: `${(globalStats.doublesOrWorse / globalStats.playedHolesCount) * 100}%` }}
                      className="bg-rose-650 h-full hover:brightness-125 transition-all cursor-pointer"
                      title={`Double+: ${globalStats.doublesOrWorse}`}
                    />
                  )}
                </>
              )}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs pt-2.5 border-t border-zinc-900" id="stats-stacked-legend">
              <div className="flex items-center gap-1.5 font-mono font-bold text-zinc-400">
                <span className="w-2.5 h-2.5 rounded bg-purple-650 inline-block shrink-0" />
                <span>Eagle/Better ({globalStats.eaglesOrBetter})</span>
              </div>
              <div className="flex items-center gap-1.5 font-mono font-bold text-zinc-400">
                <span className="w-2.5 h-2.5 rounded bg-[#ccff00] inline-block shrink-0" />
                <span>Birdie ({globalStats.birdiesCount})</span>
              </div>
              <div className="flex items-center gap-1.5 font-mono font-bold text-zinc-400">
                <span className="w-2.5 h-2.5 rounded bg-sky-500 inline-block shrink-0" />
                <span>Par ({globalStats.parsCount})</span>
              </div>
              <div className="flex items-center gap-1.5 font-mono font-bold text-zinc-400">
                <span className="w-2.5 h-2.5 rounded bg-[#dcae1d] inline-block shrink-0" />
                <span>Bogey ({globalStats.bogeysCount})</span>
              </div>
              <div className="flex items-center gap-1.5 font-mono font-bold text-zinc-400">
                <span className="w-2.5 h-2.5 rounded bg-rose-650 inline-block shrink-0" />
                <span>Double+ ({globalStats.doublesOrWorse})</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* -------------------- RECORDED ROUNDS HISTORY CARDS -------------------- */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800 pb-2">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-volt" />
            <h3 className="font-sans font-black text-white text-base uppercase tracking-wider">Tournament Vault Archives</h3>
          </div>

          {allRounds.length > 0 && (
            <button
              onClick={exportAllHistoryCSV}
              className="px-3 h-9 text-xs font-black text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer select-none uppercase w-full sm:w-auto font-sans font-bold"
              id="btn-export-all-history-csv"
            >
              <Download className="w-4 h-4 text-white shrink-0" />
              Download History CSV
            </button>
          )}
        </div>

        {allRounds.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 px-4 text-center border border-dashed border-zinc-800 rounded-xl bg-zinc-955 gap-3.5 shadow-inner">
            <Trophy className="w-11 h-11 text-zinc-800" />
            <div className="space-y-1">
              <h4 className="font-sans font-extrabold text-sm text-white uppercase tracking-wider">Vault database empty</h4>
              <p className="text-xs text-zinc-500 max-w-sm leading-relaxed">
                Matches you complete inside the Play dashboard will archive securely to this browser's cumulative vault history list!
              </p>
            </div>
            <button
              onClick={() => onSetTab("setup")}
              className="px-5 py-2.5 text-xs font-black text-black bg-volt hover:bg-volt-hover rounded-lg shadow-md transition-all inline-flex items-center uppercase mt-1 font-sans cursor-pointer"
              id="stats-start-new-btn-placeholder"
            >
              Start Game Session
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4" id="stats-history-grid">
            {allRounds.map((round) => {
              let winnerName = "";
              let winningScore = Infinity;

              round.players.forEach((p) => {
                const { totalGross } = getSubtotals(round, p.id);
                // Protect vs 0 scored players (unplayed)
                const totalGrossCalculated = Object.values(round.scores[p.id] || {}).reduce((total, sc) => total + sc, 0);
                if (totalGrossCalculated > 0 && totalGross < winningScore) {
                  winningScore = totalGross;
                  winnerName = p.name;
                }
              });

              const isCurrentlyFocused = resultsRound?.id === round.id;

              return (
                <div
                  key={round.id}
                  className={`p-4 bg-cybercard border rounded-xl shadow-md flex flex-col justify-between gap-3.5 transition-all hover:border-volt/25 ${
                    isCurrentlyFocused ? "border-volt/40 ring-1 ring-volt/10 scale-101" : !round.completed ? "border-dashed border-amber-900 bg-amber-950/5 font-sans" : "border-zinc-850"
                  }`}
                  id={`round-history-card-${round.id}`}
                >
                  <div className="space-y-1">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-1.5 text-white">
                        <MapPin className="w-4 h-4 text-volt" />
                        <h4 className="font-sans font-black text-base text-white uppercase truncate max-w-[170px]">
                          {round.courseName}
                        </h4>
                      </div>

                      {round.completed ? (
                        <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-950/20 px-2 py-0.5 rounded border border-emerald-900/40 select-none">
                          ARCHIVED
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono font-bold text-amber-500 bg-amber-950/20 px-2 py-0.5 rounded border border-amber-900/35 animate-pulse select-none">
                          IN PLAY
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-zinc-500 font-mono font-semibold">
                      <Calendar className="w-3.5 h-3.5 text-zinc-600" />
                      <span>{round.date}</span>
                      <span>•</span>
                      <span>{round.holesCount} Holes</span>
                    </div>
                  </div>

                  {/* Player performances list */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-extrabold text-zinc-500 uppercase tracking-widest block font-mono">
                      ROSTER STANDING:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {round.players.map((p) => {
                        const { totalGross } = getSubtotals(round, p.id);
                        return (
                          <div
                            key={p.id}
                            className="text-xs bg-zinc-950 border border-zinc-900 px-2.5 py-1 rounded-lg flex items-center gap-1 text-zinc-300 font-mono"
                          >
                            <User className="w-3.5 h-3.5 text-volt shrink-0" />
                            <span className="font-semibold text-zinc-300">{p.name}</span>
                            <span className="font-extrabold text-white bg-zinc-900 px-1.5 py-0.5 rounded">
                              {totalGross} <span className="text-[9px] text-zinc-500 font-normal lowercase">str</span>
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Leaderboard winner display & erase action */}
                  <div className="flex items-center justify-between border-t border-zinc-900 pt-2 px-0.5 gap-2">
                    {winnerName && round.completed ? (
                      <div className="flex items-center gap-1 text-xs text-volt bg-zinc-950 px-2 py-0.5 rounded border border-volt/10 shrink-0 select-none">
                        <Award className="w-4 h-4 text-volt" />
                        <span>
                          Champion: <span className="font-bold text-white uppercase">{winnerName}</span> ({winningScore} strokes)
                        </span>
                      </div>
                    ) : (
                      <div className="text-[10px] font-mono text-zinc-650 font-bold">STABLEFORD ARCHIVE OK</div>
                    )}

                    <div className="flex items-center gap-1.5 select-none shrink-0">
                      <button
                        onClick={() => { setFocusedRoundId(round.id); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                        className={`text-[10px] font-mono px-2 py-1 rounded border uppercase font-black transition-all cursor-pointer ${
                          resultsRound?.id === round.id
                            ? "bg-volt text-black border-volt"
                            : "bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white hover:bg-zinc-800"
                        }`}
                        id={`btn-view-historical-breakdown-${round.id}`}
                      >
                        Breakdown 📊
                      </button>

                      <button
                        onClick={() => onDeleteRound(round.id)}
                        className="p-1 px-1.5 text-red-500 hover:text-red-400 hover:bg-zinc-900 border border-zinc-800 rounded transition-all cursor-pointer"
                        aria-label="Delete record"
                        id={`btn-delete-archive-${round.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
