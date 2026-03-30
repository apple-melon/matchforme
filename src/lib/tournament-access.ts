import { prisma } from "@/lib/db";
import { getSessionFromCookies } from "@/lib/session";

export type ManageAuth = { ok: true; via: "owner" | "secret" } | { ok: false };

export async function authorizeTournamentManage(req: Request, tournamentId: string) {
  const t = await prisma.tournament.findUnique({ where: { id: tournamentId } });
  if (!t) return { auth: { ok: false } as ManageAuth, tournament: null };

  const secret = req.headers.get("x-admin-secret");
  if (secret && secret === t.adminSecret) {
    return { auth: { ok: true, via: "secret" } as const, tournament: t };
  }

  const session = await getSessionFromCookies();
  if (session?.sub && t.ownerId === session.sub) {
    return { auth: { ok: true, via: "owner" } as const, tournament: t };
  }

  return { auth: { ok: false } as ManageAuth, tournament: t };
}
