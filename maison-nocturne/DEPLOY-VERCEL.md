# Free deployment: Vercel Hobby + Neon Free

This project now includes the 3D game AND a Vercel tournament API. No Render
service, persistent disk, paid assets or always-on laptop is required after
deployment. Choose Vercel Hobby (for eligible personal, non-commercial use)
and Neon Free. Stay within their quotas; free hosting is not unlimited.

## 1. Create the database

1. Sign in at https://console.neon.tech and create a project on the **Free** plan.
2. Choose a region near your Vercel Functions region. Vercel's default is US East;
   using the same region reduces network delay when ranking submissions.
3. Open the project's **SQL Editor**, select the database/branch you will use,
   paste all of `server/schema.sql`, and run it once. Alternatively, after `neon deploy` pulls credentials, run `npm run db:migrate`; it uses the direct URL for migrations.
4. Click **Connect**, enable **connection pooling**, and copy the PostgreSQL
   connection string. Keep its TLS options (`sslmode=require`, etc.). This is
   your `DATABASE_URL`. Do not paste it into chat, public files or frontend code.

`npm start` now loads `.env.local` (or `.env`) automatically. When `DATABASE_URL` is present, the local app uses the same Neon backend as Vercel; without it, same-Wi-Fi file-backed demos still work. The Node driver uses TLS certificate verification and the Vercel entry point attaches its pool to the Vercel lifecycle.

The database is deliberately accessed only by the server. Do not expose the
`couture_events` table through a public/anonymous database API: it holds private
participant and organiser session tokens.

## 2. Put the source in GitHub

Upload the contents of the **maison-nocturne** directory, including `api`,
`server`, `src`, `public`, `package.json`, `pnpm-lock.yaml`, `vercel.json` and
`tsconfig.json`. The supplied deployment ZIP contains the project folder.

Do not upload `data`, `node_modules`, `.env` files, `.vercel`, or the parent
`release` directory with private host-access files. The project's `.gitignore`
already excludes runtime data and secrets. `.env.example` is safe to include.

## 3. Deploy the whole application on Vercel

1. In Vercel, select **Add New → Project** and import the repository on **Hobby**.
2. Root Directory: the folder containing `package.json` (usually `.` if you
   uploaded its contents, or `maison-nocturne` if you uploaded the folder).
3. Framework: **Vite**. Node.js: **24.x**.
4. The included configuration sets install to `npm install --ignore-scripts`,
   build to `npm run build`, and output to `dist`.
5. Before deploying, add these **server environment variables**:

| Variable | Value |
| --- | --- |
| `DATABASE_URL` | The pooled Neon connection string from step 1 |
| `HOST_KEY` | A long random private organiser password you choose |

Do **not** add `VITE_` to either name: that prefix exposes values in client code.
Set the variables for Production. If you want Preview tournaments, also configure
Preview variables, preferably with a separate Neon branch/database and host key.
Redeploy after changing variables.

6. Click **Deploy**. Use the public Production `https://…vercel.app` URL.
7. Open `https://YOUR-SITE.vercel.app/api/health`. It should return
   `{"app":"lost-couture-collection","database":"connected"}`.

`PUBLIC_URL` is optional. By default, QR codes use the domain you opened. If you
want one permanent canonical address, set `PUBLIC_URL` to that HTTPS origin
without a trailing slash and redeploy. Do not put localhost or a Wi-Fi IP there.
Keep the included API rewrites in `vercel.json`; do not replace them with an
old external-backend rewrite or a catch-all SPA rewrite.

## 4. Test from mobile data

1. On your computer, open `https://YOUR-SITE.vercel.app/host.html`.
2. Enter the `HOST_KEY` you chose. Set Participants to **1** and create a rehearsal.
3. Scan its new QR on your phone with Wi-Fi off. Enter a name and join.
4. Start Room 1 from the host screen. Collect the three clues and answer.
5. Check that rank, completion time and qualification appear on both screens.
6. Start each later round from the host page; finish all four and verify the winner.
7. Refresh the host and phone pages: the saved event/session should reconnect.
8. Test two or more phones together before the actual class.

Your old local QR, local host key and local event codes are separate. They are
not copied into Neon. Create a **fresh 50-player event** for the class and share
only its player QR, never the host key or host-access fragment.

All 50 join before you start. Results appear once every active player finishes,
or after the host explicitly closes the round. Unfinished players do not qualify.
The next room starts only when the host starts it: **50 → 30 → 15 → 5 → 1**.
Keep the same browser on each phone; clearing storage loses its participant token.

## Reliability, fairness and free quotas

Each event is a PostgreSQL row. Writes run in transactions with `SELECT … FOR
UPDATE`, so separate Vercel functions cannot overwrite simultaneous joins,
clues, answers or qualifiers. Wrong-answer cooldowns are committed even when
an answer is rejected. Duplicate joins and finish retries remain idempotent.
Database time is used across instances. Finishes rank by serialized database
processing order; network delay and database queueing count. This is a classroom
competition, not a tamper-proof exam or precision sports timing system.

There is no server filesystem persistence in cloud mode and no in-memory event
cache. A cold start reads the saved event from Neon. API responses are not cached.
The API caps each event at 50 entrants and the database at 100 stored events.

The browser polls approximately every 2.5 seconds while a live event is open.
50 players plus the host use roughly 73,440 polling requests per hour, plus
game actions and assets. Close tournament tabs after the event and watch both
providers' free usage dashboards. Free tiers can pause or limit service when
quotas are reached, and cold starts can delay the first request. These providers
do not guarantee unlimited free capacity. No paid plan is required by this code.

## Validation and troubleshooting

`npm test` runs the existing game tests and a complete database-backed tournament
through the real API handler, with 50 concurrent join requests and concurrent
finishes in every round. By default it uses embedded PostgreSQL (PGlite), which
serializes connections. It verifies SQL persistence, fresh function instances,
qualification counts, auth, duplicate retries, cooldowns and QR/config routes.

For full HTTP verification, start the built app on port 5175 and run `npm run verify:live`. This creates and completes a clearly named 50-player QA event, retained as test evidence; do not share its QR with the class. Set `VERIFY_URL` to use another address.

To additionally test true multi-connection PostgreSQL row locking against Neon,
set `TEST_DATABASE_URL` to a dedicated test database’s direct/unpooled URL and run `npm run test:cloud`.
The test creates and removes its own uniquely named schema. It does not touch
existing events. Never put that URL in a committed file. A live deployed and
physical-phone load test is still required before the classroom event.

- **503 / service unavailable:** check both server variables, SQL schema setup,
  database availability and Neon quotas. Redeploy after variable changes.
- **404 at `/api/config`:** check Root Directory and the included `vercel.json`.
- **Host key incorrect:** use the deployed `HOST_KEY`, not the local demo key.
- **QR opens localhost:** create a new event on the public host page and remove
  any old `PUBLIC_URL` pointing to the local computer.
- **Vercel login appears on phones:** use the public Production URL, not a
  protected preview deployment. Verify participant access before class.
- **Round cannot start:** all expected places must be filled. Rehearse with 1
  or 2 participants, not 50 empty places.

## Official references

- Vercel Hobby: https://vercel.com/docs/plans/hobby
- Vercel Functions: https://vercel.com/docs/functions/runtimes/node-js
- Neon Free: https://neon.com/pricing
- Neon Node connection guide: https://neon.com/docs/guides/node
