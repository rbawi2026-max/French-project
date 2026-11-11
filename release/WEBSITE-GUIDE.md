# Mobile tournament release

The main experience now has four replacement puzzles, indirect clues, physical clue animations, phone movement controls, touch answer cards and a server-backed 50 → 30 → 15 → 5 → 1 elimination tournament. The original salon remains separately available at `?experience=salon`.

## Open on this computer

Double-click **Start Museum.command**. Keep the Terminal window and host computer awake. Open the preview address it prints (normally http://127.0.0.1:5174/). The host screen is `/host.html`. The private HOST KEY appears in that Terminal; keep it away from participants. The launcher uses installed Node or the bundled Codex Node runtime.

## Let phones join

All phones can join over the same Wi-Fi using the network URL printed by the server. Create an event for 50 participants on the host page; it generates an event-specific QR code and shareable link. The QR generator runs locally and does not send participant data to a third-party service. Each phone joins with a unique display name.

The host starts a round once all expected players have joined. Each subsequent round starts with the previous qualifiers. Round completion is automatic when everyone active finishes; the host can also close a round early with confirmation. Unfinished players do not qualify. The next round does not begin until the host starts it. Results show 30 / 15 / 5 qualifiers, then the single winner. Early closure or a smaller rehearsal can produce fewer qualifiers.

The host computer's firewall must permit the server; Wi-Fi client isolation can prevent phones reaching it. Test on the actual venue network before the event. This is a shared online classroom game, not a LAN multiplayer 3D world: each phone renders its own room and the server coordinates starts, records evidence/answers, and ranks finishes.

## Phone controls

Left thumbstick walks; swipe the room to look around; tap nearby objects to open books, move notes, rotate displays or open the drawer. Clues are recorded after the reveal animation. Tap the door, compare all collected evidence and drag an answer card into the box. A tap-card, tap-box alternative is included. The built-in guide is `/how-to-play.html`.

## Public access / mobile data

A public preview has not been deployed automatically. Deploy this complete Node project to a host that supports a persistent web service; a static-only upload cannot run the tournament API. Use Node 24+, build with `npm install && npm run build`, then run `node serve.mjs`. The server uses the host's `PORT` environment variable. Set:

- `PUBLIC_URL`: the public HTTPS root, e.g. the deployed service address (not localhost).
- `HOST_KEY`: a strong private organiser password.
- `DATA_DIR`: a persistent writable directory for saved results and credentials. Attach persistent storage or results may be lost when the host restarts/redeploys.

One server instance is required: the lightweight file store does not coordinate multiple replicas. The supplied Dockerfile is an alternative. No paid assets or generation APIs are required by the game. Hosting provider terms and costs depend on the selected service.

## Timing and fairness

Timing starts on the server for all active players simultaneously. The first correct submissions received by the server rank highest. Menus/hints/backgrounding do not pause the tournament clock. Network latency counts. Identical millisecond times are ordered by server receipt sequence. Client-provided scores/times are ignored. Evidence and eligible-round checks are enforced on the server, and wrong answers never finish a round. Client assets still contain solo answer data, so this is not a tamper-proof examination.

Private tokens and participant names/results are stored under `data/`, which is excluded from source archives/Git. Host tokens are not returned to players. Do not share that folder or your host key. Player recovery uses the same browser's saved token. Clearing that storage loses access to that identity. The host page can reconnect from its own browser storage.

## Development and tests

- `npm run dev` runs Vite; `npm start` runs the built shared server.
- `npm run build` performs TypeScript checking and creates `dist/`.
- `npm test` covers both legacy and new puzzle logic plus the four-stage tournament.
- `server/tournament.test.mjs` simulates 50 entrants through 30, 15, 5, 1; verifies permissions, progression gates, wrong/missing evidence, idempotency, early closure and persisted results.
- `src/escape/content.ts` defines room stories, clues, choices, answers and hints. Clue prose avoids literal answers; explanations and historical sources appear after solving.

Current assets are procedural historical-style interiors and simplified garments. Physical phone testing on the target devices and venue network remains necessary; browser emulation is not a substitute for every phone GPU/browser combination.

## Sources and asset credits

Language: Cambridge French–English dictionary, robe: https://dictionary.cambridge.org/dictionary/french-english/robe
Dior: https://www.galeriedior.com/en/history
Haute couture: https://www.fhcm.paris/en/our-history
Paris Fashion Week: https://www.fhcm.paris/en/paris-fashion-week

Architecture/furniture/garments are original procedural geometry adapted from the pre-existing project. QR encoder: qrcode-generator by Kazuhiko Arase, MIT licence; vendored source `server/qrcode.cjs` retains its copyright notice. Source: https://github.com/kazuhikoarase/qrcode-generator (js/dist/qrcode.js).
