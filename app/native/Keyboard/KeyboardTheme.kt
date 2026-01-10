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
import android.widget.Button
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

    var customThemeEnabled: Boolean = false
    var customBgColor: Int = 0
    var customKeyColor: Int = 0
    var customAccentColor: Int = 0

    private val prefs: SharedPreferences by lazy {
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
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

        paletteCapsNeutralColor = paletteKeyBackgroundColor
        paletteCapsStrongColor = paletteAccentColor
        paletteCapsMediumColor = blendColors(paletteKeyBackgroundColor, paletteAccentColor, 0.45f)
        paletteCapsStrongTextColor =
            if (isColorDark(paletteCapsStrongColor)) Color.WHITE else Color.BLACK
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
        val topBlend = if (pressed) 0.22f else 0.10f
        val bottomBlend = if (pressed) 0.14f else 0.04f

        val top = blendColors(baseColor, paletteAccentColor, topBlend)
        val bottom = blendColors(baseColor, paletteAccentColor, bottomBlend)

        return GradientDrawable(
            GradientDrawable.Orientation.TOP_BOTTOM,
            intArrayOf(top, bottom),
        ).apply {
            cornerRadius = cornerRadiusPx.toFloat()
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

    companion object {
        const val PREFS_NAME = "custom_keyboard_prefs"
        const val PREF_KEY_THEME_MODE = "theme_mode"
        const val PREF_KEY_BACKGROUND_MODE = "background_mode"
        const val PREF_KEY_CORNER_RADIUS = "corner_radius"
        const val PREF_KEY_CUSTOM_THEME_ENABLED = "custom_theme_enabled"
        const val PREF_KEY_CUSTOM_BG_COLOR = "custom_bg_color"
        const val PREF_KEY_CUSTOM_KEY_COLOR = "custom_key_color"
        const val PREF_KEY_CUSTOM_ACCENT_COLOR = "custom_accent_color"
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
            context.getString(R.string.item_custom_theme)
        )

        showDialog(context.getString(R.string.dialog_visual_style_title)) { builder ->
            builder.setItems(items) { dialogInterface, which ->
                dialogInterface.dismiss()
                when (which) {
                    0 -> openCornerRadiusDialog()
                    1 -> openThemeModeConfigDialog()
                    2 -> openBackgroundModeConfigDialog()
                    3 -> openCustomThemeDialog()
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

        val updateTheme = { enabled: Boolean, bgStr: String, keyStr: String, accentStr: String ->
            try {
                val bg = bgStr.toColorInt()
                val key = keyStr.toColorInt()
                val accent = accentStr.toColorInt()

                themeManager.saveCustomTheme(enabled, bg, key, accent)
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

        val textWatcher = object : TextWatcher {
            override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) {}
            override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) {}
            override fun afterTextChanged(s: Editable?) {
                updateTheme(
                    enabledCheck.isChecked,
                    bgInput.text.toString(),
                    keyInput.text.toString(),
                    accentInput.text.toString()
                )
            }
        }

        bgInput.addTextChangedListener(textWatcher)
        keyInput.addTextChangedListener(textWatcher)
        accentInput.addTextChangedListener(textWatcher)
        enabledCheck.setOnCheckedChangeListener { _, isChecked ->
            updateTheme(
                isChecked,
                bgInput.text.toString(),
                keyInput.text.toString(),
                accentInput.text.toString()
            )
        }

        layout.addView(enabledCheck)
        layout.addView(bgInput)
        layout.addView(keyInput)
        layout.addView(accentInput)

        showDialog(context.getString(R.string.dialog_custom_theme_title)) { builder ->
            builder.setView(layout)
                .setPositiveButton(context.getString(R.string.btn_ok)) { _, _ ->
                    openVisualStylesDialog()
                }
                .setNegativeButton(context.getString(R.string.btn_cancel)) { _, _ ->
                    themeManager.saveCustomTheme(initialEnabled, initialBg, initialKey, initialAccent)
                    onThemeChanged()
                    openVisualStylesDialog()
                }
                .setOnCancelListener {
                    themeManager.saveCustomTheme(initialEnabled, initialBg, initialKey, initialAccent)
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
