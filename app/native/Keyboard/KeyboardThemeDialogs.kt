package com.package.name

import android.app.AlertDialog
import android.content.Context
import android.graphics.Color
import android.os.IBinder
import android.text.Editable
import android.text.TextWatcher
import android.util.TypedValue
import android.view.WindowManager
import android.widget.CheckBox
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.SeekBar
import android.widget.TextView
import androidx.core.graphics.toColorInt

class KeyboardThemeDialogs(
    private val context: Context,
    private val themeManager: KeyboardThemeManager,
    private val onThemeChanged: () -> Unit,
    private val onRebuild: () -> Unit,
    private val onNavigate: (String) -> Unit,
    private val getWindowToken: () -> IBinder?,
) {
    private val px10 = TypedValue.applyDimension(
        TypedValue.COMPLEX_UNIT_DIP,
        10f,
        context.resources.displayMetrics,
    ).toInt()

    fun openVisualStylesDialog() {
        val items = arrayOf(
            context.getString(R.string.item_corner_radius),
            context.getString(R.string.item_theme_mode),
            context.getString(R.string.item_background),
            context.getString(R.string.item_custom_theme),
            context.getString(R.string.item_typography),
            context.getString(R.string.item_key_shape),
            context.getString(R.string.item_animations),
        )

        showDialog(context.getString(R.string.dialog_visual_style_title)) { builder ->
            builder
                .setItems(items) { dialogInterface, which ->
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
            builder
                .setView(layout)
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
                    fromUser: Boolean,
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
            builder
                .setView(layout)
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

        val enabledCheck = CheckBox(context).apply {
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
                    capsStrongTextInput.text.toString(),
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
                capsStrongTextInput.text.toString(),
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
            builder
                .setView(layout)
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
            builder
                .setView(layout)
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
            builder
                .setView(layout)
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
        val initialInterpolator = prefs.getString(KeyboardThemeManager.PREF_KEY_ANIM_INTERPOLATOR, "accelerateDecelerate")
            ?: "accelerateDecelerate"

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
            builder
                .setView(layout)
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
            context.getString(R.string.option_system),
        )
        val checked =
            when (themeManager.currentThemeMode) {
                KeyboardThemeManager.ThemeMode.DARK -> 0
                KeyboardThemeManager.ThemeMode.LIGHT -> 1
                KeyboardThemeManager.ThemeMode.SYSTEM -> 2
            }

        showDialog(title) { builder ->
            builder
                .setSingleChoiceItems(items, checked) { dialogInterface, which ->
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
            context.getString(R.string.option_system),
        )
        val checked =
            when (themeManager.currentBackgroundMode) {
                KeyboardThemeManager.BackgroundMode.TRANSPARENT -> 0
                KeyboardThemeManager.BackgroundMode.DARK -> 1
                KeyboardThemeManager.BackgroundMode.LIGHT -> 2
                KeyboardThemeManager.BackgroundMode.SYSTEM -> 3
            }

        showDialog(title) { builder ->
            builder
                .setSingleChoiceItems(items, checked) { dialogInterface, which ->
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
