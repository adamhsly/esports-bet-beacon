import React, { useEffect, useMemo, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Check, X, Timer } from "lucide-react";
import { searchPlayers, type TriviaClue } from "@/lib/trivia";
import { useDebounce } from "@/hooks/useDebounce";
import { triviaSfx } from "@/utils/triviaSfx";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  esport: string;
  rowClue: TriviaClue | null;
  colClue: TriviaClue | null;
  currentTurnLabel: string;
  currentTurnMark: "X" | "O";
  /** Optional countdown in seconds. When it elapses, modal auto-closes (turn passes). */
  turnSeconds?: number;
  onSubmit: (player: { id: number; name: string; image_url?: string | null; nationality?: string | null; current_team_name?: string | null }) => Promise<{ ok: boolean }>;
  /** Called when the timer hits 0 with no submission. */
  onTimeout?: () => void;
}

export const TriviaAnswerModal: React.FC<Props> = ({
  open, onOpenChange, esport, rowClue, colClue,
  currentTurnLabel, currentTurnMark, turnSeconds, onSubmit, onTimeout,
}) => {
  const [query, setQuery] = useState("");
  const debounced = useDebounce(query, 200);
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<null | { ok: boolean; msg: string }>(null);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(turnSeconds ?? null);
  const inputRef = useRef<HTMLInputElement>(null);
  const tickedRef = useRef(false);

  // Reset state on open/close
  useEffect(() => {
    if (!open) {
      setQuery(""); setResults([]); setFeedback(null); setSubmitting(false);
      setSecondsLeft(turnSeconds ?? null);
      tickedRef.current = false;
    } else {
      setSecondsLeft(turnSeconds ?? null);
      // Focus input shortly after open animation
      setTimeout(() => inputRef.current?.focus(), 120);
    }
  }, [open, turnSeconds]);

  // Countdown
  useEffect(() => {
    if (!open || turnSeconds == null || submitting || feedback) return;
    if (secondsLeft == null) return;
    if (secondsLeft <= 0) {
      if (!tickedRef.current) {
        tickedRef.current = true;
        triviaSfx.timeout();
        onTimeout?.();
        onOpenChange(false);
      }
      return;
    }
    const id = window.setTimeout(() => {
      // Subtle tick in last 5 seconds
      if (secondsLeft <= 5) triviaSfx.tick();
      setSecondsLeft((s) => (s == null ? s : s - 1));
    }, 1000);
    return () => window.clearTimeout(id);
  }, [open, secondsLeft, turnSeconds, submitting, feedback, onTimeout, onOpenChange]);

  // Player search
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!open || debounced.trim().length < 2) { setResults([]); return; }
      setLoading(true);
      try {
        const r = await searchPlayers(esport, debounced.trim());
        if (!cancelled) setResults(r);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [debounced, esport, open]);

  const handlePick = async (p: any) => {
    if (submitting || !rowClue || !colClue) return;
    setSubmitting(true);
    setFeedback(null);
    try {
      const result = await onSubmit({ id: p.id, name: p.name, image_url: p.image_url, nationality: p.nationality, current_team_name: p.current_team_name });
      if (result.ok) {
        triviaSfx.correct();
        setFeedback({ ok: true, msg: `Correct! ${p.name} claims the square.` });
        setTimeout(() => onOpenChange(false), 700);
      } else {
        triviaSfx.incorrect();
        setFeedback({ ok: false, msg: `Incorrect — ${p.name} doesn't fit both clues. Turn passes.` });
        setTimeout(() => onOpenChange(false), 1100);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const title = useMemo(() => {
    if (!rowClue || !colClue) return "Pick a player";
    return `${rowClue.label}  ×  ${colClue.label}`;
  }, [rowClue, colClue]);

  const markColor = currentTurnMark === "X" ? "text-emerald-400" : "text-violet-400";
  const timerPct = turnSeconds && secondsLeft != null
    ? Math.max(0, Math.min(100, (secondsLeft / turnSeconds) * 100))
    : 100;
  const timerLow = secondsLeft != null && secondsLeft <= 5;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-slate-900 border-slate-700 text-white p-4 sm:p-6 animate-scale-in">
        <DialogHeader>
          <DialogTitle className="text-white text-lg flex items-center gap-2">
            <span className={`text-2xl font-black ${markColor}`}>{currentTurnMark}</span>
            <span className="leading-tight">{title}</span>
          </DialogTitle>
          <p className="text-xs text-gray-400 mt-1">
            {currentTurnLabel}'s turn — name a pro who fits BOTH clues
          </p>
        </DialogHeader>

        {/* Countdown bar */}
        {turnSeconds != null && (
          <div className="mb-1">
            <div className="flex items-center justify-between text-[11px] mb-1">
              <span className={`flex items-center gap-1 ${timerLow ? "text-red-300" : "text-gray-400"}`}>
                <Timer className="h-3 w-3" />
                {secondsLeft ?? turnSeconds}s
              </span>
              <span className="text-gray-500">Turn timer</span>
            </div>
            <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-1000 ease-linear ${
                  timerLow ? "bg-red-500" : "bg-emerald-500"
                }`}
                style={{ width: `${timerPct}%` }}
              />
            </div>
          </div>
        )}

        <div className="space-y-3">
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search player name…"
            disabled={submitting || !!feedback}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            inputMode="search"
            enterKeyHint="search"
            className="bg-slate-800 border-slate-700 text-white placeholder:text-gray-500 h-12 text-base"
          />

          {feedback && (
            <div
              role="status"
              aria-live="polite"
              className={`flex items-center gap-2 text-sm rounded-md px-3 py-2 border animate-fade-in ${
                feedback.ok
                  ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/40"
                  : "bg-red-500/15 text-red-300 border-red-500/40"
              }`}
            >
              {feedback.ok ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />} {feedback.msg}
            </div>
          )}

          <div className="max-h-72 overflow-y-auto space-y-1 -mx-1 px-1">
            {loading && (
              <div className="flex items-center gap-2 text-gray-400 text-sm py-3">
                <Loader2 className="h-4 w-4 animate-spin" /> Searching…
              </div>
            )}
            {submitting && (
              <div className="flex items-center gap-2 text-gray-300 text-sm py-3 animate-fade-in">
                <Loader2 className="h-4 w-4 animate-spin" /> Validating answer…
              </div>
            )}
            {!loading && !submitting && debounced.length >= 2 && results.length === 0 && (
              <div className="text-gray-500 text-sm py-3">No players found. Only verified pros can be submitted.</div>
            )}
            {!submitting && results.map((p) => (
              <button
                key={p.id}
                onClick={() => handlePick(p)}
                disabled={submitting || !!feedback}
                className="w-full flex items-center gap-3 px-3 py-3 sm:py-2 rounded-md hover:bg-slate-800 active:bg-slate-700 text-left transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[52px]"
              >
                <div className="h-9 w-9 rounded-full bg-slate-700 overflow-hidden flex-shrink-0">
                  {p.image_url && (
                    <img src={p.image_url} alt={p.name} className="h-full w-full object-cover" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium truncate">{p.name}</div>
                  <div className="text-xs text-gray-400 truncate">
                    {[p.current_team_name, p.nationality].filter(Boolean).join(" · ")}
                  </div>
                </div>
              </button>
            ))}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
