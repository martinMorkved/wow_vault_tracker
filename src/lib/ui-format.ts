export function formatDate(value: string) {
  return new Date(value).toLocaleString("nb-NO", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function formatDurationUntil(value: string) {
  const diffMs = new Date(value).getTime() - Date.now();
  if (diffMs <= 0) return "now";

  const totalMinutes = Math.floor(diffMs / 60000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0 || days > 0) parts.push(`${hours}h`);
  parts.push(`${minutes}m`);

  return parts.join(" ");
}

export function getVaultProgressPercent(weeklyRunCount: number) {
  const clamped = Math.max(0, Math.min(weeklyRunCount, 8));
  return (clamped / 8) * 100;
}

export function formatRealmLabel(realmSlug: string) {
  return realmSlug
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function capitalizeFirst(value: string) {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}
