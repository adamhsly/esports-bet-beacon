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

export async function generateBoard(esport: string): Promise<TriviaBoard> {
  const { data, error } = await supabase.functions.invoke("trivia-generate-board", {
    body: { esport },
  });
  if (error) throw error;
  if (!data?.rowClues || !data?.colClues) throw new Error("Invalid board response");
  return { rowClues: data.rowClues, colClues: data.colClues };
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

export function checkWinner(cells: TriviaCell[][]): "p1" | "p2" | "draw" | null {
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
    if (owners[0] && owners.every((o) => o === owners[0])) return owners[0]!;
  }
  const allFilled = cells.every((row) => row.every((c) => c));
  return allFilled ? "draw" : null;
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
