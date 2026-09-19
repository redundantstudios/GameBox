package com.redundantstudios.arcade

import android.content.Intent
import android.os.Bundle
import android.view.Menu
import android.view.MenuItem
import android.view.View
import androidx.appcompat.app.AppCompatActivity
import androidx.appcompat.widget.Toolbar
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import androidx.recyclerview.widget.GridLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.google.android.gms.ads.MobileAds
import com.redundantstudios.arcade.R
import com.redundantstudios.arcade.ads.UMPConsentManager
import com.redundantstudios.arcade.model.GameManifest
import com.redundantstudios.arcade.model.GameMode
import com.redundantstudios.arcade.ui.ModeAdapter
import com.redundantstudios.arcade.ui.ModeActivity
import com.redundantstudios.arcade.util.ManifestParser
import com.redundantstudios.arcade.SettingsActivity

class MainActivity : AppCompatActivity() {
    private lateinit var allGames: List<GameManifest>

    override fun onCreate(savedInstanceState: Bundle?) {
        com.redundantstudios.arcade.util.SettingsManager.init(this)
        com.redundantstudios.arcade.util.SettingsManager.applyTheme()
        installSplashScreen()
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        val toolbar: Toolbar = findViewById(R.id.toolbar)
        setSupportActionBar(toolbar)

        UMPConsentManager(this).gatherConsent {
            MobileAds.initialize(this) {}
        }

        val modeRecyclerView = findViewById<RecyclerView>(R.id.modeRecyclerView)
        modeRecyclerView.layoutManager = GridLayoutManager(this, 2)

        allGames = ManifestParser.scanGames(this)

        val modes = deriveModes(allGames)
        modeRecyclerView.adapter = ModeAdapter(modes) { mode ->
            startModeActivity(mode)
        }
        findViewById<View>(R.id.emptyState).visibility =
            if (modes.isEmpty()) View.VISIBLE else View.GONE
    }

    override fun onResume() {
        super.onResume()
        // Re-scan in case games were added/removed while paused (e.g., dev swaps)
        if (this::allGames.isInitialized) {
            allGames = ManifestParser.scanGames(this)
            val modeRecyclerView = findViewById<RecyclerView>(R.id.modeRecyclerView)
            (modeRecyclerView.adapter as? ModeAdapter)?.let { adapter ->
                val modes = deriveModes(allGames)
                adapter.updateModes(modes)
                findViewById<View>(R.id.emptyState).visibility =
                    if (modes.isEmpty()) View.VISIBLE else View.GONE
            }
        }
    }

    override fun onCreateOptionsMenu(menu: Menu?): Boolean {
        menuInflater.inflate(R.menu.toolbar_menu, menu)
        return true
    }

    override fun onOptionsItemSelected(item: MenuItem): Boolean {
        return when (item.itemId) {
            R.id.action_settings -> {
                startActivity(Intent(this, SettingsActivity::class.java))
                true
            }
            else -> super.onOptionsItemSelected(item)
        }
    }

    private fun deriveModes(games: List<GameManifest>): List<GameMode> {
        val counts = games.flatMap { (it.minPlayers..it.maxPlayers).toList() }
        val supportedCounts = counts.distinct().sorted()
        val colors = listOf("#EF5350", "#42A5F5", "#66BB6A", "#FFCA28", "#AB47BC")

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
            putExtra("player_count", mode.playerCount)
        }
        startActivity(intent)
    }
}
