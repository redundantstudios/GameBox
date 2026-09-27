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
    init {
        // Keep the player-count browser portrait even if a previous landscape
        // game left the device/task in a rotated configuration. The manifest
        // also locks this activity, and this runtime request closes the gap
        // during a singleTop reuse or a configuration transition.
        requestedOrientation = android.content.pm.ActivityInfo.SCREEN_ORIENTATION_PORTRAIT
    }

    private val TAG = "ModeActivity"

    companion object {
        /** Player count of the mode tile the user tapped. */
        const val EXTRA_PLAYER_COUNT = "player_count"

        /** When true the screen ignores the player count and lists every game. */
        const val EXTRA_ALL_GAMES = "all_games"

        /** When true the screen lists the party-games category. */
        const val EXTRA_PARTY = "party"

        /**
         * Games belonging to the Party category. A game is added by id the moment
         * it is integrated.
         *
         * Party games are the pass-the-phone crowd, so they are NOT bucketed by
         * player count - they get their own tile and carry no "NP" tag (see
         * GameAdapter). Last Balloon is here for that reason.
         */
        val PARTY_GAME_IDS = setOf("truthordare", "last-balloon")

        /**
         * Order a game appears WITHIN a player-count group on the N PLAYER
         * pages, newest first.
         *
         * The manifests carry no release date (id/title/min/max/ai/online/
         * tileColor/version), so "newest" cannot be derived from them and
         * guessing one is worse than declaring it. This is the catalogue order,
         * newest addition first - the list literally reads in the order the
         * games were integrated. Adding a game = adding one line at the top.
         *
         * Anything not listed here falls back to the title, so a newly
         * integrated game is never silently dropped from a page: it simply
         * sorts alphabetically among the unlisted ones.
         */
        val NEWEST_FIRST = listOf(
            "last-balloon",
            "balloon-battle",
            "bomb-relay",
            "egg-rush",
            "chicken-chaos",
            "memory-grab",
            "ludo",
            "checkers",
            "chess",
            "planetmerge"
        )

        /**
         * Which player-count GROUP a game belongs to on a given page.
         *
         * A game declares only a RANGE (min..max), and a 2-4 game technically
         * qualifies on the 2, 3 and 4 pages at once. Grouping by "does it fit"
         * therefore ties every game into one indistinguishable list - which is
         * what the old flat filter did, leaving the player unable to tell which
         * tiles are genuinely 2-player games.
         *
         * The group is the game's TOP end, [maxPlayers]. A game that caps at 2
         * is a 2-player game; one that runs to 4 also plays 2, but it is not
         * *primarily* a 2-player game, so it sits below the pure 2-player ones.
         * That is what makes "2 PLAYER page shows 2-player games first, then the
         * ones that stretch to 3, then 4, and so on" come out right.
         *
         * minPlayers breaks ties inside a group (a 1-2 game leads a 2-4 one),
         * then catalogue order, then A-Z.
         */
        fun groupFor(game: GameManifest): Int = game.maxPlayers

        /** True when the game can actually be opened with this many people. */
        fun fitsPage(game: GameManifest, pageCount: Int): Boolean =
            if (game.id in PARTY_GAME_IDS) {
                // Party games are pass-the-phone, NOT a seat-count crowd. They
                // must never appear in the 1/2/3/4 PLAYER tiles - a player
                // tapping "2 PLAYER" wants games that genuinely seat two. They
                // live in their own Party Games tile (and in All Games, which
                // lists everything, as it should).
                false
            } else if (pageCount == 1) {
                // One human alone: either the game genuinely seats 1, or it can
                // fill the rest with bots. Opening one never forces bot mode -
                // the game's own menu decides how the seats are filled.
                game.minPlayers == 1 || canPlayWithBots(game)
            } else {
                game.minPlayers <= pageCount && game.maxPlayers >= pageCount
            }

        /**
         * Order an N PLAYER page: tightest-fitting games first, then the ones
         * that stretch to more people, and within each group the newest game
         * first, then A-Z.
         */
        fun orderForPage(games: List<GameManifest>, playerCount: Int): List<GameManifest> {
            val newestFirst = NEWEST_FIRST
            return games.sortedWith(
                compareBy(
                    { groupFor(it) },
                    { it.minPlayers },
                    { newestFirst.indexOf(it.id).let { i -> if (i < 0) Int.MAX_VALUE else i } },
                    { it.title.lowercase() }
                )
            )
        }

        /** Single source of truth for which games belong to a player count. */
        fun filterGames(games: List<GameManifest>, playerCount: Int): List<GameManifest> =
            games.filter { fitsPage(it, playerCount) }

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
            allGamesMode -> allGames
            partyMode -> allGames.filter { it.id in PARTY_GAME_IDS }
            // N PLAYER page: exact-fit games first, then the next count up, and
            // so on - each group newest-first then A-Z. See orderForPage.
            else -> orderForPage(filterGames(allGames, playerCount), playerCount)
        }
        Log.d(TAG, "Showing ${filteredGames.size} games (allGames=$allGamesMode, players=$playerCount)")
        Log.d(TAG, "Order: ${filteredGames.joinToString { it.id }}")

        findViewById<View>(R.id.emptyState).visibility =
            if (filteredGames.isEmpty()) View.VISIBLE else View.GONE

        recyclerView.adapter = GameAdapter(filteredGames, { game ->
            // All Games and 1 PLAYER open the game's own normal menu — bot mode
            // is never forced automatically. An N PLAYER page preselects that
            // count so play starts in one tap.
            val preselect = if (allGamesMode || partyMode) NO_PRESELECT else playerCount
            Log.d(TAG, "Game tile clicked: ${game.id}, preselect=$preselect, maxPlayers=${game.maxPlayers}")

            launchGame(game, preselect)
        }, hidePlayerTag = partyMode)

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
