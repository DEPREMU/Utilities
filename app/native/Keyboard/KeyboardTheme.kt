package com.package.name

import android.app.AlertDialog
import android.content.Context
import android.content.SharedPreferences
import android.content.res.Configuration
import android.graphics.Color
import android.graphics.drawable.Drawable
import android.graphics.drawable.GradientDrawable
import android.graphics.drawable.StateListDrawable
import android.os.IBinder
import android.text.Editable
import android.text.TextWatcher
import android.util.LruCache
import android.util.TypedValue
import android.view.WindowManager
import android.view.animation.AccelerateDecelerateInterpolator
import android.view.animation.AccelerateInterpolator
import android.view.animation.BounceInterpolator
import android.view.animation.DecelerateInterpolator
import android.view.animation.Interpolator
import android.view.animation.LinearInterpolator
import android.view.animation.OvershootInterpolator
import android.widget.Button
import android.widget.CheckBox
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.SeekBar
import android.widget.TextView
import androidx.core.content.edit
import androidx.core.graphics.toColorInt
import com.package.name.R

class KeyboardThemeManager(private val context: Context) {

    enum class ThemeMode(val prefValue: String) {
        DARK("dark"),
        LIGHT("light"),
        SYSTEM("system"),
    }

    enum class BackgroundMode(val prefValue: String) {
        TRANSPARENT("transparent"),
        DARK("dark"),
        LIGHT("light"),
        SYSTEM("system"),
    }

    var currentThemeMode: ThemeMode = ThemeMode.SYSTEM
    var currentBackgroundMode: BackgroundMode = BackgroundMode.SYSTEM

    var paletteTextColor: Int = Color.BLACK
    var paletteBackgroundColor: Int = Color.WHITE
    var paletteKeyBackgroundColor: Int = 0
    var paletteAccentColor: Int = 0
    var paletteCapsNeutralColor: Int = 0
    var paletteCapsMediumColor: Int = 0
    var paletteCapsStrongColor: Int = 0
    var paletteCapsStrongTextColor: Int = Color.WHITE

    var cornerRadiusPx: Int = 0

    var fontFamily: String = ""
    var fontStyle: Int = android.graphics.Typeface.NORMAL
    var keyTextSizeSp: Float = 15f
    var suggestionTextSizeSp: Float = 14f
    var selectionTextSizeSp: Float = 14f
    var clipboardTextSizeSp: Float = 14f
    var keyPreviewTextSizeSp: Float = 30f
    var accentTextSizeSp: Float = 22f
    var hintTextSizeFactor: Float = 0.6f

    var keyPaddingHorizontalDp: Int = 10
    var keyPaddingVerticalDp: Int = 10
    var keyMinWidthDp: Int = 36
    var keyMinHeightDp: Int = 52
    var keyMinWideWidthDp: Int = 64
    var keyRowHeightDp: Int = 56
    var suggestionBarHeightDp: Int = 56
    var selectionBarHeightDp: Int = 56
    var clipboardBarHeightDp: Int = 56

    var keyStrokeWidthDp: Int = 1
    var keyStrokeColor: Int = Color.TRANSPARENT
    var keyGradientTopBlend: Float = 0.10f
    var keyGradientBottomBlend: Float = 0.04f
    var keyElevationDp: Int = 2
    var keyShadowRadiusDp: Int = 0
    var keyShadowDxDp: Int = 0
    var keyShadowDyDp: Int = 0
    var keyShadowColor: Int = Color.TRANSPARENT

    var keyPreviewBorderWidthDp: Int = 1
    var keyPreviewPaddingDp: Int = 10

    var animationDurationMs: Long = 120L
    var animationInterpolator: String = "accelerateDecelerate"

    var customTextColor: Int = Color.WHITE
    var customCapsNeutralColor: Int = 0
    var customCapsMediumColor: Int = 0
    var customCapsStrongColor: Int = 0
    var customCapsStrongTextColor: Int = Color.WHITE

    var customThemeEnabled: Boolean = false
    var customBgColor: Int = 0
    var customKeyColor: Int = 0
    var customAccentColor: Int = 0

    var isAutoCorrectionEnabled: Boolean = true
    var isClipboardSuggestionsEnabled: Boolean = true
    var isSoundEnabled: Boolean = true
    var isVibrationEnabled: Boolean = true
    var isGestureTypingEnabled: Boolean = true
    var isVoiceInputEnabled: Boolean = true
    var isDoubleSpaceEnabled: Boolean = true
    var isAutoSpaceEnabled: Boolean = true
    var isDeleteWordEnabled: Boolean = true
    var isBackspaceSwipeEnabled: Boolean = true
    var isBackspaceTripleTapEnabled: Boolean = true

    private val prefs: SharedPreferences by lazy {
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    }

    private fun getBooleanWithDefault(key: String, defaultValue: Boolean): Boolean {
        if (!prefs.contains(key)) {
            prefs.edit { putBoolean(key, defaultValue) }
        }
        return prefs.getBoolean(key, defaultValue)
    }

    fun loadPreferences() {
        currentThemeMode = getOrInitSavedThemeMode()
        currentBackgroundMode = getOrInitSavedBackgroundMode()

        val radiusDp = prefs.getInt(PREF_KEY_CORNER_RADIUS, 6)
        cornerRadiusPx = dpToPx(radiusDp)

        customThemeEnabled = prefs.getBoolean(PREF_KEY_CUSTOM_THEME_ENABLED, false)
        customBgColor = prefs.getInt(PREF_KEY_CUSTOM_BG_COLOR, Color.BLACK)
        customKeyColor = prefs.getInt(PREF_KEY_CUSTOM_KEY_COLOR, Color.DKGRAY)
        customAccentColor = prefs.getInt(PREF_KEY_CUSTOM_ACCENT_COLOR, Color.BLUE)

        fontFamily = prefs.getString(PREF_KEY_FONT_FAMILY, "") ?: ""
        fontStyle = prefs.getInt(PREF_KEY_FONT_STYLE, android.graphics.Typeface.NORMAL)
        keyTextSizeSp = prefs.getFloat(PREF_KEY_KEY_TEXT_SIZE_SP, 15f)
        suggestionTextSizeSp = prefs.getFloat(PREF_KEY_SUGGESTION_TEXT_SIZE_SP, 14f)
        selectionTextSizeSp = prefs.getFloat(PREF_KEY_SELECTION_TEXT_SIZE_SP, 14f)
        clipboardTextSizeSp = prefs.getFloat(PREF_KEY_CLIPBOARD_TEXT_SIZE_SP, 14f)
        keyPreviewTextSizeSp = prefs.getFloat(PREF_KEY_KEY_PREVIEW_TEXT_SIZE_SP, 30f)
        accentTextSizeSp = prefs.getFloat(PREF_KEY_ACCENT_TEXT_SIZE_SP, 22f)
        hintTextSizeFactor = prefs.getFloat(PREF_KEY_HINT_TEXT_SIZE_FACTOR, 0.6f)

        keyPaddingHorizontalDp = prefs.getInt(PREF_KEY_KEY_PADDING_H_DP, 10)
        keyPaddingVerticalDp = prefs.getInt(PREF_KEY_KEY_PADDING_V_DP, 10)
        keyMinWidthDp = prefs.getInt(PREF_KEY_KEY_MIN_WIDTH_DP, 36)
        keyMinHeightDp = prefs.getInt(PREF_KEY_KEY_MIN_HEIGHT_DP, 52)
        keyMinWideWidthDp = prefs.getInt(PREF_KEY_KEY_MIN_WIDE_WIDTH_DP, 64)
        keyRowHeightDp = prefs.getInt(PREF_KEY_KEY_ROW_HEIGHT_DP, 56)
        suggestionBarHeightDp = prefs.getInt(PREF_KEY_SUGGESTION_BAR_HEIGHT_DP, 56)
        selectionBarHeightDp = prefs.getInt(PREF_KEY_SELECTION_BAR_HEIGHT_DP, 56)
        clipboardBarHeightDp = prefs.getInt(PREF_KEY_CLIPBOARD_BAR_HEIGHT_DP, 56)

        keyStrokeWidthDp = prefs.getInt(PREF_KEY_KEY_STROKE_WIDTH_DP, 1)
        keyStrokeColor = prefs.getInt(PREF_KEY_KEY_STROKE_COLOR, Color.TRANSPARENT)
        keyGradientTopBlend = prefs.getFloat(PREF_KEY_KEY_GRADIENT_TOP_BLEND, 0.10f)
        keyGradientBottomBlend = prefs.getFloat(PREF_KEY_KEY_GRADIENT_BOTTOM_BLEND, 0.04f)
        keyElevationDp = prefs.getInt(PREF_KEY_KEY_ELEVATION_DP, 2)
        keyShadowRadiusDp = prefs.getInt(PREF_KEY_KEY_SHADOW_RADIUS_DP, 0)
        keyShadowDxDp = prefs.getInt(PREF_KEY_KEY_SHADOW_DX_DP, 0)
        keyShadowDyDp = prefs.getInt(PREF_KEY_KEY_SHADOW_DY_DP, 0)
        keyShadowColor = prefs.getInt(PREF_KEY_KEY_SHADOW_COLOR, Color.TRANSPARENT)

        keyPreviewBorderWidthDp = prefs.getInt(PREF_KEY_KEY_PREVIEW_BORDER_WIDTH_DP, 1)
        keyPreviewPaddingDp = prefs.getInt(PREF_KEY_KEY_PREVIEW_PADDING_DP, 10)

        animationDurationMs = prefs.getLong(PREF_KEY_ANIM_DURATION_MS, 120L)
        animationInterpolator = prefs.getString(PREF_KEY_ANIM_INTERPOLATOR, "accelerateDecelerate") ?: "accelerateDecelerate"

        customTextColor = prefs.getInt(PREF_KEY_CUSTOM_TEXT_COLOR, Color.WHITE)
        customCapsNeutralColor = prefs.getInt(PREF_KEY_CUSTOM_CAPS_NEUTRAL_COLOR, 0)
        customCapsMediumColor = prefs.getInt(PREF_KEY_CUSTOM_CAPS_MEDIUM_COLOR, 0)
        customCapsStrongColor = prefs.getInt(PREF_KEY_CUSTOM_CAPS_STRONG_COLOR, 0)
        customCapsStrongTextColor = prefs.getInt(PREF_KEY_CUSTOM_CAPS_STRONG_TEXT_COLOR, Color.WHITE)

        isAutoCorrectionEnabled = getBooleanWithDefault(PREF_KEY_FEATURE_AUTOCORRECT_ENABLED, true)
        isClipboardSuggestionsEnabled = getBooleanWithDefault(PREF_KEY_FEATURE_CLIPBOARD_ENABLED, true)
        isSoundEnabled = getBooleanWithDefault(PREF_KEY_FEATURE_SOUND_ENABLED, true)
        isVibrationEnabled = getBooleanWithDefault(PREF_KEY_FEATURE_VIBRATION_ENABLED, true)
        isGestureTypingEnabled = getBooleanWithDefault(PREF_KEY_FEATURE_GESTURE_ENABLED, true)
        isVoiceInputEnabled = getBooleanWithDefault(PREF_KEY_FEATURE_VOICE_ENABLED, true)
        isDoubleSpaceEnabled = getBooleanWithDefault(PREF_KEY_FEATURE_DOUBLE_SPACE_ENABLED, true)
        isAutoSpaceEnabled = getBooleanWithDefault(PREF_KEY_FEATURE_AUTO_SPACE_ENABLED, true)
        isDeleteWordEnabled = getBooleanWithDefault(PREF_KEY_FEATURE_DELETE_WORD_ENABLED, true)
        isBackspaceSwipeEnabled = getBooleanWithDefault(PREF_KEY_FEATURE_BACKSPACE_SWIPE_ENABLED, true)
        isBackspaceTripleTapEnabled = getBooleanWithDefault(PREF_KEY_FEATURE_BACKSPACE_TRIPLE_TAP_ENABLED, true)
    }

