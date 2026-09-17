STUDIO GAME CONTRACT v1.1
Every mini-game MUST comply. The shell (Kotlin app) and portals (CrazyGames) interface with games ONLY through this contract. Non-compliant games do not ship.

1. FILE & FORMAT
1.1 Single self-contained .html file. All CSS/JS/art inline.
1.2 Zero network calls at runtime (no CDNs, no fonts.googleapis, no analytics). Fonts: system stack OR base64-embedded woff2 (<40KB total). Exception: portal SDK script, loaded lazily, wrapped so the game runs perfectly if it fails to load.
1.3 Works file:// → so it can be loaded from APK assets with no server.
1.4 Performance is a REQUIREMENT at every tier — potentially large file size is acceptable ONLY when the game runs smoothly; every game must be optimized for its tier. Lag is a ship-blocker, not a style choice.

2. TECH LADDER
Games must pick the LIGHTEST renderer that delivers the gameplay. Budget limits apply to the total HTML file size.
- Tier 1 Tiny:      Vanilla JS + Canvas 2D          budget ≤300KB
- Tier 2 Physics:   Matter.js + Canvas 2D           budget ≤450KB
- Tier 3 Large 2D:  Phaser (inlined)                budget ≤1MB
- Tier 4 Heavy 2D:  PixiJS/WebGL (inlined)          budget ≤1.5MB
- Tier 5 Simple 3D: Three.js/WebGL (inlined)        budget ≤2.5MB
- Big games:        Unity (separate pipeline, not shell)

3. UNCHANGED CORE REQUIREMENTS
Regardless of Tier, all games must implement:
- Studio SDK block
- window.Game lifecycle (sim-clock pause/resume/destroy)
- STUDIO_GAME_MANIFEST block (with optional "renderer" field: canvas|matter|phaser|pixi|three)
- Juice requirements (screenshake, floating text, etc.)
