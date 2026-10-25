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
     * The colour the game's own VIEWPORT backdrop wears, from the manifest's
     * `viewportBg:` line.
     *
     * WHY THIS EXISTS AND WHY NOT tileColor
     * The WebView is painted with this colour before (and underneath) the page's
     * WebGL canvas. tileColor is LAUNCHER artwork, not the game's viewport: a
     * menu colour like Midnight Overdrive's orange `#ff8a3d` put a full-screen
     * orange wall behind a near-black night game, and the wall flashed through
     * during the portrait->landscape turn - the turn resizes the WebView, the
     * resized canvas re-allocates and re-clears, and the backdrop shows in that
     * gap, a colour the game never chose for its viewport.
     *
     * Null falls back to tileColor, so every existing game keeps its current
     * behaviour; a game opts in with a `viewportBg:` line only when its tile
     * colour is NOT what the viewport should show behind its canvas.
     */
    val viewportBg: String? = null,
    /**
     * When the game was integrated, read from the manifest's `released:`
     * line. [ReleaseDate.UNKNOWN] when absent - which sorts last, so a
     * game is never hidden or silently promoted by a missing field.
     */
    val released: ReleaseDate = ReleaseDate.UNKNOWN
)

/**
 * Where a game's banner strip goes.
 *
 * TOP and BOTTOM take real layout space: the WebView is measured into what is
 * left, so the game shrinks by the strip's height.
 *
 * OVERLAY_TOP takes none. The game keeps the whole viewport and the ad floats
 * over the top of it. That is what a landscape game with a centred board or map
 * wants - kiro's island sits in the middle of a wide screen, so a reserved
 * strip pushes the map off-centre even before the player sees an ad.
 */
enum class BannerEdge {
    TOP, BOTTOM, OVERLAY_TOP, RIGHT;

    /** True when the strip costs the game none of its viewport. */
    val isOverlay: Boolean get() = this == OVERLAY_TOP

    /** True when the strip stands on its end rather than lying along an edge. */
    val isVertical: Boolean get() = this == RIGHT

    companion object {
        /** Parses a manifest's `banner:` value; anything unrecognised means off. */
        fun parse(raw: String?): BannerEdge? = when (raw?.trim()?.lowercase()) {
            "top" -> TOP
            "bottom" -> BOTTOM
            "right" -> RIGHT
            "overlay", "overlaytop", "overlay_top" -> OVERLAY_TOP
            else -> null
        }
    }
}
