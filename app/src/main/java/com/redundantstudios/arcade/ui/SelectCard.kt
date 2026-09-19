package com.redundantstudios.arcade.ui

import android.content.Context
import android.graphics.Canvas
import android.graphics.Paint
import android.graphics.Path
import android.graphics.RectF
import android.util.AttributeSet
import android.view.Gravity
import android.view.View
import android.widget.Checkable
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.TextView
import androidx.core.content.ContextCompat
import com.redundantstudios.arcade.R

/**
 * Design--ref "select" option card (see design 3 — GAME MODE / SELECT PLAYERS /
 * CARDS rows).
 *
 *  - idle      : soft beige fill, deep-brown bold text
 *  - selected  : green fill, white bold text, green circle + white tick badge
 *                pinned to the top-right corner
 *
 * Because it replaces stock radio buttons and switches, it is also a real
 * [android.widget.Checkable], so it can be used exactly like them.
 */
class SelectCard @JvmOverloads constructor(
    context: Context,
    attrs: AttributeSet? = null,
    defStyleAttr: Int = 0
) : FrameLayout(context, attrs, defStyleAttr), Checkable {

    private val fillPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { style = Paint.Style.FILL }
    private val badgePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { style = Paint.Style.FILL }
    private val tickPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.STROKE
        strokeCap = Paint.Cap.ROUND
        strokeJoin = Paint.Join.ROUND
    }
    private val rect = RectF()
    private val tickPath = Path()

    private val density = resources.displayMetrics.density
    private fun dp(value: Float) = value * density

    private val radius = dp(16f)
    private val badgeRadius = dp(13f)
    private var badgeCx = 0f
    private var badgeCy = 0f

    private val mainText = TextView(context).apply {
        gravity = Gravity.CENTER
        setTextColor(ContextCompat.getColor(context, R.color.select_idle_text))
        textSize = 17f
        setTypeface(typeface, android.graphics.Typeface.BOLD)
        letterSpacing = 0.04f
        isAllCaps = true
    }

    private val subText = TextView(context).apply {
        gravity = Gravity.CENTER
        setTextColor(ContextCompat.getColor(context, R.color.select_idle_text))
        textSize = 10f
        setTypeface(typeface, android.graphics.Typeface.BOLD)
        letterSpacing = 0.06f
        isAllCaps = true
        alpha = 0.85f
    }

    private var checkedState = false

    var onCheckedChanged: ((Boolean) -> Unit)? = null

    init {
        setWillNotDraw(false)

        val a = context.obtainStyledAttributes(attrs, R.styleable.SelectCard)
        val text = a.getString(R.styleable.SelectCard_scText)
        val sub = a.getString(R.styleable.SelectCard_scSubText)
        a.recycle()

        if (!text.isNullOrEmpty()) mainText.text = text
        if (!sub.isNullOrEmpty()) {
            subText.text = sub
            subText.visibility = View.VISIBLE
        } else {
            subText.visibility = View.GONE
        }

        val column = LinearLayout(context).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER
            addView(mainText, LayoutParams(LayoutParams.WRAP_CONTENT, LayoutParams.WRAP_CONTENT))
            addView(subText, LayoutParams(LayoutParams.WRAP_CONTENT, LayoutParams.WRAP_CONTENT))
        }
        addView(column, LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT))

        minimumHeight = dp(64f).toInt()
        isClickable = true
        isFocusable = true
        refreshColors()
    }

    override fun setChecked(checked: Boolean) {
        if (checkedState == checked) return
        checkedState = checked
        refreshColors()
        invalidate()
        onCheckedChanged?.invoke(checked)
    }

    override fun isChecked(): Boolean = checkedState

    override fun toggle() = setChecked(!checkedState)

    private fun refreshColors() {
        val fill = if (checkedState) R.color.select_checked_fill else R.color.select_idle_fill
        val ink = if (checkedState) R.color.select_checked_text else R.color.select_idle_text
        fillPaint.color = ContextCompat.getColor(context, fill)
        mainText.setTextColor(ContextCompat.getColor(context, ink))
        subText.setTextColor(ContextCompat.getColor(context, ink))
        setOnClickListener { toggle() }
    }

    override fun onSizeChanged(w: Int, h: Int, oldw: Int, oldh: Int) {
        super.onSizeChanged(w, h, oldw, oldh)
        badgeCx = w - badgeRadius * 0.75f
        badgeCy = badgeRadius * 0.75f
    }

    override fun draw(canvas: Canvas) {
        val w = width.toFloat()
        val h = height.toFloat()

        rect.set(0f, 0f, w, h)
        canvas.drawRoundRect(rect, radius, radius, fillPaint)

        super.draw(canvas)

        if (checkedState) {
            badgePaint.color = ContextCompat.getColor(context, R.color.select_badge)
            canvas.drawCircle(badgeCx, badgeCy, badgeRadius, badgePaint)

            tickPaint.color = ContextCompat.getColor(context, R.color.white)
            tickPaint.strokeWidth = dp(2.6f)

            val r = badgeRadius
            tickPath.reset()
            tickPath.moveTo(badgeCx - r * 0.45f, badgeCy + r * 0.02f)
            tickPath.lineTo(badgeCx - r * 0.12f, badgeCy + r * 0.38f)
            tickPath.lineTo(badgeCx + r * 0.48f, badgeCy - r * 0.32f)
            canvas.drawPath(tickPath, tickPaint)
        }
    }
}
