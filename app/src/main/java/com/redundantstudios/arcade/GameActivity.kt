package com.redundantstudios.arcade

import android.content.Intent
import android.content.pm.ActivityInfo
import android.os.Bundle
import android.os.Build
import android.os.Handler
import android.os.Looper
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
import com.redundantstudios.arcade.util.GameWindow
import com.redundantstudios.arcade.util.ManifestParser
import com.redundantstudios.arcade.util.SettingsManager

class GameActivity : AppCompatActivity() {
    private lateinit var webView: WebView
    private var currentGame: GameManifest? = null
    private lateinit var adMobManager: AdMobManager
    private lateinit var bannerContainer: FrameLayout
    private var bannerRequestedVisible = false

    /** The view that holds the game (WebView + banner strip). */
    private lateinit var gameRoot: LinearLayout

    /** Guards the exit: back twice must not run it twice. */
    private var closing = false

    /** The window content: the game canvas (and the banner strip) live in here. */
    private lateinit var contentHost: FrameLayout

    /**
     * Fires the one piece of teardown that has to wait for the exit slide to
     * finish (see [releaseSurface]). On the main looper, so it still runs when
     * this screen is already gone.
     */
    private val teardownHandler = Handler(Looper.getMainLooper())

    /** True once the game surface has really been handed back. */
    private var surfaceReleased = false

    /** True once the page has finished loading - the canvas may be shown. */
    private var pageReady = false

    /** True once the WebView has painted anything at all. */
    private var paintSeen = false

    /** True while the short grace before the canvas is actually shown runs. */
    private var revealScheduled = false

    /** True once the game canvas has been revealed to the player. */
    private var canvasShown = false

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

        /**
         * How long the exit slide (320ms, see `nav_out_right`) is given before
         * the game surface is taken apart. Leaving is a WINDOW animation over
         * this screen's last drawn frame, so that frame has to survive until
         * the slide is over; tearing the WebView down any earlier would redraw
         * the window as a blank shell-coloured page mid-slide.
         */
        const val SURFACE_RELEASE_MS = 500L

        /**
         * The screen that currently owns [NativeBridgeContext]'s handlers.
         *
         * The bridge is process-wide, and an incoming game installs its
         * handlers in `onCreate` BEFORE the outgoing screen's `onDestroy` runs.
         * A screen may therefore only clear handlers it installed itself -
         * clearing unconditionally would leave the incoming game deaf.
         * Always released in [clearBridgeHandlers].
         */
        @Volatile
        private var bridgeOwner: GameActivity? = null

        /** Fallback canvas backdrop when a game has no tile colour. */
        const val DEFAULT_BACKDROP = 0xFF101014.toInt()

        /**
         * If a game has not finished loading within this long, show it anyway:
         * waiting for a load that never comes would leave the player on the
         * artwork for ever.
         */
        const val REVEAL_FALLBACK_MS = 2600L

        /**
         * A few frames of grace between "the game is loaded and painted" and
         * "show it": the canvas is still hidden here, so the game gets to render
         * real frames of its own before it appears.
         */
        const val REVEAL_GRACE_MS = 140L

        /* The old "hide the game's flat page background" injection is gone on
           purpose. It rewrote every game's own <body> background to transparent,
           which flattened each game onto whatever colour the window happened to
           be - and once the window became the shell's cream, dark games like
           Chess lost the dark surface their whole UI is designed against. A game
           is authored with its own background; it keeps it. */

        /** Tells a game that its portrait->landscape rotation has finished. */
        const val ORIENTATION_CHANGE_JS =
            "if(window.Game&&Game.onOrientationChange){Game.onOrientationChange();}"

        /** Stops a game's own loop, and lets it save, on its way out. */
        const val JS_GAME_DESTROY = "window.Game && Game.destroy && Game.destroy();"
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

        // The window is opaque and its background is the SHELL'S colour (see
        // Theme.Shell.Game). It used to be replaced here with the game's own tile
        // colour, which put a wall of that game's colour on screen for as long as
        // its page took to paint - the "it starts with a green colour and then
        // the game appears" flash. The shell colour is already on screen behind
        // the window, so nothing appears at all: the game simply arrives.

        // The game's manifest decides the orientation, and it is applied here -
        // before the first frame exists - so the window is simply created the
        // right way up. Nothing is animated: the page slide covers the arrival,
        // and the display change a landscape game needs is the platform's own.
        setupOrientation(currentGame?.orientation ?: "portrait")

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

        // ── The transition ───────────────────────────────────────────────────
        // Games move BY ORIENTATION: a landscape game rises up from the bottom edge
        // while the page it came from eases up and out (armGame → game_in / game_out),
        // and the reverse takes it back down on the way out. A portrait game slides
        // like every other page. Either way the display change itself is the
        // platform's own - nothing here fights it or doubles it.
        ShellTransition.armGame(
            this, (currentGame?.orientation ?: "portrait").equals("landscape", ignoreCase = true)
        )

