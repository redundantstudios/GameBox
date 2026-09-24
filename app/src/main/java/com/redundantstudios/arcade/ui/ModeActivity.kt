package com.redundantstudios.arcade.ui

import android.content.Intent
import android.os.Bundle
import android.util.Log
import android.view.View
import android.widget.TextView
import androidx.recyclerview.widget.GridLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.redundantstudios.arcade.GameActivity
import com.redundantstudios.arcade.R
import com.redundantstudios.arcade.audio.ShellAudio
import com.redundantstudios.arcade.model.GameManifest
import com.redundantstudios.arcade.util.ManifestParser

class ModeActivity : ThemedActivity() {
    private val TAG = "ModeActivity"

    companion object {
        /** Player count of the mode tile the user tapped. */
        const val EXTRA_PLAYER_COUNT = "player_count"

        /** When true the screen ignores the player count and lists every game. */
        const val EXTRA_ALL_GAMES = "all_games"

        /** When true the screen lists the party-games category. */
        const val EXTRA_PARTY = "party"

        /**
         * Games belonging to the Party category (Truth or Dare lands here).
         * A game is added by id the moment it is integrated.
         */
        val PARTY_GAME_IDS = setOf("truthordare")

        /** Single source of truth for which games belong to a player count. */
        fun filterGames(games: List<GameManifest>, playerCount: Int): List<GameManifest> {
            if (playerCount < 1) return newestFirst(games)
            // The first group is exact 1P-only games (for example Planet Merge).
            // Multi-player games are grouped by their declared minimum, so 2P
            // starts with 2P games, 3P starts with 3P games, and so on.
            return games
                .filter { game -> exactGroup(game) >= playerCount || playerCount == 1 }
                .groupBy { exactGroup(it) }
                .filterKeys { it >= playerCount }
                .toSortedMap()
                .values
                .flatMap { newestFirst(it) }
        }

        private fun exactGroup(game: GameManifest): Int {
            return if (game.maxPlayers == 1) 1 else game.minPlayers.coerceAtLeast(2)
        }

        /** Newest means the greatest semantic manifest version, with id as a stable tie-break. */
        private fun newestFirst(games: List<GameManifest>): List<GameManifest> {
            fun versionParts(version: String): List<Int> = version
                .split('.', '-', '_')
                .map { token -> token.takeWhile(Char::isDigit).toIntOrNull() ?: 0 }
            return games.sortedWith(Comparator { a, b ->
                val left = versionParts(a.version)
                val right = versionParts(b.version)
                val length = maxOf(left.size, right.size)
                var comparison = 0
                for (index in 0 until length) {
                    val l = left.getOrElse(index) { 0 }
                    val r = right.getOrElse(index) { 0 }
                    if (l != r) { comparison = l.compareTo(r); break }
                }
                if (comparison != 0) -comparison else a.id.lowercase().compareTo(b.id.lowercase())
            })
        }

        /**
         * Player count used when a game is opened from All Games or the 1
         * PLAYER page: 0 means "no preselect" - the game opens its own normal
         * menu and the player chooses the mode there (bot mode is never forced
         * automatically).
         */
    /** True when a game can seat one human plus computer opponents. */
    fun canPlayWithBots(game: GameManifest): Boolean =
        game.aiSupport == "true" || game.aiSupport == "full" || game.aiSupport == "partial"

        const val NO_PRESELECT = 0

        fun defaultPlayers(game: GameManifest): Int =
            game.maxPlayers.coerceAtMost(2).coerceAtLeast(1)
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_mode)
        applyShellBackground()

        val allGamesMode = intent.getBooleanExtra(EXTRA_ALL_GAMES, false)
        val partyMode = intent.getBooleanExtra(EXTRA_PARTY, false)
        val playerCount = intent.getIntExtra(EXTRA_PLAYER_COUNT, 1)

        val titleText = findViewById<TextView>(R.id.modeTitle)
        titleText.text = when {
            allGamesMode -> getString(R.string.all_games)
            partyMode -> getString(R.string.party_games)
            else -> getString(R.string.n_player_games, playerCount)
        }

        val recyclerView = findViewById<RecyclerView>(R.id.gamesRecyclerView)
        recyclerView.layoutManager = GridLayoutManager(this, 2)

        val allGames = ManifestParser.scanGames(this)
        Log.d(TAG, "Total games scanned: ${allGames.size}")

        val filteredGames = when {
            allGamesMode -> newestFirst(allGames)
            partyMode -> newestFirst(allGames.filter { it.id in PARTY_GAME_IDS })
            // Player pages form a descending series. 1 PLAYER shows every game,
            // 2 PLAYER drops 1P-only games, 3P drops 1P/2P-only games, and so on.
            else -> filterGames(allGames, playerCount)
        }
        Log.d(TAG, "Showing ${filteredGames.size} games (allGames=$allGamesMode, players=$playerCount)")

        findViewById<View>(R.id.emptyState).visibility =
            if (filteredGames.isEmpty()) View.VISIBLE else View.GONE

        recyclerView.adapter = GameAdapter(filteredGames) { game ->
            // All Games and 1 PLAYER open the game's own normal menu — bot mode
            // is never forced automatically. An N PLAYER page preselects that
            // count so play starts in one tap.
            val preselect = if (allGamesMode || partyMode || playerCount == 1) NO_PRESELECT else playerCount
            Log.d(TAG, "Game tile clicked: ${game.id}, preselect=$preselect, maxPlayers=${game.maxPlayers}")

            launchGame(game, preselect)
        }

        val btnBack = findViewById<android.widget.ImageButton>(R.id.btnBack)
        btnBack.setOnClickListener {
            ShellAudio.back(this)
            ShellTransition.close(this)
            finish()
        }
    }

    private fun launchGame(game: GameManifest, preselect: Int) {
        val intent = Intent(this, GameActivity::class.java).apply {
            putExtra("game_id", game.id)
            if (preselect > 0) {
                putExtra("mode", "pass")
                putExtra("skill", "medium")
                putExtra("players", preselect)
            }
        }
        // Games move BY ORIENTATION: a landscape game rises from the bottom edge
        // (game_in + game_out, because its own display turn makes a side slide read
        // as a top-down move); a portrait game uses the ordinary page slide.
        ShellTransition.openGame(this, game.orientation.equals("landscape", ignoreCase = true))
        startActivity(intent)
    }

    /** System back / gesture back gets the same dissolve as the on-screen back. */
    override fun onBackPressed() {
        ShellTransition.close(this)
        super.onBackPressed()
    }
}
