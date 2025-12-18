package {{packageName}}

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.res.ColorStateList
import android.graphics.Color
import android.inputmethodservice.InputMethodService
import android.os.Handler
import android.os.Looper
import android.os.SystemClock
import android.util.TypedValue
import android.widget.Toast
import android.widget.HorizontalScrollView
import android.view.MotionEvent
import android.view.View
import android.view.ViewGroup
import android.widget.Button
import android.widget.LinearLayout
import android.view.WindowManager
import android.text.TextUtils
import com.facebook.react.bridge.Arguments
import android.app.AlertDialog
import com.facebook.react.modules.core.DefaultHardwareBackBtnHandler
import java.lang.ref.WeakReference
import java.util.concurrent.atomic.AtomicReference

class CustomKeyboard :
    InputMethodService(),
    DefaultHardwareBackBtnHandler {
    private lateinit var rootLayout: LinearLayout
    private var suggestionsContainer: LinearLayout? = null
    private var selectionActionsContainer: LinearLayout? = null
    private var clipboardContainer: LinearLayout? = null
    private var clipboardScroll: HorizontalScrollView? = null
    private var wordList: List<String> = emptyList()
    private var clipboardSuggestions: List<String> = emptyList()
    private var capsMode: CapsMode = CapsMode.OFF
    private var autoCapSuppressed: Boolean = false
    private var backspaceRepeatRunnable: Runnable? = null
    private var backspaceIntervalMs = BACKSPACE_INITIAL_INTERVAL_MS
    private var lastShiftTapTimeMs: Long = 0L
    private enum class InputMode {
        LETTERS,
        SYMBOLS,
        SPECIAL,
    }

    private enum class CapsMode {
        OFF,
        SINGLE,
        LOCK,
    }

    override fun onCreate() {
        super.onCreate()
        instanceRef.set(WeakReference(this))
    }

    override fun onStartInputView(info: android.view.inputmethod.EditorInfo?, restarting: Boolean) {
        super.onStartInputView(info, restarting)
        updateSelectionActions()
    }

    override fun onUpdateSelection(
        oldSelStart: Int,
        oldSelEnd: Int,
        newSelStart: Int,
        newSelEnd: Int,
        candidatesStart: Int,
        candidatesEnd: Int,
    ) {
        super.onUpdateSelection(oldSelStart, oldSelEnd, newSelStart, newSelEnd, candidatesStart, candidatesEnd)
        updateSelectionActions()
    }

    override fun onDestroy() {
        super.onDestroy()
        instanceRef.set(null)
    }

    override fun onCreateInputView(): View {
        rootLayout =
            LinearLayout(this).apply {
                orientation = LinearLayout.VERTICAL
                layoutParams =
                    LinearLayout.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT,
                        ViewGroup.LayoutParams.WRAP_CONTENT,
                    )
                setPadding(dpToPx(8), dpToPx(8), dpToPx(8), dpToPx(8))
            }
        loadWordList()
        rebuildLayout()
        return rootLayout
    }

    private fun rebuildLayout() {
        rootLayout.removeAllViews()
        selectionActionsContainer = createSelectionActionsContainer().also { rootLayout.addView(it) }
        val (scroll, container) = createClipboardContainer()
        clipboardScroll = scroll
        clipboardContainer = container
        rootLayout.addView(scroll)
        suggestionsContainer = createSuggestionsContainer().also { rootLayout.addView(it) }
        val layoutSnapshot = getLayoutSnapshot()
        val screenWidth = resources.displayMetrics.widthPixels
        val marginPx = dpToPx(1)
        val rowPaddingPx = dpToPx(4)
        val rootPaddingPx = dpToPx(8)

        layoutSnapshot.forEach { row ->
            val weights = row.map { keyWeight(it) }
            val totalWeight = weights.sum().takeIf { it > 0f } ?: row.size.toFloat()
            val marginsWidth = marginPx * 2 * row.size
            val availableWidth = (screenWidth - (rootPaddingPx * 2) - (rowPaddingPx * 2) - marginsWidth)
            val baseWidth = (availableWidth / totalWeight).coerceAtLeast(dpToPx(30).toFloat())

            val rowLayout =
                LinearLayout(this).apply {
                    orientation = LinearLayout.HORIZONTAL
                    layoutParams =
                        LinearLayout.LayoutParams(
                            ViewGroup.LayoutParams.MATCH_PARENT,
                            ViewGroup.LayoutParams.WRAP_CONTENT,
                        )
                    setPadding(rowPaddingPx, 0, rowPaddingPx, 0)
                }

            row.forEachIndexed { index, keyLabel ->
                val widthForKey = (baseWidth * weights[index]).toInt()
                rowLayout.addView(createKeyButton(keyLabel, widthForKey, weights[index]))
            }

            rootLayout.addView(rowLayout)
        }

        refreshClipboardSource()
        updateSuggestions()
        updateSelectionActions()
        renderClipboardSuggestions()
    }

    private fun createSuggestionsContainer(): LinearLayout {
        return LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            layoutParams =
                LinearLayout.LayoutParams(
                    ViewGroup.LayoutParams.MATCH_PARENT,
                    ViewGroup.LayoutParams.WRAP_CONTENT,
                )
            visibility = View.GONE
            setPadding(dpToPx(4), dpToPx(4), dpToPx(4), dpToPx(8))
        }
    }

    private fun createSelectionActionsContainer(): LinearLayout {
        return LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            layoutParams =
                LinearLayout.LayoutParams(
                    ViewGroup.LayoutParams.MATCH_PARENT,
                    ViewGroup.LayoutParams.WRAP_CONTENT,
                )
            visibility = View.GONE
            setPadding(dpToPx(4), dpToPx(6), dpToPx(4), dpToPx(4))
        }
    }

    private fun createClipboardContainer(): Pair<HorizontalScrollView, LinearLayout> {
        val inner =
            LinearLayout(this).apply {
                orientation = LinearLayout.HORIZONTAL
                layoutParams =
                    LinearLayout.LayoutParams(
                        ViewGroup.LayoutParams.WRAP_CONTENT,
                        ViewGroup.LayoutParams.WRAP_CONTENT,
                    )
                visibility = View.GONE
                setPadding(dpToPx(4), dpToPx(4), dpToPx(4), dpToPx(6))
            }

        val scroll =
            HorizontalScrollView(this).apply {
                layoutParams =
                    LinearLayout.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT,
                        ViewGroup.LayoutParams.WRAP_CONTENT,
                    )
                isHorizontalScrollBarEnabled = false
                addView(inner)
            }

        return Pair(scroll, inner)
    }

    private fun createKeyButton(
        label: String,
        keyWidth: Int,
        weight: Float,
    ): Button {
        val normalized = label.trim()
        val lower = normalized.lowercase()

        val (displayText, onClick) =
            when (lower) {
                "backspace" -> Pair("⌫", { deleteFromInputConnection() })
                "enter" -> Pair("⏎", { sendEnter() })
                "caps" -> Pair("⇧", { handleShiftPress() })
                "123" -> Pair("123", { switchToSymbols() })
                "{&=" -> Pair("{&=", { switchToSpecial() })
                "abc" -> Pair("ABC", { switchToLetters() })
                "tab" -> Pair("Tab", { commitTextToInputConnection("\t") })
                "space" -> Pair("Space", { commitKeyWithCaps(" ") })
                else -> Pair(displayLabel(normalized), { commitKeyWithCaps(normalized) })
            }

        return Button(this).apply {
            layoutParams = createLayoutParams(weight)
            isAllCaps = false
            text = displayText
            textSize = 15f
            minHeight = dpToPx(52)
            minWidth = dpToPx(36)
            setPadding(dpToPx(10), dpToPx(10), dpToPx(10), dpToPx(10))
            isSingleLine = true
            ellipsize = TextUtils.TruncateAt.END
            maxLines = 1
            textAlignment = View.TEXT_ALIGNMENT_CENTER
            setTextColor(Color.BLACK)
            if (lower == "abc" || lower == "{&=") {
                minWidth = dpToPx(64)
                ellipsize = null
            }
            setOnClickListener { onClick() }
            if (lower == "backspace") {
                setOnLongClickListener {
                    startBackspaceRepeat()
                    true
                }
                setOnTouchListener { _, event ->
                    if (event.action == MotionEvent.ACTION_UP || event.action == MotionEvent.ACTION_CANCEL || event.action == MotionEvent.ACTION_OUTSIDE) {
                        stopBackspaceRepeat()
                    }
                    false
                }
            }
            if (lower == "caps") {
                applyCapsButtonStyle(this, effectiveCapsMode())
                setOnLongClickListener {
                    setCapsMode(CapsMode.LOCK)
                    true
                }
            }
        }
    }

    private fun createLayoutParams(weight: Float): LinearLayout.LayoutParams {
        return LinearLayout.LayoutParams(
            0,
            dpToPx(56),
            weight.coerceAtLeast(1f),
                    ).apply {
                        val margin = dpToPx(0)
                        setMargins(margin, margin, margin, margin)
                    }
    }

    private fun keyWeight(label: String): Float {
        return when (label.trim().lowercase()) {
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

    private fun displayLabel(value: String): String {
        if (value.length == 1 && value[0].isLetter()) {
            return when (effectiveCapsMode()) {
                CapsMode.OFF -> value.lowercase()
                CapsMode.SINGLE, CapsMode.LOCK -> value.uppercase()
            }
        }
        return value
    }

    private fun effectiveCapsMode(): CapsMode =
        if (capsMode == CapsMode.OFF && shouldAutoCapitalizeNextChar() && !autoCapSuppressed) CapsMode.SINGLE else capsMode

    private fun handleShiftPress() {
        val now = SystemClock.elapsedRealtime()
        val delta = now - lastShiftTapTimeMs

        if (capsMode == CapsMode.OFF && shouldAutoCapitalizeNextChar() && !autoCapSuppressed) {
            autoCapSuppressed = true
            rebuildOnUiThread()
            return
        }

        when (capsMode) {
            CapsMode.LOCK -> {
                setCapsMode(CapsMode.OFF)
            }
            CapsMode.SINGLE -> {
                if (delta <= DOUBLE_TAP_THRESHOLD_MS) {
                    setCapsMode(CapsMode.LOCK)
                } else {
                    setCapsMode(CapsMode.OFF)
                }
            }
            CapsMode.OFF -> {
                if (delta <= DOUBLE_TAP_THRESHOLD_MS) {
                    setCapsMode(CapsMode.LOCK)
                } else {
                    setCapsMode(CapsMode.SINGLE)
                }
            }
        }

        lastShiftTapTimeMs = now
    }

    private fun setCapsMode(mode: CapsMode) {
        capsMode = mode
        rebuildOnUiThread()
    }

    private fun rebuildOnUiThread() {
        uiHandler.post {
            if (this::rootLayout.isInitialized) {
                rebuildLayout()
            }
        }
    }

    fun commitTextToInputConnection(text: String) {
        currentInputConnection?.commitText(text, 1)
        updateSuggestions()
    }

    private fun commitKeyWithCaps(raw: String) {
        if (raw == " ") {
            if (handleDoubleSpace()) {
                return
            }
        }

        if (raw.length == 1 && isPunctuation(raw[0])) {
            removeTrailingSpaceBeforePunctuation()
        }

        var tempAutoCap = false
        if (!autoCapSuppressed && capsMode == CapsMode.OFF && shouldAutoCapitalizeNextChar()) {
            tempAutoCap = true
            setCapsMode(CapsMode.SINGLE)
        }

        val prevVisualMode = effectiveCapsMode()
        val textToCommit = prepareCasedText(raw)
        commitTextToInputConnection(textToCommit)
        maybeInsertAutoSpace(raw)

        if (!shouldAutoCapitalizeNextChar()) {
            autoCapSuppressed = false
        }

        if (tempAutoCap || (capsMode == CapsMode.SINGLE && !shouldAutoCapitalizeNextChar())) {
            setCapsMode(CapsMode.OFF)
            return
        }

        refreshCapsVisualIfNeeded(prevVisualMode)
        updateSelectionActions()
    }

    private fun refreshCapsVisualIfNeeded(previousMode: CapsMode) {
        val currentMode = effectiveCapsMode()
        if (currentMode != previousMode) {
            rebuildOnUiThread()
        }
    }

    private fun refreshClipboardSource() {
        clipboardSuggestions =
            if (clipboardItems.isNotEmpty()) clipboardItems else loadSystemClipboardSuggestions()
    }

    private fun renderClipboardSuggestions() {
        val container = clipboardContainer ?: return
        val items = clipboardSuggestions.take(MAX_ITEMS_IN_CLIPBOARD)
        container.removeAllViews()

        if (items.isEmpty()) {
            container.visibility = View.GONE
            clipboardScroll?.visibility = View.GONE
            return
        }

        container.visibility = View.VISIBLE
        clipboardScroll?.visibility = View.VISIBLE

        items.forEach { item ->
            val label = if (item.length > 10) item.take(10) + "..." else item
            val button =
                Button(this).apply {
                    layoutParams =
                        LinearLayout.LayoutParams(
                            0,
                            dpToPx(44),
                            1f,
                        ).apply {
                            val margin = dpToPx(1)
                            setMargins(margin, margin, margin, margin)
                        }
                    isAllCaps = false
                    text = label
                    textSize = 14f
                    minHeight = dpToPx(44)
                    isSingleLine = true
                    ellipsize = TextUtils.TruncateAt.END
                    maxLines = 1
                    textAlignment = View.TEXT_ALIGNMENT_CENTER
                    setTextColor(Color.BLACK)
                    setOnClickListener {
                            pasteClipboardItem(item)
                        }
                        setOnLongClickListener {
                            showClipboardDialog(item)
                            true
                    }
                }
            container.addView(button)
        }
    }

        private fun pasteClipboardItem(item: String) {
            commitTextToInputConnection(item + " ")
            updateSuggestions()
            updateSelectionActions()
        }

        private fun showClipboardDialog(text: String) {
            val (pasteLabel, closeLabel) = getClipboardDialogLabels()
            val windowToken = window?.window?.decorView?.windowToken ?: window?.window?.attributes?.token ?: return
            uiHandler.post {
                val dialog =
                    AlertDialog.Builder(this)
                        .setMessage(text)
                        .setPositiveButton(pasteLabel) { dialogInterface, _ ->
                            pasteClipboardItem(text)
                            dialogInterface.dismiss()
                        }
                        .setNegativeButton(closeLabel) { dialogInterface, _ ->
                            dialogInterface.dismiss()
                        }
                        .create()

                dialog.window?.apply {
                    setType(WindowManager.LayoutParams.TYPE_APPLICATION_ATTACHED_DIALOG)
                    attributes?.token = windowToken
                    addFlags(WindowManager.LayoutParams.FLAG_ALT_FOCUSABLE_IM)
                }

                dialog.show()
            }
        }

        private fun getClipboardDialogLabels(): Pair<String, String> {
            val languageCode = resources.configuration.locales[0]?.language ?: "en"
            return if (languageCode.startsWith("es", ignoreCase = true)) {
                Pair("Pegar", "Cerrar")
            } else {
                Pair("Paste", "Close")
            }
        }

    private fun handleDoubleSpace(): Boolean {
        val inputConnection = currentInputConnection ?: return false
        val before = inputConnection.getTextBeforeCursor(6, 0) ?: ""

        if (before.length >= 2 && before.last() == ' ' && !before[before.length - 2].isWhitespace()) {
            inputConnection.deleteSurroundingText(1, 0)
            inputConnection.commitText(". ", 1)
            updateSuggestions()
            return true
        }

        return false
    }
    private fun maybeInsertAutoSpace(raw: String) {
        if (raw.length != 1) return
        val ch = raw[0]
        if (!isPunctuation(ch)) return

        val inputConnection = currentInputConnection ?: return
        val after = inputConnection.getTextAfterCursor(1, 0) ?: ""

        val nextIsWhitespace = after.isNotEmpty() && after[0].isWhitespace()

        if (!nextIsWhitespace) {
            inputConnection.commitText(" ", 1)
        }
    }

    private fun removeTrailingSpaceBeforePunctuation() {
        val inputConnection = currentInputConnection ?: return
        val before = inputConnection.getTextBeforeCursor(1, 0) ?: ""
        if (before == " ") {
            inputConnection.deleteSurroundingText(1, 0)
        }
    }

    private fun isPunctuation(ch: Char): Boolean {
        return ch == '.' || ch == ',' || ch == ':' || ch == ';' || ch == '?' || ch == '!' || ch == ')'
    }
    private fun applyCapsButtonStyle(button: Button, mode: CapsMode) {
        val (background, textColor) =
            when (mode) {
                CapsMode.OFF -> Pair(CAPS_COLOR_NEUTRAL, Color.BLACK)
                CapsMode.SINGLE -> Pair(CAPS_COLOR_MEDIUM, Color.BLACK)
                CapsMode.LOCK -> Pair(CAPS_COLOR_STRONG, Color.WHITE)
            }

        button.backgroundTintList = ColorStateList.valueOf(background)
        button.setTextColor(textColor)
    }

    private fun updateSelectionActions() {
        val container = selectionActionsContainer ?: return
        val selectedText = currentInputConnection?.getSelectedText(0)

        if (selectedText.isNullOrEmpty()) {
            container.visibility = View.GONE
            container.removeAllViews()
            return
        }

        container.visibility = View.VISIBLE
        container.removeAllViews()

        val (copyLabel, cutLabel) = getCopyCutLabels()

        val copyButton =
            Button(this).apply {
                layoutParams =
                    LinearLayout.LayoutParams(
                        0,
                        dpToPx(44),
                        1f,
                    ).apply {
                        val margin = dpToPx(1)
                        setMargins(margin, margin, margin, margin)
                    }
                text = copyLabel
                isAllCaps = false
                textSize = 14f
                minHeight = dpToPx(44)
                setOnClickListener { copySelection(selectedText.toString()) }
            }

        val cutButton =
            Button(this).apply {
                layoutParams =
                    LinearLayout.LayoutParams(
                        0,
                        dpToPx(44),
                        1f,
                    ).apply {
                        val margin = dpToPx(1)
                        setMargins(margin, margin, margin, margin)
                    }
                text = cutLabel
                isAllCaps = false
                textSize = 14f
                minHeight = dpToPx(44)
                setOnClickListener { cutSelection(selectedText.toString()) }
            }

        container.addView(copyButton)
        container.addView(cutButton)
    }

    private fun getCopyCutLabels(): Pair<String, String> {
        val lang = resources.configuration.locales[0]?.language ?: "en"
        return if (lang.startsWith("es", ignoreCase = true)) {
            Pair("Copiar", "Cortar")
        } else {
            Pair("Copy", "Cut")
        }
    }

    private fun copySelection(text: String, isCut: Boolean = false) {
        val clipboard = getSystemService(Context.CLIPBOARD_SERVICE) as? ClipboardManager ?: return
        clipboard.setPrimaryClip(ClipData.newPlainText("selected_text", text))
        refreshClipboardSource()
        renderClipboardSuggestions()
        if (!isCut) showToastCopied()
        clearSelection()
    }

    private fun cutSelection(text: String) {
        copySelection(text, isCut = true)
        currentInputConnection?.commitText("", 1)
        showToastCut()
        clearSelection()
        updateSelectionActions()
        updateSuggestions()
        refreshClipboardSource()
        renderClipboardSuggestions()
    }

    private fun clearSelection() {
        currentInputConnection?.setSelection(Int.MAX_VALUE, Int.MAX_VALUE)
        selectionActionsContainer?.visibility = View.GONE
    }

    private fun showToastCopied() {
        val msg = if (resources.configuration.locales[0]?.language?.startsWith("es", true) == true) "Copiado" else "Copied"
        Toast.makeText(this, msg, Toast.LENGTH_SHORT).show()
    }

    private fun showToastCut() {
        val msg = if (resources.configuration.locales[0]?.language?.startsWith("es", true) == true) "Cortado" else "Cut"
        Toast.makeText(this, msg, Toast.LENGTH_SHORT).show()
    }

    fun deleteFromInputConnection() {
        val inputConnection = currentInputConnection ?: return
        val selectedText = inputConnection.getSelectedText(0)

        if (!selectedText.isNullOrEmpty()) {
            inputConnection.commitText("", 1)
            updateSuggestions()
            updateSelectionActions()
            return
        }

        inputConnection.deleteSurroundingText(1, 0)
        updateSuggestions()
        updateSelectionActions()
    }

    private fun deleteWordFromInputConnection() {
        val inputConnection = currentInputConnection ?: return
        val selectedText = inputConnection.getSelectedText(0)

        if (!selectedText.isNullOrEmpty()) {
            inputConnection.commitText("", 1)
            updateSuggestions()
            return
        }

        val beforeCursor = inputConnection.getTextBeforeCursor(120, 0) ?: ""
        if (beforeCursor.isEmpty()) return

        var toDelete = 0
        var index = beforeCursor.length - 1

        while (index >= 0 && beforeCursor[index].isWhitespace()) {
            toDelete++
            index--
        }

        while (index >= 0 && !beforeCursor[index].isWhitespace() && beforeCursor[index] != '.' && beforeCursor[index] != ',') {
            toDelete++
            index--
        }

        if (index >= 0 && (beforeCursor[index] == '.' || beforeCursor[index] == ',')) {
            toDelete++
        }

        if (toDelete > 0) {
            inputConnection.deleteSurroundingText(toDelete, 0)
            updateSuggestions()
            updateSelectionActions()
        }
    }

    fun sendEnter() {
        currentInputConnection?.sendKeyEvent(
            android.view.KeyEvent(android.view.KeyEvent.ACTION_DOWN, android.view.KeyEvent.KEYCODE_ENTER),
        )
    }

    override fun invokeDefaultOnBackPressed() {
    }

    private fun dpToPx(dp: Int): Int =
        TypedValue.applyDimension(
            TypedValue.COMPLEX_UNIT_DIP,
            dp.toFloat(),
            resources.displayMetrics,
        ).toInt()

    private fun loadWordList() {
        val languageCode = resources.configuration.locales[0]?.language ?: "en"
        val fileName = if (languageCode.startsWith("es", ignoreCase = true)) "autocomplete_es.txt" else "autocomplete_en.txt"

        wordList =
            try {
                assets
                    .open(fileName)
                    .bufferedReader()
                    .useLines { lines ->
                        lines
                            .map { it.trim() }
                            .filter { it.isNotEmpty() }
                            .toList()
                    }
            } catch (_: Exception) {
                emptyList()
            }
    }

    private fun updateClipboardItems(items: List<String>) {
        uiHandler.post {
            clipboardSuggestions = items
            renderClipboardSuggestions()
        }
    }

    private fun loadSystemClipboardSuggestions(): List<String> {
        val clipboard = getSystemService(Context.CLIPBOARD_SERVICE) as? ClipboardManager ?: return emptyList()
        val clip = clipboard.primaryClip ?: return emptyList()

        val collected = mutableListOf<String>()
        for (i in 0 until clip.itemCount) {
            val text = clip.getItemAt(i).coerceToText(this)?.toString()?.trim()
            if (!text.isNullOrEmpty()) {
                collected.add(text)
            }
            if (collected.size > MAX_ITEMS_IN_CLIPBOARD) break
        }
        return collected
    }

    private fun extractCurrentWord(): String? {
        val inputConnection = currentInputConnection ?: return null
        val beforeCursor = inputConnection.getTextBeforeCursor(50, 0) ?: return null
        if (beforeCursor.isEmpty()) return ""

        val builder = StringBuilder()
        for (index in beforeCursor.length - 1 downTo 0) {
            val char = beforeCursor[index]
            if (char.isLetter()) {
                builder.insert(0, char)
            } else {
                break
            }
        }
        return builder.toString()
    }

    private fun updateSuggestions() {
        val currentWord = extractCurrentWord()
        if (currentWord.isNullOrEmpty()) {
            renderSuggestions(emptyList(), capitalizeFirst = false)
            return
        }

        val capitalizeFirst = currentWord.firstOrNull()?.isUpperCase() == true
        val prefix = currentWord.lowercase()
        val matches = wordList.filter { it.startsWith(prefix) }.take(3)
        renderSuggestions(matches, capitalizeFirst)
        updateSelectionActions()
    }

    private fun renderSuggestions(suggestions: List<String>, capitalizeFirst: Boolean) {
        val container = suggestionsContainer ?: return
        container.removeAllViews()

        if (suggestions.isEmpty()) {
            container.visibility = View.GONE
            return
        }

        container.visibility = View.VISIBLE

        suggestions.forEach { suggestion ->
            val displayText =
                if (capitalizeFirst && suggestion.isNotEmpty()) {
                    suggestion.replaceFirstChar { it.uppercaseChar() }
                } else {
                    suggestion
                }
            val button =
                Button(this).apply {
                    layoutParams =
                        LinearLayout.LayoutParams(
                            0,
                            dpToPx(44),
                            1f,
                        ).apply {
                            val margin = dpToPx(1)
                            setMargins(margin, margin, margin, margin)
                        }
                    isAllCaps = false
                    text = displayText
                    textSize = 14f
                    minHeight = dpToPx(44)
                    setOnClickListener { applySuggestion(suggestion, capitalizeFirst) }
                }
            container.addView(button)
        }

        renderClipboardSuggestions()
    }

    private fun applySuggestion(suggestion: String, capitalizeFirst: Boolean) {
        val inputConnection = currentInputConnection ?: return
        val currentWord = extractCurrentWord().orEmpty()
        if (currentWord.isNotEmpty()) {
            inputConnection.deleteSurroundingText(currentWord.length, 0)
        }
        val textToCommit =
            if (capitalizeFirst && suggestion.isNotEmpty()) {
                suggestion.replaceFirstChar { it.uppercaseChar() }
            } else {
                suggestion
            }
        inputConnection.commitText("$textToCommit ", 1)
        updateSuggestions()
        updateSelectionActions()
    }

    private fun shouldAutoCapitalizeNextChar(): Boolean {
        val inputConnection = currentInputConnection ?: return false
        val beforeCursor = inputConnection.getTextBeforeCursor(200, 0) ?: return true
        val trimmed = beforeCursor.trimEnd()
        if (trimmed.isEmpty()) return true

        val lastChar = trimmed.last()
        return lastChar == '.' || lastChar == ':' || lastChar == ';' || lastChar == '?' || lastChar == '!' || lastChar == '\n'
    }

    private fun prepareCasedText(raw: String): String {
        if (raw.isEmpty()) return raw

       val shouldUppercase =
            capsMode == CapsMode.LOCK ||
                (!autoCapSuppressed && (
                    capsMode == CapsMode.SINGLE ||
                    shouldAutoCapitalizeNextChar()
                ))

        if (!shouldUppercase) return raw

        val first = raw[0].uppercaseChar()
        val rest = if (raw.length > 1) raw.substring(1) else ""
        return "$first$rest"
    }

    private fun startBackspaceRepeat() {
        stopBackspaceRepeat()
        backspaceIntervalMs = BACKSPACE_INITIAL_INTERVAL_MS
        deleteWordFromInputConnection()
        scheduleNextBackspace()
    }

    private fun scheduleNextBackspace() {
        val runnable = Runnable {
            deleteWordFromInputConnection()
            backspaceIntervalMs = (backspaceIntervalMs - BACKSPACE_ACCELERATION_STEP_MS).coerceAtLeast(BACKSPACE_MIN_INTERVAL_MS)
            scheduleNextBackspace()
        }
        backspaceRepeatRunnable = runnable
        uiHandler.postDelayed(runnable, backspaceIntervalMs)
    }

    private fun stopBackspaceRepeat() {
        backspaceRepeatRunnable?.let { uiHandler.removeCallbacks(it) }
        backspaceRepeatRunnable = null
    }

    companion object {
        private val uiHandler = Handler(Looper.getMainLooper())
        private val instanceRef: AtomicReference<WeakReference<CustomKeyboard>?> =
            AtomicReference(null)
        private const val BACKSPACE_INITIAL_INTERVAL_MS = 260L
        private const val BACKSPACE_MIN_INTERVAL_MS = 70L
        private const val BACKSPACE_ACCELERATION_STEP_MS = 30L
        private const val DOUBLE_TAP_THRESHOLD_MS = 350L
        private const val CAPS_COLOR_NEUTRAL = 0xFFDDDDDD.toInt()
        private const val CAPS_COLOR_MEDIUM = 0xFFAAC8FF.toInt()
        private const val CAPS_COLOR_STRONG = 0xFF2B7CFF.toInt()
        private var currentMode = InputMode.LETTERS
        private var lettersLayoutBackup: List<List<String>> = emptyList()
        private var clipboardItems: List<String> = emptyList()
        private var lastClipboardModuleSignature: String = ""
        private val defaultLayout =
            listOf(
                listOf("q", "w", "e", "r", "t", "y", "u", "i", "o", "p"),
                listOf("a", "s", "d", "f", "g", "h", "j", "k", "l", "ñ"),
                listOf("caps", "z", "x", "c", "v", "b", "n", "m", "backspace"),
                listOf("123", ",","space", ".", "enter"),
            )
        private val symbolsLayout =
            listOf(
                listOf("1", "2", "3", "4", "5", "6", "7", "8", "9", "0"),
                listOf("@", "#", "$", "&", "_", "-", "(", ")", "+", "%"),
                listOf("{&=", "\"", "*", "'", ":", "/", "!", "?", "+", "backspace"),
                listOf("abc", ",", "space", ".", "enter"),
            )
        private val specialLayout =
            listOf(
                listOf("£", "€", "¥", "¢", "©", "®", "™", "~", "¿"),
                listOf("tab", "[", "]", "{", "}", "<", ">", "^", "¡"),
                listOf("123", "`", ";", "÷", "\\", "|", "¦", "¬", "backspace"),
                listOf("abc", "space", "×", "§", "¶", "°", "enter"),
            )
        private var keyboardLayout: List<List<String>> = defaultLayout

        private fun setKeyboardLayoutInternal(value: List<List<String>>) {
            keyboardLayout = value
            if (currentMode == InputMode.LETTERS) {
                lettersLayoutBackup = value
            }
        }

        private var MAX_ITEMS_IN_CLIPBOARD = 10

        init {
            lettersLayoutBackup = defaultLayout
        }

        fun getLayoutSnapshot(): List<List<String>> = keyboardLayout

        fun setKeyboardLayout(layout: List<List<String>>) {
            setKeyboardLayoutInternal(
                layout.takeIf { list ->
                    list.isNotEmpty() && list.all { it.isNotEmpty() }
                } ?: defaultLayout,
            )
            currentMode = InputMode.LETTERS
            instanceRef.get()?.get()?.rebuildOnUiThread()
        }

        fun resetKeyboardLayout() {
            setKeyboardLayoutInternal(defaultLayout)
            currentMode = InputMode.LETTERS
            instanceRef.get()?.get()?.rebuildOnUiThread()
            lastClipboardModuleSignature = ""
        }

        fun sendKeyFromModule(key: String): Boolean {
            val service = instanceRef.get()?.get() ?: return false
            service.commitTextToInputConnection(key)
            return true
        }

        fun backspaceFromModule(): Boolean {
            val service = instanceRef.get()?.get() ?: return false
            service.deleteFromInputConnection()
            return true
        }

        fun enterFromModule(): Boolean {
            val service = instanceRef.get()?.get() ?: return false
            service.sendEnter()
            return true
        }

        private fun switchToSymbols() {
            currentMode = InputMode.SYMBOLS
            setKeyboardLayoutInternal(symbolsLayout)
            instanceRef.get()?.get()?.rebuildOnUiThread()
        }

        private fun switchToSpecial() {
            currentMode = InputMode.SPECIAL
            setKeyboardLayoutInternal(specialLayout)
            instanceRef.get()?.get()?.rebuildOnUiThread()
        }

        private fun switchToLetters() {
            currentMode = InputMode.LETTERS
            setKeyboardLayoutInternal(lettersLayoutBackup.ifEmpty { defaultLayout })
            instanceRef.get()?.get()?.rebuildOnUiThread()
        }

        fun setClipboardSuggestionsFromModule(items: List<String>) {
            val cleaned =
                items
                    .map { it.trim() }
                    .filter { it.isNotEmpty() }
                    .take(MAX_ITEMS_IN_CLIPBOARD)
            val signature = cleaned.joinToString("|")
            clipboardItems = cleaned
            instanceRef.get()?.get()?.updateClipboardItems(cleaned)
            if (cleaned.isNotEmpty() && signature != lastClipboardModuleSignature) {
                lastClipboardModuleSignature = signature
                val params = Arguments.createMap().apply { putBoolean("show", true) }
                BackgroundServiceModule.sendEvent("showClipboard", params)
            }
        }

        fun refreshClipboardFromSystem() {
            val service = instanceRef.get()?.get() ?: return
            val items = service.loadSystemClipboardSuggestions()
            service.updateClipboardItems(items)
        }
    }
}
