package com.redundantstudios.arcade

import android.os.Bundle
import android.widget.ImageButton
import android.widget.SeekBar
import androidx.appcompat.app.AppCompatActivity
import com.redundantstudios.arcade.ui.SelectCard
import com.redundantstudios.arcade.util.Haptics
import com.redundantstudios.arcade.util.SettingsManager

class SettingsActivity : AppCompatActivity() {

    /** Guards the listeners while we push the saved values into the controls. */
    private var loading = true

    override fun onCreate(savedInstanceState: Bundle?) {
        SettingsManager.init(this)
        SettingsManager.applyTheme()
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_settings)

        findViewById<ImageButton>(R.id.btnBack).setOnClickListener { finish() }

        val selSoundOn = findViewById<SelectCard>(R.id.selSoundOn)
        val selSoundOff = findViewById<SelectCard>(R.id.selSoundOff)
        val selVibeOn = findViewById<SelectCard>(R.id.selVibeOn)
        val selVibeOff = findViewById<SelectCard>(R.id.selVibeOff)
        val selHapticSoft = findViewById<SelectCard>(R.id.selHapticSoft)
        val selHapticCrisp = findViewById<SelectCard>(R.id.selHapticCrisp)
        val selHapticHeavy = findViewById<SelectCard>(R.id.selHapticHeavy)
        val selThemeLight = findViewById<SelectCard>(R.id.selThemeLight)
        val selThemeDark = findViewById<SelectCard>(R.id.selThemeDark)
        val selDevOn = findViewById<SelectCard>(R.id.selDevOn)
        val selDevOff = findViewById<SelectCard>(R.id.selDevOff)
        val seekVolume = findViewById<SeekBar>(R.id.seekVolume)

        // Push the saved state into the controls (listeners suppressed).
        applyPair(selSoundOn, selSoundOff, SettingsManager.soundEnabled)
        applyPair(selVibeOn, selVibeOff, SettingsManager.vibrationEnabled)
        applyPair(selThemeLight, selThemeDark, SettingsManager.appTheme == "Dark")
        applyPair(selDevOn, selDevOff, SettingsManager.developerMode)

        selHapticSoft.setChecked(SettingsManager.hapticProfile == "Soft")
        selHapticCrisp.setChecked(SettingsManager.hapticProfile == "Crisp")
        selHapticHeavy.setChecked(SettingsManager.hapticProfile == "Heavy")

        seekVolume.progress = SettingsManager.soundVolume

        // ---- sound ----------------------------------------------------------
        selSoundOn.onCheckedChanged = { checked ->
            if (!loading && checked) {
                SettingsManager.soundEnabled = true
                selSoundOff.setChecked(false)
                SettingsManager.syncToGameStore(this)
            }
        }
        selSoundOff.onCheckedChanged = { checked ->
            if (!loading && checked) {
                SettingsManager.soundEnabled = false
                selSoundOn.setChecked(false)
                SettingsManager.syncToGameStore(this)
            }
        }

        seekVolume.setOnSeekBarChangeListener(object : SeekBar.OnSeekBarChangeListener {
            override fun onProgressChanged(seekBar: SeekBar?, progress: Int, fromUser: Boolean) {
                if (fromUser) SettingsManager.soundVolume = progress
            }

            override fun onStartTrackingTouch(seekBar: SeekBar?) {}

            override fun onStopTrackingTouch(seekBar: SeekBar?) {
                SettingsManager.syncToGameStore(this@SettingsActivity)
            }
        })

        // ---- vibration ------------------------------------------------------
        selVibeOn.onCheckedChanged = { checked ->
            if (!loading && checked) {
                SettingsManager.vibrationEnabled = true
                selVibeOff.setChecked(false)
                Haptics.preview(this)
                SettingsManager.syncToGameStore(this)
            }
        }
        selVibeOff.onCheckedChanged = { checked ->
            if (!loading && checked) {
                SettingsManager.vibrationEnabled = false
                selVibeOn.setChecked(false)
                SettingsManager.syncToGameStore(this)
            }
        }

        // ---- haptic profile (exclusive triple, with a live preview) ---------
        val haptics = listOf(
            selHapticSoft to "Soft",
            selHapticCrisp to "Crisp",
            selHapticHeavy to "Heavy"
        )
        haptics.forEach { (card, profile) ->
            card.onCheckedChanged = { checked ->
                if (!loading && checked) {
                    SettingsManager.hapticProfile = profile
                    haptics.filter { it.first !== card }.forEach { it.first.setChecked(false) }
                    Haptics.preview(this)
                    SettingsManager.syncToGameStore(this)
                }
            }
        }

        // ---- theme ----------------------------------------------------------
        selThemeLight.onCheckedChanged = { checked ->
            if (!loading && checked) {
                SettingsManager.appTheme = "Light"
                selThemeDark.setChecked(false)
                SettingsManager.applyTheme()
            }
        }
        selThemeDark.onCheckedChanged = { checked ->
            if (!loading && checked) {
                SettingsManager.appTheme = "Dark"
                selThemeLight.setChecked(false)
                SettingsManager.applyTheme()
            }
        }

        // ---- developer mode -------------------------------------------------
        selDevOn.onCheckedChanged = { checked ->
            if (!loading && checked) {
                SettingsManager.developerMode = true
                selDevOff.setChecked(false)
            }
        }
        selDevOff.onCheckedChanged = { checked ->
            if (!loading && checked) {
                SettingsManager.developerMode = false
                selDevOn.setChecked(false)
            }
        }

        loading = false
    }

    override fun onPause() {
        super.onPause()
        // Whatever changed here must reach every game.
        SettingsManager.syncToGameStore(this)
    }

    /** Sets both cards of a yes/no pair without firing the change listeners. */
    private fun applyPair(on: SelectCard, off: SelectCard, value: Boolean) {
        val wasLoading = loading
        loading = true
        on.setChecked(value)
        off.setChecked(!value)
        loading = wasLoading
    }
}