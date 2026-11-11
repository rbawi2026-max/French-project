# The Lost Couture Collection

Playable four-chapter implementation. The previous salon demo is preserved at `?experience=salon`; its source and storage are independent.

## Direction

A fictional Parisian fashion museum in the present day, containing reconstructed historical galleries. Realistic interior proportions, parquet, gilt panelling, warm spotlights, velvet, period-style furniture and procedural garments. Mystery without horror. Laptop keyboard and mouse; arrow-key and drag-look fallbacks for trackpads. No timer, no prior knowledge required, optional progressive hints. This is an initial playable art pass: the garments are simplified teaching models, not scanned historical garments or exact replicas.

The fictional curator Élise Moreau moved the exhibition collection into a protected runway vault because of a roof leak. A damaged transfer record and security locks obscured its location. Students reconstruct the transfer by following the museum's historical research trail. Museum, story documents, collection and codes are fictional; cited historical context is labelled separately.

## Rooms and reasoning

### I. The Lost Archive

Shadowed bookcases, antique desk, three era mannequins, framed timeline, parquet and velvet seating. Discover the inventory on the round desk (1805), observe the back-left ivory dress (waist below the bust), and inspect the back-wall timeline (date and silhouette comparisons). Answer **Empire**, supported by **a waist directly beneath the bust**. All three clues are required. This earns the fictional **COLUMN · 1** seal.

The court and 1920s mannequins give visual comparison; they are deliberately decorative, not extra required clues. The timeline supplies the necessary vocabulary, so no outside knowledge is needed.

### II. The Secret Atelier

Cutting table with an animated drawer, drafting material, sewing-machine silhouette, fabric rolls and gowns. The transfer in the drawer carries the column emblem from Room I. It specifies an English-born founder and a Paris firm established in 1858. The house register on the round desk provides designer/house associations; the left gown's teaching label corroborates Worth. Answer **House of Worth**, supported by **the English-born founder's Paris firm of 1858**. Earn **NEEDLE · 8**.

### III. A New Silhouette

Salon seating, an ivory jacket with a full black skirt, framed press annotation and a presentation card. The card on the desk gives 12 February 1947. The annotation on the back wall supplies the New Look nickname. The garment supports a narrow natural waist/full skirt comparison with the Empire silhouette recorded earlier. Answer **New Look 1947**, with **defined natural waist and full skirt**. Earn **PETAL · 7**.

Historical precision: Dior's debut collection included the lines Corolle and En 8. New Look is the enduring nickname, not the original name of one line. The procedural garment is a silhouette interpretation, not an exact Bar suit reproduction.

### IV. The Last Runway

A central runway, rows of seats, backstage folio, invitation desk, timeline and collection vault. The invitation reveals the safekeeping story and code rule. The running-order folio maps earlier discoveries to COLUMN → NEEDLE → PETAL. The timeline distinguishes the 1868 precursor, the federation's 1973 creation, and its 2017 name change. Use earned seal digits **1, 8, 7**, then the final digit of **1973**: **1873**. The required supporting answer identifies the federation's creation. Historical evidence from previous rooms is required, along with all three new clues.

The fictional code is not a historical date. The founding of the federation is an institutional milestone in the development of Paris fashion events; the game does not claim that fashion shows first existed in 1973, or confuse today's Paris Fashion Week and Haute Couture Week calendars.

The physical vault opens. Crossing its threshold activates runway lights, presents the recovered teaching collection and plays a short, skippable camera sequence. The epilogue explains the mystery and provides a history recap with sources.

## Play and implementation

- WASD walks, mouse looks, E inspects the aimed-at nearby object, J opens the journal, H gives progressively more explicit hints, Escape pauses/releases the mouse.
- Click captures the mouse. Hold-and-drag or up/down plus left/right arrow keys provide alternatives. Closing a panel restores navigation; clicking the scene resumes mouse capture.
- One compact action prompt appears only when aiming near an interactable, within reach and without a solid object blocking it. There are no constantly glowing clue markers.
- Inspection presents a physical action before recording the clue. The atelier drawer visibly opens. Previously collected evidence remains readable; the evidence board compares only discovered cards.
- Each door requires the configured evidence, exact accepted answer and supporting deduction. Correct answers animate the lock and door. Players then walk through the actual doorway to advance.
- Incorrect submissions give feedback and a brief retry delay. This is a learning game, not a tamper-proof assessment; client-side answer data can be inspected with developer tools.
- Local browser storage saves discoveries, solved rooms, current room and hint usage. Corrupt saves are normalized; blocked storage leaves session play available. Camera position and settings reset on reload.
- One room is rendered at a time. Doorway transitions load the next gallery and dispose of the previous renderer, geometry, materials and textures. Static geometry is merged by material, floorboards are instanced, pixel ratio is capped, and low graphics disables shadows. No network asset downloads or paid APIs are needed.
- Sound is optional synthesized ambience and short interaction tones. It is not a finished recorded soundscape. All information remains readable with audio muted.
- Three.js + TypeScript + Vite are retained from the repository. React is unnecessary for this existing small application.

## File responsibilities

- `src/escape/content.ts`: rooms, clue locations, sources, accepted answers, evidence deductions, hints, rewards and door event IDs.
- `src/escape/state.ts`: clue discovery, strict answer validation, sequential progression, save restoration and configuration validation.
- `src/escape/world.ts`: procedural environments, collision, movement, camera, raycasting, lock/door/drawer animations, performance settings and cinematic.
- `src/escape/app.ts`: journal, evidence comparison, inspection, door UI, pause/settings, save orchestration and story flow.
- `src/escape/audio.ts`: optional synthesized sounds.
- `src/entry.ts`: switches between the four-room game and the untouched original salon demo.

## Historical sources

Verified on 29 October 2026. Text within the game is paraphrased; story documents are reconstructions, not purported historic originals.

- [FIT Fashion History Timeline: 1800–1809](https://fashionhistory.fitnyc.edu/1800-1809/) — high waist and classical influence.
- [The Metropolitan Museum of Art: Charles Frederick Worth and the House of Worth](https://www.metmuseum.org/essays/charles-frederick-worth-1825-1895-and-the-house-of-worth) — founder, Paris firm and 1858.
- [La Galerie Dior: History](https://www.galeriedior.com/en/history) — debut date, Corolle and En 8, Carmel Snow and New Look.
- [Museo del Traje: Christian Dior and the New Look](https://www.cultura.gob.es/mtraje/visita/visita-virtual/moda-renovada/dior-new-look.html) — silhouette characteristics.
- [FHCM: Our history](https://www.fhcm.paris/en/our-history) — 1868 predecessor, 1973 federation, 2017 name and fashion calendars.

## Asset provenance

No external images, logos, recordings or 3D models are bundled. Architecture, textures, signs, garments and furniture are generated in code. The scene adapts the existing project’s original procedural salon geometry. The system Georgia/Arial fonts require no third-party requests. Fashion-house names are educational references; the museum does not imply endorsement or affiliation.
