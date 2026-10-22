package com.redundantstudios.arcade

import android.content.Intent
import android.app.ActivityManager
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
import android.webkit.WebChromeClient
import android.webkit.ConsoleMessage
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.util.Log
import androidx.activity.OnBackPressedCallback
import androidx.appcompat.app.AppCompatActivity
import com.redundantstudios.arcade.ads.AdMobManager
import com.redundantstudios.arcade.ads.AdPolicy
import com.redundantstudios.arcade.bridge.NativeBridge
import com.redundantstudios.arcade.bridge.NativeBridgeContext
import com.redundantstudios.arcade.model.BannerEdge
import com.redundantstudios.arcade.model.GameManifest
import com.redundantstudios.arcade.ui.ShellTransition
import com.redundantstudios.arcade.util.GameWindow
import com.redundantstudios.arcade.util.ManifestParser
import com.redundantstudios.arcade.util.SettingsManager

class GameActivity : AppCompatActivity() {
    private lateinit var webView: WebView
    private var currentGame: GameManifest? = null
    private lateinit var adMobManager: AdMobManager

    /** The view that holds the game WebView. */
    private lateinit var gameRoot: LinearLayout

    /** Banner placeholder on the edge the game's manifest asked for, if any. */
    private var bannerPlaceholder: View? = null

    /** Guards the exit: back twice must not run it twice. */
    private var closing = false

    /** The window content: the game canvas lives in here. */
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

    /** True once the WebView's renderer process has died and been replaced. */
    private var rendererDied = false

    /** The URL this screen loaded, kept so a dead renderer can be replaced. */
        private var gameUrl: String? = null

    /**
     * Puts the same game back on screen after its renderer was killed.
     *
     * The new page boots from scratch, so the readiness flags have to be reset
     * too - otherwise the shell still believes the old page painted, reveals the
     * canvas early, and the player watches an empty surface while the new one
     * loads.
     */
    private fun reloadGame() {
        val url = gameUrl ?: return
        if (closing) return
        Log.d(TAG_TIME, "reloading game after renderer loss")
        pageReady = false
        paintSeen = false
        canvasShown = false
        revealScheduled = false
        rendererDied = false
        try {
            webView.postDelayed({
                if (closing || rendererDied) return@postDelayed
                webView.loadUrl(url)
                // The safety net still applies to the replacement page.
                gameRoot.postDelayed({ revealCanvas(force = true) }, REVEAL_FALLBACK_MS)
            }, 220)
        } catch (e: Throwable) {
            Log.w(TAG_TIME, "reload failed: ${e.message}")
        }
    }

    /**
     * The colour that takes over as the canvas backdrop once the game's page has
     * painted - and, just before that, the colour that flashes while the game
     * loads.
     *
     * Two manifest values can supply it, and a game declares whichever one
     * describes its own paint:
     *
     *   viewportBg: the game's own VIEWPORT colour - what it actually paints
     *               with. It wins: a game that leaves part of its viewport
     *               unpainted should still show its own palette, not the
     *               launcher's.
     *   bannerBg:   the game's own PAGE background. It drives the flash and
     *               the strip, so the strip reads as part of the game rather
     *               than as launcher artwork (a bright tile colour flashing
     *               before the game arrives advertises the wrong thing).
     *
     * The tile colour is the fallback, so a game that declares neither
     * behaves as before.
     */
    private fun backdropColor(): Int {
        val hex = currentGame?.viewportBg?.takeIf { it.isNotBlank() }
            ?: currentGame?.bannerBg?.takeIf { it.isNotBlank() }
            ?: currentGame?.tileColor
        return try {
            if (hex.isNullOrBlank()) DEFAULT_BACKDROP else android.graphics.Color.parseColor(hex)
        } catch (e: IllegalArgumentException) {
            DEFAULT_BACKDROP
        }
    }

    /** The banner strip's height in pixels for the current display. */
    private fun bannerHeightPx(): Int =
        (BANNER_HEIGHT_DP * resources.displayMetrics.density).toInt()

    /**
     * Width reserved for a strip that stands on its end.
     *
     * 50dp - a banner turned on its side. It is deliberately NOT the ad's
     * 320dp length: reserving that left a column so wide it swallowed the
     * potted-ball tube it was meant to sit beside.
     */
    private fun verticalStripWidthPx(): Int =
        (BANNER_HEIGHT_DP * resources.displayMetrics.density).toInt()

