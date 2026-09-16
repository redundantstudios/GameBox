package com.redundantstudios.arcade.util

import android.content.Context
import android.util.Log
import com.redundantstudios.arcade.model.GameManifest
import org.json.JSONObject
import java.io.BufferedReader
import java.io.InputStreamReader

object ManifestParser {
    private const val TAG = "ManifestParser"

    fun scanGames(context: Context): List<GameManifest> {
        val games = mutableListOf<GameManifest>()
        val assetManager = context.assets

        try {
            val gameDirs = assetManager.list("games") ?: return emptyList()

            for (dir in gameDirs) {
                try {
                    val indexFile = "games/$dir/index.html"
                    val inputStream = assetManager.open(indexFile)
                    val reader = BufferedReader(InputStreamReader(inputStream))

                    // Read first 10 lines to find manifest (handles both single-line
                    // and multi-line comment formats)
                    val lines = mutableListOf<String>()
                    var line: String?
                    var foundManifest = false
                    for (i in 0 until 10) {
                        line = reader.readLine() ?: break
                        lines.add(line)
                        if (line.contains("STUDIO_GAME_MANIFEST")) {
                            foundManifest = true
                            break
                        }
                    }
                    inputStream.close()

                    if (!foundManifest) continue

                    val manifestText = lines.joinToString("") { it.trim() }
                    val jsonStart = manifestText.indexOf("STUDIO_GAME_MANIFEST") + "STUDIO_GAME_MANIFEST".length
                    val jsonStr = manifestText.substring(jsonStart).trim()
                        .removePrefix(":")
                        .removePrefix("<!--")
                        .removePrefix("-->")
                        .trim()

                    val json = JSONObject(jsonStr)

                    val id = json.optString("id", "")
                    val title = json.optString("title", "")
                    if (id.isEmpty() || title.isEmpty()) {
                        Log.e(TAG, "Invalid manifest in $dir: missing id or title")
                        continue
                    }

                    games.add(GameManifest(
                        id = id,
                        title = title,
                        orientation = json.optString("orientation", "portrait"),
                        minPlayers = json.optInt("minPlayers", 1),
                        maxPlayers = json.optInt("maxPlayers", 1),
                        aiSupport = json.optString("aiSupport", "none"),
                        online = json.optBoolean("online", false),
                        tileColor = json.optString("tileColor", "#FFFFFF"),
                        version = json.optString("version", "1.0.0")
                    ))
                } catch (e: Exception) {
                    Log.e(TAG, "Error parsing manifest in $dir: ${e.message}")
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error scanning games: ${e.message}")
        }

        return games
    }
}