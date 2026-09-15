package com.redundantstudios.arcade.ui

import android.graphics.Color
import android.view.LayoutInflater
import android.view.MotionEvent
import android.view.animation.ScaleAnimation
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView
import com.google.android.material.card.MaterialCardView
import com.redundantstudios.arcade.R
import com.redundantstudios.arcade.model.GameMode

class ModeAdapter(
    private val modes: List<GameMode>,
    private val onModeClick: (GameMode) -> Unit
) : RecyclerView.Adapter<ModeAdapter.ModeViewHolder>() {

    class ModeViewHolder(view: View) : RecyclerView.ViewHolder(view) {
        val card: MaterialCardView = view.findViewById(R.id.modeCard)
        val number: TextView = view.findViewById(R.id.modeNumber)
        val label: TextView = view.findViewById(R.id.modeLabel)
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ModeViewHolder {
        val view = LayoutInflater.from(parent.context).inflate(R.layout.item_mode_card, parent, false)
        return ModeViewHolder(view)
    }

    override fun onBindViewHolder(holder: ModeViewHolder, position: Int) {
        val mode = modes[position]
        holder.number.text = mode.playerCount.toString()
        holder.label.text = "${mode.playerCount} PLAYER"
        holder.card.setCardBackgroundColor(Color.parseColor(mode.color))

        holder.itemView.setOnClickListener {
            onModeClick(mode)
        }

        holder.itemView.post {
            val w = holder.itemView.width
            val h = holder.itemView.height
            android.util.Log.d("ModeAdapter", "modeCard w=$w h=$h")
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
}
