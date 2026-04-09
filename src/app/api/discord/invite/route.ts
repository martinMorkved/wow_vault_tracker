import { NextResponse } from "next/server";

export async function GET() {
  const clientId = process.env.DISCORD_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json(
      { error: "DISCORD_CLIENT_ID is missing in environment variables." },
      { status: 500 },
    );
  }

  const url = new URL("https://discord.com/api/oauth2/authorize");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("permissions", "2048");
  url.searchParams.set("scope", "bot");

  return NextResponse.redirect(url);
}
