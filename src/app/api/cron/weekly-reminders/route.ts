import { db } from "@/lib/db";
import { sendDiscordDm } from "@/lib/discord-dm";
import { buildReminderMessage } from "@/lib/reminder-message";
import { NextRequest, NextResponse } from "next/server";

const OSLO_TIME_ZONE = "Europe/Oslo";

function formatOsloDateKey(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: OSLO_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function isFridayAtReminderHourOslo(date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: OSLO_TIME_ZONE,
    weekday: "short",
    hour: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const weekday = parts.find((part) => part.type === "weekday")?.value;
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? "0");

  return weekday === "Fri" && (hour === 15 || hour === 16);
}

export async function POST(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const now = new Date();
  if (!isFridayAtReminderHourOslo(now)) {
    return NextResponse.json({
      success: true,
      skipped: true,
      reason: "Outside Friday 15:00/16:00 Oslo window.",
    });
  }

  const todayOslo = formatOsloDateKey(now);
  const users = await db.user.findMany({
    where: {
      discordId: { not: null },
      discordDmActivationSentAt: { not: null },
    },
    select: {
      id: true,
      discordId: true,
      lastReminderSentAt: true,
      characters: {
        orderBy: { createdAt: "desc" },
        select: {
          name: true,
          realm: true,
          region: true,
          lastWeeklyRuns: true,
        },
      },
    },
  });

  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const user of users) {
    if (!user.discordId) {
      skipped += 1;
      continue;
    }

    if (user.characters.length === 0) {
      skipped += 1;
      continue;
    }

    const lastSentKey = user.lastReminderSentAt
      ? formatOsloDateKey(user.lastReminderSentAt)
      : null;
    if (lastSentKey === todayOslo) {
      skipped += 1;
      continue;
    }

    try {
      await sendDiscordDm(user.discordId, buildReminderMessage(user.characters));
      await db.user.update({
        where: { id: user.id },
        data: { lastReminderSentAt: now },
      });
      sent += 1;
    } catch {
      failed += 1;
    }
  }

  return NextResponse.json({
    success: true,
    sent,
    skipped,
    failed,
  });
}
