import React, { useState, useEffect } from "react";
import { Plus, Trash2, Play, Users, Map, User, Compass } from "lucide-react";
import { Player, Round } from "../types";
import { motion, AnimatePresence } from "motion/react";

interface SetupProps {
  activeRound: Round | null;
  onStartRound: (courseName: string, holesCount: number, players: Player[], isMiniGolf: boolean) => void;
  onResumeRound: () => void;
}

export default function Setup({ activeRound, onStartRound, onResumeRound }: SetupProps) {
  const [courseName, setCourseName] = useState("");
  const [isMiniGolf, setIsMiniGolf] = useState(false);
  const [holesCount, setHolesCount] = useState<number>(18);
  const [players, setPlayers] = useState<Player[]>(() => {
    try {
      const saved = localStorage.getItem("leaderboard9000_last_active_players");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [newPlayerName, setNewPlayerName] = useState("");

  // Sync active players selection for subsequent loadings
  useEffect(() => {
    try {
      localStorage.setItem("leaderboard9000_last_active_players", JSON.stringify(players));
    } catch (e) {
      console.error("Failed to sync players roster", e);
    }
  }, [players]);

  // Dynamic presets state
  const [coursePresets, setCoursePresets] = useState<string[]>([]);
  const [recentPlayers, setRecentPlayers] = useState<Player[]>([]);

  // Load presets on mount
  useEffect(() => {
    try {
      const savedCourses = localStorage.getItem("leaderboard9000_course_presets");
      if (savedCourses) {
        setCoursePresets(JSON.parse(savedCourses));
      }
      const savedPlayers = localStorage.getItem("leaderboard9000_recent_players_simple");
      if (savedPlayers) {
        setRecentPlayers(JSON.parse(savedPlayers));
      } else {
        // Fallback backward compatibility or default presets
        const oldSaved = localStorage.getItem("leaderboard9000_recent_players");
        if (oldSaved) {
          const parsed = JSON.parse(oldSaved) as any[];
          const simple = parsed.map(p => ({ id: p.id || Date.now().toString(), name: p.name }));
          setRecentPlayers(simple);
        }
      }
    } catch (e) {
      console.error("Failed to load setup presets", e);
    }
  }, []);

  const handleAddPlayer = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const name = newPlayerName.trim();
    if (!name) return;

    // Check duplicate
    if (players.some((p) => p.name.toLowerCase() === name.toLowerCase())) {
      alert("A player with this name has already been added.");
      return;
    }

    const newPlayer: Player = {
      id: Date.now().toString(),
      name,
    };

    const updatedPlayers = [...players, newPlayer];
    setPlayers(updatedPlayers);
    setNewPlayerName("");

    // Save to recents uniquely without handicap
    try {
      const filtered = recentPlayers.filter((p) => p.name.toLowerCase() !== name.toLowerCase());
      const updatedRecents = [{ id: Date.now().toString(), name }, ...filtered].slice(0, 10);
      localStorage.setItem("leaderboard9000_recent_players_simple", JSON.stringify(updatedRecents));
      setRecentPlayers(updatedRecents);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSelectRecentPlayer = (preset: Player) => {
    if (players.some((p) => p.name.toLowerCase() === preset.name.toLowerCase())) {
      return;
    }
    const newPlayer: Player = {
      id: Date.now().toString(),
      name: preset.name,
    };
    setPlayers([...players, newPlayer]);
  };

  const handleRemoveRecentPlayer = (e: React.MouseEvent, name: string) => {
    e.stopPropagation();
    const updated = recentPlayers.filter((p) => p.name.toLowerCase() !== name.toLowerCase());
    setRecentPlayers(updated);
    localStorage.setItem("leaderboard9000_recent_players_simple", JSON.stringify(updated));
  };

  const handleRemovePlayer = (id: string) => {
    setPlayers(players.filter((p) => p.id !== id));
  };

  const handleUpdateName = (id: string, name: string) => {
    setPlayers(
      players.map((p) =>
        p.id === id ? { ...p, name: name.trim() || p.name } : p
      )
    );
  };

  const handleSelectPresetCourse = (name: string) => {
    setCourseName(name);
  };

  const handleLaunch = () => {
    const finalCourseName = courseName.trim();
    if (!finalCourseName) {
      alert("Please specify a Course Name to start scoring. You can enter a course title or select / tap from your recently played list!");
      return;
    }
    
    if (players.length === 0) {
      alert("Please add at least one player to start the round.");
      return;
    }

    if (holesCount < 1 || holesCount > 100) {
      alert("Please specify a valid number of holes between 1 and 100.");
      return;
    }
    
    // Save course name to dynamic presets
    try {
      const filtered = coursePresets.filter((c) => c.toLowerCase() !== finalCourseName.toLowerCase());
      const updatedCourses = [finalCourseName, ...filtered].slice(0, 6);
      localStorage.setItem("leaderboard9000_course_presets", JSON.stringify(updatedCourses));
      setCoursePresets(updatedCourses);
    } catch (e) {
      console.error(e);
    }

    onStartRound(finalCourseName, holesCount, players, isMiniGolf);
  };

  return (
    <div className="space-y-6" id="setup-container">
      {/* Resume Active Round Banner, if available */}
      {activeRound && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row items-center justify-between p-4 bg-zinc-900 border border-volt/20 rounded-xl text-white gap-4 shadow-lg"
          id="resume-banner"
        >
          <div className="text-center sm:text-left space-y-1">
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-volt">
              ⚡ LIVE MATCH IN PROGRESS ⚡
            </span>
            <h4 className="font-sans font-black text-lg text-white">
              {activeRound.courseName} <span className="text-xs text-zinc-400 font-mono font-bold uppercase">({activeRound.holesCount} Holes)</span>
            </h4>
            <p className="text-xs text-zinc-400 font-sans">
              Roster: <span className="text-zinc-200 font-bold">{activeRound.players.map((p) => p.name).join(", ")}</span>
            </p>
          </div>
          <button
            onClick={onResumeRound}
            className="w-full sm:w-auto h-12 px-5 flex items-center justify-center gap-2 text-xs sm:text-sm font-black text-black bg-volt hover:bg-volt-hover rounded-xl shadow-md transition-all select-none uppercase tracking-wider cursor-pointer"
            id="btn-resume-round"
          >
            <Compass className="w-4 h-4 text-black shrink-0" />
            Resume Live Scorecard
          </button>
        </motion.div>
      )}

      {/* Main Grid View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Course Config (Left Side) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="p-4 sm:p-5 bg-cybercard border border-zinc-850 rounded-xl space-y-5 shadow-lg">
            
            <div className="flex items-center gap-2.5 text-volt border-b border-zinc-900 pb-3">
              <Map className="w-5 h-5 text-volt" />
              <h3 className="font-sans font-black text-white text-base uppercase tracking-wider">Course setup</h3>
            </div>

            <div className="space-y-2">
              <label htmlFor="course-name-input" className="block text-xs sm:text-sm font-extrabold text-zinc-350 uppercase tracking-wider">
                Enter Course Name <span className="text-rose-500 font-extrabold">*</span>
              </label>
              <input
                id="course-name-input"
                type="text"
                placeholder="E.g. Mount Lofty, West Beach..."
                value={courseName}
                onChange={(e) => setCourseName(e.target.value)}
                className="w-full h-12 px-3.5 placeholder:text-zinc-655 bg-zinc-950 border border-zinc-800 rounded-xl focus:outline-none focus:border-volt text-white text-sm sm:text-base font-bold transition-all focus:ring-1 focus:ring-volt/10"
              />
            </div>

            {/* Presets List (Dynamic course inputs) */}
            {coursePresets.length > 0 && (
              <div className="space-y-2">
                <label className="block text-xs font-bold text-zinc-450 uppercase tracking-wider">
                  Select Recently Played Course
                </label>
                <div className="flex flex-wrap gap-2" id="course-presets-container">
                  {coursePresets.map((presetCourse) => (
                    <button
                      key={presetCourse}
                      type="button"
                      onClick={() => handleSelectPresetCourse(presetCourse)}
                      className={`px-3 py-2 text-xs sm:text-sm rounded-lg transition-all font-sans font-bold border ${
                        courseName.toLowerCase() === presetCourse.toLowerCase()
                          ? "bg-volt border-volt text-black font-black"
                          : "bg-zinc-900 border-zinc-850 text-zinc-300 hover:bg-zinc-805"
                      }`}
                    >
                      {presetCourse}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Holes Count with custom random amount support */}
            <div className="space-y-2">
              <label className="block text-xs sm:text-sm font-extrabold text-zinc-350 uppercase tracking-wider">
                Holes Count
              </label>
              <div className="grid grid-cols-2 gap-2.5" id="holes-selector-group">
                <button
                  type="button"
                  onClick={() => setHolesCount(9)}
                  className={`py-2 px-3.5 font-sans rounded-xl border transition-all flex flex-col items-center justify-center cursor-pointer ${
                    holesCount === 9
                      ? "bg-zinc-900 border-volt text-volt shadow-[0_0_12px_rgba(204,255,0,0.1)]"
                      : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:bg-zinc-900"
                  }`}
                  id="btn-select-9-holes"
                >
                  <span className="text-sm sm:text-base font-black">9 Holes</span>
                  <span className="text-[10px] sm:text-xs font-mono uppercase tracking-widest text-zinc-500 mt-0.5 font-bold">
                    Half Round
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setHolesCount(18)}
                  className={`py-2 px-3.5 font-sans rounded-xl border transition-all flex flex-col items-center justify-center cursor-pointer ${
                    holesCount === 18
                      ? "bg-zinc-900 border-volt text-volt shadow-[0_0_12px_rgba(204,255,0,0.1)]"
                      : "bg-zinc-950 border-zinc-805 text-zinc-400 hover:bg-zinc-900"
                  }`}
                  id="btn-select-18-holes"
                >
                  <span className="text-sm sm:text-base font-black">18 Holes</span>
                  <span className="text-[10px] sm:text-xs font-mono uppercase tracking-widest text-zinc-500 mt-0.5 font-bold">
                    Full Round
                  </span>
                </button>
              </div>

              {/* Random / Custom number level stepper */}
              <div className="flex items-center justify-between p-3 bg-zinc-950 border border-zinc-900 rounded-xl mt-2.5 gap-2">
                <div className="flex flex-col">
                  <span className="text-xs font-extrabold text-white uppercase tracking-wider">Custom Layout</span>
                  <span className="text-[10px] text-zinc-500 font-semibold font-mono">Any random layout count</span>
                </div>
                <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 p-1 rounded-xl shrink-0">
                  <button
                    type="button"
                    onClick={() => setHolesCount((prev) => Math.max(1, prev - 1))}
                    className="w-8 h-8 rounded-lg bg-zinc-950 hover:bg-zinc-800 text-white font-black text-sm flex items-center justify-center transition-colors active:scale-90 select-none cursor-pointer"
                  >
                    ─
                  </button>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={holesCount}
                    onChange={(e) => setHolesCount(Math.max(1, Math.min(100, parseInt(e.target.value, 10) || 1)))}
                    className="w-12 bg-transparent text-center text-sm font-sans font-black text-volt focus:outline-none font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setHolesCount((prev) => Math.min(100, prev + 1))}
                    className="w-8 h-8 rounded-lg bg-zinc-950 hover:bg-zinc-800 text-white font-black text-sm flex items-center justify-center transition-colors active:scale-90 select-none cursor-pointer"
                  >
                    ┼
                  </button>
                </div>
              </div>
            </div>

            {/* Course Mode Selector */}
            <div className="space-y-2 pt-3 border-t border-zinc-900">
              <label className="block text-xs sm:text-sm font-extrabold text-zinc-350 uppercase tracking-wider">
                Select Scoring Style
              </label>
              <div className="grid grid-cols-2 gap-2.5" id="course-mode-selector-group">
                <button
                  type="button"
                  onClick={() => setIsMiniGolf(false)}
                  className={`py-2 px-3 font-sans rounded-xl border transition-all flex flex-col items-center justify-center cursor-pointer ${
                    !isMiniGolf
                      ? "bg-zinc-900 border-volt text-volt"
                      : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:bg-zinc-900"
                  }`}
                  id="btn-select-standard-mode"
                >
                  <span className="text-sm font-black">Standard Golf</span>
                  <span className="text-[10px] sm:text-xs font-mono uppercase tracking-widest text-zinc-500 mt-0.5">
                    Default Par 4s
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsMiniGolf(true)}
                  className={`py-2 px-3 font-sans rounded-xl border transition-all flex flex-col items-center justify-center cursor-pointer ${
                    isMiniGolf
                      ? "bg-[#ccff00] border-[#ccff00] text-black shadow-sm font-black"
                      : "bg-zinc-950 border-zinc-805 text-zinc-300 hover:bg-zinc-900"
                  }`}
                  id="btn-select-minigolf-mode"
                >
                  <span className="text-sm font-black">Mini-Golf ⛳</span>
                  <span className="text-[10px] sm:text-xs font-mono uppercase tracking-widest text-zinc-500 mt-0.5">
                    Default Par 2s
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Player Roster Configuration (Right Side) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="p-4 sm:p-5 bg-cybercard border border-zinc-850 rounded-xl space-y-4 shadow-lg">
            
            <div className="flex items-center justify-between border-b border-zinc-905 pb-3">
              <div className="flex items-center gap-2.5 text-volt">
                <Users className="w-5 h-5 text-volt" />
                <h3 className="font-sans font-black text-white text-base uppercase tracking-wider">Squad roster</h3>
              </div>
              <span className="text-xs font-mono font-bold text-volt bg-zinc-900 border border-zinc-800 px-3 py-1 rounded-full uppercase tracking-wider">
                {players.length} Players Active
              </span>
            </div>

            {/* Manual Entry Form */}
            <form onSubmit={handleAddPlayer} className="space-y-4" id="add-player-form">
              <div className="flex flex-col sm:flex-row gap-2.5">
                <div className="flex-1 space-y-2">
                  <label htmlFor="player-name-input" className="block text-xs sm:text-sm font-extrabold text-zinc-350 uppercase tracking-wider">
                    Add New Player
                  </label>
                  <input
                    id="player-name-input"
                    type="text"
                    required
                    placeholder="Enter player name..."
                    value={newPlayerName}
                    onChange={(e) => setNewPlayerName(e.target.value)}
                    className="w-full h-12 px-3.5 bg-zinc-950 border border-zinc-800 rounded-xl focus:outline-none focus:border-volt text-white text-sm sm:text-base font-bold"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    type="submit"
                    disabled={!newPlayerName.trim()}
                    className="w-full sm:w-auto h-12 px-6 flex items-center justify-center gap-1.5 bg-volt disabled:bg-zinc-800 hover:bg-volt-hover disabled:cursor-not-allowed text-black text-xs sm:text-sm font-black rounded-xl transition-all border border-transparent uppercase cursor-pointer"
                    id="btn-add-player"
                  >
                    <Plus className="w-4 h-4 text-black shrink-0 font-black" />
                    Add Player
                  </button>
                </div>
              </div>
            </form>

            {/* Recent Squad presets list */}
            {recentPlayers.length > 0 && (
              <div className="space-y-2 p-3.5 bg-zinc-950 rounded-xl border border-zinc-900">
                <span className="block text-xs font-bold text-zinc-450 uppercase tracking-wider">
                  Select from Recent Players:
                </span>
                <div className="flex flex-wrap gap-2" id="recent-players-presets-box">
                  {recentPlayers.map((recent) => (
                    <button
                      type="button"
                      key={recent.name}
                      onClick={() => handleSelectRecentPlayer(recent)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm rounded-lg bg-zinc-900 border border-zinc-850 hover:bg-zinc-800 text-zinc-350 hover:text-white text-left transition-all font-semibold font-sans cursor-pointer"
                    >
                      <span className="font-black text-volt text-sm leading-none">+</span>
                      <span>{recent.name}</span>
                      <span 
                        onClick={(e) => handleRemoveRecentPlayer(e, recent.name)}
                        className="text-zinc-500 hover:text-red-500 font-black ml-1 text-base leading-none w-4 h-4 flex items-center justify-center rounded hover:bg-zinc-950"
                        title="Delete Preset"
                      >
                        ×
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Current Selected Players List (accessible, big names) */}
            <div className="space-y-2.5 max-h-[260px] overflow-y-auto pr-1" id="players-list-scroll">
              {players.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 px-4 border border-dashed border-zinc-800 rounded-xl bg-zinc-950/20">
                  <Users className="w-8 h-8 text-zinc-700 mb-1.5" />
                  <p className="text-xs sm:text-sm font-bold text-zinc-500 uppercase tracking-wider">No active players</p>
                  <p className="text-[10px] sm:text-xs text-zinc-650 mt-1 uppercase font-bold font-mono">Add names above to build your squad roster.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <AnimatePresence>
                    {players.map((player) => (
                      <motion.div
                        key={player.id}
                        initial={{ opacity: 0, height: 0, y: -4 }}
                        animate={{ opacity: 1, height: "auto", y: 0 }}
                        exit={{ opacity: 0, height: 0, y: -4 }}
                        className="flex items-center justify-between gap-3 p-3 bg-zinc-950 border border-zinc-900 rounded-xl"
                        id={`player-row-${player.id}`}
                      >
                        <div className="flex items-center gap-2.5 flex-1 min-w-0 pr-2">
                          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 shrink-0 select-none">
                            <User className="w-4 h-4 text-volt" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <input
                              type="text"
                              value={player.name}
                              onChange={(e) => handleUpdateName(player.id, e.target.value)}
                              className="font-sans font-black text-sm sm:text-base text-white bg-transparent border-b border-transparent focus:border-zinc-700 focus:outline-none py-0.5 w-full truncate"
                            />
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemovePlayer(player.id)}
                          className="w-10 h-10 flex items-center justify-center text-red-400 hover:text-red-300 rounded-lg bg-zinc-900 border border-zinc-850 hover:bg-zinc-800 hover:border-red-950/40 transition-all cursor-pointer shrink-0 select-none"
                          aria-label="Remove player"
                        >
                          <Trash2 className="w-4 h-4 text-rose-500" />
                        </button>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Start Button - Action Centered and Human Focused Accent */}
      <div className="pt-3">
        <button
          onClick={handleLaunch}
          disabled={players.length === 0}
          className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-volt disabled:bg-zinc-800 hover:bg-volt-hover disabled:cursor-not-allowed text-black text-sm sm:text-base font-black rounded-xl shadow-[0_0_20px_rgba(204,255,0,0.2)] hover:shadow-[0_0_25px_rgba(204,255,0,0.35)] transition-all select-none active:scale-[0.99] uppercase tracking-wider font-sans cursor-pointer"
          id="btn-start-game"
        >
          <Play className="w-5 h-5 fill-current text-black" />
          <span>START YOUR GAME ⛳</span>
        </button>
      </div>
    </div>
  );
}
