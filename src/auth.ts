import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import DiscordProvider from "next-auth/providers/discord";

const syntheticAdminDiscordId =
  process.env.ADMIN_DISCORD_ID?.trim() || "local-admin-credentials";

function isAdminCredentialsEnabled() {
  return (
    Boolean(process.env.ADMIN_USERNAME?.trim()) &&
    Boolean(process.env.ADMIN_PASSWORD)
  );
}

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET,
  providers: [
    DiscordProvider({
      clientId: process.env.DISCORD_CLIENT_ID ?? "",
      clientSecret: process.env.DISCORD_CLIENT_SECRET ?? "",
    }),
    ...(isAdminCredentialsEnabled()
      ? [
          CredentialsProvider({
            id: "credentials",
            name: "Admin (env)",
            credentials: {
              username: { label: "Username", type: "text" },
              password: { label: "Password", type: "password" },
            },
            async authorize(credentials) {
              const expectedUser = process.env.ADMIN_USERNAME?.trim();
              const expectedPass = process.env.ADMIN_PASSWORD;
              if (!expectedUser || expectedPass === undefined) {
                return null;
              }
              if (
                credentials?.username === expectedUser &&
                credentials?.password === expectedPass
              ) {
                return {
                  id: syntheticAdminDiscordId,
                  name: "Admin (local)",
                  email: "admin@local.dev",
                  discordId: syntheticAdminDiscordId,
                };
              }
              return null;
            },
          }),
        ]
      : []),
  ],
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, account, user }) {
      if (account?.provider === "discord") {
        token.discordId = account.providerAccountId;
      } else if (user?.discordId) {
        token.discordId = user.discordId;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.discordId = token.discordId as string | undefined;
      }
      return session;
    },
  },
};
