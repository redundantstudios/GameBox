package com.redundantstudios.arcade.ui

import android.graphics.Color
import android.view.LayoutInflater
import android.view.MotionEvent
import android.view.animation.ScaleAnimation
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.core.content.ContextCompat
import androidx.recyclerview.widget.RecyclerView
import com.redundantstudios.arcade.R
import com.redundantstudios.arcade.audio.ShellAudio
import com.redundantstudios.arcade.model.ESTABLISHED_GAME_IDS
import com.redundantstudios.arcade.model.GameManifest
import com.redundantstudios.arcade.util.GameSeenStore

class GameAdapter(
    private val games: List<GameManifest>,
    private val onGameClick: (GameManifest) -> Unit,
    /**
     * True on the PARTY GAMES page. Party tiles carry NO "NP" badge: they are
     * the pass-the-phone crowd, they are deliberately not bucketed by player
     * count (they have their own tile on Home), and a "10P"/"5P" tag on them
     * reads as a rule the game does not have. The NEW badge is unaffected.
     */
    private val hidePlayerTag: Boolean = false
) : RecyclerView.Adapter<GameAdapter.GameViewHolder>() {

    class GameViewHolder(view: View) : RecyclerView.ViewHolder(view) {
        val tileRoot: ChunkyCardView = view.findViewById(R.id.tileRoot)
        val title: TextView = view.findViewById(R.id.gameTitle)
        val players: TextView = view.findViewById(R.id.playersBadge)
        val newBadge: TextView = view.findViewById(R.id.newBadge)
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): GameViewHolder {
        val view = LayoutInflater.from(parent.context).inflate(R.layout.item_game_tile, parent, false)
        return GameViewHolder(view)
    }

    override fun onBindViewHolder(holder: GameViewHolder, position: Int) {
        val game = games[position]
        holder.title.text = game.title
        holder.players.text = "${game.maxPlayers}P"
        holder.players.visibility = if (hidePlayerTag) View.GONE else View.VISIBLE
        holder.tileRoot.cardColor = tileColor(game.tileColor)

        /* Established games never wear the tag (see ESTABLISHED_GAME_IDS);
           everything else falls to the normal first-seen window. */
        holder.newBadge.visibility = if (
            game.id !in ESTABLISHED_GAME_IDS && GameSeenStore.isNew(holder.itemView.context, game.id)
        ) {
            View.VISIBLE
        } else {
            View.GONE
        }
        // Tile artwork, generated from the game file by _gen_tiles.py and looked
        // up by name (see util.resName convention in that script). When a game has
        // no artwork yet the tile keeps its flat manifest colour and the title
        // text becomes the label.
        val artId = holder.itemView.resources.getIdentifier(
            "tile_${game.id.lowercase().replace('-', '_')}", "drawable",
            holder.itemView.context.packageName
        )
        if (artId != 0) {
            /* The card draws its own art, clipped to its rounded body and stroked
               over by the border - so no hairline or corner sliver can appear. */
            holder.tileRoot.artDrawable =
                ContextCompat.getDrawable(holder.itemView.context, artId)
            /* The artwork already carries the game's name/logo — no overlay text. */
            holder.title.visibility = View.GONE
        } else {
            holder.tileRoot.artDrawable = null
            holder.title.visibility = View.VISIBLE
        }

        holder.itemView.setOnClickListener {
            ShellAudio.tap(it.context)
            onGameClick(game)
        }

        holder.itemView.post {
            val w = holder.itemView.width
            if (w > 0) {
                holder.itemView.layoutParams.height = w // 1:1 square — big and fills the layout
                holder.itemView.requestLayout()
            }
            android.util.Log.d("GameAdapter", "gameTile w=$w h=${holder.itemView.height}")
        }

        // Press animation: scale 0.93 snap
        holder.itemView.setOnTouchListener { v, event ->
            when (event.action) {
                MotionEvent.ACTION_DOWN -> {
                    v.startAnimation(ScaleAnimation(
                        1.0f, 0.93f, 1.0f, 0.93f,
                        android.view.animation.Animation.RELATIVE_TO_SELF, 0.5f,
                        android.view.animation.Animation.RELATIVE_TO_SELF, 0.5f
                    ).apply {
                        duration = 200
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
                        duration = 200
                        fillAfter = true
                    })
                    false
                }
                else -> false
            }
        }
    }

    private fun tileColor(value: String): Int {
        return when (value.trim().lowercase()) {
            "fuse-red" -> Color.rgb(217, 75, 75)
            "sky-blue" -> Color.rgb(142, 205, 232)
            else -> try {
                Color.parseColor(value.trim())
            } catch (_: IllegalArgumentException) {
                Color.rgb(42, 42, 42)
            }
        }
    }

    override fun getItemCount(): Int = games.size

}
