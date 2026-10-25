package com.redundantstudios.arcade.util

import android.content.Context
import android.content.SharedPreferences

/**
 * Remembers when the shell first saw each game so tiles can show a NEW tag.
 *
 * The window is a deliberate constant: [NEW_WINDOW_DAYS] days counted from the
 * moment the shell first scanned that game id. The tag is therefore the SAME
 * mechanism for every game - there is no list of ids to maintain, and a tag
 * cannot outlive the window by accident. When a future game is added it gets
 * its own first-seen date and fades out on its own.
 */
object GameSeenStore {

    /* Versioned. Bumping this deliberately re-stamps EVERY game: isNew() records
       the moment it is first called for a game, so a fresh prefs file means every
       tile wears NEW again from today and gets the full window. That is how the
       window was widened from 7 to 10 days and the existing catalogue reset in
       one step, instead of deleting the store on a user's device.

       v4 is the 1.3.0 release: the whole catalogue now wears NEW, driven only by
       this window. Bumping the file gives every game the full window from the
       first launch of the update, and every one of those tags then expires on
       the same schedule as a normal NEW tag. */
    private const val PREFS = "game_seen_v4"

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
