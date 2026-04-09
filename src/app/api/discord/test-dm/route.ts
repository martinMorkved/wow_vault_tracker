import { getCurrentUser } from "@/lib/current-user";
import { db } from "@/lib/db";
import { sendDiscordDm } from "@/lib/discord-dm";
import { NextResponse } from "next/server";

export async function POST() {
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
    await sendDiscordDm(
      currentUser.discordId,
      "Vault Tracker: Discord notifications are now active for your account.",
    );

    if (!currentUser.discordDmActivationSentAt) {
      await db.user.update({
        where: { id: currentUser.id },
        data: { discordDmActivationSentAt: new Date() },
      });
    }
  } catch (error) {
    const details = error instanceof Error ? error.message : "Unknown error";
    const noMutualGuild = details.includes('"code": 50278');
    const dmsDisabled = details.includes('"code": 50007');

    return NextResponse.json(
      {
        error: noMutualGuild
          ? "Bot is not connected to a shared Discord server yet."
          : dmsDisabled
            ? "Discord is blocking DMs to this user."
          : "Failed to send DM message.",
        details,
        code: noMutualGuild
          ? "NO_MUTUAL_GUILD"
          : dmsDisabled
            ? "USER_DMS_DISABLED"
            : "DISCORD_DM_FAILED",
      },
      { status: 502 },
    );
  }

  return NextResponse.json({
    success: true,
    alreadyActive: Boolean(currentUser.discordDmActivationSentAt),
  });
}
