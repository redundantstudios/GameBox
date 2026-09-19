package com.redundantstudios.arcade.ui

import android.content.Context
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.ColorFilter
import android.graphics.LinearGradient
import android.graphics.Paint
import android.graphics.Path
import android.graphics.PixelFormat
import android.graphics.Rect
import android.graphics.RectF
import android.graphics.Shader
import android.graphics.drawable.Drawable
import android.util.AttributeSet
import androidx.core.content.ContextCompat
import com.redundantstudios.arcade.R
import kotlin.math.cos
import kotlin.math.sin

/**
 * The Design--ref page background: a warm vertical gradient, a faint dot grid,
 * and a few translucent "floating" cards with little glyphs (star / heart /
 * diamond / flower) tilted at the corners — the playful decoration from
 * design 1 and design 4.
 *
 * All colours come from theme attributes, so light and dark both look right.
 * It is a static drawable (no animation) to stay battery friendly.
 */
class ShellBackgroundDrawable @JvmOverloads constructor(
    private val context: Context? = null,
    attrs: AttributeSet? = null
) : Drawable() {

    private val fillPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { style = Paint.Style.FILL }
    private val strokePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { style = Paint.Style.STROKE }
    private val glyphPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { style = Paint.Style.FILL }
    private val cardRect = RectF()
    private val glyphPath = Path()

    private val density = context?.resources?.displayMetrics?.density ?: 1f
    private fun dp(value: Float) = value * density

    private var gradient: LinearGradient? = null

    private val colorTop = color(R.color.studio_bg_top, 0xFFFFFBF0.toInt())
    private val colorBottom = color(R.color.studio_bg_bottom, 0xFFFBE2C2.toInt())
    private val colorDot = color(R.color.studio_bg_dot, 0xFFD8C6A4.toInt())
    private val colorCard = color(R.color.studio_bg_card, 0xA6FFFFFF.toInt())
    private val colorCardBorder = color(R.color.studio_bg_card_border, 0x59100000)
    private val colorGlyph = color(R.color.studio_bg_glyph, 0x59FF9800)

    private fun color(id: Int, fallback: Int): Int =
        if (context != null) ContextCompat.getColor(context, id) else fallback

    /**
     * Decorative cards positioned as fractions of the canvas so the layout
     * looks identical on every screen size. [glyph] picks the symbol.
     */
    private data class FloatCard(
        val xF: Float,
        val yF: Float,
        val sizeF: Float,
        val rotation: Float,
        val glyph: Int
    )

    private val cards = listOf(
        FloatCard(0.13f, 0.10f, 0.13f, -16f, GLYPH_STAR),
        FloatCard(0.87f, 0.14f, 0.14f, 14f, GLYPH_HEART),
        FloatCard(0.09f, 0.46f, 0.11f, -10f, GLYPH_DIAMOND),
        FloatCard(0.91f, 0.55f, 0.12f, 12f, GLYPH_FLOWER),
        FloatCard(0.15f, 0.84f, 0.13f, 15f, GLYPH_STAR),
        FloatCard(0.85f, 0.88f, 0.12f, -13f, GLYPH_DIAMOND)
    )

    override fun onBoundsChange(bounds: Rect) {
        gradient = LinearGradient(
            0f, bounds.top.toFloat(), 0f, bounds.bottom.toFloat(),
            colorTop, colorBottom, Shader.TileMode.CLAMP
        )
    }

    override fun draw(canvas: Canvas) {
        val b = bounds
        if (b.isEmpty) return

        fillPaint.shader = gradient
        fillPaint.color = Color.WHITE
        canvas.drawRect(b, fillPaint)
        fillPaint.shader = null

        drawDotGrid(canvas, b)
        drawFloatingCards(canvas, b)
    }

    private fun drawDotGrid(canvas: Canvas, b: android.graphics.Rect) {
        val spacing = dp(30f)
        val radius = dp(1.6f)
        fillPaint.color = colorDot
        fillPaint.alpha = 170

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

    private fun drawFloatingCards(canvas: Canvas, b: android.graphics.Rect) {
        val base = minOf(b.width(), b.height()).toFloat()

        cards.forEach { card ->
            val size = base * card.sizeF
            val cx = b.left + b.width() * card.xF
            val cy = b.top + b.height() * card.yF
            val left = cx - size / 2f
            val top = cy - size / 2f

            canvas.save()
            canvas.rotate(card.rotation, cx, cy)

            cardRect.set(left, top, left + size, top + size)

            fillPaint.color = colorCard
            canvas.drawRoundRect(cardRect, size * 0.22f, size * 0.22f, fillPaint)

            strokePaint.color = colorCardBorder
            strokePaint.strokeWidth = dp(1.5f)
            canvas.drawRoundRect(cardRect, size * 0.22f, size * 0.22f, strokePaint)

            glyphPaint.color = colorGlyph
            drawGlyph(canvas, card.glyph, cx, cy, size * 0.30f)

            canvas.restore()
        }
    }

    private fun drawGlyph(canvas: Canvas, glyph: Int, cx: Float, cy: Float, r: Float) {
        glyphPath.reset()
        when (glyph) {
            GLYPH_STAR -> buildStar(glyphPath, cx, cy, r, r * 0.45f)
            GLYPH_HEART -> buildHeart(glyphPath, cx, cy, r)
            GLYPH_DIAMOND -> {
                glyphPath.moveTo(cx, cy - r)
                glyphPath.lineTo(cx + r * 0.78f, cy)
                glyphPath.lineTo(cx, cy + r)
                glyphPath.lineTo(cx - r * 0.78f, cy)
                glyphPath.close()
            }
            GLYPH_FLOWER -> {
                val petal = r * 0.46f
                for (i in 0 until 5) {
                    val a = Math.toRadians((i * 72 - 90).toDouble())
                    val px = cx + (r * 0.52f * cos(a)).toFloat()
                    val py = cy + (r * 0.52f * sin(a)).toFloat()
                    glyphPath.addCircle(px, py, petal, Path.Direction.CW)
                }
                glyphPath.addCircle(cx, cy, petal * 0.62f, Path.Direction.CW)
            }
        }
        canvas.drawPath(glyphPath, glyphPaint)
    }

    private fun buildStar(path: Path, cx: Float, cy: Float, outer: Float, inner: Float) {
        for (i in 0 until 10) {
            val radius = if (i % 2 == 0) outer else inner
            val angle = Math.toRadians((i * 36 - 90).toDouble())
            val x = cx + (radius * cos(angle)).toFloat()
            val y = cy + (radius * sin(angle)).toFloat()
            if (i == 0) path.moveTo(x, y) else path.lineTo(x, y)
        }
        path.close()
    }

    private fun buildHeart(path: Path, cx: Float, cy: Float, r: Float) {
        val w = r * 0.9f
        val h = r * 0.9f
        path.moveTo(cx, cy + h * 0.85f)
        path.cubicTo(
            cx - w * 1.5f, cy - h * 0.2f,
            cx - w * 0.55f, cy - h * 1.15f,
            cx, cy - h * 0.35f
        )
        path.cubicTo(
            cx + w * 0.55f, cy - h * 1.15f,
            cx + w * 1.5f, cy - h * 0.2f,
            cx, cy + h * 0.85f
        )
        path.close()
    }

    override fun setAlpha(alpha: Int) {
        fillPaint.alpha = alpha
        strokePaint.alpha = alpha
        glyphPaint.alpha = alpha
        invalidateSelf()
    }

    override fun setColorFilter(colorFilter: ColorFilter?) {
        fillPaint.colorFilter = colorFilter
        strokePaint.colorFilter = colorFilter
        glyphPaint.colorFilter = colorFilter
        invalidateSelf()
    }

    @Deprecated("Deprecated in Drawable, still required by the platform.")
    override fun getOpacity(): Int = PixelFormat.OPAQUE

    companion object {
        private const val GLYPH_STAR = 0
        private const val GLYPH_HEART = 1
        private const val GLYPH_DIAMOND = 2
        private const val GLYPH_FLOWER = 3
    }
}