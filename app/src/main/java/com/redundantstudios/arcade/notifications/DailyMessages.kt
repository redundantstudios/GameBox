package com.redundantstudios.arcade.notifications

import android.content.Context
import com.redundantstudios.arcade.R

/**
 * The ten daily notifications, read from the arrays in
 * `res/values/strings_update.xml`.
 *
 * The copy lives in XML on purpose: someone who writes the words should not
 * have to open a Kotlin file, and a build should fail loudly if the two
 * arrays ever fall out of step.
 */
object DailyMessages {

    data class Message(
        val title: String,
        val body: String,
        /** Deep-link route, same grammar as MainActivity.EXTRA_NOTIF_ROUTE. */
        val route: String = "home"
    )

    /**
     * Built once per process. Titles and bodies are matched by position, so a
     * missing body falls back to an empty string rather than silently pairing
     * message 3's title with message 7's body.
     */
    private var cached: List<Message>? = null

    fun all(context: Context): List<Message> {
        cached?.let { return it }
        val titles = context.resources.getStringArray(R.array.daily_msg_titles)
        val bodies = context.resources.getStringArray(R.array.daily_msg_bodies)
        val size = maxOf(titles.size, bodies.size)
        val list = (0 until size).map { i ->
            Message(
                title = titles.getOrElse(i) { "" },
                body = bodies.getOrElse(i) { "" }
            )
        }.filter { it.title.isNotBlank() }
        cached = list
        return list
    }
}