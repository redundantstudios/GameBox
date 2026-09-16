package com.redundantstudios.arcade

import android.content.Intent
import android.content.pm.ActivityInfo
import android.os.Bundle
import android.os.Build
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
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

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        adMobManager = AdMobManager(this)
        adMobManager.loadRewardedAd()

        val gameId = intent.getStringExtra("game_id") ?: return

        val allGames = ManifestParser.scanGames(this)
        currentGame = allGames.find { it.id == gameId }

        setupOrientation(currentGame?.orientation ?: "portrait")

        webView = WebView(this).apply {
            layoutParams = android.view.ViewGroup.LayoutParams(
                android.view.ViewGroup.LayoutParams.MATCH_PARENT,
                android.view.ViewGroup.LayoutParams.MATCH_PARENT
            )

            settings.apply {
                javaScriptEnabled = true
                domStorageEnabled = true
                allowFileAccess = true
                allowContentAccess = true
                allowFileAccessFromFileURLs = false
                allowUniversalAccessFromFileURLs = false
            }

            webViewClient = WebViewClient()

            addJavascriptInterface(NativeBridge(this@GameActivity), "NativeBridge")

            if (Build.VERSION.SDK_INT >= 26) {
                webView.setRendererPriorityPolicy(WebView.RENDERER_PRIORITY_IMPORTANCE_HIGH, false)
            }

            val mode = intent.getStringExtra("mode") ?: "solo"
            val skill = intent.getStringExtra("skill") ?: "medium"
            val players = intent.getIntExtra("players", 1)

            android.util.Log.d("GameActivity", "Launching game $gameId: mode=$mode, skill=$skill, players=$players")

            loadUrl("file:///android_asset/games/$gameId/index.html?mode=$mode&skill=$skill&players=$players")
        }

        setContentView(webView)

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