    /**
     * The colour the banner strip wears behind the ad.
     *
     * The game's own page background from its manifest (`bannerBg:`), NOT the
     * tile colour: the tile is launcher artwork and root.io's is a light green
     * against a near-black game, so the tile colour put a green bar on a dark
     * screen. Falls back to black, which is wrong less loudly than a bright
     * tile colour would be.
     */
    private fun bannerBackdrop(): Int {
        val hex = currentGame?.bannerBg
        return try {
            if (hex.isNullOrBlank()) BANNER_FALLBACK_BACKDROP
            else android.graphics.Color.parseColor(hex)
        } catch (e: IllegalArgumentException) {
            BANNER_FALLBACK_BACKDROP
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
     * TRUE ON A LOW-POWER PHONE, DECIDED ONCE AT LAUNCH.
     *
     * The game that launched is told about it with `lowmem=1` on its URL, so it
     * can trim what it spends - render scale, antialiasing, shadows - before the
     * first frame rather than discovering the same fact the hard way, a stutter
     * at a time.
     *
     * WHY RAM COUNTING ISN'T ENOUGH ANY MORE (measured on device CPH2219)
     * OPPO's "RAM Expansion" puts storage-side virtual memory into MemTotal:
     * the 4GB A55 reports ~5.6GB, sailed past the old totalMem<5GB check, and
     * every trim stayed switched off on the one phone that needed them. So the
     * decision now reads three independent tells, cheapest wins first:
     *   - isLowRamDevice(), the framework's own verdict for genuinely small
     *     phones (2GB tier), cheap and authoritative;
     *   - ro.soc.model (SM4250 = Snapdragon 460 etc.): the SoC tier is what
     *     actually set the frame budget - on this device gameplay measured
     *     ~200 draw calls at a median 49ms frame with render scale held at 1,
     *     i.e. the bottleneck is CPU/driver overhead, not pixels - and the
     *     model string is visible through getprop without any permission;
     *   - a tiny per-app heap class (<128MB) as a last round-out.
     * Games lacking a lowmem path simply ignore the flag; the game-side
     * runtime probe (which measures real frame times and engages the same
     * trims) covers any device all of these tell the wrong story about.
     */
    private fun isLowRamDevice(): Boolean {
        val am = getSystemService(ActivityManager::class.java)
        if (am != null) {
            if (am.isLowRamDevice) return true
            if (am.memoryClass in 1..127) return true
        }
        val soc = try {
            val p = Runtime.getRuntime().exec(arrayOf("getprop", "ro.soc.model"))
            p.inputStream.bufferedReader().readText().trim()
        } catch (e: Throwable) { "" }
        if (soc.isNotBlank()) {
            val s = soc.lowercase()
            if (s.startsWith("sm42") || s.startsWith("sd46")) return true
        }
        val mi = ActivityManager.MemoryInfo()
        am?.getMemoryInfo(mi)
        return mi.totalMem > 0 && mi.totalMem < LOW_RAM_TOTAL_BYTES
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
            /* THE universal popup, not a second one. This used to build its own
               dialog here with different wording, so a player going offline could
               see two different notices. OfflineNotifier is now the only place
               in the app that says this. */
            com.redundantstudios.arcade.bridge.OfflineNotifier.announceOnce(this)
        }
        // "unavailable" (not "closed"): the player never saw an ad, so the game
        // can explain instead of pretending the ad was skipped.
        NativeBridgeContext.callback?.invoke(callback, "unavailable")
    }
    private var loadedSettingsSignature: String = ""

    /** Grace before telling a game its rotation finished (WebView relayout). */
    private val orientationSettleMs = 180L

    /** The same grace, for the chrome layer's own re-measure. */
    private val ORIENTATION_SETTLE_MS = 180L

    private companion object {
        /** Transition timing traces (see sinceLaunch). */
        const val TAG_TIME = "GameTransition"


        /**
         * Height of the banner strip. 50dp is the AdMob BANNER unit's own
         * height, so the reserved space matches the ad exactly and the canvas
         * never has a gap under it.
         */
        const val BANNER_HEIGHT_DP = 50

        /** Used when a game's manifest gives no `bannerBg:`. */
        val BANNER_FALLBACK_BACKDROP: Int = android.graphics.Color.BLACK

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

        /**
         * A screen whose surface is still inside its exit delay.
         *
         * The delay exists so the leaving animation paints its last frame, but
         * it also means a fast open/close/open leaves several WebViews alive at
         * once. The next game to start claims this and frees it immediately -
         * see the top of `onCreate`.
         */
        @Volatile
        private var pendingTeardown: GameActivity? = null

        /** Fallback canvas backdrop when a game has no tile colour. */
        const val DEFAULT_BACKDROP = 0xFF101014.toInt()

        /**
         * Devices reporting less total RAM than this are treated as low-RAM
         * for the `lowmem=1` launch flag (see [isLowRamDevice]). 5 GiB splits
         * a 4GB phone (which reports under ~3.7 GiB) from a 6GB one (~5.6 GiB).
         */
        const val LOW_RAM_TOTAL_BYTES = 5L * 1024L * 1024L * 1024L

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
        /* A game opened while the PREVIOUS one is still tearing down: free that
           surface right now instead of letting it sit for the rest of the exit
           delay (see SURFACE_RELEASE_MS).

           Every live WebView is a separate renderer process holding a JS heap
           and the game's own canvases - for Sheepdog Trials that is a ~5.7MB
           baked background plus its terrain layer plus a full-screen drawing
           buffer. Leave four of those alive by opening and leaving the game
           quickly four times and the phone is under real memory pressure, and
           the next renderer to ask for a canvas is the one that loses: the game
           opens showing its bare page background with the HUD drawn over
           nothing. That is exactly the "no sheep, no dog, no field, just a dark
           screen" report, and it only ever happened after several fast cycles.

           Safe to do synchronously here because the new screen is already on
           top and opaque - the outgoing one is behind it, so there is no
           visible frame for this to interrupt. */
        pendingTeardown?.let { prev ->
            if (prev !== this) {
                Log.d(TAG_TIME, "freeing previous game surface immediately")
                prev.releaseSurface()
            }
        }
        pendingTeardown = null

        // Layer 1 of the portrait lock: the manifest pins GameActivity to portrait
        // (android:screenOrientation="portrait"), so the activity is CREATED portrait
        // no matter what the caller, the sensor or a previous landscape game left
        // behind. Layer 2 is the explicit request below, which also covers a launch
        // that arrives with the activity already in the task.
        //
        // Together they close the window in which Android could build this screen in
        // a LANDSCAPE configuration before the selected game's manifest is read -
        // the portrait game that briefly appeared sideways and then turned.
        requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_PORTRAIT

        /* THE DISPLAY CUTOUT, BEFORE super.onCreate().
           This is the line that makes the game truly full screen on a phone
           with a corner camera hole (the OPPO A55 / CPH2219, where the player
           saw the game running beside a dead band with the camera in it).
           The window exists from attach() onward, so the declaration can be
           made here - and it HAS to be made here: AppCompatActivity creates
           the decor during super.onCreate(), which is when the platform adds
           the window to the window manager and decides how much of the
           display the app may use. */
        GameWindow.applyCutoutMode(window)

        super.onCreate(savedInstanceState)

        // The game must cover the WHOLE display. This has to happen BEFORE
        // setContentView, otherwise the content view is measured against an inset
        // window and the game sits below the status bar with a dead band above it.
        GameWindow.goEdgeToEdge(window)

        // Defensive: GameActivity can be cold-started directly (deep link/adb) — settings must exist
        com.redundantstudios.arcade.util.SettingsManager.init(this)
        com.redundantstudios.arcade.util.SettingsManager.applyTheme()

        WebView.setWebContentsDebuggingEnabled(true)

        adMobManager = AdMobManager(this)
        adMobManager.loadRewardedAd()
        adMobManager.loadInterstitialAd()

        /* A new game means new per-game ad caps: a fresh 5 rewarded / 1 revive
           for THIS game, while the app-wide interstitial clock keeps running so
           bouncing between games cannot out-run the 180s gap. */
        AdPolicy.onGameOpened(this)

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

        val manifestOrientation = currentGame?.orientation ?: "portrait"
        // Lock portrait games before the activity is created, so a device that
        // was held sideways never shows a landscape first frame during entry.
        setupOrientation(manifestOrientation)

        // The game fills this layout completely (no banner strip: see BANNERS ARE OFF).
val rootLayout = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            layoutParams = android.view.ViewGroup.LayoutParams(
                android.view.ViewGroup.LayoutParams.MATCH_PARENT,
                android.view.ViewGroup.LayoutParams.MATCH_PARENT
            )
        }
        /* The container is painted in the game's own colour. With a reserved
           banner strip the strip is INVISIBLE most of the time, and nothing else
           was painting it - so the window's own background showed through as a
           light bar under the game on every screen. The WebView covers the rest
           of this layout, so only the reserved strip is ever visible through it,
           and it matches the strip's own colour exactly. */
        rootLayout.setBackgroundColor(bannerBackdrop())

        /* The banner strip, on the edge this game's manifest asked for. Absent
           banner: line means the game gets the whole viewport and its own
           show/hide polling is never forwarded to the SDK. The spacer is GONE,
           so a game with no ad never loses playfield to an empty strip. */
val bannerEdge = currentGame?.bannerEdge
        android.util.Log.d(
            "GameActivity",
            "banner: game=${currentGame?.id} edge=$bannerEdge bg=${currentGame?.bannerBg}"
        )
        if (bannerEdge != null) {
            val bannerHeightPx =
                // Multiply BEFORE truncating: density is fractional (2.625 on
                // this device), so truncating it first turned 50dp into
                // 50*2 = 100px instead of 131px and the strip came out short.
                (BANNER_HEIGHT_DP * resources.displayMetrics.density).toInt()
            bannerPlaceholder = View(this).apply {
                /* A vertical strip lays out on its end: it is the WIDTH that is
                   reserved, not the height. The real FrameLayout params replace
                   this once the content frame exists. */
                layoutParams = LinearLayout.LayoutParams(
                    if (bannerEdge.isVertical) bannerHeightPx
                    else LinearLayout.LayoutParams.MATCH_PARENT,
                    if (bannerEdge.isVertical) LinearLayout.LayoutParams.MATCH_PARENT
                    else bannerHeightPx
                )
                // An overlay shows the GAME through the strip until an ad
                // actually arrives, so it must not paint a coloured box over the
                // map. A reserved strip is a real area the game already gave up,
                // so it wears the game's own colour.
                if (!bannerEdge.isOverlay) setBackgroundColor(bannerBackdrop())
                /* INVISIBLE, not GONE, for a reserved strip: it keeps taking up
                   its height whether or not an ad is showing.

                   GONE here meant the strip appeared and vanished, and with it
                   the WebView's height - so every show and every hide resized
                   the WebView and re-laid-out the game's canvas. That showed up
                   as the whole game visibly shaking twice a run, and it is far
                   more expensive than one fixed relayout at open. The space is
                   now reserved for the life of the screen and only the ad's own
                   visibility changes. */
                visibility = if (bannerEdge.isOverlay) android.view.View.GONE
                             else android.view.View.INVISIBLE
            }
            // TOP puts the strip first so it sits above the WebView; BOTTOM puts
            // it last so it sits below. The WebView carries weight=1 either way,
            // so it takes whatever is left and the canvas shrinks rather than
            // being covered. An OVERLAY_TOP is added to contentHost instead, so
            // it costs the game nothing.
            if (bannerEdge == BannerEdge.TOP) rootLayout.addView(bannerPlaceholder)
            /* Register it HERE, not on the first show. preloadBanner() runs at
               game open, before the game has asked to show anything, and it had
               nothing to attach the AdView to - so the preload silently did
               nothing and the first request only went out when the run started,
               which is the lag it was meant to remove. */
            adMobManager.setBannerPlaceholder(bannerPlaceholder)
        }

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
                /* Chromium's autoplay gate holds an AudioContext suspended until
                   the page has seen a real user gesture, so a game's score stayed
                   silent until the player happened to tap something - and that
                   first tap was spent arming audio instead of doing what they
                   touched. The shell owns playback for these games, so the gate
                   is lifted once here rather than in every game. */
                mediaPlaybackRequiresUserGesture = false
                allowFileAccess = true
                allowContentAccess = true
                allowFileAccessFromFileURLs = false
                allowUniversalAccessFromFileURLs = false
                useWideViewPort = false
                loadWithOverviewMode = false
                textZoom = 100
            }

