package com.redundantstudios.arcade

import android.content.Intent
import android.os.Bundle
import android.view.View
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.recyclerview.widget.GridLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.google.android.material.chip.Chip
import com.google.android.material.chip.ChipGroup
import com.redundantstudios.arcade.model.GameManifest
import com.redundantstudios.arcade.ui.GameAdapter
import com.redundantstudios.arcade.ui.LaunchSheet
import com.redundantstudios.arcade.util.ManifestParser

class MainActivity : AppCompatActivity() {
    private lateinit var allGames: List<GameManifest>
    private lateinit var adapter: GameAdapter

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        val recyclerView = findViewById<RecyclerView>(R.id.gamesRecyclerView)
        val chipGroup = findViewById<ChipGroup>(R.id.filterChipGroup)
        recyclerView.layoutManager = GridLayoutManager(this, 2)

        allGames = ManifestParser.scanGames(this)

        setupFilters(chipGroup)
        updateGrid(allGames)

        chipGroup.setOnCheckedStateChangeListener { _, checkedIds ->
            val selectedId = checkedIds.firstOrNull() ?: -1
            // Find which player count is associated with the chip
            // We can use the chip text as the filter
            val selectedChip = chipGroup.findViewById<Chip>(selectedId)
            val filterText = selectedChip?.text?.toString() ?: "All"

            val filtered = if (filterText == "All") {
                allGames
            } else {
                val pCount = filterText.replace("P", "").toIntOrNull() ?: 1
                allGames.filter { it.minPlayers <= pCount && it.maxPlayers >= pCount }
            }
            updateGrid(filtered)
        }
    }

    private fun setupFilters(chipGroup: ChipGroup) {
        val counts = allGames.flatMap { (it.minPlayers..it.maxPlayers).toList() }.distinct().sorted()

        // "All" chip
        val allChip = Chip(this).apply {
            text = "All"
            isChecked = true
            setOnCheckedChangeListener { _, isChecked ->
                if (isChecked) {
                    // Simple snap effect (simulated via scale if needed, but chips have default ripple)
                }
            }
        }
        chipGroup.addView(allChip)

        // Player count chips
        for (count in counts) {
            val chip = Chip(this).apply {
                text = "${count}P"
            }
            chipGroup.addView(chip)
        }
    }

    private fun updateGrid(games: List<GameManifest>) {
        val recyclerView = findViewById<RecyclerView>(R.id.gamesRecyclerView)
        val emptyState = findViewById<TextView>(R.id.emptyStateText)

        if (games.isEmpty()) {
            recyclerView.visibility = View.GONE
            emptyState.visibility = View.VISIBLE
        } else {
            recyclerView.visibility = View.VISIBLE
            emptyState.visibility = View.GONE
            adapter = GameAdapter(games) { game ->
                if (game.maxPlayers <= 1) {
                    launchGame(game, "solo", "medium", game.minPlayers)
                } else {
                    LaunchSheet(this, game) { mode, skill, players ->
                        launchGame(game, mode, skill, players)
                    }.show()
                }
            }
            recyclerView.adapter = adapter
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
