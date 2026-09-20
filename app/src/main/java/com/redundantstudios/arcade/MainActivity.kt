package com.redundantstudios.arcade

import android.content.Intent
import android.os.Build
import android.os.Bundle
import android.view.View
import android.widget.ImageButton
import android.widget.TextView
import androidx.appcompat.app.AlertDialog
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import androidx.recyclerview.widget.GridLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.google.android.gms.ads.MobileAds
import com.redundantstudios.arcade.ads.UMPConsentManager
import com.redundantstudios.arcade.audio.ShellAudio
import com.redundantstudios.arcade.model.GameManifest
import com.redundantstudios.arcade.model.GameMode
import com.redundantstudios.arcade.notifications.ArcadeNotifier
import com.redundantstudios.arcade.notifications.NotificationChannels
import com.redundantstudios.arcade.notifications.ReminderScheduler
import com.redundantstudios.arcade.ui.ModeAdapter
import com.redundantstudios.arcade.ui.ModeActivity
import com.redundantstudios.arcade.ui.ThemedActivity
import com.redundantstudios.arcade.util.ManifestParser
import com.redundantstudios.arcade.util.SettingsManager

class MainActivity : ThemedActivity() {

    private lateinit var allGames: List<GameManifest>

    /** Route pulled from a notification tap; consumed exactly once. */
    private var pendingRoute: String? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        installSplashScreen()
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)
        applyShellBackground()

        NotificationChannels.ensure(this)
        ReminderScheduler.schedule(this)
        pendingRoute = intent?.getStringExtra(EXTRA_NOTIF_ROUTE)

        UMPConsentManager(this).gatherConsent {
            MobileAds.initialize(this) {}
        }

        findViewById<ImageButton>(R.id.btnSettings).setOnClickListener {
            ShellAudio.tap(this)
            startActivity(Intent(this, SettingsActivity::class.java))
        }

        findViewById<View>(R.id.allGamesCard).setOnClickListener {
            ShellAudio.select(this)
            startActivity(
                Intent(this, ModeActivity::class.java).apply {
                    putExtra(ModeActivity.EXTRA_ALL_GAMES, true)
                }
            )
        }

        val modeRecyclerView = findViewById<RecyclerView>(R.id.modeRecyclerView)
        modeRecyclerView.layoutManager = GridLayoutManager(this, 2)

        allGames = ManifestParser.scanGames(this)
        modeRecyclerView.adapter = ModeAdapter(deriveModes(allGames)) { mode ->
            startModeActivity(mode)
        }
        bindHome()
    }

    override fun onResume() {
        super.onResume()
        // Re-scan in case games were added/removed while paused (e.g., dev swaps)
        if (this::allGames.isInitialized) {
            allGames = ManifestParser.scanGames(this)
            bindHome()
        }

        // Notification bookkeeping: opening the shell today silences today's
        // reminder, and a freshly installed game can announce itself once.
        SettingsManager.markOpenedToday()
        checkForNewGames()

        // A notification tap routes here (both cold start and onNewIntent).
        pendingRoute?.let { route ->
            pendingRoute = null
            handleRoute(route)
        }

        maybeAskNotificationPermission()
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        pendingRoute = intent.getStringExtra(EXTRA_NOTIF_ROUTE)
    }

    /** Deep links from notifications: `game:<id>`, `all_games`, or `home`. */
    private fun handleRoute(route: String) {
        when {
            route.startsWith("game:") -> {
                val id = route.removePrefix("game:")
                val game = allGames.find { it.id == id } ?: return
                startActivity(
                    Intent(this, GameActivity::class.java).apply {
                        putExtra("game_id", game.id)
                        putExtra("players_preselect", ModeActivity.NO_PRESELECT)
                    }
                )
            }
            route == "all_games" -> startActivity(
                Intent(this, ModeActivity::class.java).apply {
                    putExtra(ModeActivity.EXTRA_ALL_GAMES, true)
                }
            )
        }
    }

    /**
     * News: when the set of installed games grows, announce the first new
     * title once. The first run only seeds the baseline (no spam on install).
     */
    private fun checkForNewGames() {
        val ids = allGames.map { it.id }.sorted()
        val stored = SettingsManager.knownGameIds
        if (stored.isEmpty()) {
            SettingsManager.knownGameIds = ids.joinToString(",")
            return
        }
        val known = stored.split(",").filter { it.isNotBlank() }.toSet()
        val fresh = ids.filter { it !in known }
        if (fresh.isEmpty()) return
        SettingsManager.knownGameIds = ids.joinToString(",")
        if (ArcadeNotifier.canPost(this)) {
            val game = allGames.find { it.id == fresh.first() } ?: return
            ArcadeNotifier.postNews(this, game, fresh.size - 1)
        }
    }

    /**
     * One-shot permission moment: asked AFTER the player has finished their
     * first game and returned to the shell — a task-completion moment, never
     * on first launch. Declined or dismissed, it never auto-asks again; the
     * Settings row is the manual path.
     */
    private fun maybeAskNotificationPermission() {
        if (SettingsManager.notifPromptShown) return
        if (SettingsManager.gamesLaunched < 1) return
        if (ArcadeNotifier.canPost(this)) {
            SettingsManager.notifPromptShown = true
            return
        }
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) {
            SettingsManager.notifPromptShown = true
            return
        }
        SettingsManager.notifPromptShown = true
        AlertDialog.Builder(this)
            .setTitle(R.string.notif_explainer_title)
            .setMessage(R.string.notif_explainer_body)
            .setPositiveButton(R.string.enable) { _, _ ->
                requestPermissions(arrayOf(android.Manifest.permission.POST_NOTIFICATIONS), 1)
            }
            .setNegativeButton(R.string.not_now, null)
            .show()
    }
    companion object {
        const val EXTRA_NOTIF_ROUTE = "notif_route"
    }

    /** Keeps the All Games band, the grid and the empty state in sync. */
    private fun bindHome() {
        val modes = deriveModes(allGames)

        (findViewById<RecyclerView>(R.id.modeRecyclerView).adapter as? ModeAdapter)
            ?.updateModes(modes)

        findViewById<TextView>(R.id.allGamesSubtitle).text =
            getString(R.string.all_games_count, allGames.size)

        findViewById<View>(R.id.emptyState).visibility =
            if (modes.isEmpty()) View.VISIBLE else View.GONE
    }

    private fun deriveModes(games: List<GameManifest>): List<GameMode> {
        val counts = games.flatMap { (it.minPlayers..it.maxPlayers).toList() }
        val supportedCounts = counts.distinct().sorted()
        // Design--ref palette: all saturated enough to carry white text
        val colors = listOf("#E53935", "#1E88E5", "#43A047", "#F9A825", "#8E24AA")

        return supportedCounts.mapIndexed { index, count ->
            val gameCount = ModeActivity.filterGames(games, count).size
            GameMode(
                playerCount = count,
                label = "${count} PLAYER",
                color = colors[index % colors.size],
                gameCount = gameCount
            )
        }.filter { it.gameCount > 0 }
    }

    private fun startModeActivity(mode: GameMode) {
        val intent = Intent(this, ModeActivity::class.java).apply {
            putExtra(ModeActivity.EXTRA_PLAYER_COUNT, mode.playerCount)
        }
        startActivity(intent)
    }
}
