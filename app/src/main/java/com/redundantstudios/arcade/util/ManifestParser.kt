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
                    val firstLine = reader.readLine()
                    inputStream.close()

                    if (firstLine != null && firstLine.contains("STUDIO_GAME_MANIFEST:")) {
                        val jsonString = firstLine
                            .substringAfter("STUDIO_GAME_MANIFEST:")
                            .substringBefore(" -->")
                            .trim()

                        val json = JSONObject(jsonString)

                        // Validate mandatory fields
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
                    }
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
