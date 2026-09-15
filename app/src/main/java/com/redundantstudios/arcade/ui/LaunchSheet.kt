package com.redundantstudios.arcade.ui

import android.app.Dialog
import android.content.Context
import android.content.Intent
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Button
import android.widget.TextView
import com.google.android.material.bottomsheet.BottomSheetDialog
import com.redundantstudios.arcade.GameActivity
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

        title.text = game.title

        btnSolo.setOnClickListener {
            onLaunch("solo", "medium", game.minPlayers)
            dialog.dismiss()
        }

        btnPass.setOnClickListener {
            onLaunch("pass", "medium", game.maxPlayers)
            dialog.dismiss()
        }

        // Hide Pass mode if only 1 player supported
        if (game.maxPlayers <= 1) {
            btnPass.visibility = View.GONE
        }

        dialog.setContentView(view)
        dialog.show()
    }
}
