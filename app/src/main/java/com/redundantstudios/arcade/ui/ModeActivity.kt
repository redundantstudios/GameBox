package com.redundantstudios.arcade.ui

import android.content.Intent
import android.os.Bundle
import android.util.Log
import android.view.View
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.recyclerview.widget.GridLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.redundantstudios.arcade.GameActivity
import com.redundantstudios.arcade.R
import com.redundantstudios.arcade.model.GameManifest
import com.redundantstudios.arcade.util.ManifestParser

class ModeActivity : AppCompatActivity() {
    private val TAG = "ModeActivity"

    companion object {
        /** Single source of truth for which games belong to a player count. */
        fun filterGames(games: List<GameManifest>, playerCount: Int): List<GameManifest> =
            games.filter { game ->
                if (playerCount == 1) {
                    (game.maxPlayers == 1) || (game.aiSupport == "full" && game.maxPlayers >= 2)
                } else {
                    game.minPlayers <= playerCount && game.maxPlayers >= playerCount
                }
            }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_mode)

        val playerCount = intent.getIntExtra("player_count", 1)
        val titleText = findViewById<TextView>(R.id.modeTitle)
        titleText.text = "$playerCount Player Games"

        val recyclerView = findViewById<RecyclerView>(R.id.gamesRecyclerView)
        recyclerView.layoutManager = GridLayoutManager(this, 2)

        val allGames = ManifestParser.scanGames(this)
        Log.d(TAG, "Total games scanned: ${allGames.size}")

        val filteredGames = filterGames(allGames, playerCount)
        Log.d(TAG, "Filtered games for $playerCount P: ${filteredGames.size}")

        findViewById<View>(R.id.emptyState).visibility =
            if (filteredGames.isEmpty()) View.VISIBLE else View.GONE

        recyclerView.adapter = GameAdapter(filteredGames) { game ->
            android.util.Log.d(TAG, "Game tile clicked: ${game.id}, playerCount=$playerCount, maxPlayers=${game.maxPlayers}")

            // Direct launch: skip LaunchSheet and pass the selected mode count directly to the game
            launchGame(game, "pass", "medium", playerCount)
        }

        val btnBack = findViewById<android.widget.ImageButton>(R.id.btnBack)
        btnBack.setOnClickListener {
            finish()
        }
    }

    private fun launchGame(game: GameManifest, mode: String, skill: String, players: Int) {
        val intent = Intent(this, GameActivity::class.java).apply {
            putExtra("game_id", game.id)
            putExtra("mode", mode)
            putExtra("skill", skill)
            putExtra("players", players)
        }
        startActivity(intent)
    }
}
