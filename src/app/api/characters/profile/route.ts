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
  /** Stable per completion when Raider provides it (best dedupe key). */
  keystone_run_id?: number;
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
  /** Current raid week per Raider (often aligns better with WoW than date math alone). */
  mythic_plus_weekly_highest_level_runs?: RaiderRecentRun[];
};

type RaiderErrorResponse = {
  statusCode?: number;
  error?: string;
  message?: string;
};

const CACHE_TTL_MS = 5 * 60 * 1000;
const VAULT_RUNS_MAX = 8;

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
  vault: {
    one: boolean;
    four: boolean;
    eight: boolean;
    missingForOne: number;
    missingForFour: number;
    missingForEight: number;
  };
  recentRuns: RaiderRecentRun[];
};

function getWeeklyResetUtc(region: string, now = new Date()): Date {
  // Align with WoW weekly reset (Great Vault / M+): EU Wednesday 04:00 UTC,
  // US Tuesday 15:00 UTC (Blizzard moved EU from 07:00 → 04:00 UTC in Nov 2022).
  const normalizedRegion = region.toLowerCase();
  const resetDay = normalizedRegion === "eu" ? 3 : 2; // Sun=0, Tue=2, Wed=3
  const resetHourUtc = normalizedRegion === "eu" ? 4 : 15;

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

/** Raider.io returns ISO timestamps; treat missing timezone as UTC. */
function parseRaiderCompletedAt(iso: string): Date {
  const trimmed = iso.trim();
  const hasZone =
    /[zZ]$/.test(trimmed) || /[+-]\d{2}:?\d{2}$/.test(trimmed);
  return new Date(hasZone ? trimmed : `${trimmed}Z`);
}

function dedupeMythicRuns(runs: RaiderRecentRun[]): RaiderRecentRun[] {
  const m = new Map<string, RaiderRecentRun>();
  for (const run of runs) {
    const kid = run.keystone_run_id;
    const key =
      typeof kid === "number" && Number.isFinite(kid)
        ? `id:${kid}`
        : `c:${run.short_name}|${run.completed_at}|${run.mythic_level}`;
    if (!m.has(key)) m.set(key, run);
  }
  return [...m.values()];
}

/**
 * Prefer Raider's `mythic_plus_weekly_highest_level_runs` (current raid week on their side),
 * merged with `mythic_plus_recent_runs` in our reset window so we don't miss runs only in one list.
 */
function mergeRunsForCurrentWeek(
  data: RaiderProfileResponse,
  region: string,
): RaiderRecentRun[] {
  const resetAt = getWeeklyResetUtc(region);
  const weekly = data.mythic_plus_weekly_highest_level_runs ?? [];
  const recent = data.mythic_plus_recent_runs ?? [];
  const recentInWeek = recent.filter(
    (run) => parseRaiderCompletedAt(run.completed_at) >= resetAt,
  );

  if (weekly.length === 0) {
    return dedupeMythicRuns(recentInWeek);
  }

  return dedupeMythicRuns([...weekly, ...recentInWeek]);
}

function keystoneLevel(run: RaiderRecentRun): number {
  const n = run.mythic_level;
  if (typeof n === "number" && Number.isFinite(n)) return n;
  const parsed = Number(n);
  return Number.isFinite(parsed) ? parsed : NaN;
}

function isCompletedKeystoneTenOrHigher(run: RaiderRecentRun): boolean {
  const level = keystoneLevel(run);
  return Number.isFinite(level) && level >= 10;
}

/** Merged Raider lists → this lockout only → keystone +10 or higher. */
function runsKeystoneTenPlusThisWeek(
  data: RaiderProfileResponse,
  region: string,
  resetAt: Date,
): RaiderRecentRun[] {
  const merged = mergeRunsForCurrentWeek(data, region);
  return merged.filter(
    (run) =>
      parseRaiderCompletedAt(run.completed_at) >= resetAt &&
      isCompletedKeystoneTenOrHigher(run),
  );
}

function buildProfilePayload(
  data: RaiderProfileResponse,
  region: string,
): ProfileResponsePayload {
  const recentRuns = data.mythic_plus_recent_runs ?? [];
  const resetAt = getWeeklyResetUtc(region);
  const tenPlusThisWeek = runsKeystoneTenPlusThisWeek(data, region, resetAt);
  const weeklyRunCount = Math.min(VAULT_RUNS_MAX, tenPlusThisWeek.length);
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
    vault: {
      one: weeklyRunCount >= 1,
      four: weeklyRunCount >= 4,
      eight: weeklyRunCount >= 8,
      missingForOne: Math.max(1 - weeklyRunCount, 0),
      missingForFour: Math.max(4 - weeklyRunCount, 0),
      missingForEight: Math.max(8 - weeklyRunCount, 0),
    },
    recentRuns,
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
  raiderUrl.searchParams.set(
    "fields",
    "mythic_plus_recent_runs,mythic_plus_weekly_highest_level_runs",
  );

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
