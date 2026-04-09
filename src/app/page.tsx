"use client";

import { CharacterCard } from "@/components/character-card";
import { RealmCombobox } from "@/components/realm-combobox";
import { SearchableSelect } from "@/components/searchable-select";
import { REALMS_BY_REGION } from "@/lib/realms";
import { CharacterInput, CharacterResult } from "@/lib/types";
import { signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const isAuthenticated = status === "authenticated";
  const isAuthLoading = status === "loading";

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
    }
  }, [router, status]);

  const [region, setRegion] = useState("eu");
  const [realm, setRealm] = useState("kazzak");
  const [name, setName] = useState("");
  const [characters, setCharacters] = useState<CharacterInput[]>([]);
  const [results, setResults] = useState<Record<string, CharacterResult>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [isLoadingCharacters, setIsLoadingCharacters] = useState(true);
  const [isActivatingNotifications, setIsActivatingNotifications] = useState(false);
  const [isCheckingDiscordStatus, setIsCheckingDiscordStatus] = useState(false);
  const [isSendingReminder, setIsSendingReminder] = useState(false);
  const [notificationStatus, setNotificationStatus] = useState("");
  const [reminderStatus, setReminderStatus] = useState("");
  const [notificationsActive, setNotificationsActive] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    if (!isAuthenticated) {
      setCharacters([]);
      setResults({});
      setErrors({});
      setLoading({});
      setIsLoadingCharacters(false);
      setNotificationsActive(false);
      return;
    }

    async function loadCharacters() {
      setIsLoadingCharacters(true);

      try {
        const response = await fetch("/api/characters");
        const json = (await response.json()) as {
          characters?: CharacterInput[];
          discordDmActivationSentAt?: string | null;
        };
        const list = json.characters ?? [];
        setCharacters(list);
        setNotificationsActive(Boolean(json.discordDmActivationSentAt));
        await refreshCharacters(list);
        await refreshDiscordStatus();
      } finally {
        setIsLoadingCharacters(false);
      }
    }

    void loadCharacters();
  }, [isAuthenticated]); // eslint-disable-line react-hooks/exhaustive-deps

  const hasCharacters = useMemo(() => characters.length > 0, [characters]);
  const regionOptions = useMemo(
    () => [
      { value: "eu", label: "EU" },
      { value: "us", label: "US" },
    ],
    [],
  );

  function onRegionChange(nextRegion: string) {
    setRegion(nextRegion);
    const nextRegionKey = nextRegion === "us" ? "us" : "eu";
    if (!REALMS_BY_REGION[nextRegionKey].includes(realm.trim().toLowerCase())) {
      setRealm("");
    }
  }

  async function fetchCharacter(char: CharacterInput, forceRefresh = false) {
    if (!isAuthenticated) return;
    setLoading((prev) => ({ ...prev, [char.id]: true }));
    setErrors((prev) => ({ ...prev, [char.id]: "" }));

    try {
      const params = new URLSearchParams({
        id: char.id,
        region: char.region,
        realm: char.realm,
        name: char.name,
        force: String(forceRefresh),
      });

      const response = await fetch(`/api/characters/profile?${params}`);
      const json = await response.json();

      if (!response.ok) {
        const details =
          typeof json?.details === "string" && json.details.length > 0
            ? ` (${json.details})`
            : "";
        throw new Error(
          `${json?.error || "Failed to load character"}${details}`,
        );
      }

      setResults((prev) => ({
        ...prev,
        [char.id]: json as CharacterResult,
      }));
    } catch (error) {
      setErrors((prev) => ({
        ...prev,
        [char.id]: error instanceof Error ? error.message : "Unknown error",
      }));
    } finally {
      setLoading((prev) => ({ ...prev, [char.id]: false }));
    }
  }

  async function refreshCharacters(
    list: CharacterInput[],
    forceRefresh = false,
  ) {
    for (const char of list) {
      await fetchCharacter(char, forceRefresh);
    }
  }

  async function refreshAll() {
    await refreshCharacters(characters, true);
  }

  async function refreshDiscordStatus() {
    setIsCheckingDiscordStatus(true);
    try {
      const response = await fetch("/api/discord/status");
      const json = (await response.json()) as {
        active?: boolean;
        hasMutualGuild?: boolean;
      };

      if (!response.ok) {
        throw new Error("Failed to check Discord bot status.");
      }

      setNotificationsActive(Boolean(json.active));
    } catch {
      setNotificationStatus("Could not check Discord bot status right now.");
    } finally {
      setIsCheckingDiscordStatus(false);
    }
  }

  async function activateNotifications() {
    setIsActivatingNotifications(true);
    setNotificationStatus("");

    try {
      const response = await fetch("/api/discord/test-dm", { method: "POST" });
      const json = (await response.json()) as {
        error?: string;
        details?: string;
        code?: string;
        alreadyActive?: boolean;
      };

      if (!response.ok) {
        if (json.code === "NO_MUTUAL_GUILD") {
          const popup = window.open(
            "/api/discord/invite",
            "_blank",
            "noopener,noreferrer",
          );
          if (!popup) {
            throw new Error(
              "Popup blocked. Allow popups and try Activate notifications again.",
            );
          }
          setNotificationStatus(
            "Opened Discord invite. Complete invite, then click Activate notifications again.",
          );
          return;
        }
        if (json.code === "USER_DMS_DISABLED") {
          throw new Error(
            "Discord blocked the DM. Enable DMs from server members in Privacy Settings and try again.",
          );
        }
        const details =
          typeof json.details === "string" && json.details.length > 0
            ? ` (${json.details})`
            : "";
        throw new Error(
          `${json.error ?? "Failed to activate notifications."}${details}`,
        );
      }

      setNotificationStatus(
        json.alreadyActive
          ? "Discord notifications are already active."
          : "Discord notifications are now active.",
      );
      setNotificationsActive(true);
    } catch (error) {
      setNotificationStatus(
        error instanceof Error ? error.message : "Failed to activate notifications.",
      );
    } finally {
      setIsActivatingNotifications(false);
    }
  }

  async function sendReminderNow() {
    setIsSendingReminder(true);
    setReminderStatus("");

    try {
      const response = await fetch("/api/discord/reminder", { method: "POST" });
      const json = (await response.json()) as { error?: string; details?: string };

      if (!response.ok) {
        const details =
          typeof json.details === "string" && json.details.length > 0
            ? ` (${json.details})`
            : "";
        throw new Error(`${json.error ?? "Failed to send reminder."}${details}`);
      }

      setReminderStatus("Reminder sent on Discord.");
    } catch (error) {
      setReminderStatus(
        error instanceof Error ? error.message : "Failed to send reminder.",
      );
    } finally {
      setIsSendingReminder(false);
    }
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isAuthenticated) return;

    const trimmedName = name.trim();
    const trimmedRealm = realm.trim().toLowerCase();
    if (!trimmedName || !trimmedRealm) {
      setFormError("Please fill in realm and character name.");
      return;
    }
    setFormError("");

    const response = await fetch("/api/characters", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        region,
        realm: trimmedRealm,
        name: trimmedName,
      }),
    });

    const json = await response.json();
    if (!response.ok) {
      const baseMessage =
        typeof json?.error === "string" ? json.error : "Failed to add character";
      const details =
        typeof json?.details === "string" && json.details.length > 0
          ? ` (${json.details})`
          : "";
      setFormError(`${baseMessage}${details}`);
      return;
    }

    const created = json.character as CharacterInput;
    setCharacters((prev) => [created, ...prev]);
    setName("");
    await fetchCharacter(created, true);
  }

  async function removeCharacter(characterId: string) {
    if (!isAuthenticated) return;
    await fetch(`/api/characters/${characterId}`, {
      method: "DELETE",
    });

    setCharacters((prev) => prev.filter((char) => char.id !== characterId));
    setResults((prev) => {
      const next = { ...prev };
      delete next[characterId];
      return next;
    });
    setErrors((prev) => {
      const next = { ...prev };
      delete next[characterId];
      return next;
    });
    setLoading((prev) => {
      const next = { ...prev };
      delete next[characterId];
      return next;
    });
  }

  if (!isAuthenticated) {
    return (
      <main className="min-h-screen bg-zinc-950 px-4 py-12 text-zinc-100">
        <div className="mx-auto w-full max-w-6xl rounded-2xl border border-zinc-800/70 bg-zinc-900/60 p-6 text-sm text-zinc-400 shadow-[0_12px_40px_rgba(0,0,0,0.35)]">
          {isAuthLoading ? "Checking session..." : "Redirecting to login..."}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 px-4 py-12 text-zinc-100">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10">
        <section className="rounded-2xl border border-zinc-800/70 bg-zinc-900/60 p-6 shadow-[0_12px_40px_rgba(0,0,0,0.35)]">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">WoW Vault Tracker</h1>
              <p className="mt-1 text-sm text-zinc-400">
                Add characters, refresh data, and quickly see weekly progress
                toward 1/4/8 M+ vault slots.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-400">
                {session?.user?.name ?? session?.user?.email}
              </span>
              <button
                type="button"
                onClick={() => signOut()}
                className="rounded-md border border-zinc-600/80 bg-zinc-800/70 px-3 py-2 text-sm text-zinc-100 hover:border-zinc-500 hover:bg-zinc-700/80"
              >
                Log out
              </button>
            </div>
          </div>

          <form onSubmit={onSubmit} className="mt-4 grid gap-3 md:grid-cols-6">
            <SearchableSelect
              value={region}
              options={regionOptions}
              onChange={onRegionChange}
              className="md:col-span-1"
              searchable={false}
            />
            <RealmCombobox
              region={region}
              value={realm}
              onChange={setRealm}
              className="md:col-span-2"
            />
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="character name"
              className="rounded-md border border-zinc-700 bg-zinc-950/70 px-3 py-2 text-zinc-100 placeholder:text-zinc-500 md:col-span-2"
            />
            <button
              type="submit"
              className="rounded-md border border-amber-300/70 bg-amber-400 px-3 py-2 font-semibold text-zinc-950 hover:bg-amber-300 md:col-span-1"
            >
              Add
            </button>
          </form>
          {formError && (
            <p className="mt-2 text-sm text-red-300">{formError}</p>
          )}
        </section>

        <section className="grid gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {!notificationsActive && (
                <button
                  type="button"
                  onClick={activateNotifications}
                  disabled={isActivatingNotifications || isCheckingDiscordStatus}
                  className="rounded-md border border-indigo-300/50 bg-indigo-500/80 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isCheckingDiscordStatus
                    ? "Checking..."
                    : isActivatingNotifications
                    ? "Activating..."
                    : "Activate notifications"}
                </button>
              )}
              {!notificationsActive && notificationStatus && (
                <p className="text-xs text-zinc-400">{notificationStatus}</p>
              )}
              {notificationsActive && (
                <>
                  <button
                    type="button"
                    onClick={sendReminderNow}
                    disabled={isSendingReminder}
                    className="rounded-md border border-zinc-600/80 bg-zinc-800/70 px-3 py-2 text-sm text-zinc-100 hover:border-zinc-500 hover:bg-zinc-700/80 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isSendingReminder ? "Sending reminder..." : "Send reminder now"}
                  </button>
                  {reminderStatus && (
                    <p className="text-xs text-zinc-400">{reminderStatus}</p>
                  )}
                </>
              )}
            </div>
            <button
              type="button"
              onClick={refreshAll}
              disabled={!hasCharacters || isLoadingCharacters}
              className="rounded-md border border-zinc-600/80 bg-zinc-800/70 px-3 py-2 text-sm text-zinc-100 hover:border-zinc-500 hover:bg-zinc-700/80 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Refresh all
            </button>
          </div>

          {isLoadingCharacters && (
            <div className="rounded-xl border border-dashed border-zinc-700 p-5 text-sm text-zinc-400">
              Loading characters from database...
            </div>
          )}

          {!isLoadingCharacters && !hasCharacters && (
            <div className="rounded-xl border border-dashed border-zinc-700 p-5 text-sm text-zinc-400">
              No characters yet. Add your first character above.
            </div>
          )}

          {characters.map((char) => {
            const result = results[char.id];
            const error = errors[char.id];
            const isLoading = Boolean(loading[char.id]);

            return (
              <CharacterCard
                key={char.id}
                character={char}
                result={result}
                error={error}
                isLoading={isLoading}
                onRefresh={() => fetchCharacter(char, true)}
                onRemove={() => removeCharacter(char.id)}
              />
            );
          })}
        </section>
      </div>
    </main>
  );
}