    fun initPalette(isPrivateMode: Boolean) {
        drawableCache.evictAll()
        val systemIsDark =
            (context.resources.configuration.uiMode and Configuration.UI_MODE_NIGHT_MASK) == Configuration.UI_MODE_NIGHT_YES
        val isDark =
            when (currentThemeMode) {
                ThemeMode.DARK -> true
                ThemeMode.LIGHT -> false
                ThemeMode.SYSTEM -> systemIsDark
            }

        val fallbackTextColor = if (isDark) Color.WHITE else Color.BLACK
        val fallbackBackgroundColor = if (isDark) 0xFF121212.toInt() else Color.WHITE
        val fallbackKeyBackgroundColor = if (isDark) 0xFF2A2A2A.toInt() else 0xFFE6E6E6.toInt()
        val fallbackAccentColor = if (isDark) 0xFF7AA2FF.toInt() else 0xFF2B7CFF.toInt()

        val useThemeAttrs = currentThemeMode == ThemeMode.SYSTEM
        paletteTextColor = if (useThemeAttrs) resolveThemeColor(
            android.R.attr.textColorPrimary,
            fallbackTextColor
        ) else fallbackTextColor
        val baseBackground = if (useThemeAttrs) resolveThemeColor(
            android.R.attr.colorBackground,
            fallbackBackgroundColor
        ) else fallbackBackgroundColor
        paletteKeyBackgroundColor = if (useThemeAttrs) resolveThemeColor(
            android.R.attr.colorButtonNormal,
            fallbackKeyBackgroundColor
        ) else fallbackKeyBackgroundColor
        paletteAccentColor = if (useThemeAttrs) resolveThemeColor(
            android.R.attr.colorAccent,
            fallbackAccentColor
        ) else fallbackAccentColor

        if (customThemeEnabled) {
            paletteBackgroundColor = customBgColor
            paletteKeyBackgroundColor = customKeyColor
            paletteAccentColor = customAccentColor
            paletteTextColor = customTextColor
        } else {
            paletteBackgroundColor =
                when (currentBackgroundMode) {
                    BackgroundMode.TRANSPARENT -> Color.TRANSPARENT
                    BackgroundMode.DARK -> 0xFF121212.toInt()
                    BackgroundMode.LIGHT -> Color.WHITE
                    BackgroundMode.SYSTEM -> baseBackground
                }
        }

        if (isPrivateMode) {
            paletteBackgroundColor = blendColors(paletteBackgroundColor, 0xFF200020.toInt(), 0.2f)
            paletteKeyBackgroundColor = blendColors(paletteKeyBackgroundColor, 0xFF303030.toInt(), 0.1f)
        }

        paletteCapsNeutralColor = if (customCapsNeutralColor != 0) customCapsNeutralColor else paletteKeyBackgroundColor
        paletteCapsStrongColor = if (customCapsStrongColor != 0) customCapsStrongColor else paletteAccentColor
        paletteCapsMediumColor = if (customCapsMediumColor != 0) customCapsMediumColor else blendColors(paletteKeyBackgroundColor, paletteAccentColor, 0.45f)
        paletteCapsStrongTextColor =
            if (customCapsStrongTextColor != 0) customCapsStrongTextColor else if (isColorDark(paletteCapsStrongColor)) Color.WHITE else Color.BLACK
    }

    private val drawableCache = LruCache<Int, Drawable.ConstantState>(100)

    fun applyButtonBackground(button: Button, baseColor: Int) {
        val cachedState = drawableCache.get(baseColor)
        if (cachedState != null) {
            button.background = cachedState.newDrawable()
        } else {
            val drawable = createKeyBackgroundStateList(baseColor)
            drawable.constantState?.let { drawableCache.put(baseColor, it) }
            button.background = drawable
        }
    }

    fun createKeyBackgroundStateList(baseColor: Int): StateListDrawable {
        return StateListDrawable().apply {
            addState(
                intArrayOf(android.R.attr.state_pressed),
                createKeyBackground(baseColor, pressed = true)
            )
            addState(intArrayOf(), createKeyBackground(baseColor, pressed = false))
        }
    }

    fun createKeyBackground(baseColor: Int, pressed: Boolean): GradientDrawable {
        val pressedTop = (keyGradientTopBlend + 0.12f).coerceIn(0f, 1f)
        val pressedBottom = (keyGradientBottomBlend + 0.10f).coerceIn(0f, 1f)
        val topBlend = if (pressed) pressedTop else keyGradientTopBlend
        val bottomBlend = if (pressed) pressedBottom else keyGradientBottomBlend

        val top = blendColors(baseColor, paletteAccentColor, topBlend)
        val bottom = blendColors(baseColor, paletteAccentColor, bottomBlend)

        return GradientDrawable(
            GradientDrawable.Orientation.TOP_BOTTOM,
            intArrayOf(top, bottom),
        ).apply {
            cornerRadius = cornerRadiusPx.toFloat()
            val strokeWidth = dpToPx(keyStrokeWidthDp)
            if (strokeWidth > 0) {
                setStroke(strokeWidth, keyStrokeColor)
            }
        }
    }

    fun applyTypography(textView: TextView, sizePx: Float? = null) {
        val tf = if (fontFamily.isBlank()) {
            android.graphics.Typeface.defaultFromStyle(fontStyle)
        } else {
            android.graphics.Typeface.create(fontFamily, fontStyle)
        }
        textView.typeface = tf
        if (sizePx != null) {
            textView.setTextSize(TypedValue.COMPLEX_UNIT_PX, sizePx)
        }
        val shadowRadius = dpToPx(keyShadowRadiusDp).toFloat()
        val shadowDx = dpToPx(keyShadowDxDp).toFloat()
        val shadowDy = dpToPx(keyShadowDyDp).toFloat()
        if (shadowRadius > 0f) {
            textView.setShadowLayer(shadowRadius, shadowDx, shadowDy, keyShadowColor)
        } else {
            textView.setShadowLayer(0f, 0f, 0f, Color.TRANSPARENT)
        }
    }

    fun getInterpolator(): Interpolator {
        return when (animationInterpolator.lowercase()) {
            "linear" -> LinearInterpolator()
            "accelerate" -> AccelerateInterpolator()
            "decelerate" -> DecelerateInterpolator()
            "overshoot" -> OvershootInterpolator()
            "bounce" -> BounceInterpolator()
            else -> AccelerateDecelerateInterpolator()
        }
    }

    fun resolveThemeColor(attr: Int, fallback: Int): Int {
        val tv = TypedValue()
        val resolved = context.theme.resolveAttribute(attr, tv, true)
        if (!resolved) return fallback
        return if (tv.resourceId != 0) {
            runCatching { context.resources.getColor(tv.resourceId, context.theme) }.getOrElse { fallback }
        } else {
            tv.data
        }
    }

    fun blendColors(a: Int, b: Int, t: Float): Int {
        val clamped = t.coerceIn(0f, 1f)
        val ar = Color.red(a)
        val ag = Color.green(a)
        val ab = Color.blue(a)
        val aa = Color.alpha(a)

        val br = Color.red(b)
        val bg = Color.green(b)
        val bb = Color.blue(b)
        val ba = Color.alpha(b)

        val r = (ar + ((br - ar) * clamped)).toInt()
        val g = (ag + ((bg - ag) * clamped)).toInt()
        val bl = (ab + ((bb - ab) * clamped)).toInt()
        val al = (aa + ((ba - aa) * clamped)).toInt()
        return Color.argb(al, r, g, bl)
    }

