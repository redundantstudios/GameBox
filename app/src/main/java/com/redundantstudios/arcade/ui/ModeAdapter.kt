package com.redundantstudios.arcade.ui

import android.graphics.Color
import android.view.LayoutInflater
import android.view.MotionEvent
import android.view.animation.ScaleAnimation
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView
import com.redundantstudios.arcade.R
import com.redundantstudios.arcade.audio.ShellAudio
import com.redundantstudios.arcade.model.GameMode

class ModeAdapter(
    private var modes: List<GameMode>,
    private val onModeClick: (GameMode) -> Unit
) : RecyclerView.Adapter<ModeAdapter.ModeViewHolder>() {

    class ModeViewHolder(view: View) : RecyclerView.ViewHolder(view) {
        val card: ChunkyCardView = view.findViewById(R.id.modeCard)
        val number: TextView = view.findViewById(R.id.modeNumber)
        val label: TextView = view.findViewById(R.id.modeLabel)
        val gameCount: TextView = view.findViewById(R.id.modeGameCount)
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ModeViewHolder {
        val view = LayoutInflater.from(parent.context).inflate(R.layout.item_mode_card, parent, false)
        return ModeViewHolder(view)
    }

    override fun onBindViewHolder(holder: ModeViewHolder, position: Int) {
        val mode = modes[position]
        holder.number.text = mode.playerCount.toString()
        holder.label.text = holder.itemView.context.resources.getQuantityString(R.plurals.player_count, mode.playerCount, mode.playerCount)
        holder.gameCount.text = holder.itemView.context.resources.getQuantityString(R.plurals.game_count, mode.gameCount, mode.gameCount)
        holder.card.cardColor = Color.parseColor(mode.color)

        holder.itemView.setOnClickListener {
            ShellAudio.tap(it.context)
            android.util.Log.d("ModeAdapter", "Mode card clicked: ${mode.playerCount}P")
            onModeClick(mode)
        }

        holder.itemView.post {
            val w = holder.itemView.width
            if (w > 0) {
                holder.itemView.layoutParams.height = (w * 1).toInt() // 1:1 ratio
                holder.itemView.requestLayout()
            }
            android.util.Log.d("ModeAdapter", "modeCard w=$w h=${holder.itemView.height}")
        }

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

    override fun getItemCount(): Int = modes.size

    fun updateModes(newModes: List<GameMode>) {
        modes = newModes
        notifyDataSetChanged()
    }
}
