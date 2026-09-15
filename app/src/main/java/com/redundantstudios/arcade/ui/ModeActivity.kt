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

        val filteredGames = allGames.filter { game ->
            if (playerCount == 1) {
                (game.maxPlayers == 1) || (game.aiSupport == "full" && game.maxPlayers >= 2)
            } else {
                game.minPlayers <= playerCount && game.maxPlayers >= playerCount
            }
        }
        Log.d(TAG, "Filtered games for $playerCount P: ${filteredGames.size}")

        recyclerView.adapter = GameAdapter(filteredGames) { game ->
            android.util.Log.d(TAG, "Game tile clicked: ${game.id}, playerCount=$playerCount, maxPlayers=${game.maxPlayers}")
            if (playerCount == 1 && game.maxPlayers == 1) {
                android.util.Log.d(TAG, "Instant launch for 1P game: ${game.id}")
                launchGame(game, "solo", "medium", game.minPlayers)
            } else {
                android.util.Log.d(TAG, "Showing LaunchSheet for game: ${game.id}")
                LaunchSheet(this, game, playerCount) { mode, skill, players ->
                    android.util.Log.d(TAG, "LaunchSheet callback: mode=$mode, skill=$skill, players=$players")
                    launchGame(game, mode, skill, players)
                }.show()
            }
        }

        recyclerView.post {
            Log.d(TAG, "RecyclerView dimensions: w=${recyclerView.width} h=${recyclerView.height}")
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