    fun isColorDark(color: Int): Boolean {
        val r = Color.red(color) / 255.0
        val g = Color.green(color) / 255.0
        val b = Color.blue(color) / 255.0
        val luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b
        return luminance < 0.5
    }

    private fun dpToPx(dp: Int): Int =
        TypedValue.applyDimension(
            TypedValue.COMPLEX_UNIT_DIP,
            dp.toFloat(),
            context.resources.displayMetrics,
        ).toInt()

    fun getOrInitSavedThemeMode(): ThemeMode {
        val raw = prefs.getString(PREF_KEY_THEME_MODE, null)
        if (!raw.isNullOrBlank()) {
            return ThemeMode.entries.firstOrNull { it.prefValue == raw } ?: ThemeMode.SYSTEM
        }

        prefs.edit { putString(PREF_KEY_THEME_MODE, ThemeMode.SYSTEM.prefValue) }
        return ThemeMode.SYSTEM
    }

    fun setSavedThemeMode(mode: ThemeMode) {
        prefs.edit { putString(PREF_KEY_THEME_MODE, mode.prefValue) }
    }

    fun getOrInitSavedBackgroundMode(): BackgroundMode {
        val raw = prefs.getString(PREF_KEY_BACKGROUND_MODE, null)
        if (!raw.isNullOrBlank()) {
            return BackgroundMode.entries.firstOrNull { it.prefValue == raw }
                ?: BackgroundMode.SYSTEM
        }

        prefs.edit { putString(PREF_KEY_BACKGROUND_MODE, BackgroundMode.SYSTEM.prefValue) }
        return BackgroundMode.SYSTEM
    }

    fun setSavedBackgroundMode(mode: BackgroundMode) {
        prefs.edit { putString(PREF_KEY_BACKGROUND_MODE, mode.prefValue) }
    }

    fun saveCornerRadius(radius: Int) {
        prefs.edit { putInt(PREF_KEY_CORNER_RADIUS, radius) }
        cornerRadiusPx = dpToPx(radius)
    }

    fun saveCustomTheme(enabled: Boolean, bg: Int, key: Int, accent: Int) {
        prefs.edit {
            putBoolean(PREF_KEY_CUSTOM_THEME_ENABLED, enabled)
            putInt(PREF_KEY_CUSTOM_BG_COLOR, bg)
            putInt(PREF_KEY_CUSTOM_KEY_COLOR, key)
            putInt(PREF_KEY_CUSTOM_ACCENT_COLOR, accent)
        }
        customThemeEnabled = enabled
        customBgColor = bg
        customKeyColor = key
        customAccentColor = accent
    }

    fun saveTypography(
        family: String,
        style: Int,
        keySizeSp: Float,
        suggestionSizeSp: Float,
        selectionSizeSp: Float,
        clipboardSizeSp: Float,
        previewSizeSp: Float,
        accentSizeSp: Float,
        hintFactor: Float,
    ) {
        prefs.edit {
            putString(PREF_KEY_FONT_FAMILY, family)
            putInt(PREF_KEY_FONT_STYLE, style)
            putFloat(PREF_KEY_KEY_TEXT_SIZE_SP, keySizeSp)
            putFloat(PREF_KEY_SUGGESTION_TEXT_SIZE_SP, suggestionSizeSp)
            putFloat(PREF_KEY_SELECTION_TEXT_SIZE_SP, selectionSizeSp)
            putFloat(PREF_KEY_CLIPBOARD_TEXT_SIZE_SP, clipboardSizeSp)
            putFloat(PREF_KEY_KEY_PREVIEW_TEXT_SIZE_SP, previewSizeSp)
            putFloat(PREF_KEY_ACCENT_TEXT_SIZE_SP, accentSizeSp)
            putFloat(PREF_KEY_HINT_TEXT_SIZE_FACTOR, hintFactor)
        }
        fontFamily = family
        fontStyle = style
        keyTextSizeSp = keySizeSp
        suggestionTextSizeSp = suggestionSizeSp
        selectionTextSizeSp = selectionSizeSp
        clipboardTextSizeSp = clipboardSizeSp
        keyPreviewTextSizeSp = previewSizeSp
        accentTextSizeSp = accentSizeSp
        hintTextSizeFactor = hintFactor
    }

    fun saveKeyShape(
        paddingH: Int,
        paddingV: Int,
        minWidth: Int,
        minHeight: Int,
        minWideWidth: Int,
        rowHeight: Int,
        suggestionHeight: Int,
        selectionHeight: Int,
        clipboardHeight: Int,
        strokeWidth: Int,
        strokeColor: Int,
        gradientTop: Float,
        gradientBottom: Float,
        elevation: Int,
        shadowRadius: Int,
        shadowDx: Int,
        shadowDy: Int,
        shadowColor: Int,
        previewBorder: Int,
        previewPadding: Int,
    ) {
        prefs.edit {
            putInt(PREF_KEY_KEY_PADDING_H_DP, paddingH)
            putInt(PREF_KEY_KEY_PADDING_V_DP, paddingV)
            putInt(PREF_KEY_KEY_MIN_WIDTH_DP, minWidth)
            putInt(PREF_KEY_KEY_MIN_HEIGHT_DP, minHeight)
            putInt(PREF_KEY_KEY_MIN_WIDE_WIDTH_DP, minWideWidth)
            putInt(PREF_KEY_KEY_ROW_HEIGHT_DP, rowHeight)
            putInt(PREF_KEY_SUGGESTION_BAR_HEIGHT_DP, suggestionHeight)
            putInt(PREF_KEY_SELECTION_BAR_HEIGHT_DP, selectionHeight)
            putInt(PREF_KEY_CLIPBOARD_BAR_HEIGHT_DP, clipboardHeight)
            putInt(PREF_KEY_KEY_STROKE_WIDTH_DP, strokeWidth)
            putInt(PREF_KEY_KEY_STROKE_COLOR, strokeColor)
            putFloat(PREF_KEY_KEY_GRADIENT_TOP_BLEND, gradientTop)
            putFloat(PREF_KEY_KEY_GRADIENT_BOTTOM_BLEND, gradientBottom)
            putInt(PREF_KEY_KEY_ELEVATION_DP, elevation)
            putInt(PREF_KEY_KEY_SHADOW_RADIUS_DP, shadowRadius)
            putInt(PREF_KEY_KEY_SHADOW_DX_DP, shadowDx)
            putInt(PREF_KEY_KEY_SHADOW_DY_DP, shadowDy)
            putInt(PREF_KEY_KEY_SHADOW_COLOR, shadowColor)
            putInt(PREF_KEY_KEY_PREVIEW_BORDER_WIDTH_DP, previewBorder)
            putInt(PREF_KEY_KEY_PREVIEW_PADDING_DP, previewPadding)
        }
        keyPaddingHorizontalDp = paddingH
        keyPaddingVerticalDp = paddingV
        keyMinWidthDp = minWidth
        keyMinHeightDp = minHeight
        keyMinWideWidthDp = minWideWidth
        keyRowHeightDp = rowHeight
        suggestionBarHeightDp = suggestionHeight
        selectionBarHeightDp = selectionHeight
        clipboardBarHeightDp = clipboardHeight
        keyStrokeWidthDp = strokeWidth
        keyStrokeColor = strokeColor
        keyGradientTopBlend = gradientTop
        keyGradientBottomBlend = gradientBottom
        keyElevationDp = elevation
        keyShadowRadiusDp = shadowRadius
        keyShadowDxDp = shadowDx
        keyShadowDyDp = shadowDy
        keyShadowColor = shadowColor
        keyPreviewBorderWidthDp = previewBorder
        keyPreviewPaddingDp = previewPadding
    }

    fun saveAnimation(durationMs: Long, interpolator: String) {
        prefs.edit {
            putLong(PREF_KEY_ANIM_DURATION_MS, durationMs)
            putString(PREF_KEY_ANIM_INTERPOLATOR, interpolator)
        }
        animationDurationMs = durationMs
        animationInterpolator = interpolator
    }

    fun saveCustomTextAndCapsColors(
        textColor: Int,
        capsNeutral: Int,
        capsMedium: Int,
        capsStrong: Int,
        capsStrongText: Int,
    ) {
        prefs.edit {
            putInt(PREF_KEY_CUSTOM_TEXT_COLOR, textColor)
            putInt(PREF_KEY_CUSTOM_CAPS_NEUTRAL_COLOR, capsNeutral)
            putInt(PREF_KEY_CUSTOM_CAPS_MEDIUM_COLOR, capsMedium)
            putInt(PREF_KEY_CUSTOM_CAPS_STRONG_COLOR, capsStrong)
            putInt(PREF_KEY_CUSTOM_CAPS_STRONG_TEXT_COLOR, capsStrongText)
        }
        customTextColor = textColor
        customCapsNeutralColor = capsNeutral
        customCapsMediumColor = capsMedium
        customCapsStrongColor = capsStrong
        customCapsStrongTextColor = capsStrongText
    }

