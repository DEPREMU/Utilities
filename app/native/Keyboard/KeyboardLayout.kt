package com.package.name

import android.content.Context
import android.graphics.Color
import android.graphics.drawable.GradientDrawable
import android.text.TextUtils
import android.util.TypedValue
import android.view.Gravity
import android.view.HapticFeedbackConstants
import android.view.MotionEvent
import android.view.View
import android.view.ViewGroup
import android.widget.Button
import android.widget.FrameLayout
import android.widget.HorizontalScrollView
import android.widget.LinearLayout
import android.widget.PopupWindow
import android.widget.TextView
import com.package.name.R

interface KeyboardListenerProvider {
    fun getKeyClickListener(): View.OnClickListener
    fun getSuggestionClickListener(): View.OnClickListener
    fun getKeyTouchListener(key: String): View.OnTouchListener
    fun getKeyLongClickListener(key: String): View.OnLongClickListener?
    fun getCopyClickListener(): View.OnClickListener
    fun getCutClickListener(): View.OnClickListener
    fun getClipboardItemClickListener(text: String): View.OnClickListener
    fun getClipboardItemLongClickListener(text: String): View.OnLongClickListener
    fun commitKey(key: String)
}

class KeyboardLayout(
    private val context: Context,
    private val themeManager: KeyboardThemeManager,
    private val listenerProvider: KeyboardListenerProvider
) {
    var rootLayout: LinearLayout? = null
        private set
    var suggestionsContainer: LinearLayout? = null
        private set
    var selectionActionsContainer: LinearLayout? = null
        private set
    var clipboardContainer: LinearLayout? = null
        private set
    var clipboardScroll: HorizontalScrollView? = null
        private set
    var keyboardModesContainer: LinearLayout? = null
        private set
    var lettersKeyboardContainer: LinearLayout? = null
        private set
    var symbolsKeyboardContainer: LinearLayout? = null
        private set
    var specialKeyboardContainer: LinearLayout? = null
        private set

    var keyPreviewPopup: PopupWindow? = null
    var popupTextView: TextView? = null
    var accentPopup: PopupWindow? = null
    var accentPopupView: LinearLayout? = null
    var activeAccentView: TextView? = null

    val suggestionButtons: MutableList<Button?> = mutableListOf()
    val suggestionSlotValues: MutableList<String?> = mutableListOf()

    data class KeyButtonRef(
        val raw: String,
        val lower: String,
        val button: Button,
    )

    val keyButtonRefs: MutableList<KeyButtonRef> = mutableListOf()
    var capsButtonRef: Button? = null

    var px1: Int = 0
    var px4: Int = 0
    var px6: Int = 0
    var px8: Int = 0
    var px10: Int = 0
    var px36: Int = 0
    var px44: Int = 0
    var px52: Int = 0
    var px56: Int = 0
    var px64: Int = 0
    var keyTextSizePx: Float = 0f
    var keyGapPx: Int = 0
    var keyMinWidthPx: Int = 0
    var keyMinHeightPx: Int = 0
    var keyMinWideWidthPx: Int = 0
    var keyRowHeightPx: Int = 0
    var suggestionBarHeightPx: Int = 0
    var selectionBarHeightPx: Int = 0
    var clipboardBarHeightPx: Int = 0
    var suggestionTextSizePx: Float = 0f
    var selectionTextSizePx: Float = 0f
    var clipboardTextSizePx: Float = 0f
    var keyPreviewTextSizePx: Float = 0f
    var accentTextSizePx: Float = 0f
    var hintTextSizeFactor: Float = 0f
    var keyPaddingHorizontalPx: Int = 0
    var keyPaddingVerticalPx: Int = 0
    var keyPreviewPaddingPx: Int = 0
    var keyPreviewBorderWidthPx: Int = 0
    var keyElevationPx: Float = 0f

    var keyWeightOverrides: Map<String, Float> = emptyMap()

    fun updatePxValues(
        px1: Int, px4: Int, px6: Int, px8: Int, px10: Int, px36: Int,
        px44: Int, px52: Int, px56: Int, px64: Int,
        keyTextSizePx: Float, keyGapPx: Int,
        keyMinWidthPx: Int,
        keyMinHeightPx: Int,
        keyMinWideWidthPx: Int,
        keyRowHeightPx: Int,
        suggestionBarHeightPx: Int,
        selectionBarHeightPx: Int,
        clipboardBarHeightPx: Int,
        suggestionTextSizePx: Float,
        selectionTextSizePx: Float,
        clipboardTextSizePx: Float,
        keyPreviewTextSizePx: Float,
        accentTextSizePx: Float,
        hintTextSizeFactor: Float,
        keyPaddingHorizontalPx: Int,
        keyPaddingVerticalPx: Int,
        keyPreviewPaddingPx: Int,
        keyPreviewBorderWidthPx: Int,
        keyElevationPx: Float,
    ) {
        this.px1 = px1
        this.px4 = px4
        this.px6 = px6
        this.px8 = px8
        this.px10 = px10
        this.px36 = px36
        this.px44 = px44
        this.px52 = px52
        this.px56 = px56
        this.px64 = px64
        this.keyTextSizePx = keyTextSizePx
        this.keyGapPx = keyGapPx
        this.keyMinWidthPx = keyMinWidthPx
        this.keyMinHeightPx = keyMinHeightPx
        this.keyMinWideWidthPx = keyMinWideWidthPx
        this.keyRowHeightPx = keyRowHeightPx
        this.suggestionBarHeightPx = suggestionBarHeightPx
        this.selectionBarHeightPx = selectionBarHeightPx
        this.clipboardBarHeightPx = clipboardBarHeightPx
        this.suggestionTextSizePx = suggestionTextSizePx
        this.selectionTextSizePx = selectionTextSizePx
        this.clipboardTextSizePx = clipboardTextSizePx
        this.keyPreviewTextSizePx = keyPreviewTextSizePx
        this.accentTextSizePx = accentTextSizePx
        this.hintTextSizeFactor = hintTextSizeFactor
        this.keyPaddingHorizontalPx = keyPaddingHorizontalPx
        this.keyPaddingVerticalPx = keyPaddingVerticalPx
        this.keyPreviewPaddingPx = keyPreviewPaddingPx
        this.keyPreviewBorderWidthPx = keyPreviewBorderWidthPx
        this.keyElevationPx = keyElevationPx
    }

    fun updateKeyWeightOverrides(overrides: Map<String, Float>) {
        keyWeightOverrides = overrides
    }

    fun createRootLayout(): LinearLayout {
        val layout = LinearLayout(context).apply {
            orientation = LinearLayout.VERTICAL
            layoutParams =
                LinearLayout.LayoutParams(
                    ViewGroup.LayoutParams.MATCH_PARENT,
                    ViewGroup.LayoutParams.WRAP_CONTENT,
                )
            setBackgroundColor(themeManager.paletteBackgroundColor)
            setPadding(px8, px8, px8, px8)
        }
        rootLayout = layout
        return layout
    }

    fun rebuildLayout(
        lettersLayout: List<List<String>>,
        symbolsLayout: List<List<String>>,
        specialLayout: List<List<String>>,
        capsVisualMode: CustomKeyboard.CapsMode
    ) {
        val root = rootLayout ?: return
        root.removeAllViews()

        val (scroll, container) = createClipboardContainer()
        clipboardScroll = scroll
        clipboardContainer = container
        root.addView(scroll)

        val barContainer = FrameLayout(context).apply {
            layoutParams = LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
            )
        }
        root.addView(barContainer)

        selectionActionsContainer = createSelectionActionsContainer()
        suggestionsContainer = createSuggestionsContainer()

        barContainer.addView(suggestionsContainer)
        barContainer.addView(selectionActionsContainer)

        keyboardModesContainer =
            LinearLayout(context).apply {
                orientation = LinearLayout.VERTICAL
                layoutParams =
                    LinearLayout.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT,
                        ViewGroup.LayoutParams.WRAP_CONTENT,
                    )
            }
        root.addView(keyboardModesContainer)

        lettersKeyboardContainer = createKeyboardContainer()
        symbolsKeyboardContainer = createKeyboardContainer()
        specialKeyboardContainer = createKeyboardContainer()

        keyboardModesContainer?.addView(lettersKeyboardContainer)
        keyboardModesContainer?.addView(symbolsKeyboardContainer)
        keyboardModesContainer?.addView(specialKeyboardContainer)

        updateKeyboardModeContainers(lettersLayout, symbolsLayout, specialLayout, capsVisualMode)
    }

    private fun createKeyboardContainer(): LinearLayout {
        return LinearLayout(context).apply {
            orientation = LinearLayout.VERTICAL
            layoutParams =
                LinearLayout.LayoutParams(
                    ViewGroup.LayoutParams.MATCH_PARENT,
                    ViewGroup.LayoutParams.WRAP_CONTENT,
                )
            visibility = View.GONE
        }
    }

    fun updateKeyboardModeContainers(
        lettersLayout: List<List<String>>,
        symbolsLayout: List<List<String>>,
        specialLayout: List<List<String>>,
        capsVisualMode: CustomKeyboard.CapsMode
    ) {
        val letters = lettersKeyboardContainer ?: return
        val symbols = symbolsKeyboardContainer ?: return
        val special = specialKeyboardContainer ?: return

        keyButtonRefs.clear()
        capsButtonRef = null

        updateKeyboardContainer(letters, lettersLayout, capsVisualMode, true)
        updateKeyboardContainer(symbols, symbolsLayout, capsVisualMode, false)
        updateKeyboardContainer(special, specialLayout, capsVisualMode, false)
    }

    private fun updateKeyboardContainer(
        container: LinearLayout,
        layout: List<List<String>>,
        capsVisualMode: CustomKeyboard.CapsMode,
        trackCapsKeys: Boolean
    ) {
        if (container.childCount != layout.size) {
            container.removeAllViews()
            buildKeyboardRows(container, layout, capsVisualMode, trackCapsKeys)
            return
        }

        for (i in layout.indices) {
            val rowLayout = container.getChildAt(i) as? LinearLayout
            val rowKeys = layout[i]
            
            if (rowLayout == null || rowLayout.childCount != rowKeys.size) {
                container.removeAllViews()
                buildKeyboardRows(container, layout, capsVisualMode, trackCapsKeys)
                return
            }
            
            for (j in rowKeys.indices) {
                val keyView = rowLayout.getChildAt(j)
                val keyLabel = rowKeys[j]
                
                val button = if (keyView is FrameLayout) {
                    keyView.getChildAt(0) as? Button
                } else {
                    keyView as? Button
                }

                if (button != null) {
                    val oldTag = button.tag as? String
                    val normalized = keyLabel.trim()
                    val hints = CustomKeyboard.topRowMap[normalized.lowercase()]

                    if (!hints.isNullOrEmpty() && keyView !is FrameLayout) {
                        container.removeAllViews()
                        buildKeyboardRows(container, layout, capsVisualMode, trackCapsKeys)
                        return
                    }
                    if (keyView is FrameLayout && !hints.isNullOrEmpty()) {
                        val hintView = keyView.getChildAt(1) as? TextView
                        if (hintView != null) {
                            hintView.text = hints.take(4).joinToString(" ")
                            themeManager.applyTypography(hintView, keyTextSizePx * hintTextSizeFactor)
                            hintView.setTextColor(themeManager.paletteTextColor)
                            hintView.alpha = 0.6f
                        }
                    }
                    
                    if (oldTag != normalized) {
                        val oldLower = oldTag?.lowercase()
                        val newLower = normalized.lowercase()
                        
                        val oldHints = CustomKeyboard.topRowMap[oldLower]
                        val newHints = CustomKeyboard.topRowMap[newLower]
                        
                        if ((oldHints.isNullOrEmpty() && !newHints.isNullOrEmpty()) || 
                            (!oldHints.isNullOrEmpty() && newHints.isNullOrEmpty())) {
                             container.removeAllViews()
                             buildKeyboardRows(container, layout, capsVisualMode, trackCapsKeys)
                             return
                        }
                        
                        updateKeyButton(button, keyLabel, capsVisualMode)
                    }
                    
                    if (trackCapsKeys) {
                        val lower = normalized.lowercase()
                        if (lower == "caps") {
                            capsButtonRef = button
                            applyCapsButtonStyle(button, capsVisualMode)
                        }
                        keyButtonRefs.add(KeyButtonRef(raw = normalized, lower = lower, button = button))
                    }
                }
            }
        }
    }

    private fun updateKeyButton(button: Button, label: String, capsVisualMode: CustomKeyboard.CapsMode) {
        val normalized = label.trim()
        val lower = normalized.lowercase()
        
        val displayText =
            when (lower) {
                "backspace" -> "⌫"
                "enter" -> "⏎"
                "caps" -> "⇧"
                "123" -> "123"
                "{&=" -> "{&="
                "abc" -> "ABC"
                "tab" -> "Tab"
                "space" -> context.getString(R.string.key_space)
                else -> displayLabel(normalized, capsVisualMode)
            }
            
        button.text = displayText
        button.tag = normalized
        themeManager.applyTypography(button, keyTextSizePx)
        button.contentDescription = when (lower) {
             "backspace" -> context.getString(R.string.key_backspace)
             "enter" -> context.getString(R.string.key_enter)
             "caps" -> context.getString(R.string.key_caps)
             "tab" -> context.getString(R.string.key_tab)
             else -> if (displayText.length == 1 && displayText[0].isLetter()) displayText else displayText
        }
        
        button.setOnClickListener(listenerProvider.getKeyClickListener())
        button.setOnTouchListener(listenerProvider.getKeyTouchListener(normalized))
        val longClickListener = listenerProvider.getKeyLongClickListener(normalized)
        if (longClickListener != null) {
            button.setOnLongClickListener(longClickListener)
        } else {
            button.setOnLongClickListener(null)
        }
    }

    private fun buildKeyboardRows(
        host: LinearLayout,
        layout: List<List<String>>,
        capsVisualMode: CustomKeyboard.CapsMode,
        trackCapsKeys: Boolean,
    ) {
        val rowPadding = px4
        layout.forEach { row ->
            val weights = row.map { keyWeight(it) }
            val rowLayout =
                LinearLayout(context).apply {
                    orientation = LinearLayout.HORIZONTAL
                    layoutParams =
                        LinearLayout.LayoutParams(
                            ViewGroup.LayoutParams.MATCH_PARENT,
                            ViewGroup.LayoutParams.WRAP_CONTENT,
                        )
                    setPadding(rowPadding, 0, rowPadding, 0)
                }

            row.forEachIndexed { index, keyLabel ->
                rowLayout.addView(
                    createKeyButton(
                        keyLabel,
                        weights[index],
                        capsVisualMode,
                        trackCapsKeys
                    )
                )
            }
            host.addView(rowLayout)
        }
    }

    private fun createSuggestionsContainer(): LinearLayout {
        return LinearLayout(context).apply {
            orientation = LinearLayout.HORIZONTAL
            layoutParams =
                LinearLayout.LayoutParams(
                    ViewGroup.LayoutParams.MATCH_PARENT,
                    suggestionBarHeightPx,
                )
            visibility = View.GONE
            setPadding(px4, px4, px4, px8)
        }
    }

    private fun createSelectionActionsContainer(): LinearLayout {
        return LinearLayout(context).apply {
            orientation = LinearLayout.HORIZONTAL
            layoutParams =
                LinearLayout.LayoutParams(
                    ViewGroup.LayoutParams.MATCH_PARENT,
                    selectionBarHeightPx,
                )
            visibility = View.GONE
            setPadding(px4, px6, px4, px4)
        }
    }

    private fun createClipboardContainer(): Pair<HorizontalScrollView, LinearLayout> {
        val inner =
            LinearLayout(context).apply {
                orientation = LinearLayout.HORIZONTAL
                layoutParams =
                    LinearLayout.LayoutParams(
                        ViewGroup.LayoutParams.WRAP_CONTENT,
                        ViewGroup.LayoutParams.MATCH_PARENT,
                    )
                visibility = View.VISIBLE
                setPadding(px4, px4, px4, px6)
            }

        val scroll =
            HorizontalScrollView(context).apply {
                layoutParams =
                    LinearLayout.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT,
                        clipboardBarHeightPx,
                    )
                isHorizontalScrollBarEnabled = false
                addView(inner)
                visibility = View.GONE
            }

        return Pair(scroll, inner)
    }

    private fun createKeyButton(
        label: String,
        weight: Float,
        capsVisualMode: CustomKeyboard.CapsMode,
        trackCapsKeys: Boolean,
    ): View {
        val normalized = label.trim()
        val lower = normalized.lowercase()

        val displayText =
            when (lower) {
                "backspace" -> "⌫"
                "enter" -> "⏎"
                "caps" -> "⇧"
                "123" -> "123"
                "{&=" -> "{&="
                "abc" -> "ABC"
                "tab" -> "Tab"
                "space" -> context.getString(R.string.key_space)
                else -> displayLabel(normalized, capsVisualMode)
            }

        val button = Button(context).apply {
            isAllCaps = false
            text = displayText
            contentDescription =
                when (lower) {
                    "backspace" -> context.getString(R.string.key_backspace)
                    "enter" -> context.getString(R.string.key_enter)
                    "caps" -> context.getString(R.string.key_caps)
                    "tab" -> context.getString(R.string.key_tab)
                    else -> {
                        if (displayText.length == 1 && displayText[0].isLetter()) displayText else displayText
                    }
                }
            themeManager.applyTypography(this, keyTextSizePx)
            minHeight = keyMinHeightPx
            minWidth = keyMinWidthPx
            setPadding(keyPaddingHorizontalPx, keyPaddingVerticalPx, keyPaddingHorizontalPx, keyPaddingVerticalPx)
            isSingleLine = true
            ellipsize = TextUtils.TruncateAt.END
            maxLines = 1
            textAlignment = View.TEXT_ALIGNMENT_CENTER
            themeManager.applyButtonBackground(this, themeManager.paletteKeyBackgroundColor)
            setTextColor(themeManager.paletteTextColor)
            elevation = keyElevationPx
            if (lower == "abc" || lower == "{&=") {
                minWidth = keyMinWideWidthPx
                ellipsize = null
            }
            tag = normalized
            setOnClickListener(listenerProvider.getKeyClickListener())

            val listener = listenerProvider.getKeyTouchListener(normalized)
            setOnTouchListener(listener)

            val longClickListener = listenerProvider.getKeyLongClickListener(normalized)
            if (longClickListener != null) {
                setOnLongClickListener(longClickListener)
            }

            if (trackCapsKeys) {
                if (lower == "caps") {
                    capsButtonRef = this
                    applyCapsButtonStyle(this, capsVisualMode)
                }
                keyButtonRefs.add(KeyButtonRef(raw = normalized, lower = lower, button = this))
            }
        }

        val hints = CustomKeyboard.topRowMap[lower]

        if (hints != null && hints.isNotEmpty()) {
            val container = FrameLayout(context)
            container.layoutParams = createLayoutParams(weight)

            button.layoutParams = FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
            )

            val hintView = TextView(context).apply {
                text = hints.take(4).joinToString(" ")
                themeManager.applyTypography(this, keyTextSizePx * hintTextSizeFactor)
                setTextColor(themeManager.paletteTextColor)
                alpha = 0.6f
                elevation = keyElevationPx
                layoutParams = FrameLayout.LayoutParams(
                    ViewGroup.LayoutParams.WRAP_CONTENT,
                    ViewGroup.LayoutParams.WRAP_CONTENT
                ).apply {
                    gravity = Gravity.TOP or Gravity.END
                    setMargins(0, px4 / 2, px4, 0)
                }
            }

            container.addView(button)
            container.addView(hintView)
            return container
        } else {
            button.layoutParams = createLayoutParams(weight)
            return button
        }
    }

    private fun createLayoutParams(weight: Float): LinearLayout.LayoutParams {
        return LinearLayout.LayoutParams(
            0,
            keyRowHeightPx,
            weight.coerceAtLeast(1f),
        ).apply {
            val m = keyGapPx
            setMargins(m, m, m, m)
        }
    }

    fun keyWeight(label: String): Float {
        val normalized = label.trim().lowercase()
        val override = keyWeightOverrides[normalized]
        if (override != null) return override
        return when (normalized) {
            "backspace" -> 1.3f
            "enter" -> 1.2f
            "caps" -> 1.1f
            "space" -> 3f
            "123" -> 1.2f
            "abc", "{&=" -> 1.35f
            "tab" -> 1.4f
            else -> 1f
        }
    }

    fun displayLabel(value: String, mode: CustomKeyboard.CapsMode): String {
        if (value.length == 1 && value[0].isLetter()) {
            return when (mode) {
                CustomKeyboard.CapsMode.OFF -> value.lowercase()
                CustomKeyboard.CapsMode.SINGLE, CustomKeyboard.CapsMode.LOCK -> value.uppercase()
            }
        }
        return value
    }

    fun applyCapsButtonStyle(button: Button, mode: CustomKeyboard.CapsMode) {
        val (background, textColor) =
            when (mode) {
                CustomKeyboard.CapsMode.OFF -> Pair(themeManager.paletteCapsNeutralColor, themeManager.paletteTextColor)
                CustomKeyboard.CapsMode.SINGLE -> Pair(themeManager.paletteCapsMediumColor, themeManager.paletteTextColor)
                CustomKeyboard.CapsMode.LOCK -> Pair(themeManager.paletteCapsStrongColor, themeManager.paletteCapsStrongTextColor)
            }

        themeManager.applyButtonBackground(button, background)
        button.setTextColor(textColor)
    }

    fun ensureSuggestionButtons(maxSuggestions: Int) {
        val container = suggestionsContainer ?: return
        container.removeAllViews()
        suggestionButtons.clear()
        suggestionSlotValues.clear()

        for (i in 0 until maxSuggestions) {
            val btn =
                Button(context).apply {
                    layoutParams =
                        LinearLayout.LayoutParams(
                            0,
                            keyMinHeightPx,
                            1f,
                        ).apply {
                            val margin = px1
                            setMargins(margin, margin, margin, margin)
                        }
                    isAllCaps = false
                    text = ""
                    themeManager.applyTypography(this, suggestionTextSizePx)
                        minHeight = keyMinHeightPx
                    themeManager.applyButtonBackground(this, themeManager.paletteKeyBackgroundColor)
                    setTextColor(themeManager.paletteTextColor)
                    tag = i
                    setOnClickListener(listenerProvider.getSuggestionClickListener())
                    visibility = View.INVISIBLE
                }

            suggestionButtons.add(btn)
            suggestionSlotValues.add(null)
            container.addView(btn)
        }
    }

    fun updateSelectionActions(
        selectedText: CharSequence?,
        areSuggestionsEnabled: Boolean,
        copyLabel: String,
        cutLabel: String
    ) {
        val container = selectionActionsContainer ?: return
        val suggestions = suggestionsContainer

        if (selectedText.isNullOrEmpty()) {
            container.visibility = View.GONE
            container.removeAllViews()
              if (areSuggestionsEnabled && suggestionButtons.any { it?.visibility == View.VISIBLE }) {
                 suggestions?.visibility = View.VISIBLE
            }
            return
        }

        container.visibility = View.VISIBLE
        suggestions?.visibility = View.INVISIBLE
        container.removeAllViews()

        val copyButton =
            Button(context).apply {
                layoutParams =
                    LinearLayout.LayoutParams(
                        0,
                        keyMinHeightPx,
                        1f,
                    ).apply {
                        val margin = px1
                        setMargins(margin, margin, margin, margin)
                    }
                text = copyLabel
                isAllCaps = false
                themeManager.applyTypography(this, selectionTextSizePx)
                    minHeight = keyMinHeightPx
                themeManager.applyButtonBackground(this, themeManager.paletteKeyBackgroundColor)
                setTextColor(themeManager.paletteTextColor)
                setOnClickListener(listenerProvider.getCopyClickListener())
            }

        val cutButton =
            Button(context).apply {
                layoutParams =
                    LinearLayout.LayoutParams(
                        0,
                        keyMinHeightPx,
                        1f,
                    ).apply {
                        val margin = px1
                        setMargins(margin, margin, margin, margin)
                    }
                text = cutLabel
                isAllCaps = false
                themeManager.applyTypography(this, selectionTextSizePx)
                    minHeight = keyMinHeightPx
                themeManager.applyButtonBackground(this, themeManager.paletteKeyBackgroundColor)
                setTextColor(themeManager.paletteTextColor)
                setOnClickListener(listenerProvider.getCutClickListener())
            }

        container.addView(copyButton)
        container.addView(cutButton)
    }

    fun renderClipboardSuggestions(items: List<String>, maxItems: Int) {
        val container = clipboardContainer ?: return

        val displayItems = items.take(maxItems)
        container.removeAllViews()

        if (displayItems.isEmpty()) {
            clipboardScroll?.visibility = View.GONE
            return
        }

        clipboardScroll?.visibility = View.VISIBLE

        displayItems.forEach { item ->
            val label = if (item.length > 10) item.take(10) + "..." else item
            val button =
                Button(context).apply {
                    layoutParams =
                        LinearLayout.LayoutParams(
                            0,
                            keyMinHeightPx,
                            1f,
                        ).apply {
                            val margin = px1
                            setMargins(margin, margin, margin, margin)
                        }
                    isAllCaps = false
                    text = label
                    themeManager.applyTypography(this, clipboardTextSizePx)
                    minHeight = keyMinHeightPx
                    isSingleLine = true
                    ellipsize = TextUtils.TruncateAt.END
                    maxLines = 1
                    textAlignment = View.TEXT_ALIGNMENT_CENTER
                    themeManager.applyButtonBackground(this, themeManager.paletteKeyBackgroundColor)
                    setTextColor(themeManager.paletteTextColor)
                    setOnClickListener(listenerProvider.getClipboardItemClickListener(item))
                    setOnLongClickListener(listenerProvider.getClipboardItemLongClickListener(item))
                }
            container.addView(button)
        }
    }

    fun applyPaletteToCurrentViews(capsMode: CustomKeyboard.CapsMode) {
        rootLayout?.setBackgroundColor(themeManager.paletteBackgroundColor)

        keyButtonRefs.forEach { ref ->
            if (ref.lower == "caps") {
                applyCapsButtonStyle(ref.button, capsMode)
            } else {
                themeManager.applyButtonBackground(ref.button, themeManager.paletteKeyBackgroundColor)
                ref.button.setTextColor(themeManager.paletteTextColor)
            }
            themeManager.applyTypography(ref.button, keyTextSizePx)
            ref.button.elevation = keyElevationPx
        }

        suggestionButtons.forEach { btn ->
            if (btn != null) {
                themeManager.applyButtonBackground(btn, themeManager.paletteKeyBackgroundColor)
                btn.setTextColor(themeManager.paletteTextColor)
                themeManager.applyTypography(btn, suggestionTextSizePx)
            }
        }

        val selectionContainer = selectionActionsContainer
        if (selectionContainer != null) {
            for (i in 0 until selectionContainer.childCount) {
                val child = selectionContainer.getChildAt(i)
                if (child is Button) {
                    themeManager.applyButtonBackground(child, themeManager.paletteKeyBackgroundColor)
                    child.setTextColor(themeManager.paletteTextColor)
                    themeManager.applyTypography(child, selectionTextSizePx)
                }
            }
        }

        val clipContainer = clipboardContainer
        if (clipContainer != null) {
            for (i in 0 until clipContainer.childCount) {
                val child = clipContainer.getChildAt(i)
                if (child is Button) {
                    themeManager.applyButtonBackground(child, themeManager.paletteKeyBackgroundColor)
                    child.setTextColor(themeManager.paletteTextColor)
                    themeManager.applyTypography(child, clipboardTextSizePx)
                }
            }
        }
    }

    fun updateCapsVisuals(mode: CustomKeyboard.CapsMode) {
        if (lettersKeyboardContainer?.visibility != View.VISIBLE) {
            return
        }
        capsButtonRef?.let { applyCapsButtonStyle(it, mode) }

        keyButtonRefs.forEach { ref ->
            val raw = ref.raw
            if (raw.length == 1 && raw[0].isLetter()) {
                val nextText = displayLabel(raw, mode)
                if (ref.button.text?.toString() != nextText) {
                    ref.button.text = nextText
                }
            }
        }
    }

    fun showKeyPreview(key: View, label: String) {
        if (label.isEmpty()) return
        
        if (keyPreviewPopup == null) {
            popupTextView = TextView(context).apply {
                setTextColor(themeManager.paletteTextColor)
                themeManager.applyTypography(this, keyPreviewTextSizePx)
                gravity = Gravity.CENTER
                setBackgroundColor(themeManager.paletteKeyBackgroundColor)
                setPadding(keyPreviewPaddingPx, keyPreviewPaddingPx, keyPreviewPaddingPx, keyPreviewPaddingPx)
                
                background = GradientDrawable().apply {
                    setColor(themeManager.paletteKeyBackgroundColor)
                    cornerRadius = themeManager.cornerRadiusPx.toFloat()
                    setStroke(keyPreviewBorderWidthPx, themeManager.paletteAccentColor)
                }
            }
            
            keyPreviewPopup = PopupWindow(popupTextView, ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT).apply {
                isTouchable = false
                isFocusable = false
                inputMethodMode = PopupWindow.INPUT_METHOD_NOT_NEEDED
                elevation = keyElevationPx
            }
        }

        popupTextView?.apply {
            text = label
            setTextColor(themeManager.paletteTextColor)
            themeManager.applyTypography(this, keyPreviewTextSizePx)
            (background as? GradientDrawable)?.setColor(themeManager.paletteKeyBackgroundColor)
            measure(View.MeasureSpec.UNSPECIFIED, View.MeasureSpec.UNSPECIFIED)
        }

        val location = IntArray(2)
        key.getLocationInWindow(location)
        
        val popupWidth = popupTextView?.measuredWidth ?: 0
        val popupHeight = popupTextView?.measuredHeight ?: 0
        
        val finalX = location[0] + (key.width - popupWidth) / 2
        val finalY = location[1] - popupHeight - px10

        if (keyPreviewPopup?.isShowing == true) {
            keyPreviewPopup?.update(finalX, finalY, -1, -1)
        } else {
            keyPreviewPopup?.showAtLocation(key, Gravity.NO_GRAVITY, finalX, finalY)
        }

        popupTextView?.animate()
            ?.alpha(1f)
            ?.setDuration(themeManager.animationDurationMs)
            ?.setInterpolator(themeManager.getInterpolator())
            ?.start()
    }

    fun dismissKeyPreview() {
        keyPreviewPopup?.dismiss()
    }

    fun showAccentPopup(key: View, accents: List<String>, capsMode: CustomKeyboard.CapsMode) {
        if (accentPopup == null) {
            accentPopupView = LinearLayout(context).apply {
                orientation = LinearLayout.HORIZONTAL
                background = themeManager.createKeyBackgroundStateList(themeManager.paletteKeyBackgroundColor)
                setPadding(keyPreviewPaddingPx, keyPreviewPaddingPx, keyPreviewPaddingPx, keyPreviewPaddingPx)
            }
            
            val scrollView = HorizontalScrollView(context).apply {
                isHorizontalScrollBarEnabled = false
                overScrollMode = View.OVER_SCROLL_NEVER
                addView(accentPopupView)
            }
            
            accentPopup = PopupWindow(scrollView, ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT).apply {
                isTouchable = false
                isOutsideTouchable = false
                elevation = keyElevationPx
            }
        }

        accentPopupView?.removeAllViews()
        accents.forEach { accent ->
            val tv = TextView(context).apply {
                text = if (capsMode != CustomKeyboard.CapsMode.OFF) accent.uppercase() else accent
                themeManager.applyTypography(this, accentTextSizePx)
                setTextColor(themeManager.paletteTextColor)
                gravity = Gravity.CENTER
                setPadding(keyPaddingHorizontalPx, keyPaddingVerticalPx, keyPaddingHorizontalPx, keyPaddingVerticalPx)
                minWidth = keyMinWidthPx
                tag = accent
            }
            accentPopupView?.addView(tv)
        }

        val location = IntArray(2)
        key.getLocationInWindow(location)
        
        val screenWidth = context.resources.displayMetrics.widthPixels
        
        accentPopupView?.measure(View.MeasureSpec.UNSPECIFIED, View.MeasureSpec.UNSPECIFIED)
        val contentWidth = accentPopupView?.measuredWidth ?: 0
        val contentHeight = accentPopupView?.measuredHeight ?: 0
        
        val margin = px4
        val maxPopupWidth = screenWidth - (margin * 2)
        val popupWidth = contentWidth.coerceAtMost(maxPopupWidth)
        
        accentPopup?.width = popupWidth
        
        var finalX = location[0] + (key.width - popupWidth) / 2
        
        if (finalX + popupWidth > screenWidth - margin) {
            finalX = screenWidth - popupWidth - margin
        }
        if (finalX < margin) {
            finalX = margin
        }
        
        val finalY = location[1] - contentHeight - px10

        accentPopup?.showAtLocation(key, Gravity.NO_GRAVITY, finalX, finalY)
        activeAccentView = null

        accentPopupView?.alpha = 0f
        accentPopupView?.animate()
            ?.alpha(1f)
            ?.setDuration(themeManager.animationDurationMs)
            ?.setInterpolator(themeManager.getInterpolator())
            ?.start()
    }

    fun dismissAccentPopup() {
        accentPopup?.dismiss()
        activeAccentView = null
    }

    fun handleAccentSelection(event: MotionEvent) {
        val popupView = accentPopupView ?: return
        val popup = accentPopup ?: return
        if (!popup.isShowing) return

        val location = IntArray(2)
        popupView.getLocationOnScreen(location)
        val x = event.rawX - location[0]
        
        var found: TextView? = null
        for (i in 0 until popupView.childCount) {
            val child = popupView.getChildAt(i) as TextView
            if (x >= child.left && x <= child.right) {
                found = child
                break
            }
        }

        if (found != activeAccentView) {
            activeAccentView?.setBackgroundColor(Color.TRANSPARENT)
            activeAccentView = found
            activeAccentView?.setBackgroundColor(themeManager.paletteAccentColor)
        }
    }

    fun commitAccentSelection() {
        val view = activeAccentView ?: return
        val accent = view.tag as? String ?: return
        listenerProvider.commitKey(accent)
        view.performHapticFeedback(HapticFeedbackConstants.KEYBOARD_TAP)
    }

    private fun dpToPx(dp: Int): Int =
        TypedValue.applyDimension(
            TypedValue.COMPLEX_UNIT_DIP,
            dp.toFloat(),
            context.resources.displayMetrics,
        ).toInt()
}
