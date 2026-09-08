import { createClient } from "@/lib/supabase/client";

function formatDate(iso: string) {
  const d = new Date(iso);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${d.getFullYear()}`;
}

export async function getTopScores(gameId: string, limit = 10) {
  const supabase = createClient();
  const { data } = await supabase
    .from("scores")
    .select("name, score, created_at")
    .eq("game_id", gameId)
    .order("score", { ascending: false })
    .limit(limit);

  if (!data) return [];

  return data.map((row, i) => ({
    rank: i + 1,
    name: row.name,
    score: row.score,
    date: formatDate(row.created_at),
  }));
}

export async function saveScore(gameId: string, name: string, score: number) {
  const supabase = createClient();
  await supabase.from("scores").insert({ game_id: gameId, name, score });
}
