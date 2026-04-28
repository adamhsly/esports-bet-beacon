import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import SearchableNavbar from "@/components/SearchableNavbar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, Loader2, Plus, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { supabase } from "@/integrations/supabase/client";
import {
  TRIVIA_ESPORTS,
  listClues,
  upsertClue,
  deleteClue,
  listGridTemplates,
  upsertGridTemplate,
  deleteGridTemplate,
  findDuplicateClue,
  matchesCanonicalTemplate,
  canonicalTemplateHint,
  normalizeClueLabel,
  countBakedBoards,
  bakeBoards,
  type TriviaClueRow,
  type TriviaGridTemplateRow,
} from "@/lib/trivia";

const CLUE_TYPES: TriviaClueRow["clue_type"][] = [
  "team",
  "nationality",
  "tournament",
  "role",
  "attribute",
];

const TriviaAdminPage: React.FC = () => {
  const navigate = useNavigate();
  const { data: isAdmin, isLoading: adminLoading } = useIsAdmin();

  const [esport, setEsport] = useState<string>("Counter-Strike");
  const [clues, setClues] = useState<TriviaClueRow[]>([]);
  const [templates, setTemplates] = useState<TriviaGridTemplateRow[]>([]);
  const [loading, setLoading] = useState(true);

  // New-clue form
  const [nLabel, setNLabel] = useState("");
  const [nType, setNType] = useState<TriviaClueRow["clue_type"]>("team");
  const [nValue, setNValue] = useState("");
  const [savingClue, setSavingClue] = useState(false);

  // Template builder
  const [tplName, setTplName] = useState("");
  const [rowIds, setRowIds] = useState<string[]>(["", "", ""]);
  const [colIds, setColIds] = useState<string[]>(["", "", ""]);
  const [savingTpl, setSavingTpl] = useState(false);

  // Auto generation
  const [generating, setGenerating] = useState(false);
  const [genResult, setGenResult] = useState<any>(null);
  const [genMaxBoards, setGenMaxBoards] = useState<number>(20);

  const reload = async () => {
    setLoading(true);
    try {
      const [c, t] = await Promise.all([listClues(esport), listGridTemplates(esport)]);
      setClues(c);
      setTemplates(t);
    } catch (e: any) {
      toast.error(e?.message ?? "Could not load");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [esport, isAdmin]);

  const activeClues = useMemo(() => clues.filter((c) => c.is_active), [clues]);

  const handleAddClue = async () => {
    const label = nLabel.trim();
    const value = nValue.trim();
    if (!label || !value) {
      toast.error("Label and value are required");
      return;
    }
    if (!matchesCanonicalTemplate(label, nType)) {
      toast.error(`Label must match canonical template: "${canonicalTemplateHint(nType)}"`);
      return;
    }
    setSavingClue(true);
    try {
      const dup = await findDuplicateClue({ esport, clue_type: nType, clue_value: value, label });
      if (dup) {
        toast.error(
          dup.match_kind === "exact"
            ? `Exact duplicate of existing clue "${dup.label}"`
            : `Near-duplicate of "${dup.label}" (normalizes to "${dup.normalized_label}")`,
        );
        setSavingClue(false);
        return;
      }
      await upsertClue({
        label,
        clue_type: nType,
        clue_value: value,
        esport,
        is_active: true,
      });
      setNLabel("");
      setNValue("");
      toast.success("Clue added");
      reload();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to save clue");
    } finally {
      setSavingClue(false);
    }
  };

  const toggleActive = async (clue: TriviaClueRow) => {
    try {
      await upsertClue({ ...clue, is_active: !clue.is_active });
      reload();
    } catch (e: any) {
      toast.error(e?.message ?? "Update failed");
    }
  };

  const handleDeleteClue = async (id: string) => {
    if (!confirm("Delete this clue? Templates that reference it will break.")) return;
    try {
      await deleteClue(id);
      reload();
    } catch (e: any) {
      toast.error(e?.message ?? "Delete failed");
    }
  };

  const handleSaveTemplate = async () => {
    if (!tplName.trim()) {
      toast.error("Template name required");
      return;
    }
    if (rowIds.some((x) => !x) || colIds.some((x) => !x)) {
      toast.error("Pick 3 row clues and 3 column clues");
      return;
    }
    setSavingTpl(true);
    try {
      await upsertGridTemplate({
        name: tplName.trim(),
        esport,
        row_clue_ids: rowIds,
        col_clue_ids: colIds,
        is_active: true,
      });
      setTplName("");
      setRowIds(["", "", ""]);
      setColIds(["", "", ""]);
      toast.success("Template saved");
      reload();
    } catch (e: any) {
      toast.error(e?.message ?? "Save failed");
    } finally {
      setSavingTpl(false);
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm("Delete this template?")) return;
    try {
      await deleteGridTemplate(id);
      reload();
    } catch (e: any) {
      toast.error(e?.message ?? "Delete failed");
    }
  };

  const handleGenerate = async (dryRun: boolean) => {
    setGenerating(true);
    setGenResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("trivia-build-content", {
        body: { esport, maxBoards: genMaxBoards, dryRun },
      });
      if (error) throw error;
      setGenResult(data);
      if (data?.pending) {
        toast.info(data?.requestId
          ? `${data?.message ?? "Trivia data is being prepared. Please try again in a moment."} · Request ${data.requestId}`
          : (data?.message ?? "Trivia data is being prepared. Please try again in a moment."));
        return;
      }
      if (dryRun) {
        toast.success(`Dry run: ${data?.candidateClues ?? 0} clues · ${data?.boardsBuilt ?? 0} boards`);
      } else {
        toast.success(`Generated ${data?.candidateClues ?? 0} clues and ${data?.boardsBuilt ?? 0} boards`);
        reload();
      }
    } catch (e: any) {
      const details = e?.context instanceof Response
        ? await e.context.clone().json().catch(() => null)
        : e?.context?.json && typeof e.context.json !== "function"
          ? e.context.json
          : null;
      const failedStage = details?.diagnostics?.failedStage;
      const requestId = details?.requestId;
      toast.error(
        [details?.error ?? e?.message ?? "Generation failed", failedStage ? `stage: ${failedStage}` : null, requestId ? `request: ${requestId}` : null]
          .filter(Boolean)
          .join(" · "),
      );
      if (details) setGenResult(details);
    } finally {
      setGenerating(false);
    }
  };

  if (adminLoading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white">
        <SearchableNavbar />
        <div className="container mx-auto px-4 py-12 text-center">
          <Loader2 className="h-6 w-6 animate-spin inline" />
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-slate-950 text-white">
        <SearchableNavbar />
        <div className="container mx-auto px-4 py-12 text-center">
          <h1 className="text-xl font-semibold">Admins only</h1>
          <p className="text-sm text-gray-400 mt-2">You need admin access to manage trivia clues.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <SearchableNavbar />
      <main className="container mx-auto px-4 py-6 max-w-5xl">
        <div className="mb-4 flex">
          <Button
            variant="outline"
            size="sm"
            className="border-slate-700 bg-slate-800/60 text-gray-200 hover:bg-slate-700 hover:text-white"
            onClick={() => navigate("/trivia")}
          >
            <ChevronLeft className="h-4 w-4 mr-1" /> Back to Trivia
          </Button>
        </div>

        <div className="mb-6 flex items-end justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Trivia clue manager</h1>
            <p className="text-sm text-gray-400 mt-1">
              Build the clue library and assemble 3×3 grid templates. Only active clues are usable in games.
            </p>
          </div>
          <div className="min-w-[220px]">
            <Label className="text-xs text-gray-400">Esport</Label>
            <Select value={esport} onValueChange={setEsport}>
              <SelectTrigger className="bg-slate-900 border-slate-700 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-slate-700 text-white">
                {TRIVIA_ESPORTS.map((e) => (
                  <SelectItem key={e} value={e}>{e}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Auto-generate clues + boards */}
        <Card className="bg-slate-900/60 border-slate-700 p-5 mb-6">
          <div className="flex items-start gap-3 mb-3">
            <Sparkles className="h-5 w-5 text-theme-purple mt-0.5" />
            <div className="flex-1">
              <h2 className="font-semibold text-white">Auto-generate from Tier S/A data</h2>
              <p className="text-xs text-gray-400 mt-1">
                Builds clues (team, league, tournament, year, teammate, faced) and 3×3 boards using only validated top-tier history. Replaces previously generated content for <span className="text-theme-purple font-medium">{esport}</span>.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <Label className="text-xs text-gray-400">Max boards</Label>
              <Input
                type="number"
                min={1}
                max={30}
                value={genMaxBoards}
                onChange={(e) => setGenMaxBoards(Number(e.target.value) || 20)}
                className="bg-slate-950 border-slate-700 text-white w-24"
              />
            </div>
            <Button
              onClick={() => handleGenerate(true)}
              disabled={generating}
              variant="outline"
              className="border-theme-purple/60 bg-slate-900/60 text-theme-purple hover:bg-slate-800 hover:text-theme-purple"
            >
              {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Dry run"}
            </Button>
            <Button
              onClick={() => handleGenerate(false)}
              disabled={generating}
              className="bg-theme-purple hover:bg-theme-purple/90 text-white font-semibold"
            >
              {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Sparkles className="h-4 w-4 mr-1" /> Generate</>}
            </Button>
          </div>
          {genResult && (
            <div className="mt-4 p-3 rounded-md bg-slate-950/60 border border-slate-800 text-xs text-gray-300 space-y-1">
              {genResult.requestId && (
                <div>Request ID: <span className="text-white font-mono">{genResult.requestId}</span></div>
              )}
              {genResult.diagnostics?.failedStage && (
                <div>Failed stage: <span className="text-white">{genResult.diagnostics.failedStage}</span></div>
              )}
              {genResult.diagnostics?.totalDurationMs != null && (
                <div>Total duration: <span className="text-white">{genResult.diagnostics.totalDurationMs}ms</span></div>
              )}
              <div>Index rows: <span className="text-white">{genResult.indexRows}</span></div>
              <div>Candidate clues (4–30 answers): <span className="text-white">{genResult.candidateClues}</span></div>
              <div>By type: <span className="text-white">{JSON.stringify(genResult.cluesByType)}</span></div>
              <div>Boards built: <span className="text-white">{genResult.boardsBuilt}</span></div>
              {genResult.diagnostics?.stageTimings && (
                <div>Stage timings: <span className="text-white break-all">{JSON.stringify(genResult.diagnostics.stageTimings)}</span></div>
              )}
              {genResult.diagnostics?.error && (
                <div>Error: <span className="text-red-300 break-all">{JSON.stringify(genResult.diagnostics.error)}</span></div>
              )}
              {genResult.boardsSample?.length > 0 && (
                <div className="mt-2">
                  <div className="text-gray-400 mb-1">Sample boards:</div>
                  {genResult.boardsSample.map((b: any, i: number) => (
                    <div key={i} className="mt-2 p-2 rounded bg-slate-900/60">
                      <div className="text-theme-purple">[{b.difficulty}] quality {b.quality} · avg cell {b.avgCellAnswers} · min {b.minCellAnswers}</div>
                      <div className="text-gray-400">Rows: {b.rows.join(" · ")}</div>
                      <div className="text-gray-400">Cols: {b.cols.join(" · ")}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </Card>

        {/* Add clue */}
        <Card className="bg-slate-900/60 border-slate-700 p-5 mb-6">
          <h2 className="font-semibold mb-3 text-white">Add a clue</h2>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            <div className="md:col-span-4">
              <Label className="text-xs text-gray-400">Label (shown to players)</Label>
              <Input
                value={nLabel}
                onChange={(e) => setNLabel(e.target.value)}
                placeholder={canonicalTemplateHint(nType)}
                className="bg-slate-950 border-slate-700 text-white placeholder:text-gray-500"
              />
              {nLabel.trim() && (
                <p className={`text-[11px] mt-1 ${matchesCanonicalTemplate(nLabel, nType) ? "text-emerald-400" : "text-amber-400"}`}>
                  {matchesCanonicalTemplate(nLabel, nType)
                    ? `Normalizes to: "${normalizeClueLabel(nLabel, nType)}"`
                    : `Must match: "${canonicalTemplateHint(nType)}"`}
                </p>
              )}
            </div>
            <div className="md:col-span-3">
              <Label className="text-xs text-gray-400">Type</Label>
              <Select value={nType} onValueChange={(v: any) => setNType(v)}>
                <SelectTrigger className="bg-slate-950 border-slate-700 text-white placeholder:text-gray-500">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-700 text-white">
                  {CLUE_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-3">
              <Label className="text-xs text-gray-400">Value</Label>
              <Input
                value={nValue}
                onChange={(e) => setNValue(e.target.value)}
                placeholder="team_id / country code / tournament id"
                className="bg-slate-950 border-slate-700 text-white placeholder:text-gray-500"
              />
            </div>
            <div className="md:col-span-2 flex items-end">
              <Button
                onClick={handleAddClue}
                disabled={savingClue}
                className="w-full bg-theme-purple hover:bg-theme-purple/90 text-white font-semibold"
              >
                {savingClue ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Plus className="h-4 w-4 mr-1" /> Add</>}
              </Button>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Canonical templates — team: <code>Played for {"{team}"}</code> · nationality: <code>From {"{country}"}</code> · tournament: <code>Won {"{event}"}</code> · role: <code>Role: {"{role}"}</code> · attribute: <code>Attribute: {"{tag}"}</code>. Duplicates are auto-rejected.
          </p>
        </Card>

        {/* Clue list */}
        <Card className="bg-slate-900/60 border-slate-700 p-5 mb-6">
          <h2 className="font-semibold mb-3 text-white">Clue library ({clues.length})</h2>
          {loading ? (
            <div className="py-6 text-center"><Loader2 className="h-5 w-5 animate-spin inline" /></div>
          ) : clues.length === 0 ? (
            <p className="text-sm text-gray-400">No clues yet for this esport.</p>
          ) : (
            <div className="space-y-2 max-h-[420px] overflow-auto">
              {clues.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center gap-3 p-3 rounded-md bg-slate-950/60 border border-slate-800"
                >
                  <Badge variant="outline" className="border-slate-700 text-gray-300 capitalize">{c.clue_type}</Badge>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{c.label}</div>
                    <div className="text-xs text-gray-500 truncate">value: {c.clue_value}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">Active</span>
                    <Switch checked={c.is_active} onCheckedChange={() => toggleActive(c)} />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                    onClick={() => handleDeleteClue(c.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Template builder */}
        <Card className="bg-slate-900/60 border-slate-700 p-5 mb-6">
          <h2 className="font-semibold mb-3 text-white">Build a grid template</h2>
          <div className="mb-3">
            <Label className="text-xs text-gray-400">Template name</Label>
            <Input
              value={tplName}
              onChange={(e) => setTplName(e.target.value)}
              placeholder='e.g. "Majors special"'
              className="bg-slate-950 border-slate-700 text-white placeholder:text-gray-500 max-w-md"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-semibold mb-2">Row clues (3)</h3>
              {rowIds.map((id, i) => (
                <Select
                  key={`row-${i}`}
                  value={id}
                  onValueChange={(v) => setRowIds((prev) => prev.map((x, j) => (j === i ? v : x)))}
                >
                  <SelectTrigger className="bg-slate-950 border-slate-700 text-white mb-2">
                    <SelectValue placeholder={`Row ${i + 1}`} />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-700 text-white max-h-72">
                    {activeClues.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        [{c.clue_type}] {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ))}
            </div>
            <div>
              <h3 className="text-sm font-semibold mb-2">Column clues (3)</h3>
              {colIds.map((id, i) => (
                <Select
                  key={`col-${i}`}
                  value={id}
                  onValueChange={(v) => setColIds((prev) => prev.map((x, j) => (j === i ? v : x)))}
                >
                  <SelectTrigger className="bg-slate-950 border-slate-700 text-white mb-2">
                    <SelectValue placeholder={`Column ${i + 1}`} />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-700 text-white max-h-72">
                    {activeClues.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        [{c.clue_type}] {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ))}
            </div>
          </div>

          <Button
            onClick={handleSaveTemplate}
            disabled={savingTpl}
            className="mt-4 bg-theme-purple hover:bg-theme-purple/90 text-white font-semibold"
          >
            {savingTpl ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save template"}
          </Button>
        </Card>

        {/* Templates list */}
        <Card className="bg-slate-900/60 border-slate-700 p-5">
          <h2 className="font-semibold mb-3 text-white">Templates ({templates.length})</h2>
          {templates.length === 0 ? (
            <p className="text-sm text-gray-400">No templates yet.</p>
          ) : (
            <div className="space-y-2">
              {templates.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center gap-3 p-3 rounded-md bg-slate-950/60 border border-slate-800"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">{t.name}</div>
                    <div className="text-xs text-gray-500">{t.esport} · {t.is_active ? "active" : "inactive"}</div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-slate-700 bg-slate-800/60 text-gray-100 hover:bg-slate-700 hover:text-white"
                    onClick={() => navigate(`/trivia?templateId=${t.id}`)}
                  >
                    Test play
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                    onClick={() => handleDeleteTemplate(t.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Card>
      </main>
    </div>
  );
};

export default TriviaAdminPage;
