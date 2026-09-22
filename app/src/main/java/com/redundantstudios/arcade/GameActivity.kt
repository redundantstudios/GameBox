package com.redundantstudios.arcade

import android.content.Intent
import android.content.pm.ActivityInfo
import android.os.Bundle
import android.os.Build
import android.view.WindowManager
import android.view.View
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.util.Log
import androidx.appcompat.app.AppCompatActivity
import com.redundantstudios.arcade.ads.AdMobManager
import com.redundantstudios.arcade.bridge.NativeBridge
import com.redundantstudios.arcade.bridge.NativeBridgeContext
import com.redundantstudios.arcade.model.GameManifest
import com.redundantstudios.arcade.ui.ShellTransition
import com.redundantstudios.arcade.util.AndroidRotation
import com.redundantstudios.arcade.util.ManifestParser
import com.redundantstudios.arcade.util.SettingsManager

class GameActivity : AppCompatActivity() {
    private lateinit var webView: WebView
    private var currentGame: GameManifest? = null
    private lateinit var adMobManager: AdMobManager
    private lateinit var bannerContainer: FrameLayout
    private var bannerRequestedVisible = false

    /** True when this game wants landscape (the display turns for it). */
    private var landscapeGame = false

    /** The view that holds the game (WebView + banner strip). */
    private lateinit var gameRoot: LinearLayout

    /** Guards the exit: back twice must not run it twice. */
    private var closing = false

    /** The window content: the game canvas (and the banner strip) live in here. */
    private lateinit var contentHost: FrameLayout

    /** True once the page has finished loading - the canvas may be shown. */
    private var pageReady = false

    /** True once the WebView has painted anything at all. */
    private var paintSeen = false

    /** True while the short grace before the canvas is actually shown runs. */
    private var revealScheduled = false

    /** True once the game canvas has been revealed to the player. */
    private var canvasShown = false

    /** True once a landscape game's display turn has landed. */
    private var turnLanded = false

    /**
     * True when this landscape game's arrival is the animated turn - a snapshot
     * of the shell screen is in hand, so the shell turns away, the display
     * turns, and the game turns in. False on a cold start / deep link (there is
     * no shell screen to snapshot), where the older reveal-then-ask path runs
     * instead; either way the game itself still turns into place.
     */
    private var snapshotTurn = false

    /**
     * The colour that takes over as the canvas backdrop once the game's page has
     * painted: the game's own tile colour, so a game that leaves part of its
     * viewport unpainted still shows its own palette rather than the shell.
     */
    private fun backdropColor(): Int {
        val hex = currentGame?.tileColor
        return try {
            if (hex.isNullOrBlank()) DEFAULT_BACKDROP else android.graphics.Color.parseColor(hex)
        } catch (e: IllegalArgumentException) {
            DEFAULT_BACKDROP
        }
    }

    /** True when the device currently has a usable internet connection. */
    private fun isOnline(): Boolean {
        val cm = getSystemService(android.net.ConnectivityManager::class.java) ?: return false
        val net = cm.activeNetwork ?: return false
        val caps = cm.getNetworkCapabilities(net) ?: return false
        return caps.hasCapability(android.net.NetworkCapabilities.NET_CAPABILITY_INTERNET) &&
            caps.hasCapability(android.net.NetworkCapabilities.NET_CAPABILITY_VALIDATED)
    }

    /**
     * Rewarded/interstitial ads cannot load offline. Without this guard the
     * player taps "watch ad", nothing happens for up to 7s, and the game looks
     * broken. Instead: a clear native message, and the game's waiting UI is
     * released immediately ("closed" fires) so no game ever falls back to its
     * simulated-ad path while offline.
     *
     * explain=false (interstitials): skip the dialog entirely — an interstitial
     * is a bonus, so going offline just quietly skips it instead of nagging
     * about the network in the middle of play.
     */
    private fun runAdOrExplainOffline(callback: String, explain: Boolean = true, action: () -> Unit) {
        if (isOnline()) {
            action()
            return
        }
        Log.w("GameActivity", "Ad request blocked: device is offline")
        if (explain) {
            runOnUiThread {
                com.google.android.material.dialog.MaterialAlertDialogBuilder(this)
                    .setTitle("Check your internet connection")
                    .setMessage("Ads need an internet connection. Please check your network and try again.")
                    .setPositiveButton("Okay", null)
                    .show()
            }
        }
        // "unavailable" (not "closed"): the player never saw an ad, so the game
        // can explain instead of pretending the ad was skipped.
        NativeBridgeContext.callback?.invoke(callback, "unavailable")
    }
    private var loadedSettingsSignature: String = ""

