import Link from "next/link";
import { DevLoginForm } from "./dev-login-form";

function isCredentialsLoginConfigured() {
  return (
    Boolean(process.env.ADMIN_USERNAME?.trim()) &&
    process.env.ADMIN_PASSWORD !== undefined &&
    process.env.ADMIN_PASSWORD !== ""
  );
}

export default function DevLoginPage() {
  const enabled = isCredentialsLoginConfigured();

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950 px-4 py-8 text-zinc-100">
      <div className="w-full max-w-xl rounded-2xl border border-zinc-800/70 bg-zinc-900/60 p-8 shadow-[0_12px_40px_rgba(0,0,0,0.35)]">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
          Development
        </p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">Admin / local login</h1>
        <p className="mt-2 text-sm text-zinc-400">
          Username and password from your environment (
          <code className="rounded bg-zinc-800/80 px-1 py-0.5 text-xs text-zinc-300">
            ADMIN_USERNAME
          </code>
          ,{" "}
          <code className="rounded bg-zinc-800/80 px-1 py-0.5 text-xs text-zinc-300">
            ADMIN_PASSWORD
          </code>
          ). Optional:{" "}
          <code className="rounded bg-zinc-800/80 px-1 py-0.5 text-xs text-zinc-300">
            ADMIN_DISCORD_ID
          </code>{" "}
          to control the synthetic Discord id used in the database.
        </p>

        {enabled ? (
          <DevLoginForm />
        ) : (
          <p className="mt-6 rounded-lg border border-amber-900/50 bg-amber-950/40 px-4 py-3 text-sm text-amber-200/90">
            This login is disabled. Set{" "}
            <code className="rounded bg-zinc-900 px-1 py-0.5 text-xs">ADMIN_USERNAME</code>{" "}
            and{" "}
            <code className="rounded bg-zinc-900 px-1 py-0.5 text-xs">ADMIN_PASSWORD</code>{" "}
            in <code className="rounded bg-zinc-900 px-1 py-0.5 text-xs">.env</code>, then
            restart the dev server.
          </p>
        )}

        <p className="mt-8 text-center text-sm text-zinc-500">
          <Link
            href="/login"
            className="underline decoration-zinc-600 underline-offset-2 hover:text-zinc-400"
          >
            Back to Discord login
          </Link>
        </p>
      </div>
    </main>
  );
}
