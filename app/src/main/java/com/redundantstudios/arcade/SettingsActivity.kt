package com.redundantstudios.arcade

import android.os.Bundle
import android.view.View
import android.widget.ImageButton
import android.widget.RadioButton
import android.widget.RadioGroup
import android.widget.SeekBar
import android.widget.TextView
import androidx.appcompat.widget.SwitchCompat
import com.redundantstudios.arcade.audio.ShellAudio
import com.redundantstudios.arcade.notifications.ArcadeNotifier
import com.redundantstudios.arcade.notifications.ReminderScheduler
import com.redundantstudios.arcade.ui.ThemeTransition
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
        val swMusic = findViewById<SwitchCompat>(R.id.swMusic)
        val swVibe = findViewById<SwitchCompat>(R.id.swVibe)
        val swDev = findViewById<SwitchCompat>(R.id.swDev)
        val swReminders = findViewById<SwitchCompat>(R.id.swReminders)
        val seekVolume = findViewById<SeekBar>(R.id.seekVolume)
        val volValue = findViewById<TextView>(R.id.volValue)
        val hapticGroup = findViewById<RadioGroup>(R.id.hapticGroup)
        val themeGroup = findViewById<RadioGroup>(R.id.themeGroup)
        val slotGroup = findViewById<RadioGroup>(R.id.slotGroup)
        val btnTestNotif = findViewById<TextView>(R.id.btnTestNotif)

        // ---- push the saved state in BEFORE any listener is attached --------
        swSound.isChecked = SettingsManager.soundEnabled
        swMusic.isChecked = SettingsManager.musicEnabled
        swVibe.isChecked = SettingsManager.vibrationEnabled
        swDev.isChecked = SettingsManager.developerMode
        swReminders.isChecked = SettingsManager.remindersEnabled
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
        when (SettingsManager.reminderSlot) {
            "Morning" -> findViewById<RadioButton>(R.id.rbSlotMorning).isChecked = true
            "Afternoon" -> findViewById<RadioButton>(R.id.rbSlotAfternoon).isChecked = true
            else -> findViewById<RadioButton>(R.id.rbSlotEvening).isChecked = true
        }
        if (SettingsManager.developerMode) btnTestNotif.visibility = View.VISIBLE
        loading = false

        // A theme flip recreates this screen; the old frame dissolves away on
        // top and ThemedActivity restores the scroll position underneath.

        // ---- sound effects: the switch itself confirms with the toggle sounds
        swSound.setOnCheckedChangeListener { _, checked ->
            if (loading) return@setOnCheckedChangeListener
            SettingsManager.soundEnabled = checked
            // Play AFTER the setting lands so the sound is heard at the new state.
            if (checked) ShellAudio.tapToggleOn(this) else ShellAudio.tapTiny(this)
            sync()
        }
        // ---- music: silent flip; the loop fading in/out IS the feedback ----
        swMusic.setOnCheckedChangeListener { _, checked ->
            if (loading) return@setOnCheckedChangeListener
            SettingsManager.musicEnabled = checked
            ShellAudio.refresh(this)
            sync()
        }

        // ---- volume: ONE subtle blip while dragging; the loop fades to the
        // new level on release. No extra confirm note.
        seekVolume.setOnSeekBarChangeListener(object : SeekBar.OnSeekBarChangeListener {
            override fun onProgressChanged(seekBar: SeekBar?, progress: Int, fromUser: Boolean) {
                if (!fromUser) return
                SettingsManager.soundVolume = progress
                volValue.text = "$progress%"
                if (SettingsManager.soundEnabled) ShellAudio.tick(this@SettingsActivity)
            }

            override fun onStartTrackingTouch(seekBar: SeekBar?) {}

            override fun onStopTrackingTouch(seekBar: SeekBar?) {
                ShellAudio.refresh(this@SettingsActivity)
                sync()
            }
        })

        // ---- vibration ------------------------------------------------------
        swVibe.setOnCheckedChangeListener { _, checked ->
            if (loading) return@setOnCheckedChangeListener
            SettingsManager.vibrationEnabled = checked
            if (checked) {
                Haptics.preview(this)
                ShellAudio.tapToggleOn(this)
            } else {
                ShellAudio.tapTiny(this)
            }
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
            ShellAudio.tapTiny(this)
            sync()
        }

        // ---- theme (ThemedActivity re-applies it to every screen) -----------
        themeGroup.setOnCheckedChangeListener { _, checkedId ->
            if (loading) return@setOnCheckedChangeListener
            ShellAudio.tapToggleOn(this)
            SettingsManager.appTheme = if (checkedId == R.id.rbThemeDark) "Dark" else "Light"
            applyThemeCrossFade()
        }
        // ---- developer mode (silent; it is a test surface) ------------------
        swDev.setOnCheckedChangeListener { _, checked ->
            if (loading) return@setOnCheckedChangeListener
            SettingsManager.developerMode = checked
            btnTestNotif.visibility = if (checked) View.VISIBLE else View.GONE
            ShellAudio.tapTiny(this)
            sync()
        }

        // ---- reminders ------------------------------------------------------
        swReminders.setOnCheckedChangeListener { _, checked ->
            if (loading) return@setOnCheckedChangeListener
            SettingsManager.remindersEnabled = checked
            ReminderScheduler.schedule(this)
            if (checked) ShellAudio.tapToggleOn(this) else ShellAudio.tapTiny(this)
            sync()
        }

        slotGroup.setOnCheckedChangeListener { _, checkedId ->
            if (loading) return@setOnCheckedChangeListener
            SettingsManager.reminderSlot = when (checkedId) {
                R.id.rbSlotMorning -> "Morning"
                R.id.rbSlotAfternoon -> "Afternoon"
                else -> "Evening"
            }
            ReminderScheduler.schedule(this)
            ShellAudio.tapTiny(this)
            sync()
        }

        // ---- dev-only test ping ---------------------------------------------
        btnTestNotif.setOnClickListener {
            ShellAudio.tap(this)
            ArcadeNotifier.postDevTest(this)
        }
    }

    /**
     * Subtle theme transition: remember where the user is scrolled to, flag a
     * one-shot fade-in (ThemedActivity animates the rebuilt screen in), then
     * apply the theme - which recreates this activity with the new palette.
     * Net effect: a soft fade instead of a hard snap, and no jump to the top.
     */
    private fun applyThemeCrossFade() {
        // Capture this screen first: a flip started here must also FADE here,
        // not just on the screens further back in the stack.
        beginThemeFlip()
        SettingsManager.applyTheme()
    }

    /** Whatever changed here must reach every game. */
    private fun sync() = SettingsManager.syncToGameStore(this)

    override fun onPause() {
        super.onPause()
        sync()
    }
}
