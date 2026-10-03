package com.redundantstudios.arcade.model

/**
 * Sort key for "newest first".
 *
 * The manifests carry a `released: YYYY-MM-DD` line, so a game's place in
 * the catalogue is data in the game file rather than a hand-maintained
 * list in this app. Adding a game is one line in the manifest; nothing
 * here has to be edited, and two games integrated on the same day still
 * order deterministically via [tieBreak] below.
 *
 * Parsed as a plain Int (yyyyMMdd) rather than a LocalDate: the value may
 * be missing or malformed, and this has to keep sorting without throwing.
 */
data class ReleaseDate(
    val yyyymmdd: Int,
    val tieBreak: String
) : Comparable<ReleaseDate> {
    override fun compareTo(other: ReleaseDate): Int =
        compareValuesBy(this, other, ReleaseDate::yyyymmdd, ReleaseDate::tieBreak)

    companion object {
        /**
         * Sorts LAST - after every real date - so a game with no date (or
         * an unparseable one) sinks to the bottom of the newest-first list
         * instead of pretending to be the newest game in the app.
         */
        val UNKNOWN = ReleaseDate(0, "~")

        /** Parses `YYYY-MM-DD`; anything else is [UNKNOWN]. */
        fun parse(raw: String?, tieBreak: String): ReleaseDate {
            val m = Regex("^(\\d{4})-(\\d{2})-(\\d{2})$").find(raw?.trim().orEmpty())
                ?: return ReleaseDate(0, tieBreak)
            val (y, mo, d) = m.destructured
            val value = "$y$mo$d".toIntOrNull() ?: return ReleaseDate(0, tieBreak)
            return ReleaseDate(value, tieBreak)
        }
    }
}

data class GameManifest(
    val id: String,
    val title: String,
    val orientation: String,
    val minPlayers: Int,
    val maxPlayers: Int,
    val aiSupport: String, // "none" | "partial" | "full"
    val online: Boolean,
    val tileColor: String,
    val version: String,
    /**
     * When the game was integrated, read from the manifest's `released:`
     * line. [ReleaseDate.UNKNOWN] when absent - which sorts last, so a
     * game is never hidden or silently promoted by a missing field.
     */
    val released: ReleaseDate = ReleaseDate.UNKNOWN
)

/**
 * Games that are established enough to no longer wear the NEW tag.
 *
 * The tag is for a game people have not seen yet. Anything that predates the
 * Carroms integration is established, so listing it here hides the tag for good
 * rather than waiting out the time window. A newly integrated game is NOT
 * listed and keeps its tag automatically.
 */
val ESTABLISHED_GAME_IDS: Set<String> = setOf(
    "carroms",       // re-added later with new gameplay
    "checkers",
    "chess",
    "chicken-chaos",
    "ludo",
    "memory-grab",
    "planetmerge",
    "balloon-battle",
    "bomb-relay",
    "egg-rush",
    "last-balloon"
)
