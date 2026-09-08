import { getGames } from "@/lib/games/data";
import HallOfFame from "@/components/hall-of-fame";

export default async function HallOfFamePage() {
  const games = await getGames();

  return <HallOfFame games={games} />;
}
