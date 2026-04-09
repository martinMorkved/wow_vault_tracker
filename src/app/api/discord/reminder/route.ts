import { getCurrentUser } from "@/lib/current-user";
import { db } from "@/lib/db";
import { sendDiscordDm } from "@/lib/discord-dm";
import { buildReminderMessage } from "@/lib/reminder-message";
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

  if (!currentUser.discordDmActivationSentAt) {
    return NextResponse.json(
      { error: "Activate Discord notifications before sending reminders." },
      { status: 400 },
    );
  }

  const characters = await db.character.findMany({
    where: { userId: currentUser.id },
    orderBy: { createdAt: "desc" },
    select: {
      name: true,
      realm: true,
      region: true,
      lastWeeklyRuns: true,
    },
  });

  try {
    await sendDiscordDm(currentUser.discordId, buildReminderMessage(characters));
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to send reminder DM.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 502 },
    );
  }

  return NextResponse.json({ success: true, sentCount: 1 });
}
