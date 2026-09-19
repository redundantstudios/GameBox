package com.redundantstudios.arcade

import android.os.Bundle
import android.widget.RadioButton
import android.widget.SeekBar
import android.widget.CompoundButton
import androidx.appcompat.app.AppCompatActivity
import com.google.android.material.switchmaterial.SwitchMaterial
import com.redundantstudios.arcade.R
import com.redundantstudios.arcade.util.SettingsManager

class SettingsActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_settings)

        val switchSound = findViewById<SwitchMaterial>(R.id.switchSound)
        val seekVolume = findViewById<SeekBar>(R.id.seekVolume)
        val switchVibe = findViewById<SwitchMaterial>(R.id.switchVibe)
        val rgHaptic = findViewById<android.widget.RadioGroup>(R.id.rgHaptic)
        val switchTheme = findViewById<SwitchMaterial>(R.id.switchTheme)

        // Initialize values from SettingsManager
        switchSound.isChecked = SettingsManager.soundEnabled
        seekVolume.progress = SettingsManager.soundVolume
        switchVibe.isChecked = SettingsManager.vibrationEnabled
        switchTheme.isChecked = SettingsManager.appTheme == "Dark"

        // Set Haptic Profile radio buttons
        val rbSoft = findViewById<RadioButton>(R.id.rbHapticSoft)
        val rbCrisp = findViewById<RadioButton>(R.id.rbHapticCrisp)
        val rbHeavy = findViewById<RadioButton>(R.id.rbHapticHeavy)
        when (SettingsManager.hapticProfile) {
            "Soft" -> rbSoft.isChecked = true
            "Crisp" -> rbCrisp.isChecked = true
            "Heavy" -> rbHeavy.isChecked = true
        }

        // Listeners
        switchSound.setOnCheckedChangeListener { _, isChecked ->
            SettingsManager.soundEnabled = isChecked
        }

        seekVolume.setOnSeekBarChangeListener(object : SeekBar.OnSeekBarChangeListener {
            override fun onProgressChanged(seekBar: SeekBar?, progress: Int, fromUser: Boolean) {
                if (fromUser) SettingsManager.soundVolume = progress
            }
            override fun onStartTrackingTouch(seekBar: SeekBar?) {}
            override fun onStopTrackingTouch(seekBar: SeekBar?) {}
        })

        switchVibe.setOnCheckedChangeListener { _, isChecked ->
            SettingsManager.vibrationEnabled = isChecked
        }

        rgHaptic.setOnCheckedChangeListener { _, checkedId ->
            val profile = when (checkedId) {
                R.id.rbHapticSoft -> "Soft"
                R.id.rbHapticCrisp -> "Crisp"
                R.id.rbHapticHeavy -> "Heavy"
                else -> "Crisp"
            }
            SettingsManager.hapticProfile = profile
        }

        switchTheme.setOnCheckedChangeListener { _, isChecked ->
            SettingsManager.appTheme = if (isChecked) "Dark" else "Light"
            // Note: Full theme switching requires AppCompatDelegate.setDefaultNightMode()
            // which will be handled in a later polish phase.
        }
    }
}
