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
     * Where this game's banner ad goes, from the manifest's `banner:` line.
     *
     * WHY THIS IS DATA AND NOT A CONSTANT
     * The strip is full width, so it eats playfield, and which edge it costs
     * differs per game: root.io reads best with it above the world, magnet-pull
     * keeps its controls clear with it below. Hard-coding one edge meant the
     * other game could not have a banner at all without patching the shell.
     *
     * Null (the default - the line is absent) means NO banner: the game gets
     * the whole viewport and its own show/hide polling is never forwarded. That
     * keeps the opt-in per game, which is the whole point of the flag.
     */
    val bannerEdge: BannerEdge? = null,
    /**
     * The colour the banner strip wears where no ad artwork covers it, from the
     * manifest's `bannerBg:` line.
     *
     * WHY NOT JUST tileColor
     * tileColor is the LAUNCHER tile - root.io's is a light green while the
     * game itself sits on near-black soil, so tinting the strip with it put a
     * green bar over a dark game. This is the game's own page background, so an
     * ad that has not filled yet reads as part of the game.
     *
     * Null falls back to black, which is closer to right than a bright tile
     * colour ever would be.
     */
    val bannerBg: String? = null,
    /**
     * When the game was integrated, read from the manifest's `released:`
     * line. [ReleaseDate.UNKNOWN] when absent - which sorts last, so a
     * game is never hidden or silently promoted by a missing field.
     */
    val released: ReleaseDate = ReleaseDate.UNKNOWN
)

/** The edge a game's banner strip is anchored to. */
enum class BannerEdge { TOP, BOTTOM;
    companion object {
        /** Parses a manifest's `banner:` value; anything unrecognised means off. */
        fun parse(raw: String?): BannerEdge? = when (raw?.trim()?.lowercase()) {
            "top" -> TOP
            "bottom" -> BOTTOM
            else -> null
        }
    }
}

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

/**
 * Games added AFTER `last-balloon`, which are the current NEW cohort.
 *
 * WHY THIS IS A LIST AND NOT JUST THE FIRST-SEEN WINDOW
 * [com.redundantstudios.arcade.util.GameSeenStore.isNew] only reports a game as
 * new for [GameSeenStore.NEW_WINDOW_DAYS] days after the shell FIRST scans it.
 * These games were all scanned during development, so their windows opened and
 * closed long before anybody played the shipped build - the tags had quietly
 * disappeared from every one of them and the whole NEW row read as gone.
 *
 * A window measured from first scan cannot express "new since the last
 * release", because the two dates are unrelated: a game added yesterday on a
 * build that shipped last month is not new by that measure.
 *
 * So the current cohort is named explicitly and the tag is driven by that, with
 * the window left to do what it is good at - catching genuinely future games
 * with no code change. When one of these settles, move its id into
 * [ESTABLISHED_GAME_IDS] and its tag retires, exactly like the games above.
 */
val NEW_GAME_IDS: Set<String> = setOf(
    "colour-rush",
    "ember",
    "orrery",
    "sheepdog-trials",
    "pool-8ball",
    "midnight-overdrive",
    "magnet-pull",
    "kiro",
    "root-io"
)