        // Safety net: a game that never finishes loading would otherwise leave its
        // branded page on screen for ever.
        rootLayout.postDelayed({ revealCanvas(force = true) }, REVEAL_FALLBACK_MS)

        window.decorView.post {
            // Full-screen: drop the status + navigation bars for every game.
            GameWindow.goImmersive(window)
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

        // This screen now owns the process-wide bridge (see bridgeOwner).
        bridgeOwner = this
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
     * A landscape game is revealed the same way: nothing here waits for a
     * rotation, because the arrival is an ordinary page slide.
     */
    private fun revealCanvas(force: Boolean = false) {
        if (canvasShown || closing) return
        if (!force && (!pageReady || !paintSeen)) return
        canvasShown = true
        Log.d(TAG_TIME, "reveal +${sinceLaunch()}ms (force=$force)")
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
        GameWindow.goImmersive(window)
        // Games normally reflow via the WebView's own resize event; this hook is
        // for any game that exposes an explicit resize entry point.
        webView.evaluateJavascript("if(window.Game&&Game.onResize){Game.onResize();}", null)

        // The WebView is re-laid out on the frame after the change, so the game
        // is told once that has happened: it has to read the real size to place
        // its menu.
        webView.postDelayed({
            // The screen can already be gone (a turn immediately followed by
            // leaving): a WebView that has been destroyed must not be asked to
            // run script.
            if (surfaceReleased) return@postDelayed
            webView.evaluateJavascript(ORIENTATION_CHANGE_JS, null)
        }, orientationSettleMs)
    }

    override fun onWindowFocusChanged(hasFocus: Boolean) {
        super.onWindowFocusChanged(hasFocus)
        if (hasFocus) {
            // Keep the game full-screen whenever focus returns (rotation,
            // dialogs, swipe-revealed bars).
            GameWindow.goImmersive(window)
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

    /**
     * Hands every resource this screen created back to the system.
     *
     * Opening and closing games repeatedly used to leave all of it behind: a
     * WebView that is dropped instead of destroyed keeps a live renderer frame,
     * a JS heap and the game's own audio graph with it, and a banner AdView
     * keeps a whole Activity. A handful of open/close cycles piled those up,
     * and that pile - not the transition - is what made the shell, and the game
     * being played at the time, stutter more with every cycle.
     */
    override fun onDestroy() {
        // The game gets its own shutdown first, while its page still exists:
        // this is the call that stops a game's animation loop (Chicken Chaos
        // runs its loop until `Game.destroy()` says otherwise) and lets the
        // games that save on destroy write their progress. It used to be issued
        // after super.onDestroy(), where it never stood a chance of running.
        if (::webView.isInitialized) {
            webView.evaluateJavascript(JS_GAME_DESTROY, null)
            webView.stopLoading()
        }
        clearBridgeHandlers()

        // Everything else waits out the exit slide (see SURFACE_RELEASE_MS).
        teardownHandler.postDelayed({ releaseSurface() }, SURFACE_RELEASE_MS)
        super.onDestroy()
    }

    /**
     * Takes the game surface apart. This runs once the exit slide has painted
     * its last frame, so leaving looks exactly as it always has.
     */
    private fun releaseSurface() {
        if (surfaceReleased) return
        surfaceReleased = true
        if (::adMobManager.isInitialized) adMobManager.destroy()
        if (!::webView.isInitialized) return
        (webView.parent as? android.view.ViewGroup)?.removeView(webView)
        webView.destroy()
    }

    /**
     * Releases the process-wide bridge handlers, but only if this screen is the
     * one that installed them (see [bridgeOwner]).
     */
    private fun clearBridgeHandlers() {
        if (bridgeOwner !== this) return
        bridgeOwner = null
        NativeBridgeContext.callback = null
        NativeBridgeContext.exitHandler = null
        NativeBridgeContext.adHandler = null
        NativeBridgeContext.interstitialHandler = null
        NativeBridgeContext.bannerHandler = null
    }

    override fun onBackPressed() {
        exitGame()
    }

    /**
     * Leaves the game the way it arrived: a landscape game sinks back DOWN off the
     * bottom edge while the shell page eases back in from above (closeGame →
     * game_back_in / game_back_out); a portrait game pops back like any other page.
     * A landscape game's display change back to portrait is the platform's own,
     * exactly as it was on the way in.
     */
    private fun exitGame() {
        if (closing) return
        closing = true
        ShellTransition.closeGame(
            this, (currentGame?.orientation ?: "portrait").equals("landscape", ignoreCase = true)
        )
        finish()
    }
}
