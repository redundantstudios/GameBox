package com.redundantstudios.arcade.ui

import android.content.Context
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Path
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
    private val overlayPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { style = Paint.Style.FILL }
    private val fillRect = RectF()
    private val borderRect = RectF()
    private val bodyPath = Path()

    /** 0 = idle, >0 = pressed overlay alpha. */
    private var pressedAlpha = 0

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
        val r = cornerRadius
        val bodyW = width - shadowOffset
        val bodyH = height - shadowOffset

        // 1. Hard shadow = the exact card shape, translated by the offset, so it
        //    can never leave a seam or leak the card colour between the border
        //    and the shadow.
        if (shadowOffset > 0f) {
            canvas.save()
            canvas.translate(shadowOffset, shadowOffset)
            fillRect.set(0f, 0f, bodyW, bodyH)
            fillPaint.color = shadowColor
            canvas.drawRoundRect(fillRect, r, r, fillPaint)
            canvas.restore()
        }

        // 2. Card body fill.
        fillRect.set(0f, 0f, bodyW, bodyH)
        fillPaint.color = cardColor
        canvas.drawRoundRect(fillRect, r, r, fillPaint)

        // 2b. Press feedback, clipped to the rounded body so it can never spill
        //     into the shadow band the way a rectangular ripple does.
        if (pressedAlpha > 0) {
            bodyPath.reset()
            bodyPath.addRoundRect(fillRect, r, r, Path.Direction.CW)
            val checkpoint = canvas.save()
            canvas.clipPath(bodyPath)
            overlayPaint.color = Color.BLACK
            overlayPaint.alpha = pressedAlpha
            canvas.drawRect(fillRect, overlayPaint)
            canvas.restoreToCount(checkpoint)
        }

        // 3. Children on top of the fill.
        super.draw(canvas)

        // 4. Border drawn INSIDE the body edge (radius shrunk by half the stroke)
        //    so the stroke sits fully within the shape.
        val half = borderWidth / 2f
        borderRect.set(half, half, bodyW - half, bodyH - half)
        strokePaint.strokeWidth = borderWidth
        strokePaint.color = borderColor
        canvas.drawRoundRect(borderRect, r - half, r - half, strokePaint)
    }

    /** Instant press feedback so tappable cards feel alive without a ripple. */
    override fun drawableStateChanged() {
        super.drawableStateChanged()
        val target = if (isPressed) PRESSED_ALPHA else 0
        if (target != pressedAlpha) {
            pressedAlpha = target
            invalidate()
        }
    }

    private companion object {
        /** Overlay alpha applied over the card body while pressed. */
        const val PRESSED_ALPHA = 26
    }
}