    /** Grace before telling a game its rotation finished (WebView relayout). */
    private val orientationSettleMs = 180L

    private companion object {
        /** Transition timing traces (see sinceLaunch). */
        const val TAG_TIME = "GameTransition"

        /** Fallback canvas backdrop when a game has no tile colour. */
        const val DEFAULT_BACKDROP = 0xFF101014.toInt()

        /**
         * If a game has not finished loading within this long, show it anyway:
         * waiting for a load that never comes would leave the player on the
         * artwork for ever.
         */
        const val REVEAL_FALLBACK_MS = 2600L

        /** Same safety net for a landscape game whose turn never lands. */
        const val LANDSCAPE_FALLBACK_MS = 1800L

        /**
         * Safety net for the animated turn: if the display never reports the
         * landscape change (a device held flat, an OEM that refuses the
         * request), the game canvas is freed anyway. It must never be left
         * invisible waiting for a rotation that is not coming.
         */
        const val SNAPSHOT_FALLBACK_MS = 2400L

        /**
         * A few frames of grace between "the game is loaded and painted" and
         * "show it": the canvas is still hidden here, so the game gets to render
         * real frames of its own before it appears.
         */
        const val REVEAL_GRACE_MS = 140L

        /**
         * How long a landscape game's own portrait splash stays up before the
         * display turns. Just long enough for the splash's first frame to exist
         * (a rotation of nothing is not a rotation), but short enough that the
         * open reads as one continuous portrait -> landscape turn.
         */
        const val LANDSCAPE_BEAT_MS = 90L

        /* The old "hide the game's flat page background" injection is gone on
           purpose. It rewrote every game's own <body> background to transparent,
           which flattened each game onto whatever colour the window happened to
           be - and once the window became the shell's cream, dark games like
           Chess lost the dark surface their whole UI is designed against. A game
           is authored with its own background; it keeps it. */

        /** Tells a game that its portrait->landscape rotation has finished. */
        const val ORIENTATION_CHANGE_JS =
            "if(window.Game&&Game.onOrientationChange){Game.onOrientationChange();}"
    }


    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Defensive: GameActivity can be cold-started directly (deep link/adb) — settings must exist
        com.redundantstudios.arcade.util.SettingsManager.init(this)
        com.redundantstudios.arcade.util.SettingsManager.applyTheme()

        WebView.setWebContentsDebuggingEnabled(true)

