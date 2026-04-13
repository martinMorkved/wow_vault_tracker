/* eslint-disable @next/next/no-img-element */
import { CharacterInput, CharacterResult } from "@/lib/types";
import {
  capitalizeFirst,
  formatRealmLabel,
  getVaultProgressPercent,
} from "@/lib/ui-format";

type CharacterVaultRowProps = {
  character: CharacterInput;
  result?: CharacterResult;
  error?: string;
  isLoading: boolean;
  onRefresh: () => void;
  onRemove: () => void;
};

export function CharacterVaultRow({
  character,
  result,
  error,
  isLoading,
  onRefresh,
  onRemove,
}: CharacterVaultRowProps) {
  const n = result?.weeklyRunCount ?? 0;
  const progressWidth = result ? `${getVaultProgressPercent(n)}%` : "0%";

  return (
    <div className="border-b border-zinc-800/60 px-4 py-4 last:border-b-0">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          {result?.character.thumbnailUrl ? (
            <img
              src={result.character.thumbnailUrl}
              alt=""
              width={40}
              height={40}
              className="mt-0.5 h-10 w-10 shrink-0 rounded-md ring-1 ring-zinc-700/80"
            />
          ) : (
            <div
              className="mt-0.5 h-10 w-10 shrink-0 rounded-md bg-zinc-800/80 ring-1 ring-zinc-700/60"
              aria-hidden
            />
          )}

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="font-semibold tracking-tight text-zinc-100">
                {capitalizeFirst(character.name)}
              </span>
              <span className="text-sm text-zinc-500">
                {formatRealmLabel(character.realm)} · {character.region.toUpperCase()}
              </span>
              <span className="flex shrink-0 gap-1.5">
                <button
                  type="button"
                  onClick={onRefresh}
                  className="rounded border border-zinc-700/80 bg-zinc-800/50 px-2 py-0.5 text-xs text-zinc-300 hover:border-zinc-500 hover:bg-zinc-700/70"
                >
                  {isLoading ? "…" : "Refresh"}
                </button>
                <button
                  type="button"
                  onClick={onRemove}
                  className="rounded border border-zinc-800 bg-transparent px-2 py-0.5 text-xs text-zinc-500 hover:border-rose-500/50 hover:text-rose-300"
                >
                  Remove
                </button>
              </span>
            </div>

            {result ? (
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-sm">
                <span className="text-zinc-400">
                  {result.character.specName} {result.character.className}
                </span>
                <a
                  href={result.character.profileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-amber-400/90 hover:text-amber-300 hover:underline"
                >
                  Raider.io
                </a>
              </div>
            ) : !error ? (
              <p className="mt-1 text-sm text-zinc-500">
                {isLoading ? "Loading…" : "No data yet."}
              </p>
            ) : null}

            {error ? (
              <p className="mt-2 text-sm text-red-300" role="alert">
                {error}
              </p>
            ) : null}
          </div>
        </div>

        <div className="shrink-0 text-right tabular-nums">
          {isLoading && !result ? (
            <span className="text-2xl font-semibold text-zinc-500">…</span>
          ) : (
            <>
              <p className="text-3xl font-bold leading-none text-zinc-50">
                {n}
                <span className="ml-0.5 text-lg font-medium text-zinc-500">/8</span>
              </p>
              {result ? (
                <p className="mt-1 text-xs text-zinc-500">
                  10+{" "}
                  <span className="font-medium text-amber-400/90">
                    {result.weeklyTenPlusCount}
                  </span>
                  <span className="text-zinc-600">/8</span>
                </p>
              ) : null}
            </>
          )}
        </div>
      </div>

      <div className="mt-3">
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-zinc-800/90">
          <div
            className="h-full rounded-full bg-gradient-to-r from-orange-300 to-amber-400 transition-all duration-500"
            style={{ width: progressWidth }}
          />
        </div>
        <div className="mt-1.5 flex justify-between text-[10px] font-medium uppercase tracking-wide text-zinc-600">
          <span>0</span>
          <span>1</span>
          <span>4</span>
          <span>8</span>
        </div>
      </div>
    </div>
  );
}
