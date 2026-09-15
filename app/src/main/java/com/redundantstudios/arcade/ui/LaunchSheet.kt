package com.redundantstudios.arcade.ui

import android.app.Dialog
import android.content.Context
import android.view.LayoutInflater
import android.view.View
import android.widget.Button
import android.widget.Spinner
import android.widget.ArrayAdapter
import android.widget.TextView
import com.google.android.material.bottomsheet.BottomSheetDialog
import com.redundantstudios.arcade.R
import com.redundantstudios.arcade.model.GameManifest

class LaunchSheet(
    private val context: Context,
    private val game: GameManifest,
    private val onLaunch: (mode: String, skill: String, players: Int) -> Unit
) {
    private val dialog = BottomSheetDialog(context)

    fun show() {
        val view = LayoutInflater.from(context).inflate(R.layout.dialog_launch_sheet, null)

        val title = view.findViewById<TextView>(R.id.sheetTitle)
        val btnSolo = view.findViewById<Button>(R.id.btnSolo)
        val btnPass = view.findViewById<Button>(R.id.btnPass)
        val skillSpinner = view.findViewById<Spinner>(R.id.skillSpinner)
        val playerSpinner = view.findViewById<Spinner>(R.id.playerSpinner)
        val soloContainer = view.findViewById<View>(R.id.soloContainer)
        val passContainer = view.findViewById<View>(R.id.passContainer)
        val noSoloNote = view.findViewById<TextView>(R.id.noSoloNote)

        title.text = game.title

        // Skill Selector
        val skills = arrayOf("Easy", "Medium", "Hard")
        val skillAdapter = ArrayAdapter(context, android.R.layout.simple_spinner_item, skills)
        skillAdapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item)
        skillSpinner.adapter = skillAdapter
        skillSpinner.setSelection(1) // Default Medium

        // Player Selector for Pass & Play
        val playerCounts = (game.minPlayers..game.maxPlayers).toList()
        val playerAdapter = ArrayAdapter(context, android.R.layout.simple_spinner_item, playerCounts)
        playerAdapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item)
        playerSpinner.adapter = playerAdapter

        // Logic based on AI support and player counts
        val canPlaySolo = game.minPlayers <= 1

        if (canPlaySolo) {
            soloContainer.visibility = View.VISIBLE
            btnSolo.setOnClickListener {
                val skill = skills[skillSpinner.selectedItemPosition].lowercase()
                onLaunch("solo", skill, 1)
                dialog.dismiss()
            }
        } else {
            soloContainer.visibility = View.GONE
            noSoloNote.visibility = View.VISIBLE
            noSoloNote.text = "Solo mode not supported for this game"
        }

        if (game.maxPlayers >= 2) {
            passContainer.visibility = View.VISIBLE
            btnPass.setOnClickListener {
                val players = playerSpinner.selectedItem as Int
                onLaunch("pass", "medium", players)
                dialog.dismiss()
            }
        } else {
            passContainer.visibility = View.GONE
        }

        dialog.setContentView(view)
        dialog.show()
    }
}
