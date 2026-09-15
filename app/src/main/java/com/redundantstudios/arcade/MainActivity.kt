package com.redundantstudios.arcade

import android.content.Intent
import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity
import androidx.recyclerview.widget.GridLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.redundantstudios.arcade.model.GameManifest
import com.redundantstudios.arcade.ui.GameAdapter
import com.redundantstudios.arcade.util.ManifestParser

class MainActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        val recyclerView = findViewById<RecyclerView>(R.id.gamesRecyclerView)
        recyclerView.layoutManager = GridLayoutManager(this, 2)

        val games = ManifestParser.scanGames(this)
        recyclerView.adapter = GameAdapter(games) { game ->
            val intent = Intent(this, GameActivity::class.java).apply {
                putExtra("game_id", game.id)
            }
            startActivity(intent)
        }
    }
}
