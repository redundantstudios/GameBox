package com.redundantstudios.arcade

import android.content.Intent
import android.content.pm.ActivityInfo
import android.os.Bundle
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.appcompat.app.AppCompatActivity
import com.redundantstudios.arcade.bridge.NativeBridge
import com.redundantstudios.arcade.bridge.NativeBridgeContext
import com.redundantstudios.arcade.model.GameManifest
import com.redundantstudios.arcade.util.ManifestParser

class GameActivity : AppCompatActivity() {
    private lateinit var webView: WebView
    private var currentGame: GameManifest? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val gameId = intent.getStringExtra("game_id") ?: return

        // Resolve manifest for orientation
        val allGames = ManifestParser.scanGames(this)
        currentGame = allGames.find { it.id == gameId }

        setupOrientation(currentGame?.orientation ?: "portrait")

        webView = WebView(this).apply {
            layoutParams = android.view.ViewGroup.LayoutParams(
                android.view.ViewGroup.LayoutParams.MATCH_PARENT,
                android.view.ViewGroup.LayoutParams.MATCH_PARENT
            )

            // Security & Config
            settings.apply {
                javaScriptEnabled = true
                domStorageEnabled = true
                // S2 Security: block universal access to protect local assets
                allowFileAccess = true
                allowContentAccess = true
                allowFileAccessFromFileURLs = false
                allowUniversalAccessFromFileURLs = false
            }

            webViewClient = WebViewClient()

            // Inject Bridge BEFORE loading page
            addJavascriptInterface(NativeBridge(this@GameActivity), "NativeBridge")

            loadUrl("file:///android_asset/games/$gameId/index.html")
        }

        setContentView(webView)

        // Setup bridge handlers
        NativeBridgeContext.exitHandler = { finish() }
        NativeBridgeContext.callback = { jsFuncName, result ->
            runOnUiThread {
                webView.evaluateJavascript("if(window.$jsFuncName) { window.$jsFuncName('$result'); }", null)
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
        // Back button in GameActivity = exitGame() directly
        // Instead of popping history, we finish the activity
        finish()
    }
}
