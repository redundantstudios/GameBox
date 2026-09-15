package com.redundantstudios.arcade.ui

import android.content.Context
import android.view.LayoutInflater
import android.view.View
import android.widget.Button
import android.widget.TextView
import android.widget.LinearLayout
import com.google.android.material.bottomsheet.BottomSheetBehavior
import com.google.android.material.bottomsheet.BottomSheetDialog
import com.redundantstudios.arcade.R
import com.redundantstudios.arcade.model.GameManifest

class LaunchSheet(
    private val context: Context,
    private val game: GameManifest,
    private val modeCardCount: Int,
    private val onLaunch: (mode: String, skill: String, players: Int) -> Unit
) {
    private val dialog = BottomSheetDialog(context)

    fun show() {
        android.util.Log.d("LaunchSheet", "show() called for game=${game.id}, modeCardCount=$modeCardCount")
        val view = LayoutInflater.from(context).inflate(R.layout.dialog_launch_sheet, null)

        val title = view.findViewById<TextView>(R.id.sheetTitle)
        val soloContainer = view.findViewById<View>(R.id.soloContainer)
        val passContainer = view.findViewById<View>(R.id.passContainer)
        val noSoloNote = view.findViewById<TextView>(R.id.noSoloNote)

        // AI Stepper
        val btnAiMinus = view.findViewById<Button>(R.id.btnAiMinus)
        val btnAiPlus = view.findViewById<Button>(R.id.btnAiPlus)
        val tvAiCount = view.findViewById<TextView>(R.id.tvAiCount)

        // Difficulty Pills
        val btnDiffEasy = view.findViewById<Button>(R.id.btnDiffEasy)
        val btnDiffMed = view.findViewById<Button>(R.id.btnDiffMed)
        val btnDiffHard = view.findViewById<Button>(R.id.btnDiffHard)
        val diffPills = view.findViewById<LinearLayout>(R.id.difficultyPills)
        val btnSoloStart = view.findViewById<Button>(R.id.btnSoloStart)

        // Human Stepper
        val btnHumanMinus = view.findViewById<Button>(R.id.btnHumanMinus)
        val btnHumanPlus = view.findViewById<Button>(R.id.btnHumanPlus)
        val tvHumanCount = view.findViewById<TextView>(R.id.tvHumanCount)
        val btnPassStart = view.findViewById<Button>(R.id.btnPassStart)

        title.text = game.title
        dialog.setContentView(view)
        dialog.show()

        (dialog.window?.decorView?.findViewById<View>(com.google.android.material.R.id.design_bottom_sheet) as? android.view.ViewGroup)?.let { sheet ->
            val behavior = BottomSheetBehavior.from(sheet)
            behavior.state = BottomSheetBehavior.STATE_EXPANDED
            behavior.skipCollapsed = true
        }

        if (modeCardCount == 1) {
            // 1P Mode logic: AI configuration
            val canSolo = game.aiSupport == "full"
            if (canSolo) {
                soloContainer.visibility = View.VISIBLE
                passContainer.visibility = View.GONE
                noSoloNote.visibility = View.GONE

                var currentAiCount = Math.max(1, game.minPlayers - 1)
                var selectedSkill = "medium"

                fun updateSoloUi() {
                    tvAiCount.text = currentAiCount.toString()
                    // Difficulty visible if AI >= 1
                    diffPills.visibility = if (currentAiCount >= 1) View.VISIBLE else View.GONE
                }

                btnAiMinus.setOnClickListener {
                    val minAi = Math.max(1, game.minPlayers - 1)
                    if (currentAiCount > minAi) {
                        currentAiCount--
                        updateSoloUi()
                    }
                }

                btnAiPlus.setOnClickListener {
                    if (currentAiCount < game.maxPlayers - 1) {
                        currentAiCount++
                        updateSoloUi()
                    }
                }

                fun selectSkill(skill: String, btn: Button) {
                    selectedSkill = skill
                    listOf(btnDiffEasy, btnDiffMed, btnDiffHard).forEach {
                        it.backgroundTintList = android.content.res.ColorStateList.valueOf(android.graphics.Color.parseColor("#F5F5F7"))
                        it.setTextColor(android.graphics.Color.parseColor("#1C1E24"))
                    }
                    btn.backgroundTintList = android.content.res.ColorStateList.valueOf(android.graphics.Color.parseColor("#1C1E24"))
                    btn.setTextColor(android.graphics.Color.WHITE)
                }

                btnDiffEasy.setOnClickListener { selectSkill("easy", btnDiffEasy) }
                btnDiffMed.setOnClickListener { selectSkill("medium", btnDiffMed) }
                btnDiffHard.setOnClickListener { selectSkill("hard", btnDiffHard) }

                btnSoloStart.setOnClickListener {
                    onLaunch("solo", selectedSkill, currentAiCount + 1)
                    dialog.dismiss()
                }
                updateSoloUi()
            } else {
                soloContainer.visibility = View.GONE
                // If 1P mode but no AI, it should've been an instant launch unless it's a weird manifest.
                // But we keep a fallback.
                noSoloNote.visibility = View.VISIBLE
            }
        } else {
            // 2P+ Mode logic: Humans only
            soloContainer.visibility = View.GONE
            passContainer.visibility = View.VISIBLE
            noSoloNote.visibility = View.GONE

            var currentHumans = modeCardCount.coerceIn(game.minPlayers, game.maxPlayers)

            fun updatePassUi() {
                tvHumanCount.text = currentHumans.toString()
            }

            btnHumanMinus.setOnClickListener {
                if (currentHumans > game.minPlayers) {
                    currentHumans--
                    updatePassUi()
                }
            }

            btnHumanPlus.setOnClickListener {
                if (currentHumans < game.maxPlayers) {
                    currentHumans++
                    updatePassUi()
                }
            }

            btnPassStart.setOnClickListener {
                onLaunch("pass", "medium", currentHumans)
                dialog.dismiss()
            }
            updatePassUi()
        }
    }
}
