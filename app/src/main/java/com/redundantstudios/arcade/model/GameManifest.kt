package com.redundantstudios.arcade.model

data class GameManifest(
    val id: String,
    val title: String,
    val orientation: String,
    val players: Int,
    val tileColor: String,
    val version: String
)
