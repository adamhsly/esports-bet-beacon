import { supabase } from "@/integrations/supabase/client";

export type TriviaClue = {
  type: "team" | "nationality" | "role" | "game";
  value: string;
  label: string;
};

export type TriviaCell = {
  player_id: number;
  player_name: string;
  player_image?: string | null;
  claimed_by: "p1" | "p2";
  at: string;
} | null;

export type TriviaBoard = {
  rowClues: TriviaClue[];
  colClues: TriviaClue[];
};

export type TriviaSession = {
  id: string;
  mode: "solo" | "two_player";
  esport: string;
  board: TriviaBoard;
  cells: TriviaCell[][];
  current_turn: "p1" | "p2";
  status: "in_progress" | "won" | "draw" | "abandoned";
  winner: "p1" | "p2" | "draw" | null;
  player1_label: string;
  player2_label: string;
};

export const TRIVIA_ESPORTS = [
  "Counter-Strike",
  "LoL",
  "Valorant",
  "Dota 2",
  "Rainbow 6 Siege",
  "Rocket League",
  "Overwatch",
  "Call of Duty",
] as const;

export async function generateBoard(
  esport: string,
  opts?: { templateId?: string },
): Promise<TriviaBoard> {
  const { data, error } = await supabase.functions.invoke("trivia-generate-board", {
    body: { esport, templateId: opts?.templateId },
  });
  if (error) throw error;
  if (!data?.rowClues || !data?.colClues) throw new Error("Invalid board response");
  return { rowClues: data.rowClues, colClues: data.colClues };
}

// ---------------------------------------------------------------------------
// Admin clue + grid-template management
// ---------------------------------------------------------------------------

