import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import { NextRequest, NextResponse } from "next/server";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const deleted = await db.character.deleteMany({
    where: {
      id,
      userId: currentUser.id,
    },
  });

  if (deleted.count === 0) {
    return NextResponse.json({ error: "Character not found." }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
