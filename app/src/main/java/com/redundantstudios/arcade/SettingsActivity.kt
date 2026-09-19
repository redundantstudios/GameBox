package com.redundantstudios.arcade

import android.os.Bundle
import android.widget.ImageButton
import android.widget.SeekBar
import androidx.appcompat.app.AppCompatActivity
import com.google.android.material.button.MaterialButtonToggleGroup
import com.google.android.material.switchmaterial.SwitchMaterial
import com.redundantstudios.arcade.R
import com.redundantstudios.arcade.util.Haptics
import com.redundantstudios.arcade.util.SettingsManager

class SettingsActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        SettingsManager.init(this)
        SettingsManager.applyTheme()
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_settings)

        val btnBack = findViewById<ImageButton>(R.id.btnBack)
        btnBack.setOnClickListener { finish() }

        val switchSound = findViewById<SwitchMaterial>(R.id.switchSound)
        val seekVolume = findViewById<SeekBar>(R.id.seekVolume)
        val switchVibe = findViewById<SwitchMaterial>(R.id.switchVibe)
        val toggleHaptic = findViewById<MaterialButtonToggleGroup>(R.id.toggleHaptic)
        val switchTheme = findViewById<SwitchMaterial>(R.id.switchTheme)

        // Initialize values from SettingsManager
        switchSound.isChecked = SettingsManager.soundEnabled
        seekVolume.progress = SettingsManager.soundVolume
        switchVibe.isChecked = SettingsManager.vibrationEnabled
        switchTheme.isChecked = SettingsManager.appTheme == "Dark"

        // Haptic profile pills
        when (SettingsManager.hapticProfile) {
            "Soft" -> toggleHaptic.check(R.id.toggleHapticSoft)
            "Heavy" -> toggleHaptic.check(R.id.toggleHapticHeavy)
            else -> toggleHaptic.check(R.id.toggleHapticCrisp)
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
            if (isChecked) Haptics.preview(this)
        }

        toggleHaptic.addOnButtonCheckedListener { _, _, isChecked ->
            if (isChecked) {
                SettingsManager.hapticProfile = when (toggleHaptic.checkedButtonId) {
                    R.id.toggleHapticSoft -> "Soft"
                    R.id.toggleHapticHeavy -> "Heavy"
                    else -> "Crisp"
                }
                Haptics.preview(this)
            }
        }

        switchTheme.setOnCheckedChangeListener { _, isChecked ->
            SettingsManager.appTheme = if (isChecked) "Dark" else "Light"
            SettingsManager.applyTheme()
        }
    }
}
