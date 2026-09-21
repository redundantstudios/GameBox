package com.redundantstudios.arcade.model

data class GameMode(
    val playerCount: Int,
    val label: String,
    val color: String,
    val gameCount: Int = 0
) {
    companion object {
        /** playerCount sentinel for the special "Party games" tile (no count). */
        const val PARTY_TILE = -1
    }
}
