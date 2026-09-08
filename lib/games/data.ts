import { createClient } from "@/lib/supabase/server";
import type { Game } from "@/lib/data";

async function withAsteroidesStats(row: Game, supabase: Awaited<ReturnType<typeof createClient>>) {
  if (row.id !== "asteroides") return row;

  const { data } = await supabase.from("scores").select("score").eq("game_id", "asteroides");
  const best = data && data.length > 0 ? Math.max(...data.map((r) => r.score)) : 0;
  const plays = data ? data.length : 0;

  return { ...row, best, plays: String(plays) };
}

export async function getGames(): Promise<Game[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("games").select("*").order("created_at");

  if (!data) return [];

  return Promise.all(data.map((row) => withAsteroidesStats(row, supabase))) as Promise<Game[]>;
}

export async function getGame(id: string): Promise<Game | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("games").select("*").eq("id", id).maybeSingle();

  if (!data) return null;

  return withAsteroidesStats(data, supabase) as Promise<Game>;
}