            /* There was NO WebChromeClient at all here, which cost the shell the
               one thing that makes a broken game diagnosable: its console. Every
               `console.log`/`console.error` a game emits is now in logcat under
               GameJS, tagged with file and line.

               It also had no `onShowCustomView`, so a game calling
               `documentElement.requestFullscreen()` had nobody to answer it. An
               unanswered requestFullscreen is NOT simply ignored - the page
               `await`s a promise nothing will ever settle, so whatever the game
               queued after that await never runs, and the game sits frozen on
               whatever screen it was on. Sheepdog Trials did exactly this on its
               PLAY button. `jsFullscreenStub` below closes that hole for every
               game at once. */
            webChromeClient = object : WebChromeClient() {
                override fun onHideCustomView() {
                    webView.post { GameWindow.goImmersive(window) }
                }

                override fun onConsoleMessage(msg: ConsoleMessage): Boolean {
                    Log.d("GameJS", "${msg.message()} @${msg.sourceId()}:${msg.lineNumber()}")
                    return true
                }
            }

            webViewClient = object : WebViewClient() {

                /**
                 * SERVES THE GAME WITH THE SHELL'S SCRIPTS ALREADY IN IT.
                 *
                 * The game is a single HTML file in the APK's assets. This
                 * intercepts the request for it and returns the same document
                 * with the shell's four scripts spliced in above everything the
                 * game ships with.
                 *
                 * The reason is order. `evaluateJavascript` at onPageStarted is
                 * posted to the renderer and lands at the next script
                 * checkpoint, which RACES a game that builds its AudioContext
                 * or sizes its canvas while booting. The device log caught both
                 * sides of it: Connect Four's canvas came out 1027 pixels wide
                 * on one launch and 822 on the next, and the difference was
                 * whether the resolution cap had won the race. The audio
                 * tracker lost it too, which left the game unable to be
                 * silenced at all - the music following the player onto the
                 * home screen.
                 *
                 * A script that is PART OF THE DOCUMENT cannot lose a race with
                 * the document. The browser parses the top of the file, runs
                 * the shell's scripts, and only then reaches the game's code.
                 *
                 * If this interception does not fire - a platform that does not
                 * consult the client for file:// requests - the page simply
                 * loads as before, and the racy injection in onPageStarted is
                 * still there as a second chance. Every script guards itself
                 * behind a window flag, so running twice is harmless.
                 */
                override fun onPageStarted(view: WebView?, url: String?, favicon: android.graphics.Bitmap?) {
                    super.onPageStarted(view, url, favicon)
                    /* Installed at page start so it wraps AudioContext before the
                       game's own scripts create one - a context created before
                       this lands would never be suspended. */
                    /* Installed BEFORE the page's own scripts.
                       evaluateJavascript at onPageStarted was not good enough: it
                       can be discarded when the navigation commits, and it races
                       a game that builds its AudioContext during boot. Logs from
                       that attempt read "already wrapped, 0 ctx" - the wrapper
                       went in after the context had already been made, so it
                       suspended nothing and the music followed the player onto
                       the home screen. addDocumentStartJavaScript is guaranteed
                       to run first, so the context is captured as it is made. */
                    val v = view ?: return
                    val supported = try {
                        androidx.webkit.WebViewFeature.isFeatureSupported(
                            "DOCUMENT_START_SCRIPT"
                        )
                    } catch (e: Throwable) { false }
                    Log.d(TAG_TIME, "documentStartScript supported=$supported")
                    

                    /* THE FALLBACK INJECTION, FOR THE CASE WHERE THE SCRIPT TAG IS NOT THERE.

                       Every game now carries a plain
                       `<script src="../../shell/shell-boot.js">` at the top of
                       its <head>. That is a CLASSIC script: the parser stops
                       there, fetches it, runs it to completion, and only then
                       carries on. The browser cannot reach a line of the
                       game's own code before it, because the shell's code is
                       part of the document, above the game's code. That is
                       what finally made the resolution cap and the audio
                       tracker land every single time instead of winning a
                       race.

                       The injection below is for a page that somehow has no
                       script tag - a game added later, or one whose head was
                       edited. It is a race and it is known to be one; that is
                       exactly why it is the fallback and not the mechanism.

                       Every script guards itself behind a window flag, so
                       running twice is a no-op rather than a double-patch. */
                    if (supported) {
                        try {
                            for (js in shellScriptSources()) {
                                androidx.webkit.WebViewCompat.addDocumentStartJavaScript(
                                    v, js, setOf("file://")
                                )
                            }
                        } catch (e: Exception) {
                            Log.w(TAG_TIME, "document-start REJECTED - hand injection covers it", e)
                        }
                    }
                    injectShellScripts(v)
                    Log.d(TAG_TIME, "page started +${sinceLaunch()}ms")
                }

                /** The first paint is only REMEMBERED, never shown (see revealCanvas). */
                override fun onPageCommitVisible(view: WebView?, url: String?) {
                    super.onPageCommitVisible(view, url)
                    /* Second chance for the shell scripts. The page-start injection can
                       land against a document that is about to be replaced; this one
                       lands against the document that is actually on screen. Re-running
                       is a no-op for any script that already applied itself. */
                    view?.let { injectShellScripts(it) }
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
                    /* Third and last chance. Covers a page whose own scripts ran before
                       either earlier injection could attach - which, with no document-start
                       path on a file:// page, is the normal case and not the rare one. */
                    view?.let { injectShellScripts(it) }
                    Log.d(TAG_TIME, "page loaded +${sinceLaunch()}ms")
                    pageReady = true
                    maybeReveal()
                }

                /**
                 * THE RENDERER DIED. Handled, not fatal.
                 *
                 * Left to the default, a dead renderer CRASHES the app. That is
                 * the platform's honest answer: the WebView is a view onto
                 * another process, and when that process goes the view is a
                 * corpse. But "crash" is a terrible answer for a game that was
                 * closed and reopened a few times too quickly, because the
                 * renderer dies for the most ordinary reason there is - the
                 * system reclaimed it under memory pressure - and the player
                 * did nothing wrong.
                 *
                 * So the renderer is treated as recoverable: the WebView is
                 * detached from the corpse, and the same URL is loaded again.
                 * A game is stateless at this point (nothing is carried across
                 * a close, because a close destroys the page), so reloading
                 * loses nothing the player can see.
                 */
                override fun onRenderProcessGone(
                    view: WebView?,
                    detail: android.webkit.RenderProcessGoneDetail?
                ): Boolean {
                    Log.e(TAG_TIME, "renderer gone: crashed=${detail?.didCrash()} prio=${detail?.rendererPriorityAtExit()}")
                    rendererDied = true
                    // Never call into this WebView again - the object it wraps
                    // no longer exists, and touching it throws.
                    surfaceReleased = true
                    try {
                        (view?.parent as? android.view.ViewGroup)?.removeView(view)
                        view?.destroy()
                    } catch (e: Throwable) {
                        Log.w(TAG_TIME, "renderer cleanup failed: ${e.message}")
                    }
                    reloadGame()
                    return true
                }
            }

