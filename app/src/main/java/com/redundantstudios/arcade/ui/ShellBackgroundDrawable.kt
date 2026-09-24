package com.redundantstudios.arcade.ui

import android.content.Context
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.ColorFilter
import android.graphics.LinearGradient
import android.graphics.Paint
import android.graphics.PixelFormat
import android.graphics.RadialGradient
import android.graphics.Rect
import android.graphics.Shader
import android.graphics.drawable.Drawable
import android.util.AttributeSet
import androidx.core.content.ContextCompat
import com.redundantstudios.arcade.R

/**
 * Ambient page background for the shell.
 *
 * IMPORTANT: build this with an **Activity** context, never from a layout
 * (`android:background="@drawable/..."`). A drawable inflated from XML gets the
 * application context, which does not carry AppCompat's night-mode override, so
 * the page would keep its light gradient in dark mode. Use
 * `ThemedActivity.applyShellBackground()` instead.
 *
 * Five calm layers, all texture-only — nothing here should ever read as a
 * tappable card:
 *  1. a warm vertical gradient,
 *  2. a soft light bloom in the top-left corner,
 *  3. a very faint dot grid,
 *  4. thin concentric "ripple" arcs anchored to the bottom-right corner,
 *  5. a scattering of tiny accent specks.
 *
 * Every decoration stays between roughly 5% and 12% alpha so page content
 * always wins the contrast fight. It is a static drawable (no animation) to
 * stay battery friendly, and all colours come from the theme so light and dark
 * both resolve correctly.
 */
