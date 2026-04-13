"use client";

import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function LoginPage() {
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated") {
      router.replace("/");
    }
  }, [router, status]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950 px-4 py-8 text-zinc-100">
      <div className="w-full max-w-xl rounded-2xl border border-zinc-800/70 bg-zinc-900/60 p-8 shadow-[0_12px_40px_rgba(0,0,0,0.35)]">
        <h1 className="text-3xl font-bold tracking-tight">WoW Vault Tracker</h1>
        <p className="mt-2 text-sm text-zinc-400">
          Sign in with Discord to view and save your characters.
        </p>

        <button
          type="button"
          onClick={() => signIn("discord", { callbackUrl: "/" })}
          className="mt-6 w-full cursor-pointer rounded-md border border-indigo-300/70 bg-indigo-500 px-4 py-3 text-sm font-semibold text-white hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={status === "loading"}
        >
          {status === "loading" ? "Checking session..." : "Log in with Discord"}
        </button>
      </div>
    </main>
  );
}
