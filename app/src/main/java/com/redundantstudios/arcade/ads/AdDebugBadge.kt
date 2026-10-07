package com.redundantstudios.arcade.ads

import android.app.Activity
import android.graphics.Color
import android.graphics.drawable.GradientDrawable
import android.os.Handler
import android.os.Looper
import android.util.TypedValue
import android.view.Gravity
import android.view.View
import android.view.ViewGroup
import android.widget.FrameLayout
import android.widget.TextView

/**
 * DEVELOPMENT ONLY: an on-screen countdown to the next interstitial.
 *
 * WHY IT IS IN THE SHELL AND NOT IN THE GAMES
 *     The per-session cap meant an interstitial could be refused for a reason no
 *     game could see, and because the governor refuses SILENTLY (by design - a
 *     player who did not ask for an ad must not be nagged) a missing ad during
 *     testing was indistinguishable from a broken call site.
 *
 *     The first attempt at solving that put the badge in ONE game, which meant
 *     every other game still had an unanswerable question. This is a single
 *     native overlay attached over the game WebView, so it covers all twenty
 *     games from one implementation - there is nothing to copy into a new game
 *     and nothing that can drift between them.
 *
 * IT CANNOT SHIP
 *     [attach] returns immediately unless this is a DEBUG build.
 *
 * WHAT IT SHOWS
 *     "AD IN 87s" while the 180s gap is running, "AD READY" once an ad would be
 *     allowed. READY does NOT mean an ad is about to appear on its own: the
 *     interstitial only ever shows because the player tapped Play Again / Menu.
 */
object AdDebugBadge {

    private const val TICK_MS = 500L

    /**
     * SHOW THE ON-SCREEN AD BADGE: true.
     *
     * The badge was briefly turned off on the strength of a report that a "small
     * black capsule" was sitting at the bottom of a game screen. That turned out
     * to be something else entirely - this badge is cyan/green text on a dark
     * pill, bottom-LEFT, and the thing that was actually being seen was a
     * different element. A diagnostic that earns its place by answering "why did
     * that ad not show?" should not be disabled because of a misattributed
     * sighting; the governor refuses silently by design, so from inside a game
     * this question cannot be answered any other way.
     *
     * Still DEBUG-only via [attach], so it cannot reach a release build.
     */
    private const val ENABLED = true

    private var attached = false
    private var label: TextView? = null
    private val handler = Handler(Looper.getMainLooper())

    private val tick = object : Runnable {
        override fun run() {
            update()
            handler.postDelayed(this, TICK_MS)
        }
    }

    /** Adds the badge over [activity]'s content view. Safe to call repeatedly. */
    fun attach(activity: Activity) {
        if (!ENABLED) return
        if (!com.redundantstudios.arcade.BuildConfig.DEBUG) return
        if (attached) { update(); return }
        val root = activity.findViewById<ViewGroup>(android.R.id.content) ?: return
        if (activity.isFinishing || activity.isDestroyed) return

        val tv = TextView(activity)
        tv.text = "AD ?"
        tv.setTextColor(Color.parseColor("#8FE3FF"))
        tv.setTextSize(TypedValue.COMPLEX_UNIT_SP, 10f)
        tv.gravity = Gravity.CENTER
        tv.setPadding(dp(activity, 9), dp(activity, 5), dp(activity, 9), dp(activity, 5))
        tv.background = GradientDrawable().apply {
            cornerRadius = dp(activity, 8).toFloat()
            setColor(Color.parseColor("#E60A0D14"))
            setStroke(dp(activity, 1), Color.parseColor("#8FE3FF"))
        }
        // Never intercept a tap: this is an overlay on top of the game.
        tv.isClickable = false
        tv.isFocusable = false

        val lp = FrameLayout.LayoutParams(
            ViewGroup.LayoutParams.WRAP_CONTENT,
            ViewGroup.LayoutParams.WRAP_CONTENT,
            Gravity.BOTTOM or Gravity.START
        )
        lp.leftMargin = dp(activity, 12)
        lp.bottomMargin = dp(activity, 26)

        (root as? FrameLayout)?.addView(tv, lp)
            ?: root.addView(tv, lp)

        label = tv
        attached = true
        update()
        handler.postDelayed(tick, TICK_MS)
    }

    /** Stops the badge when leaving the screen. */
    fun detach() {
        handler.removeCallbacks(tick)
        label?.let { (it.parent as? ViewGroup)?.removeView(it) }
        label = null
        attached = false
    }

    private fun update() {
        val tv = label ?: return
        val left = AdPolicy.interstitialCooldownRemainingMs() / 1000L
        if (left > 0L) {
            tv.text = "AD IN ${left}s"
            tv.setTextColor(Color.parseColor("#8FE3FF"))
        } else {
            tv.text = "AD READY"
            tv.setTextColor(Color.parseColor("#7DFFA8"))
        }
    }

    private fun dp(activity: Activity, value: Int): Int = (value * activity.resources.displayMetrics.density).toInt()
}