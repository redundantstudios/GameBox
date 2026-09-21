package com.redundantstudios.arcade

import android.content.Intent
import android.content.pm.ActivityInfo
import android.os.Bundle
import android.os.Build
import android.view.WindowManager
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
import com.redundantstudios.arcade.util.ManifestParser
import com.redundantstudios.arcade.util.SettingsManager

class GameActivity : AppCompatActivity() {
    private lateinit var webView: WebView
    private var currentGame: GameManifest? = null
    private lateinit var adMobManager: AdMobManager
    private lateinit var bannerContainer: FrameLayout
    private var bannerRequestedVisible = false

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
     */
    private fun runAdOrExplainOffline(callback: String, action: () -> Unit) {
        if (isOnline()) {
            action()
            return
        }
        Log.w("GameActivity", "Ad request blocked: device is offline")
        runOnUiThread {
            com.google.android.material.dialog.MaterialAlertDialogBuilder(this)
                .setTitle("Check your internet connection")
                .setMessage("Ads need an internet connection. Please check your network and try again.")
                .setPositiveButton("Okay", null)
                .show()
        }
        NativeBridgeContext.callback?.invoke(callback, "closed")
    }
    private var loadedSettingsSignature: String = ""


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

            webViewClient = WebViewClient()

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
        setContentView(rootLayout)

        webView.post {
            android.util.Log.d("VP", "webViewPx=${webView.width}, density=${resources.displayMetrics.density}")
        }

        adMobManager.loadBannerAd(bannerContainer) {
            runOnUiThread {
                Log.d("BannerState", "Ad loaded. Applying requested visibility: $bannerRequestedVisible")
                bannerContainer.visibility = if (bannerRequestedVisible) android.view.View.VISIBLE else android.view.View.GONE
            }
        }

        NativeBridgeContext.exitHandler = { finish() }
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
                    }
                )
            }
        }
        NativeBridgeContext.interstitialHandler = { callback ->
            runAdOrExplainOffline(callback) {
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
                bannerContainer.visibility = if (show) android.view.View.VISIBLE else android.view.View.GONE
            }
        }
    }

    private fun setupOrientation(orientation: String) {
        when (orientation.lowercase()) {
            "portrait" -> requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_PORTRAIT
            "landscape" -> requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_LANDSCAPE
            else -> requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED
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
        finish()
    }
}