export type TriviaClueRow = {
  id: string;
  label: string;
  clue_type: "team" | "nationality" | "tournament" | "role" | "attribute";
  clue_value: string;
  esport: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type TriviaGridTemplateRow = {
  id: string;
  name: string;
  esport: string;
  is_active: boolean;
  row_clue_ids: string[];
  col_clue_ids: string[];
  created_at: string;
  updated_at: string;
};

export async function listClues(esport?: string): Promise<TriviaClueRow[]> {
  let q = (supabase as any).from("trivia_clues").select("*").order("created_at", { ascending: false });
  if (esport) q = q.eq("esport", esport);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function upsertClue(input: Partial<TriviaClueRow> & {
  label: string;
  clue_type: TriviaClueRow["clue_type"];
  clue_value: string;
  esport: string;
}): Promise<TriviaClueRow> {
  const payload = {
    id: input.id,
    label: input.label,
    clue_type: input.clue_type,
    clue_value: input.clue_value,
    esport: input.esport,
    is_active: input.is_active ?? true,
  };
  const { data, error } = await (supabase as any)
    .from("trivia_clues")
    .upsert(payload)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteClue(id: string) {
  const { error } = await (supabase as any).from("trivia_clues").delete().eq("id", id);
  if (error) throw error;
}

export async function listGridTemplates(esport?: string): Promise<TriviaGridTemplateRow[]> {
  let q = (supabase as any).from("trivia_grid_templates").select("*").order("created_at", { ascending: false });
  if (esport) q = q.eq("esport", esport);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function upsertGridTemplate(input: Partial<TriviaGridTemplateRow> & {
  name: string;
  esport: string;
  row_clue_ids: string[];
  col_clue_ids: string[];
}): Promise<TriviaGridTemplateRow> {
  if (input.row_clue_ids.length !== 3 || input.col_clue_ids.length !== 3) {
    throw new Error("Templates must have exactly 3 row clues and 3 column clues");
  }
  const payload = {
    id: input.id,
    name: input.name,
    esport: input.esport,
    row_clue_ids: input.row_clue_ids,
    col_clue_ids: input.col_clue_ids,
    is_active: input.is_active ?? true,
  };
  const { data, error } = await (supabase as any)
    .from("trivia_grid_templates")
    .upsert(payload)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteGridTemplate(id: string) {
  const { error } = await (supabase as any).from("trivia_grid_templates").delete().eq("id", id);
  if (error) throw error;
}

/** Resolve a stored grid template into the runtime TriviaBoard shape. */
export async function loadTemplateAsBoard(templateId: string): Promise<TriviaBoard> {
  const { data: tpl, error } = await (supabase as any)
    .from("trivia_grid_templates")
    .select("*")
    .eq("id", templateId)
    .single();
  if (error) throw error;

  const ids = [...tpl.row_clue_ids, ...tpl.col_clue_ids];
  const { data: clues, error: cErr } = await (supabase as any)
    .from("trivia_clues")
    .select("*")
    .in("id", ids);
  if (cErr) throw cErr;

  const byId = new Map<string, TriviaClueRow>((clues ?? []).map((c: TriviaClueRow) => [c.id, c]));
  const toClue = (id: string): TriviaClue => {
    const c = byId.get(id);
    if (!c) throw new Error("Missing clue in template");
    return { type: c.clue_type as TriviaClue["type"], value: c.clue_value, label: c.label };
  };
  return {
    rowClues: tpl.row_clue_ids.map(toClue),
    colClues: tpl.col_clue_ids.map(toClue),
  };
}

export async function createSession(args: {
  mode: "solo" | "two_player";
  esport: string;
  board: TriviaBoard;
  player1_label?: string;
  player2_label?: string;
}): Promise<TriviaSession> {
  const { data: userData } = await supabase.auth.getUser();
  const created_by = userData?.user?.id ?? null;

  const { data, error } = await supabase
    .from("trivia_sessions")
    .insert({
      created_by,
      mode: args.mode,
      esport: args.esport,
      board: args.board as any,
      player1_label: args.player1_label ?? "Player 1",
      player2_label: args.player2_label ?? (args.mode === "solo" ? "—" : "Player 2"),
    })
    .select()
    .single();

  if (error) throw error;
  return normalize(data);
}

export async function getSession(id: string): Promise<TriviaSession | null> {
  const { data, error } = await supabase
    .from("trivia_sessions")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ? normalize(data) : null;
}

export async function searchPlayers(esport: string, query: string) {
  if (query.trim().length < 2) return [];
  const { data, error } = await supabase
    .from("pandascore_players_master")
    .select("id,name,first_name,last_name,nationality,current_team_name,image_url")
    .eq("active", true)
    .eq("videogame_name", esport)
    .or(`name.ilike.%${query}%,first_name.ilike.%${query}%,last_name.ilike.%${query}%`)
    .limit(10);
  if (error) throw error;
  return data ?? [];
}

export async function validatePick(
  player_id: number,
  row: TriviaClue,
  col: TriviaClue,
): Promise<boolean> {
  const { data, error } = await supabase.rpc("trivia_validate_pick", {
    _player_id: player_id,
    _row_type: row.type,
    _row_value: row.value,
    _col_type: col.type,
    _col_value: col.value,
  });
  if (error) throw error;
  return data === true;
}

export type WinResult =
  | { winner: "p1" | "p2"; line: [number, number][] }
  | { winner: "draw"; line: null }
  | null;

export function checkWinner(cells: TriviaCell[][]): WinResult {
  const lines: [number, number][][] = [
    // rows
    [[0, 0], [0, 1], [0, 2]],
    [[1, 0], [1, 1], [1, 2]],
    [[2, 0], [2, 1], [2, 2]],
    // cols
    [[0, 0], [1, 0], [2, 0]],
    [[0, 1], [1, 1], [2, 1]],
    [[0, 2], [1, 2], [2, 2]],
    // diags
    [[0, 0], [1, 1], [2, 2]],
    [[0, 2], [1, 1], [2, 0]],
  ];
  for (const line of lines) {
    const owners = line.map(([r, c]) => cells[r][c]?.claimed_by);
    if (owners[0] && owners.every((o) => o === owners[0])) {
      return { winner: owners[0] as "p1" | "p2", line };
    }
  }
  const allFilled = cells.every((row) => row.every((c) => c));
  return allFilled ? { winner: "draw", line: null } : null;
}

export async function persistMove(args: {
  session_id: string;
  row_idx: number;
  col_idx: number;
  player_id: number;
  player_name: string;
  claimed_by: "p1" | "p2";
  was_correct: boolean;
}) {
  await supabase.from("trivia_moves").insert(args);
}

export async function updateSession(id: string, patch: Partial<{
  cells: TriviaCell[][];
  current_turn: "p1" | "p2";
  status: TriviaSession["status"];
  winner: TriviaSession["winner"];
  finished_at: string | null;
}>) {
  const { error } = await supabase
    .from("trivia_sessions")
    .update(patch as any)
    .eq("id", id);
  if (error) throw error;
}

function normalize(row: any): TriviaSession {
  return {
    id: row.id,
    mode: row.mode,
    esport: row.esport,
    board: row.board,
    cells: row.cells,
    current_turn: row.current_turn,
    status: row.status,
    winner: row.winner,
    player1_label: row.player1_label,
    player2_label: row.player2_label,
  };
}