        adMobManager = AdMobManager(this)
        adMobManager.loadRewardedAd()
        adMobManager.loadInterstitialAd()

        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)

        val gameId = intent.getStringExtra("game_id") ?: return

        // Counts toward the one-shot notification permission moment on Home.
        SettingsManager.gamesLaunched += 1

        val allGames = ManifestParser.scanGames(this)
        currentGame = allGames.find { it.id == gameId }
        landscapeGame = currentGame?.orientation?.lowercase() == "landscape"

        // The window is opaque and its background is the SHELL'S colour (see
        // Theme.Shell.Game). It used to be replaced here with the game's own tile
        // colour, which put a wall of that game's colour on screen for as long as
        // its page took to paint - the "it starts with a green colour and then
        // the game appears" flash. The shell colour is already on screen behind
        // the window, so nothing appears at all: the game simply arrives.

        // A portrait game is locked straight away. A LANDSCAPE game is not: its
        // window is created in the orientation the shell is already in, so the
        // request to turn (see startLandscapeTurn) is a genuine rotation the
        // platform can animate. An orientation applied before the first frame
        // exists is not a rotation at all - it is a hard cut into a screen that
        // was already landscape, which is what this game used to look like.
        if (!landscapeGame) setupOrientation(currentGame?.orientation ?: "portrait")

        // Root layout to accommodate banner
        val rootLayout = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            layoutParams = android.view.ViewGroup.LayoutParams(
                android.view.ViewGroup.LayoutParams.MATCH_PARENT,
                android.view.ViewGroup.LayoutParams.MATCH_PARENT
            )
        }

        val bannerContainer = FrameLayout(this).apply {
            layoutParams = android.view.ViewGroup.LayoutParams(
                android.view.ViewGroup.LayoutParams.MATCH_PARENT,
                android.view.ViewGroup.LayoutParams.WRAP_CONTENT
            )
            setBackgroundColor(android.graphics.Color.parseColor("#F3F4F6"))
            visibility = android.view.View.GONE
        }
        this.bannerContainer = bannerContainer

        webView = WebView(this).apply {
            /* Visible from the very first frame, with its background set to the
               game's own tile colour.

               This used to be INVISIBLE until the page had loaded AND painted,
               with the window behind it showing a solid backdrop - which is why
               opening a game looked like "a wall of colour, then the game". Now
               the game's own background is on screen from frame one and its real
               content paints over it the moment it is ready, so there is no wall
               and no flash of a colour the game never chose. */
            visibility = android.view.View.VISIBLE
            setBackgroundColor(backdropColor())
            layoutParams = LinearLayout.LayoutParams(
                android.view.ViewGroup.LayoutParams.MATCH_PARENT,
                0,
                1.0f
            )

            settings.apply {
                javaScriptEnabled = true
                domStorageEnabled = true
                allowFileAccess = true
                allowContentAccess = true
                allowFileAccessFromFileURLs = false
                allowUniversalAccessFromFileURLs = false
                useWideViewPort = false
                loadWithOverviewMode = false
                textZoom = 100
            }

            webViewClient = object : WebViewClient() {
                override fun onPageStarted(view: WebView?, url: String?, favicon: android.graphics.Bitmap?) {
                    super.onPageStarted(view, url, favicon)
                    Log.d(TAG_TIME, "page started +${sinceLaunch()}ms")
                }

                /** The first paint is only REMEMBERED, never shown (see revealCanvas). */
                override fun onPageCommitVisible(view: WebView?, url: String?) {
                    super.onPageCommitVisible(view, url)
                    paintSeen = true
                    Log.d(TAG_TIME, "first paint +${sinceLaunch()}ms")
                    maybeReveal()
                }

                /**
                 * The game is genuinely loaded: its scripts have run, so the frames
                 * it draws from here on are its real content. Its flat page
                 * background is made transparent at the same time, so anything the
                 * canvas has not covered shows the game's branded colour instead of
                 * a wall of body colour (Chicken Chaos's grass green would otherwise
                 * flash for as long as its boot takes).
                 */
                override fun onPageFinished(view: WebView?, url: String?) {
                    super.onPageFinished(view, url)
                    Log.d(TAG_TIME, "page loaded +${sinceLaunch()}ms")
                    pageReady = true
                    maybeReveal()
                }
            }

            addJavascriptInterface(NativeBridge(this@GameActivity), "NativeBridge")

            val mode = intent.getStringExtra("mode")
            val skill = intent.getStringExtra("skill") ?: "medium"
            val players = intent.getIntExtra("players", 0)

            android.util.Log.d("GameActivity", "Launching game $gameId: mode=$mode, skill=$skill, players=$players")

            // Hand the current shell settings to the game store so every game
            // starts with the player's real sound/haptics choices.
            com.redundantstudios.arcade.util.SettingsManager.syncToGameStore(this@GameActivity)
            loadedSettingsSignature = com.redundantstudios.arcade.util.SettingsManager.signature()

            val settingsQuery = com.redundantstudios.arcade.util.SettingsManager.getSettingsQueryString()
            // Test tools (e.g. Ludo's bot speed test) exist only when the player
            // has switched on Developer mode in Settings.
            val devFlag =
                if (com.redundantstudios.arcade.util.SettingsManager.developerMode) "&dev=1" else ""
            // A player-count preselect is only attached when one was actually
            // chosen; otherwise the game opens its own normal menu.
            val preselect =
                if (mode != null && players > 0) "&mode=$mode&skill=$skill&players=$players" else ""
            loadUrl("file:///android_asset/games/$gameId/index.html?$settingsQuery$devFlag$preselect")
        }

        rootLayout.addView(webView)
        rootLayout.addView(bannerContainer)
        // The window content is a plain frame: the game canvas, and (for a tile
        // launch) the tile's own artwork above it while the game opens.
        contentHost = FrameLayout(this)
        contentHost.addView(
            rootLayout,
            FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT
            )
        )
        setContentView(contentHost)
        gameRoot = rootLayout

        // ── The turn ────────────────────────────────────────────────────────
        // A landscape game arrives as ONE motion: the shell screen (snapshotted
        // by the page the player came from) turns away, the display turns, and
        // this game's canvas turns in from the opposite side - all on the same
        // 400 ms curve, so it reads as the screen itself rotating.
        //
        // The canvas is invisible until its own turn begins: it has no business
        // showing in a portrait window, and the entry animation in
        // onConfigurationChanged brings it in at the right moment.
        snapshotTurn = landscapeGame && AndroidRotation.hasShellShot()
        if (snapshotTurn) {
            gameRoot.alpha = 0f
            gameRoot.post {
                AndroidRotation.playShellExitAndTurn(this, gameRoot) {
                    turnLanded = true
                    webView.evaluateJavascript(ORIENTATION_CHANGE_JS, null)
                }
            }
            // Safety net: a display turn that never lands must not leave the
            // game invisible.
            gameRoot.postDelayed({ freeTheCanvas() }, SNAPSHOT_FALLBACK_MS)
        }

        // ── The transition ───────────────────────────────────────────────────
        // Portrait game: the slide every shell page already uses, so opening a
        // game feels like going one page deeper. The canvas is painted by the time
        // the slide lands (the branded page carries the motion until then), so the
        // first thing the player sees inside the game is the game.
        //
        // Landscape game: NO window animation at all. Its transition is the display
        // turning itself, and anything animating underneath that turn would double
        // it. The game's own portrait splash holds the screen for one short beat
        // (see revealCanvas), the display turns THAT, and the game's menu drops in
        // when we tell it the rotation finished (see onConfigurationChanged).
        ShellTransition.armGame(this, landscapeGame)

        // Safety net: a game that never finishes loading would otherwise leave its
        // branded page on screen for ever.
        rootLayout.postDelayed({ revealCanvas(force = true) }, REVEAL_FALLBACK_MS)

        if (landscapeGame) {
            // Second safety net, for a turn that never lands (device held flat, an
            // OEM that refuses the request): tell the game the beat happened
            // anyway, so nothing stays frozen waiting for a rotation that is not
            // coming.
            rootLayout.postDelayed({
                if (!turnLanded) webView.evaluateJavascript(ORIENTATION_CHANGE_JS, null)
            }, LANDSCAPE_FALLBACK_MS)
        }
        window.decorView.post {
            // Full-screen: drop the status + navigation bars for every game.
            com.redundantstudios.arcade.util.AndroidRotation.goImmersive(window)
        }

        webView.post {
            android.util.Log.d("VP", "webViewPx=${webView.width}, density=${resources.displayMetrics.density}")
        }

        adMobManager.loadBannerAd(bannerContainer) {
            runOnUiThread {
                Log.d("BannerState", "Ad loaded. Applying requested visibility: $bannerRequestedVisible")
                bannerContainer.visibility = if (bannerRequestedVisible) android.view.View.VISIBLE else android.view.View.GONE
            }
        }

        NativeBridgeContext.exitHandler = {
            exitGame()
        }
        NativeBridgeContext.callback = { jsFuncName, result ->
            runOnUiThread {
                webView.evaluateJavascript("if(window.$jsFuncName) { window.$jsFuncName('$result'); }", null)
            }
        }
        NativeBridgeContext.adHandler = { callback ->
            runAdOrExplainOffline(callback) {
                adMobManager.showRewardedAd(
                    onRewardEarned = {
                        NativeBridgeContext.callback?.invoke(callback, "granted")
                    },
                    onAdClosed = {
                        NativeBridgeContext.callback?.invoke(callback, "closed")
                    },
                    onAdUnavailable = {
                        // No ad to show (still loading, failed, or offline): the game
                        // must hear back so it can re-open its offer / say why.
                        NativeBridgeContext.callback?.invoke(callback, "unavailable")
                    }
                )
            }
        }
        NativeBridgeContext.interstitialHandler = { callback ->
            // Interstitials are bonus breaks: offline, skip silently (no
            // "no internet" dialog) and let the game carry on.
            runAdOrExplainOffline(callback, explain = false) {
                adMobManager.showInterstitialAd(
                    onAdClosed = {
                        NativeBridgeContext.callback?.invoke(callback, "closed")
                    }
                )
            }
        }
        NativeBridgeContext.bannerHandler = { show ->
            runOnUiThread {
                bannerRequestedVisible = show
                /* GONE here is correct: pages that intentionally hide the banner
                   (intro / menu) must get the full height back, with no reserved
                   grey strip. The game-over drag was fixed at the source instead —
                   the game no longer hides the banner at game over. */
                bannerContainer.visibility = if (show) android.view.View.VISIBLE else android.view.View.GONE
            }
        }
    }

    /**
     * Asks the display to turn - but only once the game has actually drawn.
     *
     * The whole reason a landscape game used to look wrong: the request was made
     * during onCreate, so the system applied it before the first frame existed and
     * there was nothing for a rotation animation to turn. Requested after the
     * game's own portrait splash has been painted (see [revealCanvas]), the
     * platform's own rotation animation turns real content - the game itself -
     * from portrait into landscape.
     */
    private fun startLandscapeTurn() {
        if (!landscapeGame) return
        val observer = contentHost.viewTreeObserver
        observer.addOnPreDrawListener(object : android.view.ViewTreeObserver.OnPreDrawListener {
            override fun onPreDraw(): Boolean {
                val live = contentHost.viewTreeObserver
                if (live.isAlive) live.removeOnPreDrawListener(this)
                // A real frame has been drawn this pass; ask for the turn after it.
                contentHost.post {
                    if (!closing) {
                        requestedOrientation =
                            ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE
                    }
                }
                return true
            }
        })
    }

    /**
     * Per-game rotation, done WITHOUT any overlay: the game's manifest decides,
     * and the activity rotates automatically. configChanges in the manifest keeps
     * the activity alive across the flip (no relaunch = no hard cut), so the
     * system's own rotate animation plays while the WebView simply resizes.
     */
    private fun setupOrientation(orientation: String) {
        when (orientation.lowercase()) {
            "portrait" -> requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_SENSOR_PORTRAIT
            "landscape" -> requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE
            else -> requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED
        }
    }

    /**
     * The one moment a game becomes visible. Called from every readiness signal
     * (page loaded, first paint) and from the safety timer - whichever lands last
     * wins. Nothing is shown until the page is loaded AND has painted, and even
     * then a couple of frames of grace run first so the game has drawn a real
     * frame of its own while still invisible.
     */
    private fun maybeReveal() {
        if (canvasShown || revealScheduled) return
        if (!pageReady || !paintSeen) return
        revealScheduled = true
        gameRoot.postDelayed({
            revealScheduled = false
            revealCanvas()
        }, REVEAL_GRACE_MS)
    }

    /** Milliseconds since this game screen was created (transition debugging). */
    private fun sinceLaunch() = android.os.SystemClock.uptimeMillis() - launchAt

    private val launchAt = android.os.SystemClock.uptimeMillis()

    /**
     * Shows the game canvas. [force] is the safety net for a page that never
     * finishes loading.
     *
     * A landscape game then holds its own portrait splash for one short beat
     * before asking the display to turn. That ordering is the whole point: the
     * turn rotates REAL, already painted game content, so a portrait screen turns
     * smoothly into a landscape one. Asking for the orientation before the first
     * frame exists produces no rotation at all - the window is simply created
     * landscape, which reads as a landscape screen appearing out of nowhere.
     */
    private fun revealCanvas(force: Boolean = false) {
        if (canvasShown || closing) return
        if (!force && (!pageReady || !paintSeen)) return
        canvasShown = true
        Log.d(TAG_TIME, "reveal +${sinceLaunch()}ms (force=$force)")
        // A snapshot turn asks for the display turn itself, once the shell has
        // finished turning away - asking here as well would cut the animation
        // short mid-flight.
        if (landscapeGame && !turnLanded && !snapshotTurn) {
            gameRoot.postDelayed({ startLandscapeTurn() }, LANDSCAPE_BEAT_MS)
        }
    }

    /**
     * Frees the game canvas from the turn, unconditionally. Only ever needed by
     * the safety timer: if the display never reports the landscape change, the
     * player would otherwise be sitting in front of an invisible game.
     */
    private fun freeTheCanvas() {
        if (closing || turnLanded) return
        turnLanded = true
        gameRoot.animate().cancel()
        gameRoot.rotation = 0f
        gameRoot.scaleX = 1f
        gameRoot.scaleY = 1f
        gameRoot.alpha = 1f
        Log.w(TAG_TIME, "the turn never landed - canvas freed +${sinceLaunch()}ms")
        webView.evaluateJavascript(ORIENTATION_CHANGE_JS, null)
    }

    /**
     * The display turn has landed: the WebView has genuinely been re-laid out in
     * landscape and the game has drawn at the new size. That settle is the beat a
     * game uses to play its menu drop-in, so it is told the rotation finished.
     */
    override fun onConfigurationChanged(newConfig: android.content.res.Configuration) {
        super.onConfigurationChanged(newConfig)
        Log.d(TAG_TIME, "config change +${sinceLaunch()}ms (${newConfig.orientation})")
        // Rotation can restore the system bars — drop them again.
        com.redundantstudios.arcade.util.AndroidRotation.goImmersive(window)
        // Games normally reflow via the WebView's own resize event; this hook is
        // for any game that exposes an explicit resize entry point.
        webView.evaluateJavascript("if(window.Game&&Game.onResize){Game.onResize();}", null)

        // A turn the shell started drives itself: the game canvas rotates in
        // from the opposite side, or this screen is on its way back to the
        // portrait shell. Neither is an ordinary resize.
        val ours = com.redundantstudios.arcade.util.AndroidRotation
            .onOrientationChanged(this, newConfig, gameRoot)
        if (ours) {
            if (newConfig.orientation == android.content.res.Configuration.ORIENTATION_PORTRAIT) {
                finish()
            }
            return
        }

        if (newConfig.orientation == android.content.res.Configuration.ORIENTATION_LANDSCAPE) {
            turnLanded = true
        }
        // The snapshot turn reports its own landing (see the entry animation);
        // the older path needs the settle beat here.
        if (!snapshotTurn) {
            webView.postDelayed({
                webView.evaluateJavascript(ORIENTATION_CHANGE_JS, null)
            }, orientationSettleMs)
        }
    }

    override fun onWindowFocusChanged(hasFocus: Boolean) {
        super.onWindowFocusChanged(hasFocus)
        if (hasFocus) {
            // Keep the game full-screen whenever focus returns (rotation,
            // dialogs, swipe-revealed bars).
            com.redundantstudios.arcade.util.AndroidRotation.goImmersive(window)
        }
    }

    override fun onPause() {
        super.onPause()
        webView.evaluateJavascript("window.Game && Game.pause && Game.pause();", null)
    }

    override fun onResume() {
        super.onResume()
        adMobManager.loadRewardedAd()
        adMobManager.loadInterstitialAd()

        // If the player changed sound/haptics while the game was paused, push the
        // new values straight into the running game.
        com.redundantstudios.arcade.util.SettingsManager.syncToGameStore(this)
        val signature = com.redundantstudios.arcade.util.SettingsManager.signature()
        if (loadedSettingsSignature.isNotEmpty() && signature != loadedSettingsSignature) {
            loadedSettingsSignature = signature
            val json = com.redundantstudios.arcade.util.SettingsManager.getSettingsJson()
            webView.evaluateJavascript(
                "if(window.Game&&Game.setSettings){Game.setSettings($json);}",
                null
            )
        }

        webView.evaluateJavascript("window.Game && Game.resume && Game.resume();", null)
    }

    override fun onDestroy() {
        super.onDestroy()
        webView.evaluateJavascript("window.Game && Game.destroy && Game.destroy();", null)
    }

    override fun onBackPressed() {
        // A turn in flight owns the screen: back is ignored so a rotation can
        // never be double-triggered or left half-played.
        if (AndroidRotation.isRotating()) return
        exitGame()
    }

    /**
     * Leaves the game the way it arrived. A landscape game turns itself away to
     * the portrait shell (the shell then turns itself in); a portrait game slides
     * back out to the right like every other shell page.
     */
    private fun exitGame() {
        if (closing) return
        // A landscape game mid-session leaves through the animated turn. The
        // pre-turn states (still arriving) fall through to the plain exit: there
        // is nothing worth animating yet.
        if (landscapeGame && AndroidRotation.state == AndroidRotation.ScreenState.GAME) {
            closing = true
            ShellTransition.closeGame(this, true)
            AndroidRotation.playGameExitAndTurn(this, contentHost) { finish() }
            return
        }
        closing = true
        ShellTransition.closeGame(this, landscapeGame)
        finish()
    }
}
