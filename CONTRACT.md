STUDIO GAME CONTRACT v1.0
Every mini-game MUST comply. The shell (Kotlin app) and portals (CrazyGames)interface with games ONLY through this contract. Non-compliant games do not ship.

1. FILE & FORMAT
1.1 Single self-contained .html file. All CSS/JS/art inline. Total file < 300KB.1.2 Zero network calls at runtime (no CDNs, no fonts.googleapis, no analytics). Fonts: system stack OR base64-embedded woff2 (<40KB total). Exception: portal SDK script, loaded lazily, wrapped so the game runs perfectly if it fails to load.1.3 Works file:// → so it can be loaded from APK assets with no server.1.4 Target 60fps on a mid-range Android (4GB RAM class). Canvas 2D only. No WebGL requirement, no frameworks, vanilla JS.1.5