package com.redundantstudios.arcade.util

import android.content.Context
import android.content.SharedPreferences

/**
 * Remembers when the shell first saw each game so tiles can show a NEW tag.
 *
 * The window is a deliberate constant: [NEW_WINDOW_DAYS] days counted from the
 * moment the shell first scanned that game id. Every game bundled today reads as
 * new, because this store is created the first time this code runs - which is
 * exactly the behaviour the user described ("currently every game is a new
 * game"). When a future game is added, it gets its own first-seen date and the
 * tag fades out on its own after the window; nothing to maintain.
 */
object GameSeenStore {

    /* Versioned. Bumping this deliberately re-stamps EVERY game: isNew() records
       the moment it is first called for a game, so a fresh prefs file means every
       tile wears NEW again from today and gets the full window. That is how the
       window was widened from 7 to 10 days and the existing catalogue reset in
       one step, instead of deleting the store on a user's device. */
    private const val PREFS = "game_seen_v3"

    /** How long a freshly added game wears the NEW tag. */
    const val NEW_WINDOW_DAYS = 10L

    private const val DAY_MS = 24L * 60L * 60L * 1000L

    private fun prefs(context: Context): SharedPreferences =
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

    /** True while the game is inside its NEW window. First sight records the date. */
    fun isNew(context: Context, gameId: String): Boolean {
        val prefs = prefs(context)
        val first = prefs.getLong(gameId, -1L)
        if (first == -1L) {
            prefs.edit().putLong(gameId, System.currentTimeMillis()).apply()
            return true
        }
        return System.currentTimeMillis() - first < NEW_WINDOW_DAYS * DAY_MS
    }
}
