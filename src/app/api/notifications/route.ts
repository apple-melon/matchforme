import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionFromCookies } from "@/lib/session";

/** GET — 최근 알림 30개 */
export async function GET() {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ notifications: [], unreadCount: 0 });

  const notifications = await prisma.notification.findMany({
    where: { userId: session.sub },
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  return NextResponse.json({
    notifications: notifications.map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      body: n.body,
      link: n.link,
      read: n.read,
      createdAt: n.createdAt.toISOString(),
    })),
    unreadCount,
  });
}

/** PATCH — 전체 읽음 처리 */
export async function PATCH() {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  await prisma.notification.updateMany({
    where: { userId: session.sub, read: false },
    data: { read: true },
  });

  return NextResponse.json({ ok: true });
}
