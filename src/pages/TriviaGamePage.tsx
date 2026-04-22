import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import SearchableNavbar from "@/components/SearchableNavbar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChevronLeft, RotateCw, Trophy, Loader2 } from "lucide-react";
import {
  checkWinner, getSession, persistMove, updateSession, validatePick,
  type TriviaCell, type TriviaSession, type WinResult,
} from "@/lib/trivia";
import { TriviaAnswerModal } from "@/components/trivia/TriviaAnswerModal";
import { toast } from "sonner";

const markFor = (who?: "p1" | "p2") => (who === "p1" ? "X" : who === "p2" ? "O" : null);

const TriviaGamePage: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const [session, setSession] = useState<TriviaSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [picking, setPicking] = useState<{ r: number; c: number } | null>(null);
  const [winLine, setWinLine] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!sessionId) return;
    (async () => {
      try {
        const s = await getSession(sessionId);
        if (!s) { toast.error("Session not found"); navigate("/trivia"); return; }
        setSession(s);
        // Recompute win line on load (in case of refresh)
        const w = checkWinner(s.cells);
        if (w && w.winner !== "draw") setWinLine(new Set(w.line.map(([r, c]) => `${r}-${c}`)));
      } catch (e: any) {
        toast.error(e?.message ?? "Failed to load game");
      } finally {
        setLoading(false);
      }
    })();
  }, [sessionId, navigate]);

  const currentLabel = useMemo(() => {
    if (!session) return "";
    return session.current_turn === "p1" ? session.player1_label : session.player2_label;
  }, [session]);

  const handleSubmit = async (player: { id: number; name: string; image_url?: string | null }) => {
    if (!session || !picking) return { ok: false };
    const { r, c } = picking;
    // Defensive: never overwrite a claimed square
    if (session.cells[r][c]) {
      toast.error("That square is already claimed.");
      return { ok: false };
    }
    const row = session.board.rowClues[r];
    const col = session.board.colClues[c];
    const valid = await validatePick(player.id, row, col);
    const claimer = session.current_turn;

    const newCells = session.cells.map((row) => row.slice()) as TriviaCell[][];
    if (valid) {
      newCells[r][c] = {
        player_id: player.id,
        player_name: player.name,
        player_image: player.image_url ?? null,
        claimed_by: claimer,
        at: new Date().toISOString(),
      };
    }

    // Solo mode never switches turn; 2P always switches
    const nextTurn: "p1" | "p2" =
      session.mode === "solo" ? "p1" : claimer === "p1" ? "p2" : "p1";

    let win: WinResult = checkWinner(newCells);
    let status: TriviaSession["status"] = "in_progress";
    let winnerCode: TriviaSession["winner"] = null;

    if (session.mode === "solo") {
      // Solo = no winner concept; complete when board fills
      const allFilled = newCells.every((row) => row.every((cell) => cell));
      if (allFilled) { status = "draw"; winnerCode = "draw"; }
    } else if (win) {
      status = win.winner === "draw" ? "draw" : "won";
      winnerCode = win.winner;
      if (win.winner !== "draw") {
        setWinLine(new Set(win.line.map(([rr, cc]) => `${rr}-${cc}`)));
      }
    }

    // Fire DB writes in parallel
    await Promise.all([
      persistMove({
        session_id: session.id,
        row_idx: r, col_idx: c,
        player_id: player.id, player_name: player.name,
        claimed_by: claimer, was_correct: valid,
      }),
      updateSession(session.id, {
        cells: newCells,
        current_turn: nextTurn,
        status,
        winner: winnerCode as any,
        finished_at: status !== "in_progress" ? new Date().toISOString() : null,
      }),
    ]);

    setSession({
      ...session,
      cells: newCells,
      current_turn: nextTurn,
      status,
      winner: winnerCode,
    });

    // Toast the outcome (in addition to in-modal feedback)
    if (valid) {
      toast.success(`${player.name} claims ${row.label} × ${col.label}`);
    } else {
      toast.error(`${player.name} doesn't fit — turn passes`);
    }

    return { ok: valid };
  };

  const handleRestart = () => navigate("/trivia");

  if (loading) {
    return (
      <div className="min-h-screen bg-theme-gray-dark text-white">
        <SearchableNavbar />
        <div className="container mx-auto px-4 py-12 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      </div>
    );
  }
  if (!session) return null;

  const { rowClues, colClues } = session.board;
  const cells = session.cells;
  const isFinished = session.status !== "in_progress";
  const currentMark: "X" | "O" = session.current_turn === "p1" ? "X" : "O";

  const cellStyle = (cell: TriviaCell, isWinning: boolean) => {
    if (cell?.claimed_by === "p1") {
      return `bg-emerald-500/15 border-emerald-500/60 ${isWinning ? "ring-2 ring-emerald-400 shadow-[0_0_24px_-4px_rgba(16,185,129,0.6)]" : ""}`;
    }
    if (cell?.claimed_by === "p2") {
      return `bg-violet-500/15 border-violet-500/60 ${isWinning ? "ring-2 ring-violet-400 shadow-[0_0_24px_-4px_rgba(139,92,246,0.6)]" : ""}`;
    }
    return "bg-slate-800/40 border-slate-700 hover:border-slate-500";
  };

  // Score (correct claims per player) — quick read from cells
  const score = { p1: 0, p2: 0 };
  cells.forEach((row) => row.forEach((cell) => {
    if (cell?.claimed_by === "p1") score.p1++;
    if (cell?.claimed_by === "p2") score.p2++;
  }));

  return (
    <div className="min-h-screen bg-theme-gray-dark text-white">
      <SearchableNavbar />
      <main className="container mx-auto px-4 py-4 max-w-2xl">
        <div className="mb-4 flex">
          <Button
            variant="outline" size="sm"
            className="border-slate-700 bg-slate-800/60 text-gray-200 hover:bg-slate-700 hover:text-white"
            onClick={() => navigate("/trivia")}
          >
            <ChevronLeft className="h-4 w-4 mr-1" /> Back to lobby
          </Button>
        </div>

        <div className="mb-3 flex items-center justify-between">
          <div>
            <div className="text-xs text-gray-400 uppercase tracking-wider">
              {session.esport} · {session.mode === "solo" ? "Solo" : "2 Player"}
            </div>
            {!isFinished && (
              <div className="text-base font-semibold mt-0.5 flex items-center gap-2">
                <span className={`text-xl font-black ${session.current_turn === "p1" ? "text-emerald-400" : "text-violet-400"}`}>
                  {currentMark}
                </span>
                <span className={session.current_turn === "p1" ? "text-emerald-400" : "text-violet-400"}>
                  {currentLabel}
                </span>
                <span className="text-gray-400 font-normal">to play</span>
              </div>
            )}
            {isFinished && (
              <div className="text-base font-semibold mt-0.5 flex items-center gap-2">
                <Trophy className="h-4 w-4 text-yellow-400" />
                {session.winner === "draw"
                  ? (session.mode === "solo" ? "Board complete!" : "Game over — draw!")
                  : `${session.winner === "p1" ? session.player1_label : session.player2_label} wins!`}
              </div>
            )}
          </div>
          <Button size="sm" variant="ghost" onClick={handleRestart} className="text-gray-300">
            <RotateCw className="h-4 w-4 mr-1" /> New game
          </Button>
        </div>

        {/* Board */}
        <Card className="bg-slate-900/60 border-slate-700 p-3">
          <div className="grid grid-cols-[minmax(70px,90px)_repeat(3,minmax(0,1fr))] gap-2">
            <div />
            {colClues.map((c, i) => (
              <div
                key={`col-${i}`}
                className="text-center text-xs sm:text-sm font-semibold text-gray-200 bg-slate-800/70 border border-slate-700 rounded-md p-2 flex items-center justify-center min-h-[56px]"
              >
                {c.label}
              </div>
            ))}

            {rowClues.map((rowClue, r) => (
              <React.Fragment key={`row-${r}`}>
                <div className="text-xs sm:text-sm font-semibold text-gray-200 bg-slate-800/70 border border-slate-700 rounded-md p-2 flex items-center justify-center min-h-[80px] text-center">
                  {rowClue.label}
                </div>
                {colClues.map((_col, c) => {
                  const cell = cells[r][c];
                  const mark = markFor(cell?.claimed_by);
                  const isWinning = winLine.has(`${r}-${c}`);
                  return (
                    <button
                      key={`cell-${r}-${c}`}
                      disabled={!!cell || isFinished}
                      onClick={() => setPicking({ r, c })}
                      aria-label={
                        cell
                          ? `Claimed by ${cell.claimed_by === "p1" ? "X" : "O"} with ${cell.player_name}`
                          : `Empty square ${rowClue.label} by ${_col.label}`
                      }
                      className={`relative rounded-md border aspect-square min-h-[80px] flex flex-col items-center justify-center text-center p-1 transition-all ${cellStyle(cell, isWinning)} ${(!cell && !isFinished) ? "cursor-pointer" : "cursor-default"}`}
                    >
                      {/* X / O marker badge */}
                      {mark && (
                        <div
                          className={`absolute top-1 right-1 text-[10px] sm:text-xs font-black px-1.5 py-0.5 rounded ${
                            mark === "X" ? "bg-emerald-500/30 text-emerald-200" : "bg-violet-500/30 text-violet-200"
                          }`}
                        >
                          {mark}
                        </div>
                      )}

                      {cell ? (
                        <>
                          {cell.player_image ? (
                            <img src={cell.player_image} alt={cell.player_name} className="h-8 w-8 sm:h-10 sm:w-10 rounded-full object-cover mb-1" />
                          ) : (
                            <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-slate-700 mb-1" />
                          )}
                          <div className="text-[10px] sm:text-xs font-medium leading-tight line-clamp-2">{cell.player_name}</div>
                        </>
                      ) : (
                        <span className="text-gray-500 text-xs">Tap to pick</span>
                      )}
                    </button>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
        </Card>

        {/* Score / Legend */}
        {session.mode === "two_player" && (
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div className={`flex items-center justify-between bg-slate-900/40 border rounded-md p-3 ${
              session.current_turn === "p1" && !isFinished ? "border-emerald-500" : "border-slate-700"
            }`}>
              <div className="flex items-center gap-2">
                <span className="text-lg font-black text-emerald-400">X</span>
                <span className="text-emerald-300 font-medium">{session.player1_label}</span>
              </div>
              <span className="text-emerald-200 font-semibold">{score.p1}</span>
            </div>
            <div className={`flex items-center justify-between bg-slate-900/40 border rounded-md p-3 ${
              session.current_turn === "p2" && !isFinished ? "border-violet-500" : "border-slate-700"
            }`}>
              <div className="flex items-center gap-2">
                <span className="text-lg font-black text-violet-400">O</span>
                <span className="text-violet-300 font-medium">{session.player2_label}</span>
              </div>
              <span className="text-violet-200 font-semibold">{score.p2}</span>
            </div>
          </div>
        )}

        {isFinished && (
          <div className="mt-4">
            <Button onClick={handleRestart} className="w-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold">
              Play again
            </Button>
          </div>
        )}
      </main>

      <TriviaAnswerModal
        open={!!picking}
        onOpenChange={(o) => !o && setPicking(null)}
        esport={session.esport}
        rowClue={picking ? rowClues[picking.r] : null}
        colClue={picking ? colClues[picking.c] : null}
        currentTurnLabel={currentLabel}
        currentTurnMark={currentMark}
        onSubmit={handleSubmit}
      />
    </div>
  );
};

export default TriviaGamePage;
