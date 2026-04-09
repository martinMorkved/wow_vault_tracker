import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import { NextRequest, NextResponse } from "next/server";

type RaiderRecentRun = {
  dungeon: string;
  short_name: string;
  mythic_level: number;
  completed_at: string;
  score: number;
  num_keystone_upgrades: number;
};

type RaiderProfileResponse = {
  name: string;
  realm: string;
  region: string;
  class: string;
  active_spec_name: string;
  thumbnail_url: string;
  profile_url: string;
  mythic_plus_recent_runs?: RaiderRecentRun[];
};

type RaiderErrorResponse = {
  statusCode?: number;
  error?: string;
  message?: string;
};

const CACHE_TTL_MS = 5 * 60 * 1000;

type ProfileResponsePayload = {
  character: {
    name: string;
    realm: string;
    region: string;
    className: string;
    specName: string;
    thumbnailUrl: string;
    profileUrl: string;
  };
  resetAtUtc: string;
  nextResetAtUtc: string;
  regionLabel: string;
  weeklyRunCount: number;
  weeklyTenPlusCount: number;
  vault: {
    one: boolean;
    four: boolean;
    eight: boolean;
    missingForOne: number;
    missingForFour: number;
    missingForEight: number;
  };
  recentRuns: RaiderRecentRun[];
  weeklyRuns: RaiderRecentRun[];
};

function getWeeklyResetUtc(region: string, now = new Date()): Date {
  // MVP defaults: EU weekly reset on Wednesday 07:00 UTC.
  // This can be made fully region-aware and DST-aware later.
  const normalizedRegion = region.toLowerCase();
  const resetDay = normalizedRegion === "eu" ? 3 : 2; // Sun=0, Tue=2, Wed=3
  const resetHourUtc = normalizedRegion === "eu" ? 7 : 15;

  const current = new Date(now);
  const day = current.getUTCDay();
  const daysSinceReset = (day - resetDay + 7) % 7;

  const reset = new Date(
    Date.UTC(
      current.getUTCFullYear(),
      current.getUTCMonth(),
      current.getUTCDate() - daysSinceReset,
      resetHourUtc,
      0,
      0,
      0,
    ),
  );

  if (current < reset) {
    reset.setUTCDate(reset.getUTCDate() - 7);
  }

  return reset;
}

function normalizeRealmSlug(realm: string): string {
  return realm.trim().toLowerCase().replace(/\s+/g, "-");
}

function buildProfilePayload(
  data: RaiderProfileResponse,
  region: string,
): ProfileResponsePayload {
  const recentRuns = data.mythic_plus_recent_runs ?? [];
  const resetAt = getWeeklyResetUtc(region);
  const weeklyRuns = recentRuns.filter(
    (run) => new Date(run.completed_at) >= resetAt,
  );
  const weeklyRunCount = weeklyRuns.length;
  const weeklyTenPlusCount = weeklyRuns.filter(
    (run) => run.mythic_level >= 10,
  ).length;
  const nextResetAt = new Date(resetAt);
  nextResetAt.setUTCDate(nextResetAt.getUTCDate() + 7);

  return {
    character: {
      name: data.name,
      realm: data.realm,
      region: data.region,
      className: data.class,
      specName: data.active_spec_name,
      thumbnailUrl: data.thumbnail_url,
      profileUrl: data.profile_url,
    },
    resetAtUtc: resetAt.toISOString(),
    nextResetAtUtc: nextResetAt.toISOString(),
    regionLabel: region.toUpperCase(),
    weeklyRunCount,
    weeklyTenPlusCount,
    vault: {
      one: weeklyRunCount >= 1,
      four: weeklyRunCount >= 4,
      eight: weeklyRunCount >= 8,
      missingForOne: Math.max(1 - weeklyRunCount, 0),
      missingForFour: Math.max(4 - weeklyRunCount, 0),
      missingForEight: Math.max(8 - weeklyRunCount, 0),
    },
    recentRuns,
    weeklyRuns,
  };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let region = (searchParams.get("region") ?? "eu").toLowerCase();
  let realm = normalizeRealmSlug(searchParams.get("realm") ?? "");
  let name = (searchParams.get("name") ?? "").trim();
  const characterId = searchParams.get("id");
  const forceRefresh = searchParams.get("force") === "true";

  if (characterId) {
    const dbCharacter = await db.character.findUnique({
      where: { id: characterId },
      select: {
        id: true,
        userId: true,
        region: true,
        realm: true,
        name: true,
        lastFetchedAt: true,
        cachedProfile: true,
      },
    });

    if (!dbCharacter) {
      return NextResponse.json({ error: "Character not found." }, { status: 404 });
    }
    if (dbCharacter.userId !== currentUser.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    region = dbCharacter.region;
    realm = dbCharacter.realm;
    name = dbCharacter.name;

    const ageMs = dbCharacter.lastFetchedAt
      ? Date.now() - dbCharacter.lastFetchedAt.getTime()
      : Number.POSITIVE_INFINITY;

    if (
      !forceRefresh &&
      dbCharacter.cachedProfile &&
      ageMs < CACHE_TTL_MS
    ) {
      return NextResponse.json(dbCharacter.cachedProfile);
    }
  }

  if (!realm || !name) {
    return NextResponse.json(
      { error: "Missing required query params: region, realm, name" },
      { status: 400 },
    );
  }

  const raiderUrl = new URL("https://raider.io/api/v1/characters/profile");
  raiderUrl.searchParams.set("region", region);
  raiderUrl.searchParams.set("realm", realm);
  raiderUrl.searchParams.set("name", name);
  raiderUrl.searchParams.set("fields", "mythic_plus_recent_runs");

  const response = await fetch(raiderUrl, {
    next: { revalidate: 120 },
  });

  if (!response.ok) {
    const body = await response.text();
    let message = "Failed to fetch character from Raider.io";

    try {
      const parsed = JSON.parse(body) as RaiderErrorResponse;
      if (parsed.message) {
        message = parsed.message;
      } else if (parsed.error) {
        message = parsed.error;
      }
    } catch {
      // Keep fallback message if response isn't JSON.
    }

    return NextResponse.json(
      { error: message, details: body },
      { status: response.status },
    );
  }

  const data = (await response.json()) as RaiderProfileResponse;
  const payload = buildProfilePayload(data, region);

  if (characterId) {
    await db.character.update({
      where: { id: characterId },
      data: {
        lastFetchedAt: new Date(),
        lastWeeklyRuns: payload.weeklyRunCount,
        cachedProfile: payload,
      },
    });
  }

  return NextResponse.json(payload);
}
