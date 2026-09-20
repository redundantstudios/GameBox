package com.redundantstudios.arcade.util

import android.content.Context
import android.content.SharedPreferences
import androidx.appcompat.app.AppCompatDelegate

object SettingsManager {
    private const val PREFS_NAME = "studio_settings"

    /** Must match NativeBridge's store â€” games read `shell:settings` from it. */
    private const val GAME_STORE = "studio_games"
    private const val GAME_SETTINGS_KEY = "shell:settings"

    // Keys
    private const val KEY_SOUND_ENABLED = "sound_enabled"
    private const val KEY_MUSIC_ENABLED = "music_enabled"
    private const val KEY_SOUND_VOLUME = "sound_volume"
    private const val KEY_VIBRATION_ENABLED = "vibration_enabled"
    private const val KEY_HAPTIC_PROFILE = "haptic_profile"
    private const val KEY_AUDIO_PRESET = "audio_preset"
    private const val KEY_APP_THEME = "app_theme"
    private const val KEY_DEVELOPER_MODE = "developer_mode"
    private const val KEY_REMINDERS_ENABLED = "reminders_enabled"
    private const val KEY_REMINDER_SLOT = "reminder_slot"
    private const val KEY_NEWS_ENABLED = "news_enabled"
    private const val KEY_LAST_OPEN_DAY = "last_open_day"
    private const val KEY_LAST_NOTIF_DAY = "last_notif_day"
    private const val KEY_KNOWN_GAME_IDS = "known_game_ids"
    private const val KEY_GAMES_LAUNCHED = "games_launched"
    private const val KEY_NOTIF_PROMPT_SHOWN = "notif_prompt_shown"

    private lateinit var prefs: SharedPreferences

    fun init(context: Context) {
        prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    }

    // Sound
    var soundEnabled: Boolean
        get() = prefs.getBoolean(KEY_SOUND_ENABLED, true)
        set(value) = prefs.edit().putBoolean(KEY_SOUND_ENABLED, value).apply()

    /** Music (the ambient loop) has its own switch, separate from SFX. */
    var musicEnabled: Boolean
        get() = prefs.getBoolean(KEY_MUSIC_ENABLED, true)
        set(value) = prefs.edit().putBoolean(KEY_MUSIC_ENABLED, value).apply()

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

    /**
     * Developer mode: when on, games are launched with `dev=1`, which is what
     * exposes test-only tools inside a game (e.g. Ludo's bot speed test).
     * Off by default so real players never see them.
     */
    var developerMode: Boolean
        get() = prefs.getBoolean(KEY_DEVELOPER_MODE, false)
        set(value) = prefs.edit().putBoolean(KEY_DEVELOPER_MODE, value).apply()

    // ------------------------------------------------------------------
    // Notifications (100% local — see NOTIFICATIONS.md)
    // ------------------------------------------------------------------

    /** Master switch for the daily reminder. Nothing fires without it. */
    var remindersEnabled: Boolean
        get() = prefs.getBoolean(KEY_REMINDERS_ENABLED, true)
        set(value) = prefs.edit().putBoolean(KEY_REMINDERS_ENABLED, value).apply()

    /** Morning / Afternoon / Evening — maps to fixed local times. */
    var reminderSlot: String
        get() = prefs.getString(KEY_REMINDER_SLOT, "Evening") ?: "Evening"
        set(value) = prefs.edit().putString(KEY_REMINDER_SLOT, value).apply()

    /** New-game announcements. */
    var newsEnabled: Boolean
        get() = prefs.getBoolean(KEY_NEWS_ENABLED, true)
        set(value) = prefs.edit().putBoolean(KEY_NEWS_ENABLED, value).apply()

    /** yyyy-MM-dd of the last day the shell was actually opened. */
    var lastOpenDay: String?
        get() = prefs.getString(KEY_LAST_OPEN_DAY, null)
        set(value) = prefs.edit().putString(KEY_LAST_OPEN_DAY, value).apply()

    /** yyyy-MM-dd of the last posted re-engagement notification (daily dedupe). */
    var lastNotifDay: String?
        get() = prefs.getString(KEY_LAST_NOTIF_DAY, null)
        set(value) = prefs.edit().putString(KEY_LAST_NOTIF_DAY, value).apply()

    /** Comma-joined sorted ids of games already "seen"; drives news detection. */
    var knownGameIds: String
        get() = prefs.getString(KEY_KNOWN_GAME_IDS, "") ?: ""
        set(value) = prefs.edit().putString(KEY_KNOWN_GAME_IDS, value).apply()

    /** How many times any game was launched (drives the permission moment). */
    var gamesLaunched: Int
        get() = prefs.getInt(KEY_GAMES_LAUNCHED, 0)
        set(value) = prefs.edit().putInt(KEY_GAMES_LAUNCHED, value).apply()

    /** The one-shot permission explainer has been shown. */
    var notifPromptShown: Boolean
        get() = prefs.getBoolean(KEY_NOTIF_PROMPT_SHOWN, false)
        set(value) = prefs.edit().putBoolean(KEY_NOTIF_PROMPT_SHOWN, value).apply()

    fun markOpenedToday() {
        lastOpenDay = today()
    }

    fun today(): String {
        val cal = java.util.Calendar.getInstance()
        return String.format(
            "%04d-%02d-%02d",
            cal.get(java.util.Calendar.YEAR),
            cal.get(java.util.Calendar.MONTH) + 1,
            cal.get(java.util.Calendar.DAY_OF_MONTH)
        )
    }

    /** Apply the saved theme app-wide. Must be called before super.onCreate(). */
    /** One-shot flag consumed by the next screen that resumes after a theme flip. */
    var themeTransitionPending: Boolean = false

    fun consumeThemeTransition(): Boolean {
        val pending = themeTransitionPending
        themeTransitionPending = false
        return pending
    }

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

    /** Same payload as [getSettingsQueryString] but as JSON, for live pushes. */
    fun getSettingsJson(): String {
        return org.json.JSONObject().apply {
            put("sound", soundEnabled)
            put("volume", soundVolume)
            put("haptics", vibrationEnabled)
            put("haptic", hapticProfile.lowercase())
            put("preset", audioPreset.lowercase())
        }.toString()
    }

    /**
     * Games read their shell-provided settings from the shared game store under
     * the key `shell:settings` (see the Studio shim inside each game).
     * Writing it here means a settings change takes effect in every game.
     */
    fun syncToGameStore(context: Context) {
        context.getSharedPreferences(GAME_STORE, Context.MODE_PRIVATE)
            .edit()
            .putString(GAME_SETTINGS_KEY, getSettingsJson())
            .apply()
    }

    /** Changes whenever any setting is edited â€” lets callers detect staleness. */
    fun signature(): String = getSettingsJson()
}

