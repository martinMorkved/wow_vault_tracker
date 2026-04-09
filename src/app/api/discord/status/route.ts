import { getCurrentUser } from "@/lib/current-user";
import { getDiscordDmCapability } from "@/lib/discord-dm";
import { NextResponse } from "next/server";

export async function GET() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!currentUser.discordId) {
    return NextResponse.json(
      { error: "No Discord account connected for this user." },
      { status: 400 },
    );
  }

  try {
    const capability = await getDiscordDmCapability(currentUser.discordId);
    return NextResponse.json({
      active: Boolean(currentUser.discordDmActivationSentAt),
      hasMutualGuild: capability.hasMutualGuild,
      canDm: capability.canDm,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to check Discord bot status.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 502 },
    );
  }
}
