package com.redundantstudios.arcade

import android.os.Bundle
import android.widget.ImageButton
import android.widget.RadioButton
import android.widget.RadioGroup
import android.widget.SeekBar
import android.widget.TextView
import androidx.appcompat.widget.SwitchCompat
import com.redundantstudios.arcade.audio.ShellAudio
import com.redundantstudios.arcade.ui.ThemedActivity
import com.redundantstudios.arcade.util.Haptics
import com.redundantstudios.arcade.util.SettingsManager

/**
 * Settings, rebuilt calm: one row per setting, real Android controls
 * (SwitchCompat / RadioButton) restyled to the shell palette, the volume
 * slider, and audio feedback on every interaction.
 *
 * gone: the ON/OFF pill pairs and the triple pill row that made this page
 * feel like a wall of buttons.
 */
class SettingsActivity : ThemedActivity() {

    /** Guards the listeners while the saved values are pushed into the controls. */
    private var loading = true

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_settings)
        applyShellBackground()

        findViewById<ImageButton>(R.id.btnBack).setOnClickListener {
            ShellAudio.back(this)
            finish()
        }

        val swSound = findViewById<SwitchCompat>(R.id.swSound)
        val swVibe = findViewById<SwitchCompat>(R.id.swVibe)
        val swDev = findViewById<SwitchCompat>(R.id.swDev)
        val seekVolume = findViewById<SeekBar>(R.id.seekVolume)
        val volValue = findViewById<TextView>(R.id.volValue)
        val hapticGroup = findViewById<RadioGroup>(R.id.hapticGroup)
        val themeGroup = findViewById<RadioGroup>(R.id.themeGroup)

        // ---- push the saved state in BEFORE any listener is attached --------
        swSound.isChecked = SettingsManager.soundEnabled
        swVibe.isChecked = SettingsManager.vibrationEnabled
        swDev.isChecked = SettingsManager.developerMode
        seekVolume.progress = SettingsManager.soundVolume
        volValue.text = "${SettingsManager.soundVolume}%"
        when (SettingsManager.hapticProfile) {
            "Soft" -> findViewById<RadioButton>(R.id.rbHapticSoft).isChecked = true
            "Heavy" -> findViewById<RadioButton>(R.id.rbHapticHeavy).isChecked = true
            else -> findViewById<RadioButton>(R.id.rbHapticCrisp).isChecked = true
        }
        if (SettingsManager.appTheme == "Dark") {
            findViewById<RadioButton>(R.id.rbThemeDark).isChecked = true
        } else {
            findViewById<RadioButton>(R.id.rbThemeLight).isChecked = true
        }
        loading = false

        // ---- sound ----------------------------------------------------------
        swSound.setOnCheckedChangeListener { _, checked ->
            if (loading) return@setOnCheckedChangeListener
            SettingsManager.soundEnabled = checked
            if (checked) ShellAudio.select(this) else ShellAudio.back(this)
            ShellAudio.refresh(this)
            sync()
        }

        // ---- volume: live audio preview, which is what a volume slider is for
        seekVolume.setOnSeekBarChangeListener(object : SeekBar.OnSeekBarChangeListener {
            override fun onProgressChanged(seekBar: SeekBar?, progress: Int, fromUser: Boolean) {
                if (!fromUser) return
                SettingsManager.soundVolume = progress
                volValue.text = "$progress%"
                if (SettingsManager.soundEnabled) ShellAudio.tick(this@SettingsActivity)
            }

            override fun onStartTrackingTouch(seekBar: SeekBar?) {}

            override fun onStopTrackingTouch(seekBar: SeekBar?) {
                // Confirm the level with a real note played at the new volume.
                if (SettingsManager.soundEnabled) ShellAudio.select(this@SettingsActivity)
                ShellAudio.refresh(this@SettingsActivity)
                sync()
            }
        })

        // ---- vibration ------------------------------------------------------
        swVibe.setOnCheckedChangeListener { _, checked ->
            if (loading) return@setOnCheckedChangeListener
            SettingsManager.vibrationEnabled = checked
            if (checked) Haptics.preview(this)
            sync()
        }

        // ---- haptic profile -------------------------------------------------
        hapticGroup.setOnCheckedChangeListener { _, checkedId ->
            if (loading) return@setOnCheckedChangeListener
            SettingsManager.hapticProfile = when (checkedId) {
                R.id.rbHapticSoft -> "Soft"
                R.id.rbHapticHeavy -> "Heavy"
                else -> "Crisp"
            }
            Haptics.preview(this)
            ShellAudio.tap(this)
            sync()
        }

        // ---- theme (ThemedActivity re-applies it to every screen) -----------
        themeGroup.setOnCheckedChangeListener { _, checkedId ->
            if (loading) return@setOnCheckedChangeListener
            SettingsManager.appTheme = if (checkedId == R.id.rbThemeDark) "Dark" else "Light"
            SettingsManager.applyTheme()
        }

        // ---- developer mode -------------------------------------------------
        swDev.setOnCheckedChangeListener { _, checked ->
            if (loading) return@setOnCheckedChangeListener
            SettingsManager.developerMode = checked
            ShellAudio.tap(this)
            sync()
        }
    }

    /** Whatever changed here must reach every game. */
    private fun sync() = SettingsManager.syncToGameStore(this)

    override fun onPause() {
        super.onPause()
        sync()
    }
}