class ShellBackgroundDrawable @JvmOverloads constructor(
    private val context: Context? = null,
    attrs: AttributeSet? = null
) : Drawable() {

    private val fillPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { style = Paint.Style.FILL }
    private val strokePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { style = Paint.Style.STROKE }

    private val density = context?.resources?.displayMetrics?.density ?: 1f
    private fun dp(value: Float) = value * density

    private var gradient: LinearGradient? = null
    private var glow: RadialGradient? = null

    private val colorTop = color(R.color.studio_bg_top, 0xFFFFFBF0.toInt())
    private val colorBottom = color(R.color.studio_bg_bottom, 0xFFFBE2C2.toInt())
    private val colorDot = color(R.color.studio_bg_dot, 0xFFD8C6A4.toInt())
    private val colorGlow = color(R.color.studio_bg_glow, 0xFFFFF4DC.toInt())
    private val colorArc = color(R.color.studio_bg_arc, 0xFF8D6E63.toInt())

    /** Tiny specks reuse the studio accents so the page feels branded, not random. */
    private val specks = intArrayOf(
        color(R.color.studio_accent, 0xFFFF9800.toInt()),
        color(R.color.studio_primary, 0xFF4CAF50.toInt()),
        color(R.color.studio_secondary, 0xFF5C6BC0.toInt()),
        color(R.color.studio_gold, 0xFFFFD75E.toInt())
    )

    private fun color(id: Int, fallback: Int): Int =
        if (context != null) ContextCompat.getColor(context, id) else fallback

    private fun withAlpha(color: Int, fraction: Float): Int = Color.argb(
        (Color.alpha(color) * fraction).toInt().coerceIn(0, 255),
        Color.red(color),
        Color.green(color),
        Color.blue(color)
    )

    /**
     * A decorative speck, positioned as a fraction of the canvas so the feel is
     * identical on every screen size. [size] is a fraction of the shortest side.
     */
    private data class Speck(
        val xF: Float,
        val yF: Float,
        val sizeF: Float,
        val colorIndex: Int
    )

    private val speckLayout = listOf(
        Speck(0.06f, 0.22f, 0.009f, 0),
        Speck(0.20f, 0.62f, 0.007f, 2),
        Speck(0.32f, 0.11f, 0.006f, 3),
        Speck(0.46f, 0.42f, 0.005f, 3),
        Speck(0.52f, 0.80f, 0.008f, 1),
        Speck(0.68f, 0.33f, 0.006f, 0),
        Speck(0.82f, 0.64f, 0.009f, 2),
        Speck(0.94f, 0.28f, 0.007f, 1),
        Speck(0.74f, 0.93f, 0.007f, 0),
        Speck(0.12f, 0.88f, 0.006f, 1)
    )

    override fun onBoundsChange(bounds: Rect) {
        gradient = LinearGradient(
            0f, bounds.top.toFloat(), 0f, bounds.bottom.toFloat(),
            colorTop, colorBottom, Shader.TileMode.CLAMP
        )

        // A wide, off-canvas bloom in the top-left corner: a light source, not a shape.
        val span = maxOf(bounds.width(), bounds.height()).toFloat()
        glow = RadialGradient(
            bounds.left + bounds.width() * 0.10f,
            bounds.top + bounds.height() * 0.01f,
            span * 0.78f,
            intArrayOf(withAlpha(colorGlow, 1f), withAlpha(colorGlow, 0f)),
            floatArrayOf(0f, 1f),
            Shader.TileMode.CLAMP
        )
    }

    override fun draw(canvas: Canvas) {
        val b = bounds
        if (b.isEmpty) return

        fillPaint.shader = gradient
        fillPaint.alpha = 255
        canvas.drawRect(b, fillPaint)

        fillPaint.shader = glow
        canvas.drawRect(b, fillPaint)
        fillPaint.shader = null

        drawDotGrid(canvas, b)
        drawRipples(canvas, b)
        drawSpecks(canvas, b)
    }

    /** Faint dot grid: the "graph paper" texture under everything else. */
    private fun drawDotGrid(canvas: Canvas, b: Rect) {
        val spacing = dp(30f)
        val radius = dp(1.3f)
        fillPaint.color = colorDot
        fillPaint.alpha = 120

        var y = b.top + spacing / 2f
        while (y < b.bottom) {
            var x = b.left + spacing / 2f
            while (x < b.right) {
                canvas.drawCircle(x, y, radius, fillPaint)
                x += spacing
            }
            y += spacing
        }
        fillPaint.alpha = 255
    }

    /** Thin concentric arcs from the bottom-right corner — a soft "ripple" motif. */
    private fun drawRipples(canvas: Canvas, b: Rect) {
        val cx = b.right.toFloat()
        val cy = b.bottom.toFloat()
        val unit = b.width().toFloat()

        strokePaint.style = Paint.Style.STROKE
        strokePaint.strokeWidth = dp(1.2f)
        strokePaint.color = colorArc
        strokePaint.alpha = 30

        for (i in 1..3) {
            canvas.drawCircle(cx, cy, unit * (0.46f + i * 0.18f), strokePaint)
        }

        strokePaint.alpha = 255
        strokePaint.style = Paint.Style.FILL
    }

    /** A handful of tiny accent specks for a bit of playfulness. */
    private fun drawSpecks(canvas: Canvas, b: Rect) {
        val base = minOf(b.width(), b.height()).toFloat()

        speckLayout.forEachIndexed { index, speck ->
            fillPaint.color = specks[speck.colorIndex]
            fillPaint.alpha = 34 + (index % 3) * 10
            canvas.drawCircle(
                b.left + b.width() * speck.xF,
                b.top + b.height() * speck.yF,
                base * speck.sizeF,
                fillPaint
            )
        }
        fillPaint.alpha = 255
    }

    override fun setAlpha(alpha: Int) {
        fillPaint.alpha = alpha
        strokePaint.alpha = alpha
        invalidateSelf()
    }

    override fun setColorFilter(colorFilter: ColorFilter?) {
        fillPaint.colorFilter = colorFilter
        strokePaint.colorFilter = colorFilter
        invalidateSelf()
    }

    @Deprecated("Deprecated in Drawable, still required by the platform.")
    override fun getOpacity(): Int = PixelFormat.OPAQUE
}
