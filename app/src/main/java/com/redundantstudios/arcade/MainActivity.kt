package com.redundantstudios.arcade

import android.content.Intent
import android.os.Bundle
import android.view.View
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.recyclerview.widget.GridLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.redundantstudios.arcade.R
import com.redundantstudios.arcade.model.GameManifest
import com.redundantstudios.arcade.model.GameMode
import com.redundantstudios.arcade.ui.ModeAdapter
import com.redundantstudios.arcade.ui.ModeActivity
import com.redundantstudios.arcade.util.ManifestParser

class MainActivity : AppCompatActivity() {
    private lateinit var allGames: List<GameManifest>

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        val modeRecyclerView = findViewById<RecyclerView>(R.id.modeRecyclerView)
        modeRecyclerView.layoutManager = GridLayoutManager(this, 2)

        allGames = ManifestParser.scanGames(this)

        val modes = deriveModes(allGames)
        modeRecyclerView.adapter = ModeAdapter(modes) { mode ->
            startModeActivity(mode)
        }
    }

    private fun deriveModes(games: List<GameManifest>): List<GameMode> {
        val supportedCounts = games.flatMap { (it.minPlayers..it.maxPlayers).toList() }.distinct().sorted()
        val colors = listOf("#EF5350", "#42A5F5", "#66BB6A", "#FFCA28", "#AB47BC") // Red, Blue, Green, Amber, Purple

        return supportedCounts.mapIndexed { index, count ->
            GameMode(
                playerCount = count,
                label = "${count} PLAYER",
                color = colors[index % colors.size]
            )
        }
    }

    private fun startModeActivity(mode: GameMode) {
        val intent = Intent(this, ModeActivity::class.java).apply {
            putExtra("player_count", mode.playerCount)
        }
        startActivity(intent)
    }
}
