package com.redundantstudios.arcade.ui

import android.view.View
import androidx.recyclerview.widget.GridLayoutManager
import androidx.recyclerview.widget.RecyclerView

/**
 * Grid column count that follows the space actually available, not the device
 * class.
 *
 * The shell was hardcoded to two columns everywhere, which on a tablet stretches
 * every tile across half a 1200px screen - enormous touch targets, huge empty
 * gaps, and a grid that looks like a phone that failed to fill.
 *
 * Decided from the measured width of the grid rather than from a
 * `values-sw600dp` integer, so it also behaves on a foldable or a resized
 * multi-window window, and re-decides on every layout pass.
 *
 * Roughly: keep tiles in a comfortable 150-190dp band, then clamp so a very
 * wide screen does not turn into a single row of tiny tiles.
 */
object ResponsiveGrid {

    /** Below this the grid stays at two columns, which is right for a phone. */
    private const val MIN_SPAN = 2
    private const val MAX_SPAN = 6
    private const val TARGET_TILE_DP = 168f
    private const val TILE_GAP_DP = 14f

    fun spanCount(widthPx: Int, density: Float): Int {
        if (widthPx <= 0 || density <= 0f) return MIN_SPAN
        val widthDp = widthPx / density
        if (widthDp <= 0f) return MIN_SPAN
        val n = ((widthDp + TILE_GAP_DP) / (TARGET_TILE_DP + TILE_GAP_DP)).toInt()
        return n.coerceIn(MIN_SPAN, MAX_SPAN)
    }

    /**
     * Attach a grid that keeps re-deciding its own column count.
     *
     * Safe to call before the view is laid out - the listener fires on the
     * first measure, so nothing is lost.
     */
    fun apply(recycler: RecyclerView) {
        val lm = recycler.layoutManager as? GridLayoutManager ?: return
        fun resize() {
            val want = spanCount(recycler.width, recycler.resources.displayMetrics.density)
            if (lm.spanCount != want) lm.spanCount = want
        }
        // Re-decide on every layout pass, so a rotation, a foldable unfolding
        // or a multi-window resize all land on the right column count.
        recycler.addOnLayoutChangeListener { _, _, _, _, _, _, _, _, _ -> resize() }
        resize()
    }
}