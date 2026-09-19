package com.redundantstudios.arcade.util

import android.content.Context
import android.content.SharedPreferences
import androidx.appcompat.app.AppCompatDelegate

object SettingsManager {
    private const val PREFS_NAME = "studio_settings"

    // Keys
    private const val KEY_SOUND_ENABLED = "sound_enabled"
    private const val KEY_SOUND_VOLUME = "sound_volume"
    private const val KEY_VIBRATION_ENABLED = "vibration_enabled"
    private const val KEY_HAPTIC_PROFILE = "haptic_profile"
    private const val KEY_AUDIO_PRESET = "audio_preset"
    private const val KEY_APP_THEME = "app_theme"

    private lateinit var prefs: SharedPreferences

    fun init(context: Context) {
        prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    }

    // Sound
    var soundEnabled: Boolean
        get() = prefs.getBoolean(KEY_SOUND_ENABLED, true)
        set(value) = prefs.edit().putBoolean(KEY_SOUND_ENABLED, value).apply()

    var soundVolume: Int
        get() = prefs.getInt(KEY_SOUND_VOLUME, 80)
        set(value) = prefs.edit().putInt(KEY_SOUND_VOLUME, value).apply()

    // Vibration
    var vibrationEnabled: Boolean
        get() = prefs.getBoolean(KEY_VIBRATION_ENABLED, true)
        set(value) = prefs.edit().putBoolean(KEY_VIBRATION_ENABLED, value).apply()

    var hapticProfile: String
        get() = prefs.getString(KEY_HAPTIC_PROFILE, "Crisp") ?: "Crisp"
        set(value) = prefs.edit().putString(KEY_HAPTIC_PROFILE, value).apply()

    // Audio Preset
    var audioPreset: String
        get() = prefs.getString(KEY_AUDIO_PRESET, "Studio") ?: "Studio"
        set(value) = prefs.edit().putString(KEY_AUDIO_PRESET, value).apply()

    // Theme
    var appTheme: String
        get() = prefs.getString(KEY_APP_THEME, "Light") ?: "Light"
        set(value) = prefs.edit().putString(KEY_APP_THEME, value).apply()

    /** Apply the saved theme app-wide. Must be called before super.onCreate(). */
    fun applyTheme() {
        AppCompatDelegate.setDefaultNightMode(
            if (appTheme == "Dark") AppCompatDelegate.MODE_NIGHT_YES
            else AppCompatDelegate.MODE_NIGHT_NO
        )
    }

    fun getSettingsQueryString(): String {
        return "sound=${if (soundEnabled) 1 else 0}" +
               "&vol=$soundVolume" +
               "&vibe=${if (vibrationEnabled) 1 else 0}" +
               "&haptic=${hapticProfile.lowercase()}" +
               "&preset=${audioPreset.lowercase()}"
    }
}
