import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import { NextRequest, NextResponse } from "next/server";

type RaiderErrorResponse = {
  message?: string;
  error?: string;
};

function normalizeRealmSlug(realm: string): string {
  return realm.trim().toLowerCase().replace(/\s+/g, "-");
}

export async function GET() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const characters = await db.character.findMany({
    where: { userId: currentUser.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      region: true,
      realm: true,
      name: true,
    },
  });

  return NextResponse.json({
    characters,
    discordDmActivationSentAt: currentUser.discordDmActivationSentAt,
  });
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    region?: string;
    realm?: string;
    name?: string;
  };

  const region = body.region?.trim().toLowerCase() ?? "";
  const realm = normalizeRealmSlug(body.realm ?? "");
  const name = body.name?.trim() ?? "";

  if (!region || !realm || !name) {
    return NextResponse.json(
      { error: "Missing required fields: region, realm, name" },
      { status: 400 },
    );
  }

  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const raiderUrl = new URL("https://raider.io/api/v1/characters/profile");
  raiderUrl.searchParams.set("region", region);
  raiderUrl.searchParams.set("realm", realm);
  raiderUrl.searchParams.set("name", name);
  raiderUrl.searchParams.set("fields", "mythic_plus_recent_runs");

  const profileResponse = await fetch(raiderUrl);
  if (!profileResponse.ok) {
    const body = await profileResponse.text();
    let message = "Could not find requested character.";

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
      {
        error:
          "Character not found. Check region, realm, and character name.",
        details: message,
      },
      { status: 400 },
    );
  }

  try {
    const character = await db.character.create({
      data: {
        userId: currentUser.id,
        region,
        realm,
        name,
      },
      select: {
        id: true,
        region: true,
        realm: true,
        name: true,
      },
    });

    return NextResponse.json({ character }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Character already exists for this user." },
      { status: 409 },
    );
  }
}