            addJavascriptInterface(NativeBridge(this@GameActivity), "NativeBridge")
        installBackBlock()

            val mode = intent.getStringExtra("mode")
            val skill = intent.getStringExtra("skill") ?: "medium"
            val players = intent.getIntExtra("players", 0)

            android.util.Log.d("GameActivity", "Launching game $gameId: mode=$mode, skill=$skill, players=$players")

            // Hand the current shell settings to the game store so every game
            // starts with the player's real sound/haptics choices.
            com.redundantstudios.arcade.util.SettingsManager.syncToGameStore(this@GameActivity)
            loadedSettingsSignature = com.redundantstudios.arcade.util.SettingsManager.signature()

            val settingsQuery = com.redundantstudios.arcade.util.SettingsManager.getSettingsQueryString()
            // Test tools (e.g. Ludo's bot speed test) used to be gated behind a
            // Developer mode switch in Settings. That switch is GONE for the Play
            // release - no player-facing way to enable it exists - so the dev=1
            // flag is never appended and the test tools stay dormant.
            // A player-count preselect is only attached when one was actually
            // chosen; otherwise the game opens its own normal menu.
            val preselect =
                if (mode != null && players > 0) "&mode=$mode&skill=$skill&players=$players" else ""
            /* A low-RAM phone announces itself: the game can trim itself to fit
               from frame one instead of learning it through stutters. Games
               without a lowmem path simply ignore the flag. */
            val lowmem = if (isLowRamDevice()) "&lowmem=1" else ""
            gameUrl = "file:///android_asset/games/$gameId/index.html?$settingsQuery$lowmem$preselect"
            loadUrl(gameUrl!!)
        }

        rootLayout.addView(webView)
        // A bottom strip goes after the WebView, so it lands below the canvas.
        if (bannerEdge == BannerEdge.BOTTOM) rootLayout.addView(bannerPlaceholder)
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
        /* An OVERLAY_TOP banner goes into this frame, ON TOP of the game, rather
           than into rootLayout. The game keeps the whole viewport - nothing is
           measured out of it - and the ad simply covers the top of the screen
           while it is on. That is the trade: no shrink, but the ad does cover
           the top of the world for as long as it is up. */
        if (bannerEdge?.isOverlay == true && bannerPlaceholder != null) {
            contentHost.addView(
                bannerPlaceholder,
                FrameLayout.LayoutParams(
                    FrameLayout.LayoutParams.MATCH_PARENT,
                    bannerHeightPx(),
                    android.view.Gravity.TOP
                )
            )
            adMobManager.setBannerOverlay(true)
        }
        /* A RIGHT strip stands on its end against the right-hand edge. It is laid
           over the frame rather than into rootLayout, and the WebView is inset by
           the same width so the two sit SIDE BY SIDE: the game keeps the full
           height, and whatever the game keeps against its right edge - pool's
           potted-ball tube - ends up immediately beside the ad instead of under
           it.

           The reserved width is the AD's own width, not the banner's 50dp. A
           MEDIUM_RECTANGLE is 300dp across; reserving the banner's 50dp left a
           strip far narrower than the ad it was meant to hold, so the container
           appeared and the ad never fitted inside it. */
        if (bannerEdge?.isVertical == true && bannerPlaceholder != null) {
            val stripWidthPx = verticalStripWidthPx()
            val wp = webView.layoutParams as? LinearLayout.LayoutParams
            if (wp != null) {
                wp.rightMargin = stripWidthPx
                webView.layoutParams = wp
            }
            contentHost.addView(
                bannerPlaceholder,
                FrameLayout.LayoutParams(
                    stripWidthPx,
                    FrameLayout.LayoutParams.MATCH_PARENT,
                    android.view.Gravity.END
                )
            )
            adMobManager.setBannerVertical(true)
        }
        /* Ask for the banner's ad NOW rather than when the game asks to show it.
           The strip's first request used to go out at the start of a run, so the
           ad was still arriving while the player was already playing, and the
           SDK's first setup runs on the UI thread - which read as a hitch right
           at the beginning of every run. Nothing is happening yet at this point
           in the open, so it is the right moment to spend it. */
        if (bannerEdge != null) adMobManager.preloadBanner()
        setContentView(contentHost)
        /* The display-cutout declaration has to be pushed into the view root
           once the hierarchy is on screen - that is where the frame is
           computed (see GameWindow.applyCutoutModeToView). */
        webView.post { GameWindow.applyCutoutModeToView(webView.rootView) }
        webView.post { GameWindow.fitWindowToDisplay(window, webView.rootView) }
        webView.postDelayed({ GameWindow.fitWindowToDisplay(window, webView.rootView) }, 600)
        // The decor exists now, so the cutout declaration sticks. Before this
        // point the platform re-applied the theme's window attributes when it
        // created the decor, which is what silently put the game back into the
        // letterboxed band around the camera hole.
        GameWindow.applyCutoutMode(window)
        gameRoot = rootLayout
        // The rotation was decided before the first frame (see setupOrientation), so
        // there is nothing left to turn once the entry animation starts.

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

        /* No banner load: see the BANNERS ARE OFF note where the strip used to be. */

        // This screen now owns the process-wide bridge (see bridgeOwner).
        bridgeOwner = this
        NativeBridgeContext.exitHandler = {
            /* MUST be marshalled onto the UI thread.
               Every other handler below does this, and the exit handler was the
               one that did not - which is why the shell BACK button was dead in
               EVERY game. NativeBridge is a @JavascriptInterface, so its
               methods are invoked on a WebView background thread; exitGame()
               then calls ShellTransition.closeGame() and finish(), neither of
               which may run off the main thread (finish() from a worker thread
               does not reliably leave the Activity). The tap looked live but
               nothing happened. */
            runOnUiThread { exitGame() }
        }
        NativeBridgeContext.callback = { jsFuncName, result ->
            runOnUiThread {
                webView.evaluateJavascript("if(window.$jsFuncName) { window.$jsFuncName('$result'); }", null)
            }
        }
        /* The policy decision has ALREADY been made in NativeBridge, which is
           the single funnel every ad in the app passes through - including the
           ten older games that call showRewardedAd(callback) directly. These
           handlers only have to load and show what was approved. */
        NativeBridgeContext.adHandler = { callback, placement, kind ->
            runAdOrExplainOffline(callback) {
                adMobManager.showRewardedAd(
                    onRewardEarned = {
                        AdPolicy.onRewardedEarned(
                            if (kind.equals("revive", true)) AdPolicy.RewardKind.REVIVE
                            else AdPolicy.RewardKind.NORMAL
                        )
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
        NativeBridgeContext.interstitialHandler = { callback, placement ->
            // Interstitials are bonus breaks: offline, skip silently (no
            // "no internet" dialog) and let the game carry on. A policy denial
            // was already released as "skipped" in NativeBridge.
            runAdOrExplainOffline(callback, explain = false) {
                adMobManager.showInterstitialAd(
                    onAdClosed = {
                        AdPolicy.onInterstitialShown()
                        NativeBridgeContext.callback?.invoke(callback, "closed")
                    }
                )
            }
        }
        /* A NEW RUN inside the same game screen. Games restart in place on
           "Play Again", so the Activity is never recreated and onGameOpened()
           never runs again - without this the shell still believed the first
           run's revive had been spent and refused the second run's. */
        NativeBridgeContext.runHandler = { AdPolicy.onRunStarted() }

        /* A game that changes its own background WHILE IT IS OPEN - Carrom has
           themes - tells the shell, and the banner strip follows. The strip is
           a native view over the WebView, so it cannot see a CSS change by
           itself, and being left on the colour the game started with put a
           brown strip over a green game. */
        NativeBridgeContext.pageBgHandler = { hex ->
            val colour = try {
                android.graphics.Color.parseColor(hex.trim())
            } catch (e: IllegalArgumentException) {
                Log.w(TAG_TIME, "page background not a colour: $hex")
                null
            }
            if (colour != null) {
                adMobManager.setBannerBackdrop(colour)
                Log.d(TAG_TIME, "page background now $hex")
            }
        }

        /* Banner handler: games call Studio.ads.showBanner()/hideBanner().
           Only wired for a game whose manifest carries a `banner:` line, so a
           game that never opted in cannot bring a strip up on its own. */
        NativeBridgeContext.bannerHandler = { show ->
            runOnUiThread {
                val slot = bannerPlaceholder ?: return@runOnUiThread
                adMobManager.setBannerBackdrop(bannerBackdrop())
                if (show) {
                    adMobManager.setBannerPlaceholder(slot)
                    adMobManager.showBanner()
                } else {
                    adMobManager.hideBanner()
                }
            }
        }
    }

    /**
     * Per-game rotation, done WITHOUT any overlay: the game's manifest decides,
     * and the activity rotates from the portrait configuration it was created in.
     * `configChanges` in the manifest keeps the activity alive across the flip (no
     * relaunch = no hard cut), so the system's own rotate animation plays while
     * the WebView simply resizes.
     *
     * A LANDSCAPE game still turns for real - it is created portrait (manifest
     * lock), then asks the display to turn here, so the platform animates a genuine
     * rotation instead of the activity starting up already sideways.
     *
     * Anything that is not explicitly landscape stays portrait. `unspecified` is
     * deliberately NOT used: it hands the choice to the sensor, which is exactly
     * how a portrait game used to arrive sideways on a phone held in landscape.
     */
    private fun setupOrientation(orientation: String) {
        when (orientation.lowercase()) {
            "landscape" -> requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_LANDSCAPE
            else -> requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_PORTRAIT
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
        /* The rotation re-lays the window out, and the cutout declaration has
           to be re-pushed into the view root afterwards - the frame is
           computed there (see GameWindow.applyCutoutModeToView). */
        webView.post { GameWindow.applyCutoutModeToView(webView.rootView) }
        webView.post { GameWindow.fitWindowToDisplay(window, webView.rootView) }
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

    /* Tracks every AudioContext the page creates, so they can all be suspended when
       the screen is backgrounded.
       webView.onPause() stops JS timers and the render loop, but an AudioContext
       that is ALREADY running ignores both and keeps making sound - which is how
       a game's score followed the player onto the home screen and into other
       apps. Doing this per game meant only the games that had opted in went
       quiet, so the contexts are wrapped here instead and the whole page is
       covered at once. Runs before the game's own scripts. */

    /* THE SHELL ALREADY OWNS THE VIEWPORT - a game must never be able to hang
       on a fullscreen request.

       GameActivity runs every game edge-to-edge and immersive ([GameWindow]),
       and the activity's own `requestedOrientation` decides portrait vs
       landscape. A game asking for `requestFullscreen()` is therefore asking
       for something it already has.

       The reason this matters is not the feature, it is the PROMISE. A page that
       does `await documentElement.requestFullscreen()` waits on a promise that
       is only settled by the host through WebChromeClient.onShowCustomView.
       This WebView sets no WebChromeClient fullscreen path, so nothing settles
       it: the await never returns and every line after it silently never runs.
       Sheepdog Trials called it on its PLAY button, so the game could sit on its
       opening overlay looking frozen - the exact "black background, stuck"
       report.

       Replacing the call with one that resolves IMMEDIATELY (and dispatches the
       resize a real fullscreen would have caused, which is all a canvas game
       actually wants from it) means a game can never be left waiting on the
       host. In a plain browser tab this script is simply absent and the real API
       is used unchanged. */
    /**
     * Injects the shell's four page scripts - DPR cap, fullscreen stub,
     * canvas-loss watcher, audio tracker - into [v].
     *
     * WHY NOT DOCUMENT-START INJECTION
     *
     * `addDocumentStartJavaScript` reports the feature supported, accepts every
     * registration without complaint, and then never executes any of them. Logged
     * on a real launch:
     *
     *     16:29:04.756  Launching game sheepdog-trials
     *     16:29:04.983  document-start registered 8 of 8
     *     16:29:05.407  AudioTrack: installed      <- +424ms: the hand-injected
     *                                                      fallback, not the above
     *
     * Two origin rules were tried - the file scheme and the catch-all - and not
     * one `DPR:` or `CW:` line was ever produced. It is not a rule that can be
     * fixed: a page loaded from `file:///android_asset` has an opaque origin, and
     * there is nothing there to match against, so the injection is accepted and
     * discarded. Registration succeeding was never evidence that anything ran,
     * and for the entire life of this feature that was simply assumed - which is
     * why the audio tracker was the only one of the four that had ever worked.
     * It went in by hand, here, the whole time.
     *
     * So all four go in by hand now.
     *
     * WHY IT IS INJECTED THREE TIMES
     *
     * The DPR cap is the one that needs to arrive early - a game reads
     * `devicePixelRatio` once, at startup - and there is no longer any way to
     * guarantee beating it to that read. Injecting at page start gives the best
     * chance; injecting again at commit and after load catches a document that
     * replaced itself in between. Every script sets a window flag on its first
     * run and returns immediately on later ones, so the repeats are no-ops.
     *
     * Each script announces itself on its first successful run, which is what
     * makes this knowable instead of assumed - and if a game still reports an
     * uncapped DPR, the log says so rather than leaving it to be guessed at.
     */

    /**
     * The shell's page scripts, as one inline block for splicing into the
     * game's document.
     *
     * They live in the APK's assets as real .js files rather than as Kotlin
     * raw strings. That is not a style preference: a raw string full of
     * JavaScript is a brace hazard for anything that tries to find its end,
     * and the scripts are JavaScript and deserve to be linted and tested as
     * JavaScript.
     *
     * Reading them here also means the very same text is used for the
     * document injection and for the fallback injection, so the two can never
     * drift apart.
     */
    private fun shellScriptBlock(): String {
        val sb = StringBuilder()
        for (name in listOf("dpr.js", "fullscreen.js", "canvaswatch.js", "audiotracker.js")) {
            val js = try {
                assets.open("shell/$name").use { it.readBytes().toString(Charsets.UTF_8) }
            } catch (e: Throwable) {
                Log.w(TAG_TIME, "shell script missing: $name")
                continue
            }
            // A script tag cannot contain the sequence that closes one.
            val safe = js.replace("</script", "<" + "/script")
            sb.append("<script>\n").append(safe).append("\n</script>\n")
        }
        return sb.toString()
    }

    /**
     * The shell's page scripts, as raw JavaScript, for the fallback path.
     */
    private fun shellScriptSources(): List<String> =
        listOf("dpr.js", "fullscreen.js", "canvaswatch.js", "audiotracker.js").map { name ->
            try {
                assets.open("shell/$name").use { it.readBytes().toString(Charsets.UTF_8) }
            } catch (e: Throwable) {
                Log.w(TAG_TIME, "shell script missing: $name")
                ""
            }
        }

    private fun injectShellScripts(v: WebView) {
        val ordered = shellScriptSources()
        for (js in ordered) {
            try {
                v.evaluateJavascript(js, null)
            } catch (e: Throwable) {
                // A renderer that has gone away throws here. reloadGame() owns
                // that case; there is nothing useful to do about it twice.
                Log.w(TAG_TIME, "shell script injection failed: ${e.message}")
            }
        }
    }

    /**
     * Puts the shell's scripts at the very top of the game's document.
     *
     * They go after the <head> tag when there is one, and at the very start of
     * the file when there is not, so that they are above every script the game
     * ships with. Nothing the game does can happen before them.
     */
    private fun injectShellScript(html: String): String {
        val block = shellScriptBlock()
        val headAt = html.indexOf("<head")
        if (headAt >= 0) {
            val headEnd = html.indexOf('>', headAt)
            if (headEnd >= 0) {
                return html.substring(0, headEnd + 1) + block + html.substring(headEnd + 1)
            }
        }
        val doctype = html.indexOf("<!DOCTYPE")
        if (doctype >= 0) {
            val end = html.indexOf('>', doctype)
            if (end >= 0) return html.substring(0, end + 1) + block + html.substring(end + 1)
        }
        return block + html
    }


    /* THE BACKING STORE IS CAPPED, ONCE, FOR EVERY GAME.

   Almost every canvas game sizes its backing store off `devicePixelRatio`. Most
   cap it; the ones that do not, and the two that cap at 2.5, hand the GPU a
   surface several times larger than the screen. On a 2.75-density phone that is
   about six device pixels for every CSS pixel, and every one of those pixels is
   paid again by each full-screen fill, each background blit and each vignette -
   sixty times a second.

   That is also why a LARGER phone could be the laggy one: a bigger screen is a
   bigger backing store, so the same number of draw calls is being asked to cover
   more pixels. Frame cost here tracks area, not just call count.

   Capping what the page SEES is the cheapest correct lever available, because
   it reaches every bundled game at once and touches none of their drawing code
   or their art. The cap is 2, which is past the point where extra density stops
   being visible on a phone and still leaves text crisp.

   Not additive with a game's own cap - a game that clamps to 1.5 keeps 1.5.
   Only the ones that would have gone higher are pulled down. */


    override fun onPause() {
        super.onPause()
        /* Put the ad strip away with the screen. Left up, it kept its slot in
           the layout and drew over whatever the player opened next. */
        adMobManager.hideBanner()
        /* WHY THE WEBVIEW IS NOT STOPPED HERE.

           `webView.onPause()` is deferred to `onStop()` below, and that move is
           the fix.

           A game queues its music in chunks, armed from a timer, so stopping JS
           only stops the QUEUE - whatever chunk is already scheduled plays out
           to the end before silence, which is where the "the music keeps
           playing for forty seconds after I leave" report came from. The only
           thing that cuts it short is suspending the AudioContext itself.

           Suspending it is a job for the page, and `evaluateJavascript` is how
           the page is reached. That call is asynchronous: it queues, the page
           runs it later. Calling `webView.onPause()` on the following line can
           reach the renderer first, and a renderer that has been told to stop
           sits on the queued call instead of running it - so the suspend that
           was supposed to prevent the forty seconds is itself the thing that
           never happens.

           So this method only ASKS the page to be quiet, and the WebView is not
           stopped until `onStop()`, by which point the renderer has had the
           whole of the pause transition to run the request. `onStop()` still
           arrives promptly - it is the very next callback - so nothing is left
           running behind the shell for longer than it was before. */
        webView.evaluateJavascript(
            "window.__studioSuspendAudioAll && window.__studioSuspendAudioAll(true);", null)
        webView.evaluateJavascript("window.Game && Game.pause && Game.pause();", null)
        /* Stop the debug countdown with the screen: it is a singleton, so leaving
           it running would keep a Handler ticking over a dead Activity. */
        com.redundantstudios.arcade.ads.AdDebugBadge.detach()
    }

    /**
     * The activity is off screen. Stop the WebView now - not in [onPause] - so
     * that the audio suspend issued there has actually run first. See the note
     * in [onPause].
     */
    override fun onStop() {
        super.onStop()
        if (::webView.isInitialized) webView.onPause()
    }

    override fun onResume() {
        super.onResume()
        webView.onResume()
        /* Counterpart to the suspend in onPause - otherwise a game that was
           backgrounded comes back silent. */
        webView.evaluateJavascript(
            "window.__studioSuspendAudioAll && window.__studioSuspendAudioAll(false);", null)
        adMobManager.loadRewardedAd()
        adMobManager.loadInterstitialAd()
        /* Debug builds only (AdDebugBadge returns immediately otherwise). The
           interstitial countdown is drawn by the SHELL over the game WebView so
           it covers every game from one implementation, instead of a badge that
           has to be copied into each game and can drift between them. */
        com.redundantstudios.arcade.ads.AdDebugBadge.attach(this)

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
        pendingTeardown = this
        teardownHandler.postDelayed({
            releaseSurface()
            if (pendingTeardown === this) pendingTeardown = null
        }, SURFACE_RELEASE_MS)
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
        /* Point the WebView at an empty page and let it go. Destroying it while
           it is mid-document leaves the renderer to unwind a live page with a
           canvas and an animation loop on it; about:blank gives it nothing to
           hold on to, which is the difference between the memory coming back
           now and coming back whenever the collector next runs. */
        try {
            webView.stopLoading()
            webView.loadUrl("about:blank")
        } catch (e: Throwable) {
            Log.w(TAG_TIME, "pre-destroy unload failed: ${e.message}")
        }
        webView.removeJavascriptInterface("NativeBridge")
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

    /**
     * Back is disabled while a game is on screen.
     *
     * The director asked for this so a player cannot drop out of a game by
     * reflex mid-turn - they are meant to leave through the in-game pause
     * menu like everything else. The in-game back button (NativeBridge
     * .exitGame) is untouched, so every game still has a way out.
     *
     * NOT a dead end, though: a broken or half-loaded game could fail to show
     * that menu and strand someone with no way home. So the first two presses
     * are swallowed with a hint, and a third within a couple of seconds
     * always gets out. A trap is worse than a reflex.
     */
    private var backPressCount = 0
    private var lastBackPressAt = 0L

    private fun installBackBlock() {
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() = onSystemBackPressed()
        })
    }

    private fun onSystemBackPressed() {
        val now = android.os.SystemClock.elapsedRealtime()
        // a press more than 2.5s after the last one restarts the count
        backPressCount = if (now - lastBackPressAt > 2500) 1 else backPressCount + 1
        lastBackPressAt = now
        if (backPressCount >= 3) {
            exitGame()
            return
        }
        try {
            android.widget.Toast.makeText(this, R.string.game_back_hint, android.widget.Toast.LENGTH_SHORT).show()
        } catch (_: Throwable) {
            // never let a hint crash a game
        }
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