    fun saveFeatureFlags(
        autoCorrectionEnabled: Boolean,
        clipboardSuggestionsEnabled: Boolean,
        soundEnabled: Boolean,
        vibrationEnabled: Boolean,
        gestureTypingEnabled: Boolean,
        voiceInputEnabled: Boolean,
        doubleSpaceEnabled: Boolean,
        autoSpaceEnabled: Boolean,
        deleteWordEnabled: Boolean,
        backspaceSwipeEnabled: Boolean,
        backspaceTripleTapEnabled: Boolean,
    ) {
        prefs.edit {
            putBoolean(PREF_KEY_FEATURE_AUTOCORRECT_ENABLED, autoCorrectionEnabled)
            putBoolean(PREF_KEY_FEATURE_CLIPBOARD_ENABLED, clipboardSuggestionsEnabled)
            putBoolean(PREF_KEY_FEATURE_SOUND_ENABLED, soundEnabled)
            putBoolean(PREF_KEY_FEATURE_VIBRATION_ENABLED, vibrationEnabled)
            putBoolean(PREF_KEY_FEATURE_GESTURE_ENABLED, gestureTypingEnabled)
            putBoolean(PREF_KEY_FEATURE_VOICE_ENABLED, voiceInputEnabled)
            putBoolean(PREF_KEY_FEATURE_DOUBLE_SPACE_ENABLED, doubleSpaceEnabled)
            putBoolean(PREF_KEY_FEATURE_AUTO_SPACE_ENABLED, autoSpaceEnabled)
            putBoolean(PREF_KEY_FEATURE_DELETE_WORD_ENABLED, deleteWordEnabled)
            putBoolean(PREF_KEY_FEATURE_BACKSPACE_SWIPE_ENABLED, backspaceSwipeEnabled)
            putBoolean(PREF_KEY_FEATURE_BACKSPACE_TRIPLE_TAP_ENABLED, backspaceTripleTapEnabled)
        }
        isAutoCorrectionEnabled = autoCorrectionEnabled
        isClipboardSuggestionsEnabled = clipboardSuggestionsEnabled
        isSoundEnabled = soundEnabled
        isVibrationEnabled = vibrationEnabled
        isGestureTypingEnabled = gestureTypingEnabled
        isVoiceInputEnabled = voiceInputEnabled
        isDoubleSpaceEnabled = doubleSpaceEnabled
        isAutoSpaceEnabled = autoSpaceEnabled
        isDeleteWordEnabled = deleteWordEnabled
        isBackspaceSwipeEnabled = backspaceSwipeEnabled
        isBackspaceTripleTapEnabled = backspaceTripleTapEnabled
    }

    companion object {
        const val PREFS_NAME = "custom_keyboard_prefs"
        const val PREF_KEY_THEME_MODE = "theme_mode"
        const val PREF_KEY_BACKGROUND_MODE = "background_mode"
        const val PREF_KEY_CORNER_RADIUS = "corner_radius"
        const val PREF_KEY_CUSTOM_THEME_ENABLED = "custom_theme_enabled"
        const val PREF_KEY_CUSTOM_BG_COLOR = "custom_bg_color"
        const val PREF_KEY_CUSTOM_KEY_COLOR = "custom_key_color"
        const val PREF_KEY_CUSTOM_ACCENT_COLOR = "custom_accent_color"
        const val PREF_KEY_CUSTOM_TEXT_COLOR = "custom_text_color"
        const val PREF_KEY_CUSTOM_CAPS_NEUTRAL_COLOR = "custom_caps_neutral_color"
        const val PREF_KEY_CUSTOM_CAPS_MEDIUM_COLOR = "custom_caps_medium_color"
        const val PREF_KEY_CUSTOM_CAPS_STRONG_COLOR = "custom_caps_strong_color"
        const val PREF_KEY_CUSTOM_CAPS_STRONG_TEXT_COLOR = "custom_caps_strong_text_color"

        const val PREF_KEY_FONT_FAMILY = "font_family"
        const val PREF_KEY_FONT_STYLE = "font_style"
        const val PREF_KEY_KEY_TEXT_SIZE_SP = "key_text_size_sp"
        const val PREF_KEY_SUGGESTION_TEXT_SIZE_SP = "suggestion_text_size_sp"
        const val PREF_KEY_SELECTION_TEXT_SIZE_SP = "selection_text_size_sp"
        const val PREF_KEY_CLIPBOARD_TEXT_SIZE_SP = "clipboard_text_size_sp"
        const val PREF_KEY_KEY_PREVIEW_TEXT_SIZE_SP = "key_preview_text_size_sp"
        const val PREF_KEY_ACCENT_TEXT_SIZE_SP = "accent_text_size_sp"
        const val PREF_KEY_HINT_TEXT_SIZE_FACTOR = "hint_text_size_factor"

        const val PREF_KEY_KEY_PADDING_H_DP = "key_padding_h_dp"
        const val PREF_KEY_KEY_PADDING_V_DP = "key_padding_v_dp"
        const val PREF_KEY_KEY_MIN_WIDTH_DP = "key_min_width_dp"
        const val PREF_KEY_KEY_MIN_HEIGHT_DP = "key_min_height_dp"
        const val PREF_KEY_KEY_MIN_WIDE_WIDTH_DP = "key_min_wide_width_dp"
        const val PREF_KEY_KEY_ROW_HEIGHT_DP = "key_row_height_dp"
        const val PREF_KEY_SUGGESTION_BAR_HEIGHT_DP = "suggestion_bar_height_dp"
        const val PREF_KEY_SELECTION_BAR_HEIGHT_DP = "selection_bar_height_dp"
        const val PREF_KEY_CLIPBOARD_BAR_HEIGHT_DP = "clipboard_bar_height_dp"

        const val PREF_KEY_KEY_STROKE_WIDTH_DP = "key_stroke_width_dp"
        const val PREF_KEY_KEY_STROKE_COLOR = "key_stroke_color"
        const val PREF_KEY_KEY_GRADIENT_TOP_BLEND = "key_gradient_top_blend"
        const val PREF_KEY_KEY_GRADIENT_BOTTOM_BLEND = "key_gradient_bottom_blend"
        const val PREF_KEY_KEY_ELEVATION_DP = "key_elevation_dp"
        const val PREF_KEY_KEY_SHADOW_RADIUS_DP = "key_shadow_radius_dp"
        const val PREF_KEY_KEY_SHADOW_DX_DP = "key_shadow_dx_dp"
        const val PREF_KEY_KEY_SHADOW_DY_DP = "key_shadow_dy_dp"
        const val PREF_KEY_KEY_SHADOW_COLOR = "key_shadow_color"

        const val PREF_KEY_KEY_PREVIEW_BORDER_WIDTH_DP = "key_preview_border_width_dp"
        const val PREF_KEY_KEY_PREVIEW_PADDING_DP = "key_preview_padding_dp"

        const val PREF_KEY_ANIM_DURATION_MS = "anim_duration_ms"
        const val PREF_KEY_ANIM_INTERPOLATOR = "anim_interpolator"

        const val PREF_KEY_FEATURE_AUTOCORRECT_ENABLED = "feature_autocorrect_enabled"
        const val PREF_KEY_FEATURE_CLIPBOARD_ENABLED = "feature_clipboard_enabled"
        const val PREF_KEY_FEATURE_SOUND_ENABLED = "sound_enabled"
        const val PREF_KEY_FEATURE_VIBRATION_ENABLED = "feature_vibration_enabled"
        const val PREF_KEY_FEATURE_GESTURE_ENABLED = "feature_gesture_enabled"
        const val PREF_KEY_FEATURE_VOICE_ENABLED = "feature_voice_enabled"
        const val PREF_KEY_FEATURE_DOUBLE_SPACE_ENABLED = "feature_double_space_enabled"
        const val PREF_KEY_FEATURE_AUTO_SPACE_ENABLED = "feature_auto_space_enabled"
        const val PREF_KEY_FEATURE_DELETE_WORD_ENABLED = "feature_delete_word_enabled"
        const val PREF_KEY_FEATURE_BACKSPACE_SWIPE_ENABLED = "feature_backspace_swipe_enabled"
        const val PREF_KEY_FEATURE_BACKSPACE_TRIPLE_TAP_ENABLED = "feature_backspace_triple_tap_enabled"
    }
}

