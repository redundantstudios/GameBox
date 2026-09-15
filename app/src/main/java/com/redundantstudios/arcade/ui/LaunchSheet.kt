package com.redundantstudios.arcade.ui

import android.app.Dialog
import android.content.Context
import android.view.LayoutInflater
import android.view.View
import android.widget.Button
import android.widget.Spinner
import android.widget.ArrayAdapter
import android.widget.TextView
import com.google.android.material.bottomsheet.BottomSheetBehavior
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
        val soloPlayerSpinner = view.findViewById<Spinner>(R.id.soloPlayerSpinner)
        val soloContainer = view.findViewById<View>(R.id.soloContainer)
        val passContainer = view.findViewById<View>(R.id.passContainer)
        val noSoloNote = view.findViewById<TextView>(R.id.noSoloNote)

        android.util.Log.d("LaunchSheet", "sheet: id=${game.id} min=${game.minPlayers} max=${game.maxPlayers} ai=${game.aiSupport}")

        title.text = game.title

        dialog.setContentView(view)
        dialog.show()
        (dialog.window?.decorView?.findViewById<View>(com.google.android.material.R.id.design_bottom_sheet) as? android.view.ViewGroup)?.let { sheet ->
            val behavior = BottomSheetBehavior.from(sheet)
            behavior.state = BottomSheetBehavior.STATE_EXPANDED
            behavior.skipCollapsed = true
        }

        // Skill Selector
        val skills = arrayOf("Easy", "Medium", "Hard")
        val skillAdapter = ArrayAdapter(context, android.R.layout.simple_spinner_item, skills)
        skillAdapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item)
        skillSpinner.adapter = skillAdapter
        skillSpinner.setSelection(1) // Default Medium

        // PRODUCT RULE: "SOLO" = 1 human + AI seats. Available if aiSupport == "full".
        val canSolo = game.aiSupport == "full"
        if (canSolo) {
            soloContainer.visibility = View.VISIBLE
            // Solo seat selector: Total seats (1 human + AI). Range: max(2, minPlayers)..maxPlayers
            val soloPlayerCounts = (Math.max(2, game.minPlayers)..game.maxPlayers).toList()
            val soloPlayerAdapter = ArrayAdapter(context, android.R.layout.simple_spinner_item, soloPlayerCounts)
            soloPlayerAdapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item)
            soloPlayerSpinner.adapter = soloPlayerAdapter
            // NOTE: In dialog_launch_sheet.xml, playerSpinner is inside passContainer.
            // We need a spinner for solo too. Assuming a fix to layout or reusing if mutually exclusive.
            // For now, let's stick to the provided layout's spinners.

            btnSolo.setOnClickListener {
                val skill = skills[skillSpinner.selectedItemPosition].lowercase()
                val totalSeats = (soloPlayerSpinner.selectedItem as? Int) ?: game.maxPlayers
                onLaunch("solo", skill, totalSeats)
                dialog.dismiss()
            }
        } else {
            soloContainer.visibility = View.GONE
        }

        // PRODUCT RULE: "PASS & PLAY" = N humans. Available if maxPlayers >= 2.
        val canPass = game.maxPlayers >= 2
        if (canPass) {
            passContainer.visibility = View.VISIBLE
            val passPlayerCounts = (game.minPlayers..game.maxPlayers).toList()
            val passPlayerAdapter = ArrayAdapter(context, android.R.layout.simple_spinner_item, passPlayerCounts)
            passPlayerAdapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item)
            playerSpinner.adapter = passPlayerAdapter

            btnPass.setOnClickListener {
                val players = playerSpinner.selectedItem as Int
                onLaunch("pass", "medium", players)
                dialog.dismiss()
            }
        } else {
            passContainer.visibility = View.GONE
        }

        // "no solo" note only when !canSolo && canPass
        if (!canSolo && canPass) {
            noSoloNote.visibility = View.VISIBLE
            noSoloNote.text = "Solo mode not supported for this game"
        } else {
            noSoloNote.visibility = View.GONE
        }
    }
}
