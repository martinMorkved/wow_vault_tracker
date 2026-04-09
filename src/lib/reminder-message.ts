function capitalizeFirst(value: string) {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function getNextVaultResetUtc(region: string, now = new Date()) {
  const normalizedRegion = region.toLowerCase();
  const resetDay = normalizedRegion === "eu" ? 3 : 2; // Sun=0, Tue=2, Wed=3
  const resetHourUtc = normalizedRegion === "eu" ? 7 : 15;

  const current = new Date(now);
  const nextReset = new Date(
    Date.UTC(
      current.getUTCFullYear(),
      current.getUTCMonth(),
      current.getUTCDate(),
      resetHourUtc,
      0,
      0,
      0,
    ),
  );

  while (nextReset.getUTCDay() !== resetDay || nextReset <= current) {
    nextReset.setUTCDate(nextReset.getUTCDate() + 1);
  }

  return nextReset;
}

function getDaysUntil(date: Date, now = new Date()) {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.ceil((date.getTime() - now.getTime()) / msPerDay);
}

export function buildReminderMessage(
  characters: Array<{
    name: string;
    realm: string;
    region: string;
    lastWeeklyRuns: number | null;
  }>,
) {
  if (characters.length === 0) {
    return "Vault reminder: You have no characters added yet. Add one in the tracker to start weekly progress reminders.";
  }

  const now = new Date();
  const nextResets = characters.map((character) =>
    getNextVaultResetUtc(character.region, now),
  );
  const nearestReset = nextResets.reduce((earliest, current) =>
    current < earliest ? current : earliest,
  );
  const daysUntilNextVault = getDaysUntil(nearestReset, now);
  const dayLabel = daysUntilNextVault === 1 ? "day" : "days";

  const lines = characters.slice(0, 15).map((character) => {
    const runs = character.lastWeeklyRuns ?? 0;
    const slotStatus =
      runs >= 8 ? "8/8" : runs >= 4 ? "4/8" : runs >= 1 ? "1/8" : "0/8";
    return `- ${capitalizeFirst(character.name)} (${character.region.toUpperCase()}-${character.realm}): ${runs} runs (${slotStatus})`;
  });

  return [
    "Vault reminder:",
    `Next vault reset in ${daysUntilNextVault} ${dayLabel}.`,
    "Weekly Mythic+ progress snapshot",
    ...lines,
  ].join("\n");
}
