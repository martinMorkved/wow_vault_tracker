import { authOptions } from "@/auth";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";

export async function getCurrentUser() {
  const session = await getServerSession(authOptions);
  const discordId = session?.user?.discordId;
  const email = session?.user?.email ?? null;

  if (!discordId) {
    return null;
  }

  const user = await db.user.upsert({
    where: { discordId },
    update: {
      email,
    },
    create: {
      discordId,
      email,
    },
    select: { id: true, discordId: true, discordDmActivationSentAt: true },
  });

  return user;
}
