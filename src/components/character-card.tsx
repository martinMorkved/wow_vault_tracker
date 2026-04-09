/* eslint-disable @next/next/no-img-element */
import { CharacterInput, CharacterResult } from "@/lib/types";
import {
  capitalizeFirst,
  formatDate,
  formatDurationUntil,
  formatRealmLabel,
  getVaultProgressPercent,
} from "@/lib/ui-format";

type CharacterCardProps = {
  character: CharacterInput;
  result?: CharacterResult;
  error?: string;
  isLoading: boolean;
  onRefresh: () => void;
  onRemove: () => void;
};

export function CharacterCard({
  character,
  result,
  error,
  isLoading,
  onRefresh,
  onRemove,
}: CharacterCardProps) {
  const progressWidth = result
    ? `${getVaultProgressPercent(result.weeklyRunCount)}%`
    : "0%";

  return (
    <article className="rounded-2xl border border-zinc-800/70 bg-zinc-900/70 p-5 shadow-[0_12px_40px_rgba(0,0,0,0.35)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold tracking-tight text-zinc-100">
          {capitalizeFirst(character.name)} · {formatRealmLabel(character.realm)} (
          {character.region.toUpperCase()})
        </h2>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onRefresh}
            className="rounded-lg border border-zinc-600/80 bg-zinc-800/70 px-3 py-1.5 text-sm text-zinc-100 hover:border-zinc-500 hover:bg-zinc-700/80"
          >
            {isLoading ? "Refreshing..." : "Refresh"}
          </button>
          <button
            type="button"
            onClick={onRemove}
            className="rounded-lg border border-zinc-700 bg-transparent px-3 py-1.5 text-sm text-zinc-300 hover:border-rose-500/70 hover:bg-rose-950/35 hover:text-rose-200"
          >
            Remove
          </button>
        </div>
      </div>

      {error && <p className="mt-3 text-sm text-red-300">{error}</p>}

      {!error && result && (
        <div className="mt-4 space-y-4">
          <div className="rounded-xl bg-zinc-800/45 p-5">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-zinc-400">
                  Weekly runs
                </p>
                <p className="text-5xl font-bold leading-none text-zinc-50">
                  {result.weeklyRunCount}
                  <span className="ml-1 text-xl font-medium text-zinc-400">/8</span>
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs uppercase tracking-wide text-zinc-400">
                  10+ this week
                </p>
                <p className="text-3xl font-semibold text-amber-300">
                  {result.weeklyTenPlusCount}
                  <span className="ml-1 text-base text-zinc-400">/8</span>
                </p>
              </div>
            </div>

            <div className="mt-4">
              <p className="mb-2 text-sm font-medium text-zinc-300">Vault progress</p>
              <div className="h-4 w-full overflow-hidden rounded-full bg-zinc-800">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-orange-300 to-amber-400 transition-all duration-500"
                  style={{ width: progressWidth }}
                />
              </div>
              <div className="mt-2 flex justify-between text-xs text-zinc-400">
                <span>0</span>
                <span>1</span>
                <span>4</span>
                <span>8</span>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm">
              <p className="text-zinc-300">
                Next slot:{" "}
                {result.vault.one
                  ? result.vault.four
                    ? result.vault.eight
                      ? "All vault slots unlocked"
                      : `${result.vault.missingForEight} run(s) to 8/8`
                    : `${result.vault.missingForFour} run(s) to 4/8`
                  : `${result.vault.missingForOne} run(s) to 1/8`}
              </p>
              <p className="text-xs text-zinc-500">
                {result.regionLabel} reset: {formatDate(result.resetAtUtc)}
              </p>
            </div>
            <p className="mt-1 text-xs text-zinc-500">
              Next reset in: {formatDurationUntil(result.nextResetAtUtc)}
            </p>

            <div className="mt-4 border-t border-zinc-700/40 pt-3">
              <p className="text-xs text-zinc-400">Character</p>
              <div className="mt-1 flex items-center gap-2">
                {result.character.thumbnailUrl ? (
                  <img
                    src={result.character.thumbnailUrl}
                    alt={`${result.character.name} avatar`}
                    width={42}
                    height={42}
                    className="h-10 w-10 rounded-md"
                  />
                ) : null}
                <div className="text-sm">
                  <p className="text-zinc-200">
                    {result.character.specName} {result.character.className}
                  </p>
                  <a
                    href={result.character.profileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-amber-300 hover:text-amber-200 hover:underline"
                  >
                    Raider.io profile
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </article>
  );
}
