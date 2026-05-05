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
import { Loader2, Users, User, Settings, ChevronLeft } from "lucide-react";
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

import counterStrike2Logo from "@/assets/logos/esports/counter-strike-2.png";
import leagueOfLegendsLogo from "@/assets/logos/esports/league-of-legends.png";
import dota2Logo from "@/assets/logos/esports/dota-2.png";
import valorantLogo from "@/assets/logos/esports/valorant.png";
import rainbowSixSiegeLogo from "@/assets/logos/esports/rainbow-six-siege.png";
import rocketLeagueLogo from "@/assets/logos/esports/rocket-league.png";
import overwatchLogo from "@/assets/logos/esports/overwatch.png";
import callOfDutyLogo from "@/assets/logos/esports/call-of-duty.png";
import modeSoloImg from "@/assets/trivia/mode-solo.png";
import mode2pImg from "@/assets/trivia/mode-2p.png";

type TriviaEsport = (typeof TRIVIA_ESPORTS)[number];

const GAME_TILES: { value: TriviaEsport; label: string; logo: string }[] = [
  { value: "Counter-Strike", label: "Counter-Strike 2", logo: counterStrike2Logo },
  { value: "LoL", label: "League of Legends", logo: leagueOfLegendsLogo },
  { value: "Valorant", label: "Valorant", logo: valorantLogo },
  { value: "Dota 2", label: "Dota 2", logo: dota2Logo },
  { value: "Rainbow 6 Siege", label: "Rainbow Six Siege", logo: rainbowSixSiegeLogo },
  { value: "Rocket League", label: "Rocket League", logo: rocketLeagueLogo },
  { value: "Overwatch", label: "Overwatch", logo: overwatchLogo },
  { value: "Call of Duty", label: "Call of Duty", logo: callOfDutyLogo },
];

const TriviaPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const presetTemplateId = searchParams.get("templateId") ?? undefined;

  const [esport, setEsport] = useState<TriviaEsport | null>(null);
  const [mode, setMode] = useState<"solo" | "two_player">("solo");
  const [loading, setLoading] = useState(false);
  const [templates, setTemplates] = useState<TriviaGridTemplateRow[]>([]);
  const [templateId, setTemplateId] = useState<string | undefined>(presetTemplateId);
  const { data: isAdmin } = useIsAdmin();

  useEffect(() => {
    if (!esport) {
      setTemplates([]);
      return;
    }
    listGridTemplates(esport)
      .then((rows) => setTemplates(rows.filter((r) => r.is_active)))
      .catch(() => setTemplates([]));
  }, [esport]);

  const handleStart = async () => {
    if (!esport) return;
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

  const selectedTile = esport ? GAME_TILES.find((t) => t.value === esport) : null;

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
      <main className="container mx-auto px-4 py-6 max-w-5xl">
        {esport && (
          <div className="mb-4 flex">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setEsport(null);
                setTemplateId(undefined);
              }}
              className="border-slate-700 bg-slate-800/60 text-gray-200 hover:bg-slate-700 hover:text-white"
            >
              <ChevronLeft className="h-4 w-4 mr-1" /> Back to games
            </Button>
          </div>
        )}

        <header className="mb-6 text-center">
          <div className="flex items-start justify-center gap-3 relative">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">Esports Trivia Grid</h1>
              <p className="text-gray-400 text-sm mt-1">
                A 3×3 board. Each square needs a pro player who fits BOTH the row clue AND the column clue.
                First to three in a row wins.
              </p>
            </div>
            {isAdmin && (
              <Button
                size="sm"
                variant="outline"
                className="border-slate-700 bg-slate-800/60 text-gray-200 hover:bg-slate-700 hover:text-white shrink-0 absolute right-0 top-0"
                onClick={() => navigate("/admin/trivia")}
              >
                <Settings className="h-4 w-4 mr-1" /> Manage clues
              </Button>
            )}
          </div>
        </header>

        {/* Step 1: Game selection */}
        {!esport ? (
          <section className="text-center">
            <h2 className="text-lg font-semibold mb-5">Pick a game to get started</h2>

            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
              {GAME_TILES.map((tile) => (
                <button
                  key={tile.value}
                  onClick={() => setEsport(tile.value)}
                  className={cn(
                    "group relative flex flex-col items-center justify-center gap-2 p-3",
                    "rounded-xl transition-all duration-[250ms] ease-in-out",
                    "h-32 lg:h-36",
                    "bg-gradient-to-b from-[#2B2F3A] to-[#1B1F28]",
                    "shadow-[0_4px_15px_rgba(0,0,0,0.4)]",
                    "border-2 border-transparent",
                    "before:absolute before:inset-0 before:rounded-xl before:border before:border-white/10 before:pointer-events-none",
                    "focus:outline-none touch-manipulation select-none",
                    "hover:translate-y-[-3px] hover:scale-[1.02] hover:border-[#965AFF] hover:shadow-[0_0_20px_rgba(150,90,255,0.4),0_4px_15px_rgba(0,0,0,0.4)]"
                  )}
                  aria-label={`Play ${tile.label} trivia`}
                  title={tile.label}
                >
                  <img
                    src={tile.logo}
                    alt={tile.label}
                    className="w-16 h-16 object-contain"
                    draggable={false}
                  />
                  <span className="text-[11px] font-medium text-[#E8EAF5] text-center leading-tight line-clamp-2">
                    {tile.label}
                  </span>
                </button>
              ))}
            </div>
          </section>
        ) : (
          /* Step 2: Mode selection */
          <Card className="bg-slate-900/60 border-slate-700 p-5 space-y-6 max-w-3xl mx-auto">
            {selectedTile && (
              <div className="flex items-center justify-center gap-3">
                <img src={selectedTile.logo} alt="" className="w-10 h-10 object-contain" />
                <div>
                  <div className="text-xs uppercase tracking-wide text-gray-400">Selected game</div>
                  <div className="font-semibold">{selectedTile.label}</div>
                </div>
              </div>
            )}

            <div>
              <h3 className="text-sm font-semibold text-gray-300 mb-2 uppercase tracking-wide">Choose mode</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={() => setMode("solo")}
                  className={cn(
                    "p-4 rounded-lg border text-center transition-colors flex flex-col items-center",
                    mode === "solo"
                      ? "bg-theme-purple/10 border-theme-purple"
                      : "bg-slate-800/60 border-slate-700 hover:border-slate-600"
                  )}
                >
                  <div className="h-24 w-24 rounded-full mb-2 flex items-center justify-center bg-gradient-to-br from-theme-purple/30 to-slate-950 ring-1 ring-white/10 shadow-[0_0_24px_-6px_rgba(150,90,255,0.5)]">
                    <img
                      src={modeSoloImg}
                      alt=""
                      loading="lazy"
                      width={512}
                      height={512}
                      className="h-20 w-20 object-contain"
                    />
                  </div>
                  <div className="flex items-center justify-center gap-2 font-semibold text-white">
                    <User className="h-4 w-4" /> Solo practice
                  </div>
                  <p className="text-xs text-gray-400 mt-1">Fill the grid yourself. No turns, no opponent.</p>
                </button>
                <button
                  onClick={() => setMode("two_player")}
                  className={cn(
                    "p-4 rounded-lg border text-center transition-colors flex flex-col items-center",
                    mode === "two_player"
                      ? "bg-theme-purple/10 border-theme-purple"
                      : "bg-slate-800/60 border-slate-700 hover:border-slate-600"
                  )}
                >
                  <div className="h-24 w-24 rounded-full mb-2 flex items-center justify-center bg-gradient-to-br from-theme-purple/30 to-slate-950 ring-1 ring-white/10 shadow-[0_0_24px_-6px_rgba(150,90,255,0.5)]">
                    <img
                      src={mode2pImg}
                      alt=""
                      loading="lazy"
                      width={512}
                      height={512}
                      className="h-20 w-20 object-contain"
                    />
                  </div>
                  <div className="flex items-center justify-center gap-2 font-semibold text-white">
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
        )}

        <div className="mt-6 text-xs text-gray-500">
          Tip: Boards are generated to be solvable — every cell has at least one valid pro player.
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default TriviaPage;
