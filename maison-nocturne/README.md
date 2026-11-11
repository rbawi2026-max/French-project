# Current version: mobile tournament

**Free public deployment is now supported:** Vercel Functions + Neon PostgreSQL. Follow [DEPLOY-VERCEL.md](DEPLOY-VERCEL.md). The local server instructions below remain available for same-Wi-Fi demos.

Read [TOURNAMENT-README.md](./TOURNAMENT-README.md) for the current four questions, phone controls, QR access, and 50 → 30 → 15 → 5 → 1 tournament. Open `Start Museum.command` to run it.

The notes below document earlier versions.

# Maison Nocturne

A desktop-first, browser-based 3D escape-room prototype about French fashion.
Room 1 is playable. Rooms 2–4 are an outlined continuation, not implemented levels.

## Run

Requires Node.js 22.18+ and pnpm 11.

```sh
pnpm install
pnpm dev
pnpm test
pnpm build
pnpm preview
```

## Stack

Three.js, TypeScript, Vite, HTML/CSS, Web Audio, and browser local storage.
No backend, accounts, paid APIs, or externally downloaded 3D assets are needed.
Google Fonts supplies Cormorant Garamond and Manrope, with system font fallbacks.
The scene and garments are procedural 3D models; they are stylised silhouette studies.

## Experience

The player is a new fashion archivist in a fictional, present-day Parisian couture house.
The missing collection has been concealed by the house's enchanted memories.
Dark cinematic atmosphere; no horror, jump scares, or time limit.

1. Search beneath the court gown’s hem, under the Empire display plaque, inside the modern dress’s plinth, and behind the mirror’s mist.
2. Solve four different fashion puzzles to recover the Rose, Column, Pearl, and Star seal digits.
3. Lift the invitation’s wax-sealed flap to find the ordering instructions.
4. Enter the four-digit combination on the door’s keypad.

See [PUZZLE-DESIGN.md](PUZZLE-DESIGN.md) for the facilitator’s answer key and clue map (spoilers).

Drag to look, WASD to walk. Arrow keys move forward/back and turn.
Click markers to inspect, or use the keyboard-accessible Objects menu.
Touch devices have movement buttons. Hidden evidence, typed riddles, illustrated matching, multi-select deduction, a keypad, journal, progressive hints, sound, reduced motion,
viewpoint reset, replay, and browser-local progress are included.

## Historical sources

- [The Metropolitan Museum of Art: Robe à la française](https://www.metmuseum.org/art/collection/search/82640)
- [ASU FIDM Museum: The Empire Era Silhouette](https://thefidmmuseum.org/learn/articles/empire-era-silhouette)
- [The Metropolitan Museum of Art: French evening dress, 1920s](https://www.metmuseum.org/art/collection/search/156032)

The museum sources support the fashion clues. Maison Nocturne, its founding date,
its collection, Éléonore V., and the supernatural events are fictional.

## Planned continuation

2. The House of Signatures: French fashion houses and influential designers.
3. The 1947 Atelier: Christian Dior's landmark collection.
4. The Final Runway: Paris Fashion Week and the recovered collection.

## Design limitations

The prototype prioritises a complete interaction loop and visual direction.
Garments are not photorealistic cloth simulations or museum-object replicas.
The enchanted mirror is a shader effect, not a physical reflection.
WebGL 2 and hardware acceleration are required. Performance will vary on mobile
devices. No multiplayer, cloud saves, or Rooms 2–4 are implemented yet.
The new riddle edition saves separately from the earlier memory-collection prototype.

---

## New: four-room escape experience

The default entry now opens **The Lost Couture Collection**, a complete sequential escape-room prototype. The original salon is still available at `/?experience=salon`; the original source files and save key are preserved.

From this folder, with Node.js 22.6+ (24 recommended) and dependencies installed:

```sh
npm run dev
npm test
npm run build
```

Open the local address printed by Vite. Use a WebGL-capable desktop browser. No backend, account, paid service or remote asset API is required. The initial dependency install uses the package registry; the game itself generates its assets locally.

**Controls:** WASD to walk, mouse to look after clicking the scene, E to inspect the nearby object under the centre dot, J for journal, H for hints, Escape to pause. Hold-and-drag and arrow-key turning are alternatives to mouse capture. Use the settings menu for sound, sensitivity, reduced motion and low graphics.

**Progress:** Discover all relevant evidence, provide the door's answer and supporting deduction, then physically walk through the open door. Reload preserves evidence, solved puzzles, room and hints. Restart requires confirmation. Blocked browser storage allows session play but cannot preserve it across reload.

The first art pass uses detailed procedural architecture and simplified original garment models. It is not a photorealistic scan of a real museum or an exact reconstruction of designer garments. Sound is synthesized. Performance should be checked on the actual classroom laptops before deployment.

Read [ESCAPE-ROOM-DESIGN.md](./ESCAPE-ROOM-DESIGN.md) for the four puzzles, reasoning chains, evidence locations, architecture, historical sources and asset provenance. The new files live in `src/escape/`.

On this computer, `./start-local.sh` also works with the bundled Codex Node runtime when Node is not on the shell PATH.

### Verification of the new experience

- TypeScript check and production build pass.
- All 12 automated tests pass, covering the original salon and the new four-room progression.
- A Chrome browser playthrough discovered every clue through movement and inspection, rejected an incorrect answer, solved all four doors, crossed all four thresholds, viewed previous-room journal evidence, played the ending, and restored completion after reload. No browser console errors were reported.
- The repeatable browser check is `tests/escape-browser.mjs`. It requires Playwright and Chrome. With a running development server, run `node tests/escape-browser.mjs`. Set `COUTURE_URL` if Vite uses a port other than 5173. Optionally set `PLAYWRIGHT_MODULE` to an existing Playwright module path. Screenshots are written to `/tmp/couture-*.png`.
- Browser automation uses a read-only camera probe in the test itself; no teleportation or answer bypass is added to the game.
- Classroom hardware performance and student usability still need real-device feedback.
