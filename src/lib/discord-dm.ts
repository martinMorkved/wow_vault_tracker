const DISCORD_API_BASE = "https://discord.com/api/v10";

export async function getDiscordDmCapability(discordUserId: string) {
  const botToken = process.env.DISCORD_BOT_TOKEN;
  if (!botToken) {
    throw new Error("DISCORD_BOT_TOKEN is missing in environment variables.");
  }

  const dmChannelResponse = await fetch(`${DISCORD_API_BASE}/users/@me/channels`, {
    method: "POST",
    headers: {
      Authorization: `Bot ${botToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      recipient_id: discordUserId,
    }),
  });

  if (dmChannelResponse.ok) {
    return { hasMutualGuild: true, canDm: true };
  }

  const details = await dmChannelResponse.text();
  const noMutualGuild = details.includes('"code": 50278');
  if (noMutualGuild) {
    return { hasMutualGuild: false, canDm: false };
  }

  const dmsDisabled = details.includes('"code": 50007');
  if (dmsDisabled) {
    return { hasMutualGuild: true, canDm: false };
  }

  throw new Error(`Failed to check DM capability: ${details}`);
}

export async function sendDiscordDm(discordUserId: string, content: string) {
  const botToken = process.env.DISCORD_BOT_TOKEN;
  if (!botToken) {
    throw new Error("DISCORD_BOT_TOKEN is missing in environment variables.");
  }

  const dmChannelResponse = await fetch(`${DISCORD_API_BASE}/users/@me/channels`, {
    method: "POST",
    headers: {
      Authorization: `Bot ${botToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      recipient_id: discordUserId,
    }),
  });

  if (!dmChannelResponse.ok) {
    const details = await dmChannelResponse.text();
    throw new Error(`Failed to create DM channel: ${details}`);
  }

  const dmChannel = (await dmChannelResponse.json()) as { id: string };
  const messageResponse = await fetch(
    `${DISCORD_API_BASE}/channels/${dmChannel.id}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bot ${botToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ content }),
    },
  );

  if (!messageResponse.ok) {
    const details = await messageResponse.text();
    throw new Error(`Failed to send DM message: ${details}`);
  }
}