class KeyboardThemeDialogs(
    private val context: Context,
    private val themeManager: KeyboardThemeManager,
    private val onThemeChanged: () -> Unit,
    private val onRebuild: () -> Unit,
    private val onNavigate: (String) -> Unit,
    private val getWindowToken: () -> IBinder?
) {
    private val px10 = TypedValue.applyDimension(
        TypedValue.COMPLEX_UNIT_DIP,
        10f,
        context.resources.displayMetrics
    ).toInt()

    fun openVisualStylesDialog() {
        val items = arrayOf(
            context.getString(R.string.item_corner_radius),
            context.getString(R.string.item_theme_mode),
            context.getString(R.string.item_background),
            context.getString(R.string.item_custom_theme),
            context.getString(R.string.item_typography),
            context.getString(R.string.item_key_shape),
            context.getString(R.string.item_animations)
        )

        showDialog(context.getString(R.string.dialog_visual_style_title)) { builder ->
            builder.setItems(items) { dialogInterface, which ->
                dialogInterface.dismiss()
                when (which) {
                    0 -> openCornerRadiusDialog()
                    1 -> openThemeModeConfigDialog()
                    2 -> openBackgroundModeConfigDialog()
                    3 -> openCustomThemeDialog()
                    4 -> openTypographyDialog()
                    5 -> openKeyShapeDialog()
                    6 -> openAnimationDialog()
                }
            }
            .setNegativeButton(context.getString(R.string.btn_close)) { _, _ ->
                onNavigate("main")
            }
            .setOnCancelListener {
                onNavigate("main")
            }
        }
    }

    fun openFeaturesDialog() {
        val layout = LinearLayout(context).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(px10 * 2, px10, px10 * 2, px10)
        }

        val autoCorrectCheck = CheckBox(context).apply {
            text = context.getString(R.string.feature_auto_correction)
            isChecked = themeManager.isAutoCorrectionEnabled
        }
        val clipboardCheck = CheckBox(context).apply {
            text = context.getString(R.string.feature_clipboard_suggestions)
            isChecked = themeManager.isClipboardSuggestionsEnabled
        }
        val soundCheck = CheckBox(context).apply {
            text = context.getString(R.string.feature_sound_effects)
            isChecked = themeManager.isSoundEnabled
        }
        val vibrationCheck = CheckBox(context).apply {
            text = context.getString(R.string.feature_vibration)
            isChecked = themeManager.isVibrationEnabled
        }
        val gestureCheck = CheckBox(context).apply {
            text = context.getString(R.string.feature_gesture_typing)
            isChecked = themeManager.isGestureTypingEnabled
        }
        val voiceCheck = CheckBox(context).apply {
            text = context.getString(R.string.feature_voice_input)
            isChecked = themeManager.isVoiceInputEnabled
        }
        val doubleSpaceCheck = CheckBox(context).apply {
            text = context.getString(R.string.feature_double_space)
            isChecked = themeManager.isDoubleSpaceEnabled
        }
        val autoSpaceCheck = CheckBox(context).apply {
            text = context.getString(R.string.feature_auto_space)
            isChecked = themeManager.isAutoSpaceEnabled
        }
        val deleteWordCheck = CheckBox(context).apply {
            text = context.getString(R.string.feature_delete_word)
            isChecked = themeManager.isDeleteWordEnabled
        }
        val backspaceSwipeCheck = CheckBox(context).apply {
            text = context.getString(R.string.feature_backspace_swipe)
            isChecked = themeManager.isBackspaceSwipeEnabled
        }
        val backspaceTripleTapCheck = CheckBox(context).apply {
            text = context.getString(R.string.feature_backspace_triple_tap)
            isChecked = themeManager.isBackspaceTripleTapEnabled
        }

        val applyChanges = {
            themeManager.saveFeatureFlags(
                autoCorrectionEnabled = autoCorrectCheck.isChecked,
                clipboardSuggestionsEnabled = clipboardCheck.isChecked,
                soundEnabled = soundCheck.isChecked,
                vibrationEnabled = vibrationCheck.isChecked,
                gestureTypingEnabled = gestureCheck.isChecked,
                voiceInputEnabled = voiceCheck.isChecked,
                doubleSpaceEnabled = doubleSpaceCheck.isChecked,
                autoSpaceEnabled = autoSpaceCheck.isChecked,
                deleteWordEnabled = deleteWordCheck.isChecked,
                backspaceSwipeEnabled = backspaceSwipeCheck.isChecked,
                backspaceTripleTapEnabled = backspaceTripleTapCheck.isChecked,
            )
            onRebuild()
        }

        autoCorrectCheck.setOnCheckedChangeListener { _, _ -> applyChanges() }
        clipboardCheck.setOnCheckedChangeListener { _, _ -> applyChanges() }
        soundCheck.setOnCheckedChangeListener { _, _ -> applyChanges() }
        vibrationCheck.setOnCheckedChangeListener { _, _ -> applyChanges() }
        gestureCheck.setOnCheckedChangeListener { _, _ -> applyChanges() }
        voiceCheck.setOnCheckedChangeListener { _, _ -> applyChanges() }
        doubleSpaceCheck.setOnCheckedChangeListener { _, _ -> applyChanges() }
        autoSpaceCheck.setOnCheckedChangeListener { _, _ -> applyChanges() }
        deleteWordCheck.setOnCheckedChangeListener { _, _ -> applyChanges() }
        backspaceSwipeCheck.setOnCheckedChangeListener { _, _ -> applyChanges() }
        backspaceTripleTapCheck.setOnCheckedChangeListener { _, _ -> applyChanges() }

        layout.addView(autoCorrectCheck)
        layout.addView(clipboardCheck)
        layout.addView(soundCheck)
        layout.addView(vibrationCheck)
        layout.addView(gestureCheck)
        layout.addView(voiceCheck)
        layout.addView(doubleSpaceCheck)
        layout.addView(autoSpaceCheck)
        layout.addView(deleteWordCheck)
        layout.addView(backspaceSwipeCheck)
        layout.addView(backspaceTripleTapCheck)

        showDialog(context.getString(R.string.dialog_features_title)) { builder ->
            builder.setView(layout)
                .setPositiveButton(context.getString(R.string.btn_close)) { _, _ ->
                    onNavigate("behavior")
                }
                .setOnCancelListener {
                    onNavigate("behavior")
                }
        }
    }

    fun openCornerRadiusDialog() {
        val layout = LinearLayout(context).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(px10 * 2, px10, px10 * 2, px10)
        }

        val prefs = context.getSharedPreferences(KeyboardThemeManager.PREFS_NAME, Context.MODE_PRIVATE)
        val initialRadius = prefs.getInt(KeyboardThemeManager.PREF_KEY_CORNER_RADIUS, 6)

        val radiusLabel =
            TextView(context).apply { text = context.getString(R.string.label_radius_fmt, initialRadius) }
        val radiusSeek = SeekBar(context).apply {
            max = 24
            progress = initialRadius
            setOnSeekBarChangeListener(object : SeekBar.OnSeekBarChangeListener {
                override fun onProgressChanged(
                    seekBar: SeekBar?,
                    progress: Int,
                    fromUser: Boolean
                ) {
                    radiusLabel.text = context.getString(R.string.label_radius_fmt, progress)
                    themeManager.saveCornerRadius(progress)
                    onRebuild()
                }

                override fun onStartTrackingTouch(seekBar: SeekBar?) {}
                override fun onStopTrackingTouch(seekBar: SeekBar?) {}
            })
        }

        layout.addView(radiusLabel)
        layout.addView(radiusSeek)

        showDialog(context.getString(R.string.dialog_corner_radius_title)) { builder ->
            builder.setView(layout)
                .setPositiveButton(context.getString(R.string.btn_ok)) { _, _ ->
                    openVisualStylesDialog()
                }
                .setNegativeButton(context.getString(R.string.btn_cancel)) { _, _ ->
                    themeManager.saveCornerRadius(initialRadius)
                    onRebuild()
                    openVisualStylesDialog()
                }
                .setOnCancelListener {
                    themeManager.saveCornerRadius(initialRadius)
                    onRebuild()
                    openVisualStylesDialog()
                }
        }
    }

    fun openCustomThemeDialog() {
        val layout = LinearLayout(context).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(px10 * 2, px10, px10 * 2, px10)
        }

        val prefs = context.getSharedPreferences(KeyboardThemeManager.PREFS_NAME, Context.MODE_PRIVATE)
        val initialEnabled = prefs.getBoolean(KeyboardThemeManager.PREF_KEY_CUSTOM_THEME_ENABLED, false)
        val initialBg = prefs.getInt(KeyboardThemeManager.PREF_KEY_CUSTOM_BG_COLOR, Color.BLACK)
        val initialKey = prefs.getInt(KeyboardThemeManager.PREF_KEY_CUSTOM_KEY_COLOR, Color.DKGRAY)
        val initialAccent = prefs.getInt(KeyboardThemeManager.PREF_KEY_CUSTOM_ACCENT_COLOR, Color.BLUE)
        val initialText = prefs.getInt(KeyboardThemeManager.PREF_KEY_CUSTOM_TEXT_COLOR, Color.WHITE)
        val initialCapsNeutral = prefs.getInt(KeyboardThemeManager.PREF_KEY_CUSTOM_CAPS_NEUTRAL_COLOR, 0)
        val initialCapsMedium = prefs.getInt(KeyboardThemeManager.PREF_KEY_CUSTOM_CAPS_MEDIUM_COLOR, 0)
        val initialCapsStrong = prefs.getInt(KeyboardThemeManager.PREF_KEY_CUSTOM_CAPS_STRONG_COLOR, 0)
        val initialCapsStrongText = prefs.getInt(KeyboardThemeManager.PREF_KEY_CUSTOM_CAPS_STRONG_TEXT_COLOR, Color.WHITE)

        val updateTheme = { enabled: Boolean, bgStr: String, keyStr: String, accentStr: String, textStr: String, capsNeutralStr: String, capsMediumStr: String, capsStrongStr: String, capsStrongTextStr: String ->
            try {
                val bg = bgStr.toColorInt()
                val key = keyStr.toColorInt()
                val accent = accentStr.toColorInt()
            val text = (if (textStr.isBlank()) "#FFFFFF" else textStr).toColorInt()
                val capsNeutral = capsNeutralStr.toColorInt()
                val capsMedium = capsMediumStr.toColorInt()
                val capsStrong = capsStrongStr.toColorInt()
                val capsStrongText = capsStrongTextStr.toColorInt()

                themeManager.saveCustomTheme(enabled, bg, key, accent)
                themeManager.saveCustomTextAndCapsColors(text, capsNeutral, capsMedium, capsStrong, capsStrongText)
                onThemeChanged()
            } catch (_: Exception) {
            }
        }

        val enabledCheck = android.widget.CheckBox(context).apply {
            text = context.getString(R.string.check_enable_custom_theme)
            isChecked = initialEnabled
        }

        val bgInput = EditText(context).apply {
            hint = context.getString(R.string.hint_hex_bg)
            setText(String.format("#%06X", (0xFFFFFF and initialBg)))
        }
        val keyInput = EditText(context).apply {
            hint = context.getString(R.string.hint_hex_key)
            setText(String.format("#%06X", (0xFFFFFF and initialKey)))
        }
        val accentInput = EditText(context).apply {
            hint = context.getString(R.string.hint_hex_accent)
            setText(String.format("#%06X", (0xFFFFFF and initialAccent)))
        }
        val textInput = EditText(context).apply {
            hint = context.getString(R.string.hint_hex_text)
            setText(String.format("#%06X", (0xFFFFFF and initialText)))
        }
        val capsNeutralInput = EditText(context).apply {
            hint = context.getString(R.string.hint_hex_caps_neutral)
            setText(if (initialCapsNeutral == 0) "" else String.format("#%06X", (0xFFFFFF and initialCapsNeutral)))
        }
        val capsMediumInput = EditText(context).apply {
            hint = context.getString(R.string.hint_hex_caps_medium)
            setText(if (initialCapsMedium == 0) "" else String.format("#%06X", (0xFFFFFF and initialCapsMedium)))
        }
        val capsStrongInput = EditText(context).apply {
            hint = context.getString(R.string.hint_hex_caps_strong)
            setText(if (initialCapsStrong == 0) "" else String.format("#%06X", (0xFFFFFF and initialCapsStrong)))
        }
        val capsStrongTextInput = EditText(context).apply {
            hint = context.getString(R.string.hint_hex_caps_strong_text)
            setText(String.format("#%06X", (0xFFFFFF and initialCapsStrongText)))
        }

        val textWatcher = object : TextWatcher {
            override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) {}
            override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) {}
            override fun afterTextChanged(s: Editable?) {
                updateTheme(
                    enabledCheck.isChecked,
                    bgInput.text.toString(),
                    keyInput.text.toString(),
                    accentInput.text.toString(),
                    textInput.text.toString(),
                    if (capsNeutralInput.text.toString().isBlank()) "#00000000" else capsNeutralInput.text.toString(),
                    if (capsMediumInput.text.toString().isBlank()) "#00000000" else capsMediumInput.text.toString(),
                    if (capsStrongInput.text.toString().isBlank()) "#00000000" else capsStrongInput.text.toString(),
                    capsStrongTextInput.text.toString()
                )
            }
        }

        bgInput.addTextChangedListener(textWatcher)
        keyInput.addTextChangedListener(textWatcher)
        accentInput.addTextChangedListener(textWatcher)
        textInput.addTextChangedListener(textWatcher)
        capsNeutralInput.addTextChangedListener(textWatcher)
        capsMediumInput.addTextChangedListener(textWatcher)
        capsStrongInput.addTextChangedListener(textWatcher)
        capsStrongTextInput.addTextChangedListener(textWatcher)
        enabledCheck.setOnCheckedChangeListener { _, isChecked ->
            updateTheme(
                isChecked,
                bgInput.text.toString(),
                keyInput.text.toString(),
                accentInput.text.toString(),
                textInput.text.toString(),
                if (capsNeutralInput.text.toString().isBlank()) "#00000000" else capsNeutralInput.text.toString(),
                if (capsMediumInput.text.toString().isBlank()) "#00000000" else capsMediumInput.text.toString(),
                if (capsStrongInput.text.toString().isBlank()) "#00000000" else capsStrongInput.text.toString(),
                capsStrongTextInput.text.toString()
            )
        }

        layout.addView(enabledCheck)
        layout.addView(bgInput)
        layout.addView(keyInput)
        layout.addView(accentInput)
        layout.addView(textInput)
        layout.addView(capsNeutralInput)
        layout.addView(capsMediumInput)
        layout.addView(capsStrongInput)
        layout.addView(capsStrongTextInput)

        showDialog(context.getString(R.string.dialog_custom_theme_title)) { builder ->
            builder.setView(layout)
                .setPositiveButton(context.getString(R.string.btn_ok)) { _, _ ->
                    openVisualStylesDialog()
                }
                .setNegativeButton(context.getString(R.string.btn_cancel)) { _, _ ->
                    themeManager.saveCustomTheme(initialEnabled, initialBg, initialKey, initialAccent)
                    themeManager.saveCustomTextAndCapsColors(initialText, initialCapsNeutral, initialCapsMedium, initialCapsStrong, initialCapsStrongText)
                    onThemeChanged()
                    openVisualStylesDialog()
                }
                .setOnCancelListener {
                    themeManager.saveCustomTheme(initialEnabled, initialBg, initialKey, initialAccent)
                    themeManager.saveCustomTextAndCapsColors(initialText, initialCapsNeutral, initialCapsMedium, initialCapsStrong, initialCapsStrongText)
                    onThemeChanged()
                    openVisualStylesDialog()
                }
        }
    }

    fun openTypographyDialog() {
        val layout = LinearLayout(context).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(px10 * 2, px10, px10 * 2, px10)
        }

        val prefs = context.getSharedPreferences(KeyboardThemeManager.PREFS_NAME, Context.MODE_PRIVATE)
        val initialFamily = prefs.getString(KeyboardThemeManager.PREF_KEY_FONT_FAMILY, "") ?: ""
        val initialStyle = prefs.getInt(KeyboardThemeManager.PREF_KEY_FONT_STYLE, android.graphics.Typeface.NORMAL)
        val initialKey = prefs.getFloat(KeyboardThemeManager.PREF_KEY_KEY_TEXT_SIZE_SP, 15f)
        val initialSuggestion = prefs.getFloat(KeyboardThemeManager.PREF_KEY_SUGGESTION_TEXT_SIZE_SP, 14f)
        val initialSelection = prefs.getFloat(KeyboardThemeManager.PREF_KEY_SELECTION_TEXT_SIZE_SP, 14f)
        val initialClipboard = prefs.getFloat(KeyboardThemeManager.PREF_KEY_CLIPBOARD_TEXT_SIZE_SP, 14f)
        val initialPreview = prefs.getFloat(KeyboardThemeManager.PREF_KEY_KEY_PREVIEW_TEXT_SIZE_SP, 30f)
        val initialAccent = prefs.getFloat(KeyboardThemeManager.PREF_KEY_ACCENT_TEXT_SIZE_SP, 22f)
        val initialHintFactor = prefs.getFloat(KeyboardThemeManager.PREF_KEY_HINT_TEXT_SIZE_FACTOR, 0.6f)

        val familyInput = EditText(context).apply {
            hint = context.getString(R.string.hint_font_family)
            setText(initialFamily)
        }

        val styleLabel = TextView(context).apply {
            text = context.getString(R.string.label_font_style_fmt, initialStyle)
        }
        val styleSeek = SeekBar(context).apply {
            max = 3
            progress = initialStyle.coerceIn(0, 3)
            setOnSeekBarChangeListener(object : SeekBar.OnSeekBarChangeListener {
                override fun onProgressChanged(seekBar: SeekBar?, progress: Int, fromUser: Boolean) {
                    styleLabel.text = context.getString(R.string.label_font_style_fmt, progress)
                }
                override fun onStartTrackingTouch(seekBar: SeekBar?) {}
                override fun onStopTrackingTouch(seekBar: SeekBar?) {}
            })
        }

        val addSizeSeek = { labelResId: Int, value: Float, min: Int, max: Int ->
            val tv = TextView(context).apply { text = context.getString(labelResId, value.toInt()) }
            val seek = SeekBar(context).apply {
                this.max = max - min
                progress = (value.toInt() - min).coerceAtLeast(0)
                setOnSeekBarChangeListener(object : SeekBar.OnSeekBarChangeListener {
                    override fun onProgressChanged(seekBar: SeekBar?, progress: Int, fromUser: Boolean) {
                        val v = min + progress
                        tv.text = context.getString(labelResId, v)
                    }
                    override fun onStartTrackingTouch(seekBar: SeekBar?) {}
                    override fun onStopTrackingTouch(seekBar: SeekBar?) {}
                })
            }
            layout.addView(tv)
            layout.addView(seek)
            Pair(tv, seek)
        }

        val keySeek = addSizeSeek(R.string.label_key_text_size_fmt, initialKey, 8, 40)
        val suggestionSeek = addSizeSeek(R.string.label_suggestion_text_size_fmt, initialSuggestion, 8, 40)
        val selectionSeek = addSizeSeek(R.string.label_selection_text_size_fmt, initialSelection, 8, 40)
        val clipboardSeek = addSizeSeek(R.string.label_clipboard_text_size_fmt, initialClipboard, 8, 40)
        val previewSeek = addSizeSeek(R.string.label_preview_text_size_fmt, initialPreview, 12, 64)
        val accentSeek = addSizeSeek(R.string.label_accent_text_size_fmt, initialAccent, 12, 48)

        val hintLabel = TextView(context).apply {
            text = context.getString(R.string.label_hint_size_factor_fmt, (initialHintFactor * 100).toInt())
        }
        val hintSeek = SeekBar(context).apply {
            max = 100
            progress = (initialHintFactor * 100).toInt().coerceIn(0, 100)
            setOnSeekBarChangeListener(object : SeekBar.OnSeekBarChangeListener {
                override fun onProgressChanged(seekBar: SeekBar?, progress: Int, fromUser: Boolean) {
                    hintLabel.text = context.getString(R.string.label_hint_size_factor_fmt, progress)
                }
                override fun onStartTrackingTouch(seekBar: SeekBar?) {}
                override fun onStopTrackingTouch(seekBar: SeekBar?) {}
            })
        }

        layout.addView(familyInput)
        layout.addView(styleLabel)
        layout.addView(styleSeek)
        layout.addView(hintLabel)
        layout.addView(hintSeek)

        showDialog(context.getString(R.string.dialog_typography_title)) { builder ->
            builder.setView(layout)
                .setPositiveButton(context.getString(R.string.btn_ok)) { _, _ ->
                    val family = familyInput.text.toString()
                    val style = styleSeek.progress
                    val keySp = 8 + keySeek.second.progress
                    val suggestionSp = 8 + suggestionSeek.second.progress
                    val selectionSp = 8 + selectionSeek.second.progress
                    val clipboardSp = 8 + clipboardSeek.second.progress
                    val previewSp = 12 + previewSeek.second.progress
                    val accentSp = 12 + accentSeek.second.progress
                    val hintFactor = hintSeek.progress / 100f
                    themeManager.saveTypography(
                        family,
                        style,
                        keySp.toFloat(),
                        suggestionSp.toFloat(),
                        selectionSp.toFloat(),
                        clipboardSp.toFloat(),
                        previewSp.toFloat(),
                        accentSp.toFloat(),
                        hintFactor,
                    )
                    onRebuild()
                    onThemeChanged()
                    openVisualStylesDialog()
                }
                .setNegativeButton(context.getString(R.string.btn_cancel)) { _, _ ->
                    themeManager.saveTypography(
                        initialFamily,
                        initialStyle,
                        initialKey,
                        initialSuggestion,
                        initialSelection,
                        initialClipboard,
                        initialPreview,
                        initialAccent,
                        initialHintFactor,
                    )
                    onRebuild()
                    onThemeChanged()
                    openVisualStylesDialog()
                }
                .setOnCancelListener {
                    themeManager.saveTypography(
                        initialFamily,
                        initialStyle,
                        initialKey,
                        initialSuggestion,
                        initialSelection,
                        initialClipboard,
                        initialPreview,
                        initialAccent,
                        initialHintFactor,
                    )
                    onRebuild()
                    onThemeChanged()
                    openVisualStylesDialog()
                }
        }
    }

    fun openKeyShapeDialog() {
        val layout = LinearLayout(context).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(px10 * 2, px10, px10 * 2, px10)
        }

        val prefs = context.getSharedPreferences(KeyboardThemeManager.PREFS_NAME, Context.MODE_PRIVATE)
        val initialPaddingH = prefs.getInt(KeyboardThemeManager.PREF_KEY_KEY_PADDING_H_DP, 10)
        val initialPaddingV = prefs.getInt(KeyboardThemeManager.PREF_KEY_KEY_PADDING_V_DP, 10)
        val initialMinW = prefs.getInt(KeyboardThemeManager.PREF_KEY_KEY_MIN_WIDTH_DP, 36)
        val initialMinH = prefs.getInt(KeyboardThemeManager.PREF_KEY_KEY_MIN_HEIGHT_DP, 52)
        val initialMinWideW = prefs.getInt(KeyboardThemeManager.PREF_KEY_KEY_MIN_WIDE_WIDTH_DP, 64)
        val initialRowH = prefs.getInt(KeyboardThemeManager.PREF_KEY_KEY_ROW_HEIGHT_DP, 56)
        val initialSugH = prefs.getInt(KeyboardThemeManager.PREF_KEY_SUGGESTION_BAR_HEIGHT_DP, 56)
        val initialSelH = prefs.getInt(KeyboardThemeManager.PREF_KEY_SELECTION_BAR_HEIGHT_DP, 56)
        val initialClipH = prefs.getInt(KeyboardThemeManager.PREF_KEY_CLIPBOARD_BAR_HEIGHT_DP, 56)
        val initialStrokeW = prefs.getInt(KeyboardThemeManager.PREF_KEY_KEY_STROKE_WIDTH_DP, 1)
        val initialStrokeC = prefs.getInt(KeyboardThemeManager.PREF_KEY_KEY_STROKE_COLOR, Color.TRANSPARENT)
        val initialGradTop = prefs.getFloat(KeyboardThemeManager.PREF_KEY_KEY_GRADIENT_TOP_BLEND, 0.10f)
        val initialGradBottom = prefs.getFloat(KeyboardThemeManager.PREF_KEY_KEY_GRADIENT_BOTTOM_BLEND, 0.04f)
        val initialElevation = prefs.getInt(KeyboardThemeManager.PREF_KEY_KEY_ELEVATION_DP, 2)
        val initialShadowRadius = prefs.getInt(KeyboardThemeManager.PREF_KEY_KEY_SHADOW_RADIUS_DP, 0)
        val initialShadowDx = prefs.getInt(KeyboardThemeManager.PREF_KEY_KEY_SHADOW_DX_DP, 0)
        val initialShadowDy = prefs.getInt(KeyboardThemeManager.PREF_KEY_KEY_SHADOW_DY_DP, 0)
        val initialShadowColor = prefs.getInt(KeyboardThemeManager.PREF_KEY_KEY_SHADOW_COLOR, Color.TRANSPARENT)
        val initialPreviewBorder = prefs.getInt(KeyboardThemeManager.PREF_KEY_KEY_PREVIEW_BORDER_WIDTH_DP, 1)
        val initialPreviewPadding = prefs.getInt(KeyboardThemeManager.PREF_KEY_KEY_PREVIEW_PADDING_DP, 10)

        val strokeInput = EditText(context).apply {
            hint = context.getString(R.string.hint_stroke_color)
            setText(if (initialStrokeC == Color.TRANSPARENT) "" else String.format("#%06X", (0xFFFFFF and initialStrokeC)))
        }
        val shadowInput = EditText(context).apply {
            hint = context.getString(R.string.hint_shadow_color)
            setText(if (initialShadowColor == Color.TRANSPARENT) "" else String.format("#%06X", (0xFFFFFF and initialShadowColor)))
        }

        val addSeek = { labelResId: Int, initial: Int, max: Int ->
            val tv = TextView(context).apply { text = context.getString(labelResId, initial) }
            val seek = SeekBar(context).apply {
                this.max = max
                progress = initial.coerceIn(0, max)
                setOnSeekBarChangeListener(object : SeekBar.OnSeekBarChangeListener {
                    override fun onProgressChanged(seekBar: SeekBar?, progress: Int, fromUser: Boolean) {
                        tv.text = context.getString(labelResId, progress)
                    }
                    override fun onStartTrackingTouch(seekBar: SeekBar?) {}
                    override fun onStopTrackingTouch(seekBar: SeekBar?) {}
                })
            }
            layout.addView(tv)
            layout.addView(seek)
            seek
        }

        val paddingHSeek = addSeek(R.string.label_padding_h_fmt, initialPaddingH, 40)
        val paddingVSeek = addSeek(R.string.label_padding_v_fmt, initialPaddingV, 40)
        val minWSeek = addSeek(R.string.label_min_width_fmt, initialMinW, 120)
        val minHSeek = addSeek(R.string.label_min_height_fmt, initialMinH, 120)
        val minWideWSeek = addSeek(R.string.label_min_wide_width_fmt, initialMinWideW, 160)
        val rowHSeek = addSeek(R.string.label_row_height_fmt, initialRowH, 120)
        val sugHSeek = addSeek(R.string.label_suggestion_bar_height_fmt, initialSugH, 120)
        val selHSeek = addSeek(R.string.label_selection_bar_height_fmt, initialSelH, 120)
        val clipHSeek = addSeek(R.string.label_clipboard_bar_height_fmt, initialClipH, 120)
        val strokeWSeek = addSeek(R.string.label_stroke_width_fmt, initialStrokeW, 20)
        val elevationSeek = addSeek(R.string.label_elevation_fmt, initialElevation, 20)
        val shadowRadiusSeek = addSeek(R.string.label_shadow_radius_fmt, initialShadowRadius, 20)
        val shadowDxSeek = addSeek(R.string.label_shadow_dx_fmt, initialShadowDx, 20)
        val shadowDySeek = addSeek(R.string.label_shadow_dy_fmt, initialShadowDy, 20)
        val previewBorderSeek = addSeek(R.string.label_preview_border_fmt, initialPreviewBorder, 10)
        val previewPaddingSeek = addSeek(R.string.label_preview_padding_fmt, initialPreviewPadding, 30)

        val gradTopLabel = TextView(context).apply {
            text = context.getString(R.string.label_gradient_top_fmt, (initialGradTop * 100).toInt())
        }
        val gradTopSeek = SeekBar(context).apply {
            max = 100
            progress = (initialGradTop * 100).toInt().coerceIn(0, 100)
            setOnSeekBarChangeListener(object : SeekBar.OnSeekBarChangeListener {
                override fun onProgressChanged(seekBar: SeekBar?, progress: Int, fromUser: Boolean) {
                    gradTopLabel.text = context.getString(R.string.label_gradient_top_fmt, progress)
                }
                override fun onStartTrackingTouch(seekBar: SeekBar?) {}
                override fun onStopTrackingTouch(seekBar: SeekBar?) {}
            })
        }

        val gradBottomLabel = TextView(context).apply {
            text = context.getString(R.string.label_gradient_bottom_fmt, (initialGradBottom * 100).toInt())
        }
        val gradBottomSeek = SeekBar(context).apply {
            max = 100
            progress = (initialGradBottom * 100).toInt().coerceIn(0, 100)
            setOnSeekBarChangeListener(object : SeekBar.OnSeekBarChangeListener {
                override fun onProgressChanged(seekBar: SeekBar?, progress: Int, fromUser: Boolean) {
                    gradBottomLabel.text = context.getString(R.string.label_gradient_bottom_fmt, progress)
                }
                override fun onStartTrackingTouch(seekBar: SeekBar?) {}
                override fun onStopTrackingTouch(seekBar: SeekBar?) {}
            })
        }

        layout.addView(gradTopLabel)
        layout.addView(gradTopSeek)
        layout.addView(gradBottomLabel)
        layout.addView(gradBottomSeek)
        layout.addView(strokeInput)
        layout.addView(shadowInput)

        showDialog(context.getString(R.string.dialog_key_shape_title)) { builder ->
            builder.setView(layout)
                .setPositiveButton(context.getString(R.string.btn_ok)) { _, _ ->
                    val strokeColor = runCatching {
                        if (strokeInput.text.toString().isBlank()) Color.TRANSPARENT else strokeInput.text.toString().toColorInt()
                    }.getOrElse { Color.TRANSPARENT }
                    val shadowColor = runCatching {
                        if (shadowInput.text.toString().isBlank()) Color.TRANSPARENT else shadowInput.text.toString().toColorInt()
                    }.getOrElse { Color.TRANSPARENT }
                    themeManager.saveKeyShape(
                        paddingHSeek.progress,
                        paddingVSeek.progress,
                        minWSeek.progress,
                        minHSeek.progress,
                        minWideWSeek.progress,
                        rowHSeek.progress,
                        sugHSeek.progress,
                        selHSeek.progress,
                        clipHSeek.progress,
                        strokeWSeek.progress,
                        strokeColor,
                        gradTopSeek.progress / 100f,
                        gradBottomSeek.progress / 100f,
                        elevationSeek.progress,
                        shadowRadiusSeek.progress,
                        shadowDxSeek.progress,
                        shadowDySeek.progress,
                        shadowColor,
                        previewBorderSeek.progress,
                        previewPaddingSeek.progress,
                    )
                    onRebuild()
                    onThemeChanged()
                    openVisualStylesDialog()
                }
                .setNegativeButton(context.getString(R.string.btn_cancel)) { _, _ ->
                    themeManager.saveKeyShape(
                        initialPaddingH,
                        initialPaddingV,
                        initialMinW,
                        initialMinH,
                        initialMinWideW,
                        initialRowH,
                        initialSugH,
                        initialSelH,
                        initialClipH,
                        initialStrokeW,
                        initialStrokeC,
                        initialGradTop,
                        initialGradBottom,
                        initialElevation,
                        initialShadowRadius,
                        initialShadowDx,
                        initialShadowDy,
                        initialShadowColor,
                        initialPreviewBorder,
                        initialPreviewPadding,
                    )
                    onRebuild()
                    onThemeChanged()
                    openVisualStylesDialog()
                }
                .setOnCancelListener {
                    themeManager.saveKeyShape(
                        initialPaddingH,
                        initialPaddingV,
                        initialMinW,
                        initialMinH,
                        initialMinWideW,
                        initialRowH,
                        initialSugH,
                        initialSelH,
                        initialClipH,
                        initialStrokeW,
                        initialStrokeC,
                        initialGradTop,
                        initialGradBottom,
                        initialElevation,
                        initialShadowRadius,
                        initialShadowDx,
                        initialShadowDy,
                        initialShadowColor,
                        initialPreviewBorder,
                        initialPreviewPadding,
                    )
                    onRebuild()
                    onThemeChanged()
                    openVisualStylesDialog()
                }
        }
    }

    fun openAnimationDialog() {
        val prefs = context.getSharedPreferences(KeyboardThemeManager.PREFS_NAME, Context.MODE_PRIVATE)
        val initialDuration = prefs.getLong(KeyboardThemeManager.PREF_KEY_ANIM_DURATION_MS, 120L)
        val initialInterpolator = prefs.getString(KeyboardThemeManager.PREF_KEY_ANIM_INTERPOLATOR, "accelerateDecelerate") ?: "accelerateDecelerate"

        val layout = LinearLayout(context).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(px10 * 2, px10, px10 * 2, px10)
        }

        val durationLabel = TextView(context).apply {
            text = context.getString(R.string.label_duration_ms_fmt, initialDuration)
        }
        val durationSeek = SeekBar(context).apply {
            max = 1000
            progress = initialDuration.toInt().coerceIn(0, 1000)
            setOnSeekBarChangeListener(object : SeekBar.OnSeekBarChangeListener {
                override fun onProgressChanged(seekBar: SeekBar?, progress: Int, fromUser: Boolean) {
                    durationLabel.text = context.getString(R.string.label_duration_ms_fmt, progress)
                }
                override fun onStartTrackingTouch(seekBar: SeekBar?) {}
                override fun onStopTrackingTouch(seekBar: SeekBar?) {}
            })
        }

        val interpolatorValues = arrayOf("accelerateDecelerate", "linear", "accelerate", "decelerate", "overshoot", "bounce")
        val interpolatorLabels = arrayOf(
            context.getString(R.string.interpolator_accelerate_decelerate),
            context.getString(R.string.interpolator_linear),
            context.getString(R.string.interpolator_accelerate),
            context.getString(R.string.interpolator_decelerate),
            context.getString(R.string.interpolator_overshoot),
            context.getString(R.string.interpolator_bounce),
        )
        val initialIndex = interpolatorValues.indexOf(initialInterpolator).takeIf { it >= 0 } ?: 0
        val interpolatorLabel = TextView(context).apply {
            text = context.getString(R.string.label_interpolator_fmt, interpolatorLabels[initialIndex])
        }

        layout.addView(durationLabel)
        layout.addView(durationSeek)
        layout.addView(interpolatorLabel)

        showDialog(context.getString(R.string.dialog_animations_title)) { builder ->
            builder.setView(layout)
                .setSingleChoiceItems(interpolatorLabels, initialIndex) { dialogInterface, which ->
                    interpolatorLabel.text = context.getString(R.string.label_interpolator_fmt, interpolatorLabels[which])
                    themeManager.saveAnimation(durationSeek.progress.toLong(), interpolatorValues[which])
                    onRebuild()
                    onThemeChanged()
                    dialogInterface.dismiss()
                    openVisualStylesDialog()
                }
                .setNegativeButton(context.getString(R.string.btn_cancel)) { _, _ ->
                    themeManager.saveAnimation(initialDuration, initialInterpolator)
                    onRebuild()
                    onThemeChanged()
                    openVisualStylesDialog()
                }
                .setOnCancelListener {
                    themeManager.saveAnimation(initialDuration, initialInterpolator)
                    onRebuild()
                    onThemeChanged()
                    openVisualStylesDialog()
                }
        }
    }

    fun openThemeModeConfigDialog() {
        val title = context.getString(R.string.dialog_theme_title)
        val closeLabel = context.getString(R.string.btn_close)
        val items = arrayOf(
            context.getString(R.string.option_dark),
            context.getString(R.string.option_light),
            context.getString(R.string.option_system)
        )
        val checked =
            when (themeManager.currentThemeMode) {
                KeyboardThemeManager.ThemeMode.DARK -> 0
                KeyboardThemeManager.ThemeMode.LIGHT -> 1
                KeyboardThemeManager.ThemeMode.SYSTEM -> 2
            }

        showDialog(title) { builder ->
            builder.setSingleChoiceItems(items, checked) { dialogInterface, which ->
                val selected =
                    when (which) {
                        0 -> KeyboardThemeManager.ThemeMode.DARK
                        1 -> KeyboardThemeManager.ThemeMode.LIGHT
                        else -> KeyboardThemeManager.ThemeMode.SYSTEM
                    }
                themeManager.currentThemeMode = selected
                themeManager.setSavedThemeMode(selected)
                onThemeChanged()
                dialogInterface.dismiss()
                openVisualStylesDialog()
            }
            .setNegativeButton(closeLabel) { dialogInterface, _ ->
                dialogInterface.dismiss()
                openVisualStylesDialog()
            }
            .setOnCancelListener {
                openVisualStylesDialog()
            }
        }
    }

    fun openBackgroundModeConfigDialog() {
        val title = context.getString(R.string.dialog_background_title)
        val closeLabel = context.getString(R.string.btn_close)
        val items = arrayOf(
            context.getString(R.string.option_transparent),
            context.getString(R.string.option_dark),
            context.getString(R.string.option_light),
            context.getString(R.string.option_system)
        )
        val checked =
            when (themeManager.currentBackgroundMode) {
                KeyboardThemeManager.BackgroundMode.TRANSPARENT -> 0
                KeyboardThemeManager.BackgroundMode.DARK -> 1
                KeyboardThemeManager.BackgroundMode.LIGHT -> 2
                KeyboardThemeManager.BackgroundMode.SYSTEM -> 3
            }

        showDialog(title) { builder ->
            builder.setSingleChoiceItems(items, checked) { dialogInterface, which ->
                val selected =
                    when (which) {
                        0 -> KeyboardThemeManager.BackgroundMode.TRANSPARENT
                        1 -> KeyboardThemeManager.BackgroundMode.DARK
                        2 -> KeyboardThemeManager.BackgroundMode.LIGHT
                        else -> KeyboardThemeManager.BackgroundMode.SYSTEM
                    }
                themeManager.currentBackgroundMode = selected
                themeManager.setSavedBackgroundMode(selected)
                onThemeChanged()
                dialogInterface.dismiss()
                openVisualStylesDialog()
            }
            .setNegativeButton(closeLabel) { dialogInterface, _ ->
                dialogInterface.dismiss()
                openVisualStylesDialog()
            }
            .setOnCancelListener {
                openVisualStylesDialog()
            }
        }
    }

    private fun showDialog(title: String, setup: (AlertDialog.Builder) -> Unit) {
        val windowToken = getWindowToken() ?: return
        val builder = AlertDialog.Builder(context).setTitle(title)
        setup(builder)
        val dialog = builder.create()
        dialog.window?.apply {
            setType(WindowManager.LayoutParams.TYPE_APPLICATION_ATTACHED_DIALOG)
            attributes?.token = windowToken
            addFlags(WindowManager.LayoutParams.FLAG_ALT_FOCUSABLE_IM)
        }
        dialog.show()
    }
}
