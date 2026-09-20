package com.redundantstudios.arcade

import android.content.Intent
import android.os.Bundle
import android.view.View
import android.widget.ImageButton
import android.widget.TextView
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import androidx.recyclerview.widget.GridLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.google.android.gms.ads.MobileAds
import com.redundantstudios.arcade.ads.UMPConsentManager
import com.redundantstudios.arcade.model.GameManifest
import com.redundantstudios.arcade.model.GameMode
import com.redundantstudios.arcade.ui.ModeAdapter
import com.redundantstudios.arcade.ui.ModeActivity
import com.redundantstudios.arcade.ui.ThemedActivity
import com.redundantstudios.arcade.util.ManifestParser

class MainActivity : ThemedActivity() {

    private lateinit var allGames: List<GameManifest>

    override fun onCreate(savedInstanceState: Bundle?) {
        installSplashScreen()
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)
        applyShellBackground()

        UMPConsentManager(this).gatherConsent {
            MobileAds.initialize(this) {}
        }

        findViewById<ImageButton>(R.id.btnSettings).setOnClickListener {
            startActivity(Intent(this, SettingsActivity::class.java))
        }

        findViewById<View>(R.id.allGamesCard).setOnClickListener {
            startActivity(
                Intent(this, ModeActivity::class.java).apply {
                    putExtra(ModeActivity.EXTRA_ALL_GAMES, true)
                }
            )
        }

        val modeRecyclerView = findViewById<RecyclerView>(R.id.modeRecyclerView)
        modeRecyclerView.layoutManager = GridLayoutManager(this, 2)

        allGames = ManifestParser.scanGames(this)
        modeRecyclerView.adapter = ModeAdapter(deriveModes(allGames)) { mode ->
            startModeActivity(mode)
        }
        bindHome()
    }

    override fun onResume() {
        super.onResume()
        // Re-scan in case games were added/removed while paused (e.g., dev swaps)
        if (this::allGames.isInitialized) {
            allGames = ManifestParser.scanGames(this)
            bindHome()
        }
    }

    /** Keeps the All Games band, the grid and the empty state in sync. */
    private fun bindHome() {
        val modes = deriveModes(allGames)

        (findViewById<RecyclerView>(R.id.modeRecyclerView).adapter as? ModeAdapter)
            ?.updateModes(modes)

        findViewById<TextView>(R.id.allGamesSubtitle).text =
            getString(R.string.all_games_count, allGames.size)

        findViewById<View>(R.id.emptyState).visibility =
            if (modes.isEmpty()) View.VISIBLE else View.GONE
    }

    private fun deriveModes(games: List<GameManifest>): List<GameMode> {
        val counts = games.flatMap { (it.minPlayers..it.maxPlayers).toList() }
        val supportedCounts = counts.distinct().sorted()
        // Design--ref palette: all saturated enough to carry white text
        val colors = listOf("#E53935", "#1E88E5", "#43A047", "#F9A825", "#8E24AA")

        return supportedCounts.mapIndexed { index, count ->
            val gameCount = ModeActivity.filterGames(games, count).size
            GameMode(
                playerCount = count,
                label = "${count} PLAYER",
                color = colors[index % colors.size],
                gameCount = gameCount
            )
        }.filter { it.gameCount > 0 }
    }

    private fun startModeActivity(mode: GameMode) {
        val intent = Intent(this, ModeActivity::class.java).apply {
            putExtra(ModeActivity.EXTRA_PLAYER_COUNT, mode.playerCount)
        }
        startActivity(intent)
    }
}
