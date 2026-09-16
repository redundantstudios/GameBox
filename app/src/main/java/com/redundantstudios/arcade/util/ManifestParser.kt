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

                    var manifest: GameManifest? = null
                    var skipReason = "No manifest marker found"

                    // Read first 30 lines to find manifest
                    val lines = mutableListOf<String>()
                    for (i in 0 until 30) {
                        val line = reader.readLine() ?: break
                        lines.add(line)
                    }
                    inputStream.close()

                    // Try to find the manifest marker
                    val markerIndex = lines.indexOfFirst { it.contains("STUDIO_GAME_MANIFEST") }

                    if (markerIndex != -1) {
                        val markerLine = lines[markerIndex]

                        if (markerLine.contains("STUDIO_GAME_MANIFEST:")) {
                            // Legacy Format: Single-line JSON
                            try {
                                val jsonString = markerLine
                                    .substringAfter("STUDIO_GAME_MANIFEST:")
                                    .substringBefore(" -->")
                                    .trim()
                                val json = JSONObject(jsonString)
                                val id = json.optString("id", "")
                                val title = json.optString("title", "")

                                if (id.isNotEmpty() && title.isNotEmpty()) {
                                    manifest = GameManifest(
                                        id = id,
                                        title = title,
                                        orientation = json.optString("orientation", "portrait"),
                                        minPlayers = json.optInt("minPlayers", 1),
                                        maxPlayers = json.optInt("maxPlayers", 1),
                                        aiSupport = json.optString("aiSupport", "none"),
                                        online = json.optBoolean("online", false),
                                        tileColor = json.optString("tileColor", "#FFFFFF"),
                                        version = json.optString("version", "1.0.0")
                                    )
                                } else {
                                    skipReason = "missing id or title"
                                }
                            } catch (e: Exception) {
                                skipReason = "JSON parse error: ${e.message}"
                            }
                        } else {
                            // Contract §8 Format: Multi-line block
                            val block = mutableListOf<String>()
                            for (i in (markerIndex + 1) until lines.size) {
                                val line = lines[i]
                                if (line.contains("STUDIO_GAME_MANIFEST")) break
                                block.add(line)
                                if (block.size >= 20) break
                            }

                            val props = block.mapNotNull { line ->
                                val parts = line.split(":", limit = 2)
                                if (parts.size == 2) parts[0].trim() to parts[1].trim() else null
                            }.toMap()

                            val id = props["id"] ?: ""
                            val title = props["title"] ?: ""

                            if (id.isNotEmpty() && title.isNotEmpty()) {
                                manifest = GameManifest(
                                    id = id,
                                    title = title,
                                    orientation = props["orientation"] ?: "portrait",
                                    minPlayers = props["minPlayers"]?.toIntOrNull() ?: 1,
                                    maxPlayers = props["maxPlayers"]?.toIntOrNull() ?: 1,
                                    aiSupport = props["aiSupport"] ?: "none",
                                    online = props["online"]?.toBoolean() ?: false,
                                    tileColor = props["tileColor"] ?: "#FFFFFF",
                                    version = props["version"] ?: "1.0.0"
                                )
                            } else {
                                skipReason = "missing id or title"
                            }
                        }
                    }

                    if (manifest != null) {
                        games.add(manifest!!)
                        Log.d(TAG, "scan: $dir → parsed ${manifest!!.id}")
                    } else {
                        Log.d(TAG, "scan: $dir SKIPPED: $skipReason")
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
