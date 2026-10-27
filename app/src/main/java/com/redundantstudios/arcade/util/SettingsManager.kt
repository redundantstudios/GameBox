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
    // The developer_mode preference key is GONE. The setting, its UI row and the
    // dev=1 launch flag were all removed for the Play release, so nothing can
    // re-enable the in-game test tools. A stale value already written to a
    // player's prefs is simply ignored.
    private const val KEY_REMINDERS_ENABLED = "reminders_enabled"
    private const val KEY_REMINDER_SLOT = "reminder_slot"
    private const val KEY_NEWS_ENABLED = "news_enabled"
    private const val KEY_LAST_OPEN_DAY = "last_open_day"
    private const val KEY_LAST_NOTIF_DAY = "last_notif_day"
    private const val KEY_KNOWN_GAME_IDS = "known_game_ids"
    private const val KEY_GAMES_LAUNCHED = "games_launched"
    private const val KEY_NOTIF_PROMPT_SHOWN = "notif_prompt_shown"

// In-app updates
private const val KEY_LAST_SEEN_VERSION = "last_seen_version"
private const val KEY_UPDATE_PROMPTED_VERSION = "update_prompted_version"
private const val KEY_UPDATE_COMPLETED_SHOWN = "update_completed_shown"
private const val KEY_UPDATE_NOTIFIED_VERSION = "update_notified_version"

// Daily notification rotation
private const val KEY_DAILY_MSG_INDEX = "daily_msg_index"
private const val KEY_DAILY_MSG_DAY = "daily_msg_day"

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

    /* ---- developer mode: REMOVED for the Play release ----
       It exposed in-game test tools (Ludo's bot speed test) to real players.
       The whole path is gone: the setting, the persisted flag, and the dev=1
       launch flag. Nothing in the UI can switch it back on, so the test tools
       stay dormant in shipped builds. */

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

    // ------------------------------------------------------------------
    // In-app updates
    // ------------------------------------------------------------------

    /**
     * versionCode of the last app version this install actually ran.
     * Null until the first cold start stamps it. A null here means "fresh
     * install", never "upgraded" - important, or a new install would claim an
     * update happened and show the completion popup to someone who never
     * updated anything.
     */
    var lastSeenVersion: Int?
        get() = if (prefs.contains(KEY_LAST_SEEN_VERSION)) prefs.getInt(KEY_LAST_SEEN_VERSION, 0) else null
        set(value) = prefs.edit().putInt(KEY_LAST_SEEN_VERSION, value ?: 0).apply()

    /**
     * versionCode we have already put the "update ready" popup in front of the
     * player. Compared against the offered versionCode so a release is asked
     * about once, no matter how many times the app is opened.
     */
    var updatePromptedVersion: Int
        get() = prefs.getInt(KEY_UPDATE_PROMPTED_VERSION, 0)
        set(value) = prefs.edit().putInt(KEY_UPDATE_PROMPTED_VERSION, value).apply()

    /** True once the "you're up to date" popup has been shown for this upgrade. */
    var updateCompletedShown: Boolean
        get() = prefs.getBoolean(KEY_UPDATE_COMPLETED_SHOWN, false)
        set(value) = prefs.edit().putBoolean(KEY_UPDATE_COMPLETED_SHOWN, value).apply()

    /** yyyy-MM-dd the "update finished" notification last fired, for dedupe. */
    var updateNotifiedVersion: Int
        get() = prefs.getInt(KEY_UPDATE_NOTIFIED_VERSION, 0)
        set(value) = prefs.edit().putInt(KEY_UPDATE_NOTIFIED_VERSION, value).apply()

    // ------------------------------------------------------------------
    // Daily notification rotation
    // ------------------------------------------------------------------

    /**
     * Index into [com.redundantstudios.arcade.notifications.DailyMessages] for
     * today, and the day it was picked for. Chosen once a day and then reused,
     * so a retried worker posts the same text instead of reshuffling.
     */
    var dailyMessageIndex: Int
        get() = prefs.getInt(KEY_DAILY_MSG_INDEX, -1)
        set(value) = prefs.edit().putInt(KEY_DAILY_MSG_INDEX, value).apply()

    var dailyMessageDay: String?
        get() = prefs.getString(KEY_DAILY_MSG_DAY, null)
        set(value) = prefs.edit().putString(KEY_DAILY_MSG_DAY, value).apply()

    /**
     * Today's daily message index, picking one at random the first time a day
     * asks for it. Never repeats yesterday's pick when there is a choice.
     */
    fun todayDailyMessageIndex(size: Int): Int {
        if (size <= 0) return 0
        val today = today()
        val stored = dailyMessageIndex
        if (dailyMessageDay == today && stored in 0 until size) return stored
        val previous = if (dailyMessageDay == yesterday()) stored else -1
        var pick = (java.util.Random().nextInt(size))
        if (size > 1 && pick == previous) pick = (pick + 1) % size
        dailyMessageIndex = pick
        dailyMessageDay = today
        return pick
    }

    fun yesterday(): String {
        val cal = java.util.Calendar.getInstance().apply {
            add(java.util.Calendar.DAY_OF_MONTH, -1)
        }
        return String.format(
            "%04d-%02d-%02d",
            cal.get(java.util.Calendar.YEAR),
            cal.get(java.util.Calendar.MONTH) + 1,
            cal.get(java.util.Calendar.DAY_OF_MONTH)
        )
    }

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
            put("music", musicEnabled)
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

