package com.redundantstudios.arcade.model

data class GameMode(
    val playerCount: Int,
    val label: String,
    val color: String,
    val gameCount: Int = 0
)
