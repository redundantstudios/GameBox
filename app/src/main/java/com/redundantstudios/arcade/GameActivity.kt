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
import androidx.appcompat.app.AppCompatActivity
import com.redundantstudios.arcade.ads.AdMobManager
import com.redundantstudios.arcade.bridge.NativeBridge
import com.redundantstudios.arcade.bridge.NativeBridgeContext
import com.redundantstudios.arcade.model.GameManifest
import com.redundantstudios.arcade.util.ManifestParser

class GameActivity : AppCompatActivity() {
    private lateinit var webView: WebView
    private var currentGame: GameManifest? = null
    private lateinit var adMobManager: AdMobManager
    private lateinit var bannerContainer: FrameLayout
    private var bannerRequestedVisible = false


    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        WebView.setWebContentsDebuggingEnabled(true)

        adMobManager = AdMobManager(this)
        adMobManager.loadRewardedAd()
        adMobManager.loadInterstitialAd()

        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)

        val gameId = intent.getStringExtra("game_id") ?: return

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

            val mode = intent.getStringExtra("mode") ?: "solo"
            val skill = intent.getStringExtra("skill") ?: "medium"
            val players = intent.getIntExtra("players", 1)

            android.util.Log.d("GameActivity", "Launching game $gameId: mode=$mode, skill=$skill, players=$players")

            loadUrl("file:///android_asset/games/$gameId/index.html?mode=$mode&skill=$skill&players=$players")
        }

        rootLayout.addView(webView)
        rootLayout.addView(bannerContainer)
        setContentView(rootLayout)

        webView.post {
            android.util.Log.d("ViewportProof", "WebView width: ${webView.width}px, density: ${resources.displayMetrics.density}")
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
            adMobManager.showRewardedAd(
                onRewardEarned = {
                    NativeBridgeContext.callback?.invoke(callback, "granted")
                },
                onAdClosed = {
                    NativeBridgeContext.callback?.invoke(callback, "closed")
                }
            )
        }
        NativeBridgeContext.interstitialHandler = { callback ->
            adMobManager.showInterstitialAd(
                onAdClosed = {
                    NativeBridgeContext.callback?.invoke(callback, "closed")
                }
            )
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
        webView.evaluateJavascript("Game.pause && Game.pause();", null)
    }

    override fun onResume() {
        super.onResume()
        webView.evaluateJavascript("Game.resume && Game.resume();", null)
    }

    override fun onDestroy() {
        super.onDestroy()
        webView.evaluateJavascript("Game.destroy && Game.destroy();", null)
    }

    override fun onBackPressed() {
        finish()
    }
}
