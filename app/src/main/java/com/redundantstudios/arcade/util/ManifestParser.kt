package com.redundantstudios.arcade.util

import android.content.Context
import android.content.res.AssetManager
import com.redundantstudios.arcade.model.GameManifest
import org.json.JSONObject
import java.io.BufferedReader
import java.io.InputStreamReader

object ManifestParser {
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
                        games.add(GameManifest(
                            id = json.getString("id"),
                            title = json.getString("title"),
                            orientation = json.getString("orientation"),
                            players = json.getInt("players"),
                            tileColor = json.getString("tileColor"),
                            version = json.getString("version")
                        ))
                    }
                } catch (e: Exception) {
                    e.printStackTrace()
                }
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }

        return games
    }
}
