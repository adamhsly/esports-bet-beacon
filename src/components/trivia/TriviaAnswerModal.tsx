import React, { useEffect, useMemo, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Check, X } from "lucide-react";
import { searchPlayers, validatePick, type TriviaClue } from "@/lib/trivia";
import { useDebounce } from "@/hooks/useDebounce";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  esport: string;
  rowClue: TriviaClue | null;
  colClue: TriviaClue | null;
  currentTurnLabel: string;
  onSubmit: (player: { id: number; name: string; image_url?: string | null }) => Promise<{ ok: boolean }>;
}

export const TriviaAnswerModal: React.FC<Props> = ({
  open, onOpenChange, esport, rowClue, colClue, currentTurnLabel, onSubmit,
}) => {
  const [query, setQuery] = useState("");
  const debounced = useDebounce(query, 200);
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<null | { ok: boolean; msg: string }>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) {
      setQuery(""); setResults([]); setFeedback(null);
    } else {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

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
      const valid = await validatePick(p.id, rowClue, colClue);
      const result = await onSubmit({ id: p.id, name: p.name, image_url: p.image_url });
      if (valid && result.ok) {
        setFeedback({ ok: true, msg: `${p.name} claims the square!` });
        setTimeout(() => onOpenChange(false), 800);
      } else {
        setFeedback({ ok: false, msg: `${p.name} doesn't satisfy both clues. Turn passes.` });
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-slate-900 border-slate-700 text-white">
        <DialogHeader>
          <DialogTitle className="text-white text-lg">{title}</DialogTitle>
          <p className="text-xs text-gray-400 mt-1">{currentTurnLabel}'s turn — name a pro who fits BOTH clues</p>
        </DialogHeader>

        <div className="space-y-3">
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search player name…"
            disabled={submitting}
            className="bg-slate-800 border-slate-700 text-white placeholder:text-gray-500"
          />

          {feedback && (
            <div className={`flex items-center gap-2 text-sm rounded-md px-3 py-2 ${
              feedback.ok ? "bg-emerald-500/15 text-emerald-300" : "bg-red-500/15 text-red-300"
            }`}>
              {feedback.ok ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />} {feedback.msg}
            </div>
          )}

          <div className="max-h-72 overflow-y-auto space-y-1">
            {loading && (
              <div className="flex items-center gap-2 text-gray-400 text-sm py-3">
                <Loader2 className="h-4 w-4 animate-spin" /> Searching…
              </div>
            )}
            {!loading && debounced.length >= 2 && results.length === 0 && (
              <div className="text-gray-500 text-sm py-3">No players found.</div>
            )}
            {results.map((p) => (
              <button
                key={p.id}
                onClick={() => handlePick(p)}
                disabled={submitting}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-slate-800 text-left transition-colors disabled:opacity-50"
              >
                <div className="h-8 w-8 rounded-full bg-slate-700 overflow-hidden flex-shrink-0">
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
