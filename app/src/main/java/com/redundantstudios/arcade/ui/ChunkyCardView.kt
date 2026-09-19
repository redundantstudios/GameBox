package com.redundantstudios.arcade.ui

import android.content.Context
import android.graphics.Canvas
import android.graphics.Paint
import android.graphics.RectF
import android.util.AttributeSet
import android.widget.FrameLayout
import androidx.core.content.ContextCompat
import com.redundantstudios.arcade.R

/**
 * The Design--ref card/button look: a solid fill, a thick dark border and a
 * HARD (unblurred) offset shadow underneath — the chunky 3D style used across
 * every design reference screenshot.
 *
 * Draw order is fill -> children -> border so children can never cover the
 * border, and the shadow sits behind everything (offset down/right).
 */
class ChunkyCardView @JvmOverloads constructor(
    context: Context,
    attrs: AttributeSet? = null,
    defStyleAttr: Int = 0
) : FrameLayout(context, attrs, defStyleAttr) {

    private val fillPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { style = Paint.Style.FILL }
    private val strokePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { style = Paint.Style.STROKE }
    private val fillRect = RectF()
    private val borderRect = RectF()
    private val shadowRect = RectF()

    private val density = resources.displayMetrics.density
    private fun dp(value: Float) = value * density

    /** Fill colour of the card body. */
    var cardColor: Int = ContextCompat.getColor(context, R.color.studio_surface)
        set(value) {
            field = value
            invalidate()
        }

    var borderColor: Int = ContextCompat.getColor(context, R.color.studio_border_dark)

    var shadowColor: Int = ContextCompat.getColor(context, R.color.studio_border_dark)

    var cornerRadius: Float = dp(20f)

    var borderWidth: Float = dp(3f)

    var shadowOffset: Float = dp(5f)

    private var shadowInsetApplied = false

    init {
        // FrameLayout does not draw itself by default; we do.
        setWillNotDraw(false)

        val a = context.obtainStyledAttributes(attrs, R.styleable.ChunkyCardView)
        cardColor = a.getColor(R.styleable.ChunkyCardView_ccColor, cardColor)
        borderColor = a.getColor(R.styleable.ChunkyCardView_ccBorderColor, borderColor)
        shadowColor = a.getColor(R.styleable.ChunkyCardView_ccShadowColor, shadowColor)
        cornerRadius = a.getDimension(R.styleable.ChunkyCardView_ccCornerRadius, cornerRadius)
        borderWidth = a.getDimension(R.styleable.ChunkyCardView_ccBorderWidth, borderWidth)
        shadowOffset = a.getDimension(R.styleable.ChunkyCardView_ccShadowOffset, shadowOffset)
        a.recycle()

        strokePaint.strokeWidth = borderWidth
        applyShadowInset()
    }

    /**
     * Reserve the shadow band so children never sit on the offset shadow.
     * Any padding that came from XML counts as *content* padding; the shadow
     * band is added on top of it exactly once.
     *
     * NOTE: we deliberately do not override [setPadding] — put content padding
     * on an inner container so it cannot be added twice.
     */
    private fun applyShadowInset() {
        if (shadowInsetApplied) return
        shadowInsetApplied = true
        val inset = shadowOffset.toInt()
        super.setPadding(
            paddingLeft,
            paddingTop,
            paddingRight + inset,
            paddingBottom + inset
        )
        requestLayout()
    }

    override fun draw(canvas: Canvas) {
        val w = width.toFloat()
        val h = height.toFloat()
        val r = cornerRadius

        // 1. Hard offset shadow behind the card body.
        if (shadowOffset > 0f) {
            shadowRect.set(shadowOffset, shadowOffset, w, h)
            fillPaint.color = shadowColor
            canvas.drawRoundRect(shadowRect, r, r, fillPaint)
        }

        // 2. Card body fill.
        fillRect.set(0f, 0f, w - shadowOffset, h - shadowOffset)
        fillPaint.color = cardColor
        canvas.drawRoundRect(fillRect, r, r, fillPaint)

        // 3. Children on top of the fill.
        super.draw(canvas)

        // 4. Border last so nothing can overlap it.
        val half = borderWidth / 2f
        borderRect.set(
            half,
            half,
            w - shadowOffset - half,
            h - shadowOffset - half
        )
        strokePaint.color = borderColor
        canvas.drawRoundRect(borderRect, r, r, strokePaint)
    }
}
