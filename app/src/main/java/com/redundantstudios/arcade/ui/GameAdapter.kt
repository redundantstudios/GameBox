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
import com.google.android.material.card.MaterialCardView
import com.redundantstudios.arcade.R
import com.redundantstudios.arcade.model.GameManifest

class GameAdapter(
    private val games: List<GameManifest>,
    private val onGameClick: (GameManifest) -> Unit
) : RecyclerView.Adapter<GameAdapter.GameViewHolder>() {

    class GameViewHolder(view: View) : RecyclerView.ViewHolder(view) {
        val tileRoot: MaterialCardView = view.findViewById(R.id.tileRoot)
        val title: TextView = view.findViewById(R.id.gameTitle)
        val players: TextView = view.findViewById(R.id.playersBadge)
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): GameViewHolder {
        val view = LayoutInflater.from(parent.context).inflate(R.layout.item_game_tile, parent, false)
        return GameViewHolder(view)
    }

    override fun onBindViewHolder(holder: GameViewHolder, position: Int) {
        val game = games[position]
        holder.title.text = game.title
        holder.players.text = "${game.maxPlayers}P"
        holder.tileRoot.setCardBackgroundColor(Color.parseColor(game.tileColor))

        holder.itemView.setOnClickListener {
            onGameClick(game)
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

    override fun getItemCount(): Int = games.size
}
