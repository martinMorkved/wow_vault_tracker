# WoW Vault Tracker

En liten [Next.js](https://nextjs.org)-app som viser hvor mange **Mythic+**-runder på **+10 eller høyere** du har gjort denne uken mot *Great Vault* (1 / 4 / 8 valg), basert på data fra [Raider.io](https://raider.io). Du logger inn, legger til karakterer (realm + navn), og får oversikt og mulighet til å oppdatere data.

## Funksjoner

- Innlogging med **Discord** (NextAuth)
- Lagring av flere karakterer per bruker (**PostgreSQL** via Prisma, Neon-adapter)
- Region **EU** eller **US · OCE · LA**, søkbar realm-liste
- Telling mot ukens vault-slots ut fra Raider.io sine Mythic+-felt
- Cache av profilrespons for raskere lasting (TTL i API-et)

## Teknologier

Next.js (App Router) · React · TypeScript · Tailwind CSS · NextAuth.js · Prisma · PostgreSQL (Neon) · Raider.io API

## Forutsetninger

- Node.js (LTS anbefalt)
- En PostgreSQL-database (f.eks. [Neon](https://neon.tech)) og `DATABASE_URL`
- Discord-app for OAuth (se under)

## Miljøvariabler

Opprett en `.env` eller `.env.local` (ikke commit denne filen):

| Variabel | Beskrivelse |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string (påkrevd) |
| `NEXTAUTH_SECRET` eller `AUTH_SECRET` | Hemmelig nøkkel for JWT-økter (påkrevd i produksjon) |
| `NEXTAUTH_URL` | Appens offentlige URL, f.eks. `http://localhost:3000` lokalt eller produksjons-URL |
| `DISCORD_CLIENT_ID` | Fra Discord Developer Portal |
| `DISCORD_CLIENT_SECRET` | Fra Discord Developer Portal |
| `ADMIN_USERNAME` | Valgfritt: brukernavn for lokal «Credentials»-innlogging |
| `ADMIN_PASSWORD` | Valgfritt: passord (må settes sammen med `ADMIN_USERNAME`) |
| `ADMIN_DISCORD_ID` | Valgfritt: syntetisk bruker-ID når du bruker credentials-login |

Når `ADMIN_USERNAME` og `ADMIN_PASSWORD` er satt, kan du i tillegg logge inn via credentials på [`/login/dev`](http://localhost:3000/login/dev) (nyttig for lokal testing uten Discord).

### Discord OAuth

1. Opprett en applikasjon under [Discord Developer Portal](https://discord.com/developers/applications).
2. Under **OAuth2** → **Redirects**, legg til f.eks.  
   `http://localhost:3000/api/auth/callback/discord` (utvikling) og produksjons-URL med samme path.
3. Kopier **Client ID** og **Client Secret** til miljøvariablene over.

## Kom i gang

```bash
npm install
npx prisma migrate dev
npm run dev
```

Åpne [http://localhost:3000](http://localhost:3000). Du blir sendt til innlogging hvis du ikke har aktiv økt.

### Nyttige kommandoer

| Script | Beskrivelse |
|--------|-------------|
| `npm run dev` | Utviklingsserver |
| `npm run build` | Produksjonsbygg |
| `npm run start` | Kjør produksjonsbygg lokalt |
| `npm run lint` | ESLint |
| `npx prisma studio` | GUI mot databasen |

## Datakilde

Karakter- og Mythic+-data hentes fra Raider.io sitt offentlige API. Tidslinjer og ukentlig reset følger logikken i appen og kan avvike noe fra in-game visning; sjekk Raider.io ved tvil.