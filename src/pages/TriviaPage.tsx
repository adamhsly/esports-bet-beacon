import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import SearchableNavbar from "@/components/SearchableNavbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Users, User, Sparkles, Settings } from "lucide-react";
import {
  TRIVIA_ESPORTS,
  generateBoard,
  createSession,
  listGridTemplates,
  type TriviaGridTemplateRow,
} from "@/lib/trivia";
import { toast } from "sonner";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { cn } from "@/lib/utils";

const TriviaPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const presetTemplateId = searchParams.get("templateId") ?? undefined;

  const [esport, setEsport] = useState<string>("Counter-Strike");
  const [mode, setMode] = useState<"solo" | "two_player">("solo");
  const [loading, setLoading] = useState(false);
  const [templates, setTemplates] = useState<TriviaGridTemplateRow[]>([]);
  const [templateId, setTemplateId] = useState<string | undefined>(presetTemplateId);
  const { data: isAdmin } = useIsAdmin();

  useEffect(() => {
    listGridTemplates(esport)
      .then((rows) => setTemplates(rows.filter((r) => r.is_active)))
      .catch(() => setTemplates([]));
  }, [esport]);

  const handleStart = async () => {
    setLoading(true);
    try {
      const board = await generateBoard(esport, { templateId });
      const session = await createSession({ mode, esport, board });
      navigate(`/trivia/${session.id}`);
    } catch (e: any) {
      const snapshot = e?.snapshot;
      const description = snapshot
        ? Object.entries(snapshot)
            .filter(([k]) => k !== "requestId")
            .map(([k, v]) => `${k}: ${typeof v === "object" ? JSON.stringify(v) : v}`)
            .join(" · ")
        : undefined;
      console.error("[trivia] handleStart failed", { message: e?.message, snapshot, requestId: e?.requestId });
      toast.error(e?.message ?? "Could not start a game", description ? { description } : undefined);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <Helmet>
        <title>Esports Trivia Grid | Frags & Fortunes</title>
        <meta
          name="description"
          content="Play the 3×3 esports trivia grid. Name a pro player who fits both clues. Solo or same-screen 2-player. Free to play."
        />
        <link rel="canonical" href="https://frags-and-fortunes.lovable.app/trivia" />
      </Helmet>
      <SearchableNavbar />
      <main className="container mx-auto px-4 py-6 max-w-3xl">
        <header className="mb-6">
          <div className="inline-flex items-center gap-2 text-theme-purple text-xs font-semibold uppercase tracking-wider">
            <Sparkles className="h-3.5 w-3.5" /> New
          </div>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold mt-1">Esports Trivia Grid</h1>
              <p className="text-gray-400 text-sm mt-1">
                A 3×3 board. Each square needs a pro player who fits BOTH the row clue AND the column clue.
                First to three in a row wins.
              </p>
            </div>
            {isAdmin && (
              <Button
                size="sm"
                variant="outline"
                className="border-slate-700 bg-slate-800/60 text-gray-200 hover:bg-slate-700 hover:text-white shrink-0"
                onClick={() => navigate("/admin/trivia")}
              >
                <Settings className="h-4 w-4 mr-1" /> Manage clues
              </Button>
            )}
          </div>
        </header>

        <Card className="bg-slate-900/60 border-slate-700 p-5 space-y-6">
          {/* Esport */}
          <div>
            <h3 className="text-sm font-semibold text-gray-300 mb-2 uppercase tracking-wide">Choose esport</h3>
            <div className="flex flex-wrap gap-2">
              {TRIVIA_ESPORTS.map((e) => (
                <button
                  key={e}
                  onClick={() => setEsport(e)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-sm border transition-colors",
                    esport === e
                      ? "bg-theme-purple/20 border-theme-purple text-white"
                      : "bg-slate-800/60 border-slate-700 text-gray-300 hover:border-slate-600"
                  )}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          {/* Mode */}
          <div>
            <h3 className="text-sm font-semibold text-gray-300 mb-2 uppercase tracking-wide">Choose mode</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={() => setMode("solo")}
                className={cn(
                  "p-4 rounded-lg border text-left transition-colors",
                  mode === "solo"
                    ? "bg-theme-purple/10 border-theme-purple"
                    : "bg-slate-800/60 border-slate-700 hover:border-slate-600"
                )}
              >
                <div className="flex items-center gap-2 font-semibold">
                  <User className="h-4 w-4" /> Solo practice
                </div>
                <p className="text-xs text-gray-400 mt-1">Fill the grid yourself. No turns, no opponent.</p>
              </button>
              <button
                onClick={() => setMode("two_player")}
                className={cn(
                  "p-4 rounded-lg border text-left transition-colors",
                  mode === "two_player"
                    ? "bg-theme-purple/10 border-theme-purple"
                    : "bg-slate-800/60 border-slate-700 hover:border-slate-600"
                )}
              >
                <div className="flex items-center gap-2 font-semibold">
                  <Users className="h-4 w-4" /> Same-screen 2P
                </div>
                <p className="text-xs text-gray-400 mt-1">Pass the device. Get 3 in a row to win.</p>
              </button>
            </div>
          </div>

          {templates.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-300 mb-2 uppercase tracking-wide">
                Grid template (optional)
              </h3>
              <Select
                value={templateId ?? "__random"}
                onValueChange={(v) => setTemplateId(v === "__random" ? undefined : v)}
              >
                <SelectTrigger className="bg-slate-950 border-slate-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-700">
                  <SelectItem value="__random">Random (auto-generated)</SelectItem>
                  {templates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <Button
            onClick={handleStart}
            disabled={loading}
            className="w-full bg-theme-purple hover:bg-theme-purple/90 text-white font-semibold h-11"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generating board…
              </>
            ) : (
              "Start game"
            )}
          </Button>
        </Card>

        <div className="mt-6 text-xs text-gray-500">
          Tip: Boards are generated to be solvable — every cell has at least one valid pro player.
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default TriviaPage;
