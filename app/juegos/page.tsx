import { getGames } from "@/lib/games/data";
import GameLibrary from "@/components/game-library";

export default async function Juegos() {
  const games = await getGames();

  return (
    <div className="fade-in">
      <section className="av-hero">
        <h1 className="flicker">ARCADE VAULT</h1>
        <div className="sub">
          INSERTA UNA MONEDA PARA JUGAR <span className="blink">_</span>
        </div>
      </section>

      <GameLibrary games={games} />
    </div>
  );
}
