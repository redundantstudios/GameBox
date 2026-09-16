package com.redundantstudios.arcade

import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.os.Build
import android.os.Bundle
import android.util.Log
import android.view.MotionEvent
import android.view.View
import android.view.animation.ScaleAnimation
import android.widget.Switch
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import com.google.android.material.switchmaterial.SwitchMaterial
import com.redundantstudios.arcade.BuildConfig

class SettingsActivity : AppCompatActivity() {

    private lateinit var prefs: SharedPreferences
    private lateinit var soundSwitch: SwitchMaterial
    private lateinit var hapticsSwitch: SwitchMaterial
    private lateinit var versionText: TextView

    companion object {
        const val PREFS_NAME = "studio_games"
        const val SETTINGS_KEY = "shell:settings"
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_settings)

        prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

        soundSwitch = findViewById(R.id.switchSound)
        hapticsSwitch = findViewById(R.id.switchHaptics)
        versionText = findViewById(R.id.tvVersion)

        loadSettings()
        versionText.text = BuildConfig.VERSION_NAME

        applyScaleSnap(soundSwitch)
        applyScaleSnap(hapticsSwitch)

        soundSwitch.setOnCheckedChangeListener { _, isChecked ->
            saveSettings()
        }

        hapticsSwitch.setOnCheckedChangeListener { _, isChecked ->
            saveSettings()
        }
    }

    private fun loadSettings() {
        val json = prefs.getString(SETTINGS_KEY, null)
        if (json != null) {
            try {
                val obj = android.util.JsonReader(android.io.StringReader(json)).apply {
                    beginObject()
                    while (hasNext()) {
                        val name = nextName()
                        when (name) {
                            "sound" -> soundSwitch.isChecked = nextBoolean()
                            "haptics" -> hapticsSwitch.isChecked = nextBoolean()
                        }
                    }
                    endObject()
                    close()
                }
            } catch (e: Exception) {
                soundSwitch.isChecked = true
                hapticsSwitch.isChecked = true
            }
        } else {
            soundSwitch.isChecked = true
            hapticsSwitch.isChecked = true
        }
    }

    private fun saveSettings() {
        val settingsJson = android.util.JsonObject()
        settingsJson.addProperty("sound", soundSwitch.isChecked)
        settingsJson.addProperty("haptics", hapticsSwitch.isChecked)
        prefs.edit().putString(SETTINGS_KEY, settingsJson.toString()).apply()
        Log.d("SettingsActivity", "Saved settings: ${settingsJson.toString()}")
    }

    private fun applyScaleSnap(view: View) {
        view.setOnTouchListener { v, event ->
            when (event.action) {
                MotionEvent.ACTION_DOWN -> {
                    v.startAnimation(ScaleAnimation(
                        1.0f, 0.93f, 1.0f, 0.93f,
                        android.view.animation.Animation.RELATIVE_TO_SELF, 0.5f,
                        android.view.animation.Animation.RELATIVE_TO_SELF, 0.5f
                    ).apply {
                        duration = 100
                        fillAfter = true
                    })
                    false
                }
                MotionEvent.ACTION_UP, MotionEvent.ACTION_CANCEL -> {
                    v.startAnimation(ScaleAnimation(
                        0.93f, 1.0f, 0.93f, 1.0f,
                        android.view.animation.Animation.RELATIVE_TO_SELF, 0.5f,
                        android.view.animation.Animation.RELATIVE_TO_SELF, 0.5f
                    ).apply {
                        duration = 100
                        fillAfter = true
                    })
                    false
                }
                else -> false
            }
        }
    }

    companion object {
        fun start(context: Context) {
            context.startActivity(Intent(context, SettingsActivity::class.java))
        }
    }
}