import { SKIN_IDS, type SkinId, type SkinRoles } from "@/lib/games/skins";
import { auditSkin, auditRampSeparation, type ContrastViolation } from "@/lib/games/contrast";
import { GAME_ENGINE_IDS } from "@/lib/games/registry";

/**
 * Auditoría dev-only de contraste de las paletas de skins sobre el CRT oscuro.
 * Cada lib/games/<id>/skin.ts exporta SKINS (obligatorio) y RAMPS (opcional,
 * para rampas multicolor como las piezas de tetris o los bloques de arkanoid).
 */

type SkinModule = {
  SKINS: Record<SkinId, SkinRoles & Record<string, unknown>>;
  RAMPS?: Partial<Record<SkinId, string[]>>;
};

type GameReport = {
  id: string;
  skins: Record<SkinId, ContrastViolation[]>;
};

export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return new Response(null, { status: 404 });
  }

  const games: GameReport[] = [];

  for (const id of GAME_ENGINE_IDS) {
    let mod: SkinModule;
    try {
      mod = (await import(`../../../../lib/games/${id}/skin`)) as SkinModule;
    } catch {
      continue;
    }

    const skins = {} as Record<SkinId, ContrastViolation[]>;
    for (const skinId of SKIN_IDS) {
      const roles = mod.SKINS[skinId];
      const violations = auditSkin(roles);
      const ramp = mod.RAMPS?.[skinId];
      if (ramp) violations.push(...auditRampSeparation(ramp));
      skins[skinId] = violations;
    }
    games.push({ id, skins });
  }

  const violations = games.flatMap((g) =>
    Object.entries(g.skins).flatMap(([skinId, v]) =>
      v.map((violation) => ({ game: g.id, skin: skinId, ...violation })),
    ),
  );

  return Response.json({ games, violations });
}
