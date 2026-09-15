package com.redundantstudios.arcade.model

data class GameManifest(
    val id: String,
    val title: String,
    val orientation: String,
    val minPlayers: Int,
    val maxPlayers: Int,
    val aiSupport: String, // "none" | "partial" | "full"
    val online: Boolean,
    val tileColor: String,
    val version: String
)
