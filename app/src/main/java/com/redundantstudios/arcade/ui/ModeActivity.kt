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
import com.redundantstudios.arcade.model.NEW_GAME_IDS
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
         * GameAdapter). Last Balloon is here for that reason; UnderCover is a
         * 3-10 player pass-the-phone deduction game and belongs here too.
         */
        val PARTY_GAME_IDS = setOf("truth-or-dare", "last-balloon", "quick-draw", "undercover")

        /**
         * DEPRECATED - superseded by the manifests' own `released:` date.
         *
         * This hand-maintained list only ever had room for "one new game at
         * a time": integrating a second new game meant remembering to edit
         * this file, and nothing failed if you forgot - the game simply
         * sorted alphabetically and nobody noticed. It is kept only as a
         * last-resort tie-break and is no longer the source of ordering.
         *
         * [GameManifest.released] is the real ordering key now.
         */
        @Deprecated(
            "Use GameManifest.released - adding a game is a manifest line, " +
                "not an edit to this list."
        )
        val NEWEST_FIRST = listOf(
            "midnight-overdrive",
            "pool-8ball",
            "sheepdog-trials",
            "orrery",
            "ember",
            "colour-rush",
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

        /**
         * Which games an N PLAYER page lists.
         *
         * ONE rule, one direction: a game belongs on page X if it can be
         * played with X people or FEWER. Never more.
         *
         *   a 2-player game appears on the 3 PLAYER page    (needs 2, 2 <= 3)
         *   a 3-player game never appears on the 2 PLAYER page (needs 3 > 2)
         *
         * Judged on the game's MINIMUM, not its maximum, so a game that can
         * fill a seat with a bot is never hidden from a page it could really
         * be played on.
         *
         * Party games are excluded: they are pass-the-phone, not a seat
         * count, and they have their own tile.
         *
         * Two earlier passes got this wrong: a symmetric "+/-1" rule put
         * 1-player games on the 2 PLAYER page, and the next applied that
         * relaxation only to NEW games, so new and established games followed
         * different rules on the same page.
         */
        fun fitsOnPage(game: GameManifest, pageCount: Int): Boolean {
            if (game.id in PARTY_GAME_IDS) return false
            /* Page X lists games that seat AT LEAST X people.
             *
             *   1 PLAYER page -> games seating 1, 2, 3, 4 or 5. Every game, because
             *                     any of them can be played solo against bots.
             *   2 PLAYER page -> games seating 2, 3, 4 or 5
             *   3 PLAYER page -> games seating 3, 4 or 5
             *   4 PLAYER page -> games seating 4 or 5
             *   5 PLAYER page -> games seating 5
             *
             * Measured on the LARGEST seat count. Two earlier passes had this
             * the other way round: one used the minimum, which put Chess on the
             * 1 PLAYER page, and the next used max but pointing down, which hid
             * everything multi-player from the 2 and 3 PLAYER pages.
             *
             * Party games never appear here - they are pass-the-phone, not a
             * seat count. They live in the Party Games tile and in All Games. */
            return game.maxPlayers >= pageCount
        }

        /** Kept so any caller still asking the old question compiles. */
        fun fitsPage(game: GameManifest, pageCount: Int): Boolean = fitsOnPage(game, pageCount)

        /**
         * Order an N PLAYER page: the NEW cohort first, then the games that
         * fit this count most tightly, then the ones that stretch to more
         * people - and within each group the newest first, then A-Z.
         */
        @Suppress("DEPRECATION")
        fun orderForPage(games: List<GameManifest>, playerCount: Int): List<GameManifest> {
            val legacy = NEWEST_FIRST
            return games.sortedWith(
                compareBy(
                    /* NEW games pin to the very top of the page, whether they seat
                       this many people exactly or are only a near miss. */
                    { if (it.id in NEW_GAME_IDS) 0 else 1 },
                    { groupFor(it) },
                    { it.minPlayers },
                    // Newest first: ReleaseDate is Comparable and descending
                    // here, so the newest `released:` lands at the top. A game
                    // with no date compares as UNKNOWN and sinks below dated
                    // ones, then the legacy list, then A-Z, so nothing is lost.
                    { it.released.let { r -> -r.yyyymmdd } },
                    { legacy.indexOf(it.id).let { i -> if (i < 0) Int.MAX_VALUE else i } },
                    { it.title.lowercase() }
                )
            )
        }

        /**
         * Order a flat list (ALL GAMES, PARTY GAMES) newest addition first.
         *
         * These pages used the raw scan order from the assets folder, which is
         * alphabetical by directory and has nothing to do with when a game was
         * added - so a game integrated last could sit at the bottom of the list
         * a player had to scroll to find.
         *
         * The ordering key is now the game's own `released:` manifest line, so
         * this scales to any number of new games: integrating a game is one
         * line in the game file, with no list here to keep in step. Games
         * sharing a date (several integrated on the same day) fall back to
         * A-Z, which is deterministic rather than filesystem-dependent.
         */
        @Suppress("DEPRECATION")
        fun orderNewestFirst(games: List<GameManifest>): List<GameManifest> {
            val legacy = NEWEST_FIRST
            return games.sortedWith(
                compareBy(
                    { it.released.let { r -> -r.yyyymmdd } },
                    { legacy.indexOf(it.id).let { i -> if (i < 0) Int.MAX_VALUE else i } },
                    { it.title.lowercase() }
                )
            )
        }

        /** Games an N PLAYER page lists: see [fitsOnPage] for the rule. */
        /** Games an N PLAYER page lists: see [fitsOnPage] for the rule. */
        fun filterGames(games: List<GameManifest>, playerCount: Int): List<GameManifest> =
            games.filter { fitsOnPage(it, playerCount) }

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

                // Two columns on a phone, more once there is room for them.
        ResponsiveGrid.apply(findViewById(R.id.gamesRecyclerView))

        val filteredGames = when {
            // ALL GAMES and PARTY GAMES: newest integration first. These pages
            // used the raw asset-scan order (alphabetical by directory), which
            // has nothing to do with how recently a game was added.
            allGamesMode -> orderNewestFirst(allGames)
            partyMode -> orderNewestFirst(allGames.filter { it.id in PARTY_GAME_IDS })
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
