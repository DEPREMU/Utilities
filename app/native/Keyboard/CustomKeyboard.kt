package com.package.name

import android.app.AlertDialog
import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.content.res.Configuration
import android.graphics.Color
import android.graphics.drawable.GradientDrawable
import android.graphics.drawable.StateListDrawable
import android.inputmethodservice.InputMethodService
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.os.SystemClock
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import android.text.InputType
import android.text.TextUtils
import android.transition.TransitionManager
import android.util.TypedValue
import android.view.HapticFeedbackConstants
import android.view.KeyEvent
import android.view.MotionEvent
import android.view.View
import android.view.ViewGroup
import android.view.WindowManager
import android.widget.Button
import android.widget.EditText
import android.widget.FrameLayout
import android.widget.HorizontalScrollView
import android.widget.LinearLayout
import android.widget.PopupWindow
import android.widget.SeekBar
import android.widget.TextView
import android.widget.Toast
import android.view.Gravity
import android.view.KeyCharacterMap
import androidx.core.content.edit
import androidx.core.graphics.toColorInt
import com.facebook.react.bridge.Arguments
import com.facebook.react.modules.core.DefaultHardwareBackBtnHandler
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import kotlinx.coroutines.isActive
import kotlin.coroutines.coroutineContext
import kotlin.math.abs
import com.package.name.R
import java.util.concurrent.ConcurrentHashMap

class CustomKeyboard :
    InputMethodService(),
    DefaultHardwareBackBtnHandler {
    private lateinit var layoutManager: KeyboardLayout
    private lateinit var listenerProvider: KeyboardListenerProvider
    private lateinit var inputProcessor: InputProcessor

    private var capsMode: CapsMode = CapsMode.OFF
    private var currentKeyboardLayout: List<List<String>> = defaultLayout
    private var lettersLayoutBackup: List<List<String>> = defaultLayout
    private var symbolsLayoutOverride: List<List<String>>? = null
    private var specialLayoutOverride: List<List<String>>? = null
    private var currentMode: InputMode = InputMode.LETTERS
    private var autoCapSuppressed: Boolean = false
    private var lastAutoCapitalizeNext: Boolean = true
    private var isBackspaceRepeating: Boolean = false
    private var backspaceIntervalMs = 260L
    private var lastShiftTapTimeMs: Long = 0L
    private var backspaceTapCount: Int = 0
    private var lastBackspaceTapTimeMs: Long = 0L

    private lateinit var soundHaptics: KeyboardSoundHaptics

    private var backspaceInitialIntervalMs = 260L
    private var backspaceAccelerationMs = 30L
    private var backspaceMinIntervalMs = 70L
    private var backspaceSwipeThresholdPx = 0f

    private var spaceSwipeDownX: Float = 0f
    private var spaceSwipeLastX: Float = 0f
    private var spaceSwipeAccumX: Float = 0f
    private var spaceSwipeCursorMode: Boolean = false
    private var spaceSwipeStartThresholdPx: Float = 0f
    private var spaceSwipeStepPx: Float = 0f
    private var spaceSwipeVerticalStepPx: Float = 0f
    private var touchSlopPx: Float = 0f
    private var accentSwipeThresholdPx: Float = 0f

    private var px1: Int = 0
    private var px4: Int = 0
    private var px6: Int = 0
    private var px8: Int = 0
    private var px10: Int = 0
    private var px36: Int = 0
    private var px44: Int = 0
    private var px52: Int = 0
    private var px56: Int = 0
    private var px64: Int = 0

    private var keyboardHeightFactor: Float = 1.0f
    private var keyGapPx: Int = 0
    private var longPressDelayMs: Long = 400L
    private var keyTextSizePx: Float = 0f
    private var keyMinWidthPx: Int = 0
    private var keyMinHeightPx: Int = 0
    private var keyMinWideWidthPx: Int = 0
    private var keyRowHeightPx: Int = 0
    private var suggestionBarHeightPx: Int = 0
    private var selectionBarHeightPx: Int = 0
    private var clipboardBarHeightPx: Int = 0
    private var suggestionTextSizePx: Float = 0f
    private var selectionTextSizePx: Float = 0f
    private var clipboardTextSizePx: Float = 0f
    private var keyPreviewTextSizePx: Float = 0f
    private var accentTextSizePx: Float = 0f
    private var hintTextSizeFactor: Float = 0f
    private var keyPaddingHorizontalPx: Int = 0
    private var keyPaddingVerticalPx: Int = 0
    private var keyPreviewPaddingPx: Int = 0
    private var keyPreviewBorderWidthPx: Int = 0
    private var keyElevationPx: Float = 0f

    private var doubleTapThresholdMs: Long = 350L
    private var backspaceMultiTapWindowMs: Long = 450L
    private var backspaceMultiTapCount: Int = 3
    private var edgeRepeatIntervalMs: Long = 150L
    private var spaceSwipeEdgeThresholdPx: Float = 0f
    private var doubleSpaceWindowMs: Long = 800L
    private var autoCapLookbackChars: Int = 200
    private var currentWordLookbackChars: Int = 50
    private var doubleSpaceLookbackChars: Int = 6
    private var deleteWordLookbackChars: Int = 120
    private var autoPunctuationChars: String = ".,;:?! )"
    private var autoCapSentenceDelimiters: String = ".:;?!\n"
    private var pasteAddsTrailingSpace: Boolean = true
    private var maxSuggestions: Int = 3
    private var autoCorrectThresholdShort: Double = 0.75
    private var autoCorrectThresholdMedium: Double = 0.70
    private var autoCorrectThresholdLong: Double = 0.65
    private var pendingWordPromotionThreshold: Int = 3
    private var maxPendingWordCache: Int = 250
    private val pendingWordCounts = ConcurrentHashMap<String, Int>()

    private lateinit var themeManager: KeyboardThemeManager
    private lateinit var themeDialogs: KeyboardThemeDialogs

    private val userDictionary = mutableSetOf<String>()
    private var speechRecognizer: SpeechRecognizer? = null
    private var isVoiceListening: Boolean = false

    override fun onFinishInputView(finishingInput: Boolean) {
        super.onFinishInputView(finishingInput)
        layoutManager.dismissKeyPreview()
        suggestionsJob?.cancel()
        suggestionUpdateRunnable?.let { uiHandler.removeCallbacks(it) }
        soundHaptics.cancel()
    }

    override fun onWindowHidden() {
        super.onWindowHidden()
        layoutManager.dismissKeyPreview()
        suggestionsJob?.cancel()
        suggestionUpdateRunnable?.let { uiHandler.removeCallbacks(it) }
        soundHaptics.cancel()
        dictionaryLoadJob?.cancel()
        speechRecognizer?.destroy()
    }

    private val serviceJob = SupervisorJob()
    private val serviceScope = CoroutineScope(serviceJob + Dispatchers.Main.immediate)

    private var suggestionEngine = SuggestionEngine(maxSuggestions)
    private val bigramModel = BigramModel()
    private var lastCommittedWordLower: String? = null

    private enum class AutocompleteMode {
        EN,
        ES,
        BOTH,
    }

    private enum class LayoutStyle(val prefValue: String) {
        QWERTY("qwerty"),
        QWERTZ("qwertz"),
        AZERTY("azerty"),
        CUSTOM("custom"),
    }

    private var dictionaryLoadJob: Job? = null
    private var currentAutocompleteMode: AutocompleteMode? = null
    private var currentLayoutStyle: LayoutStyle = LayoutStyle.QWERTY
    private var cachedEnSnapshot: SuggestionEngine.Snapshot? = null
    private var cachedEsSnapshot: SuggestionEngine.Snapshot? = null
    private var cachedBothSnapshot: SuggestionEngine.Snapshot? = null

    private var suggestionSlotsCapitalizeFirst: Boolean = false
    private val suggestionSlotUseRawCase: MutableList<Boolean> = mutableListOf()

    enum class InputMode {
        LETTERS,
        SYMBOLS,
        SPECIAL,
    }

    enum class CapsMode {
        OFF,
        SINGLE,
        LOCK,
    }

    private var cachedEffectiveCaps: CapsMode? = null

    private var suggestionsJob: Job? = null
    private var suggestionsRequestId: Long = 0L
    private var suggestionDebounceMs: Long = 24L
    private var suggestionMinIntervalMs: Long = 48L
    private var lastSuggestionComputeAtMs: Long = 0L
    private var pendingSuggestionPrefix: String? = null
    private var pendingSuggestionCurrentWord: String? = null
    private var pendingSuggestionCapitalize: Boolean = false
    private var pendingNextWordBase: String? = null
    private var pendingNextWordMode: Boolean = false
    private var suggestionUpdateRunnable: Runnable? = null

    private var isPrivateMode: Boolean = false
    private var areSuggestionsEnabled: Boolean = true
    private var isRebuildPending: Boolean = false
    private var isCapsVisualUpdatePending: Boolean = false

    private fun observeClipboard() {
        serviceScope.launch {
            ClipboardRepository.clipboardItems.collect { items ->
                withContext(Dispatchers.Main) {
                    if (!themeManager.isClipboardSuggestionsEnabled) {
                        renderClipboardSuggestions()
                        return@withContext
                    }
                    renderClipboardSuggestions()
                }
            }
        }
    }

    private fun observeCommands() {
        serviceScope.launch {
            KeyboardCommandRepository.commands.collect { command ->
                withContext(Dispatchers.Main) {
                    handleCommand(command)
                }
            }
        }
    }

    private fun handleCommand(command: KeyboardCommandRepository.Command) {
        when (command) {
            is KeyboardCommandRepository.Command.CommitText -> commitText(command.text)
            is KeyboardCommandRepository.Command.Delete -> deleteFromInputConnection()
            is KeyboardCommandRepository.Command.Enter -> sendEnter()
            is KeyboardCommandRepository.Command.SetLayout -> setKeyboardLayoutInstance(command.layout)
            is KeyboardCommandRepository.Command.ResetLayout -> resetKeyboardLayoutInstance()
            is KeyboardCommandRepository.Command.SetInputMode -> { /* TODO */ }
        }
    }

    private fun setKeyboardLayoutInstance(layout: List<List<String>>) {
        currentKeyboardLayout = layout
        rebuildOnUiThread()
    }

    private fun resetKeyboardLayoutInstance() {
        currentKeyboardLayout = lettersLayoutBackup
        rebuildOnUiThread()
    }

    override fun onCreate() {
        super.onCreate()
        inputProcessor = InputProcessor(this)
        themeManager = KeyboardThemeManager(this)
        themeManager.loadPreferences()

        soundHaptics = KeyboardSoundHaptics(
            context = this,
            coroutineScope = serviceScope,
            themeManager = themeManager,
            uiHandler = uiHandler,
        )
        soundHaptics.init()

        observeClipboard()
        observeCommands()

        listenerProvider = object : KeyboardListenerProvider {
            override fun getKeyClickListener() = keyClickListener
            override fun getSuggestionClickListener() = suggestionClickListener
            override fun getSuggestionLongClickListener(index: Int): View.OnLongClickListener {
                return View.OnLongClickListener {
                    showSuggestionOptionsDialog(index)
                }
            }
            override fun getKeyTouchListener(key: String): View.OnTouchListener {
                val lower = key.lowercase()
                return when (lower) {
                    "space" -> SpaceTouchListener()
                    "backspace" -> BackspaceTouchListener()
                    "caps" -> ShiftTouchListener()
                    else -> StandardKeyTouchListener(key, lower)
                }
            }
            override fun getKeyLongClickListener(key: String): View.OnLongClickListener? {
                val lower = key.lowercase()
                return when (lower) {
                    "backspace" -> View.OnLongClickListener {
                        startBackspaceRepeat()
                        true
                    }
                    "space" -> View.OnLongClickListener {
                        openKeyboardConfigDialog()
                        true
                    }
                    "," -> View.OnLongClickListener {
                        if (isVoiceListening) {
                            stopVoiceInput()
                        } else {
                            startVoiceInput()
                        }
                        true
                    }
                    "caps" -> View.OnLongClickListener {
                        setCapsMode(CapsMode.LOCK)
                        true
                    }
                    else -> null
                }
            }
            override fun getCopyClickListener() = View.OnClickListener {
                val text = currentInputConnection?.getSelectedText(0)
                if (text != null) copySelection(text.toString())
            }
            override fun getCutClickListener() = View.OnClickListener {
                val text = currentInputConnection?.getSelectedText(0)
                if (text != null) cutSelection(text.toString())
            }
            override fun getClipboardItemClickListener(item: ClipboardRepository.ClipboardEntry) =
                View.OnClickListener { pasteClipboardItem(item) }
            override fun getClipboardItemLongClickListener(item: ClipboardRepository.ClipboardEntry) =
                View.OnLongClickListener {
                    showClipboardDialog(item)
                    true
                }
            override fun commitKey(key: String) {
                commitKeyWithCaps(key)
            }
        }
        layoutManager = KeyboardLayout(this, themeManager, listenerProvider)

        themeDialogs = KeyboardThemeDialogs(
            context = this,
            themeManager = themeManager,
            onThemeChanged = {
                themeManager.initPalette(isPrivateMode)
                applyPaletteToCurrentViews()
            },
            onRebuild = {
                initPxCache()
                rebuildOnUiThread()
            },
            onNavigate = { screen ->
                when (screen) {
                    "main" -> openKeyboardConfigDialog()
                    "behavior" -> openBehaviorDialog()
                }
            },
            getWindowToken = {
                window?.window?.decorView?.windowToken ?: window?.window?.attributes?.token
            }
        )
        initPxCache()
        currentLayoutStyle = getOrInitSavedLayoutStyle()
        
        lettersLayoutBackup = when (currentLayoutStyle) {
            LayoutStyle.QWERTY -> qwertyLayout
            LayoutStyle.QWERTZ -> qwertzLayout
            LayoutStyle.AZERTY -> azertyLayout
            LayoutStyle.CUSTOM -> loadLayoutFromPrefs(PREF_KEY_LAYOUT_LETTERS) ?: qwertyLayout
        }
        symbolsLayoutOverride = loadLayoutFromPrefs(PREF_KEY_LAYOUT_SYMBOLS)
        specialLayoutOverride = loadLayoutFromPrefs(PREF_KEY_LAYOUT_SPECIAL)
        layoutManager.updateKeyWeightOverrides(loadKeyWeightOverrides())
        updateTopRowMapOverrides()

        val savedUserWords = getPrefs().getStringSet(PREF_KEY_USER_DICTIONARY, emptySet())
        if (savedUserWords != null) {
            userDictionary.addAll(savedUserWords)
        }

        themeManager.initPalette(isPrivateMode)
        loadBigramModelFromAssets(BIGRAM_FILE_EN, BIGRAM_FILE_ES)
    }

    override fun onConfigurationChanged(newConfig: Configuration) {
        super.onConfigurationChanged(newConfig)
        initPxCache()
        themeManager.initPalette(isPrivateMode)
        rebuildOnUiThread()
    }

    override fun onStartInputView(info: android.view.inputmethod.EditorInfo?, restarting: Boolean) {
        super.onStartInputView(info, restarting)
        refreshAppearanceFromPrefsIfNeeded()

        val inputType = info?.inputType ?: 0
        val newPrivateMode = isPasswordInputType(inputType)

        if (isPrivateMode != newPrivateMode) {
            isPrivateMode = newPrivateMode
            themeManager.initPalette(isPrivateMode)
            applyPaletteToCurrentViews()
        } else {
            isPrivateMode = newPrivateMode
        }

        areSuggestionsEnabled = !isPrivateMode && !hasNoSuggestionsFlag(inputType) && themeManager.isAutoCorrectionEnabled

        if (isNumericOrPhoneInputType(inputType)) {
            switchToSymbols()
        } else {
            switchToLetters()
        }

        if (!areSuggestionsEnabled) {
            suggestionsJob?.cancel()
            layoutManager.suggestionsContainer?.visibility = View.GONE
            renderSuggestions(emptyList(), capitalizeFirst = false)
        }

        refreshClipboardSource()

        if (areSuggestionsEnabled) {
            updateSuggestions()
        }

        updateSelectionActions()
        invalidateCapsCache()
        updateCapsVisualsOnUiThread()
    }

    private fun isNumericOrPhoneInputType(inputType: Int): Boolean {
        val klass = inputType and InputType.TYPE_MASK_CLASS
        return klass == InputType.TYPE_CLASS_NUMBER || klass == InputType.TYPE_CLASS_PHONE
    }

    private fun hasNoSuggestionsFlag(inputType: Int): Boolean {
        val flags = inputType and InputType.TYPE_MASK_FLAGS
        return (flags and InputType.TYPE_TEXT_FLAG_NO_SUGGESTIONS) != 0
    }

    private fun isPasswordInputType(inputType: Int): Boolean {
        val klass = inputType and InputType.TYPE_MASK_CLASS
        val variation = inputType and InputType.TYPE_MASK_VARIATION

        if (klass == InputType.TYPE_CLASS_TEXT) {
            return variation == InputType.TYPE_TEXT_VARIATION_PASSWORD ||
                    variation == InputType.TYPE_TEXT_VARIATION_VISIBLE_PASSWORD ||
                    variation == InputType.TYPE_TEXT_VARIATION_WEB_PASSWORD
        }

        if (klass == InputType.TYPE_CLASS_NUMBER) {
            return variation == InputType.TYPE_NUMBER_VARIATION_PASSWORD
        }

        return false
    }

    private var isSelectionActive = false

    override fun onUpdateSelection(
        oldSelStart: Int,
        oldSelEnd: Int,
        newSelStart: Int,
        newSelEnd: Int,
        candidatesStart: Int,
        candidatesEnd: Int,
    ) {
        super.onUpdateSelection(
            oldSelStart,
            oldSelEnd,
            newSelStart,
            newSelEnd,
            candidatesStart,
            candidatesEnd
        )
        isSelectionActive = newSelStart != newSelEnd
        updateSelectionActions()
        invalidateCapsCache()
        updateCapsVisualsOnUiThread()
    }

    override fun onTrimMemory(level: Int) {
        super.onTrimMemory(level)
        if (level >= TRIM_MEMORY_MODERATE) {
            
            
            
            userDictionary.clear()
            suggestionEngine.clear()
            bigramModel.clear()
            lastCommittedWordLower = null

            cachedEnSnapshot = null
            cachedEsSnapshot = null
            cachedBothSnapshot = null

            layoutManager.dismissKeyPreview()
            layoutManager.keyPreviewPopup = null
            layoutManager.popupTextView = null

            suggestionsJob?.cancel()
            dictionaryLoadJob?.cancel()
            dictionaryLoadJob = null
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        stopBackspaceRepeat()
        suggestionsJob?.cancel()
        suggestionUpdateRunnable?.let { uiHandler.removeCallbacks(it) }
        soundHaptics.cancel()
        dictionaryLoadJob?.cancel()
        suggestionEngine.clear()
        bigramModel.clear()
        cachedEnSnapshot = null
        cachedEsSnapshot = null
        cachedBothSnapshot = null
        serviceScope.cancel()
        speechRecognizer?.destroy()
        soundHaptics.release()
    }

    override fun onCreateInputView(): View {
        val root = layoutManager.createRootLayout()
        rebuildLayout()
        val mode = getOrInitSavedAutocompleteMode()
        applyAutocompleteMode(mode, persist = false)
        return root
    }



    private fun refreshAppearanceFromPrefsIfNeeded() {
        themeManager.loadPreferences()
        initPxCache()
        val savedTheme = themeManager.getOrInitSavedThemeMode()
        val savedBackground = themeManager.getOrInitSavedBackgroundMode()

        if (savedTheme == themeManager.currentThemeMode && savedBackground == themeManager.currentBackgroundMode) {
            if (themeManager.currentThemeMode == KeyboardThemeManager.ThemeMode.SYSTEM || themeManager.currentBackgroundMode == KeyboardThemeManager.BackgroundMode.SYSTEM) {
                themeManager.initPalette(isPrivateMode)
                applyPaletteToCurrentViews()
            }
            return
        }

        themeManager.currentThemeMode = savedTheme
        themeManager.currentBackgroundMode = savedBackground
        themeManager.initPalette(isPrivateMode)
        applyPaletteToCurrentViews()
    }

    private fun applyPaletteToCurrentViews() {
        layoutManager.applyPaletteToCurrentViews(effectiveCapsMode())
    }




    private fun sendDpadKey(keyCode: Int, isSelection: Boolean = false) {
        val inputConnection = currentInputConnection ?: return
        val now = SystemClock.uptimeMillis()

       
        val metaState = if (isSelection) KeyEvent.META_SHIFT_ON else 0

        if (isSelection) {
            inputConnection.sendKeyEvent(KeyEvent(now, now, KeyEvent.ACTION_DOWN, KeyEvent.KEYCODE_SHIFT_LEFT, 0, 0))
        }

       
        inputConnection.sendKeyEvent(
            KeyEvent(
                now,
                now,
                KeyEvent.ACTION_DOWN,
                keyCode,
                0,
                metaState
            )
        )
        inputConnection.sendKeyEvent(
            KeyEvent(
                now,
                now,
                KeyEvent.ACTION_UP,
                keyCode,
                0,
                metaState
            )
        )

        if (isSelection) {
            inputConnection.sendKeyEvent(KeyEvent(now, now, KeyEvent.ACTION_UP,     KeyEvent.KEYCODE_SHIFT_LEFT, 0, 0))
        }
    }



    private fun rebuildLayout() {
        val letters = if (currentMode == InputMode.LETTERS) currentKeyboardLayout else lettersLayoutBackup
        layoutManager.rebuildLayout(
            lettersLayout = letters.ifEmpty { defaultLayout },
            symbolsLayout = symbolsLayoutOverride ?: symbolsLayout,
            specialLayout = specialLayoutOverride ?: specialLayout,
            capsVisualMode = effectiveCapsMode()
        )

        layoutManager.ensureSuggestionButtons(maxSuggestions)

        refreshClipboardSource()
        updateSuggestions()
        updateSelectionActions()
        renderClipboardSuggestions()
        invalidateCapsCache()
        updateCapsVisuals()

        setInputMode(currentMode)
    }

    private fun setInputMode(mode: InputMode) {
        layoutManager.lettersKeyboardContainer?.visibility =
            if (mode == InputMode.LETTERS) View.VISIBLE else View.GONE
        layoutManager.symbolsKeyboardContainer?.visibility =
            if (mode == InputMode.SYMBOLS) View.VISIBLE else View.GONE
        layoutManager.specialKeyboardContainer?.visibility =
            if (mode == InputMode.SPECIAL) View.VISIBLE else View.GONE

        if (mode == InputMode.LETTERS) {
            invalidateCapsCache()
            updateCapsVisualsOnUiThread()
        }
    }

    private fun effectiveCapsMode(): CapsMode {
        return cachedEffectiveCaps
            ?: run {
                val mode =
                    if (
                        capsMode == CapsMode.OFF &&
                        shouldAutoCapitalizeNextChar() &&
                        !autoCapSuppressed
                    ) {
                        CapsMode.SINGLE
                    } else {
                        capsMode
                    }
                cachedEffectiveCaps = mode
                mode
            }
    }

    private fun handleShiftPress() {
        val now = SystemClock.elapsedRealtime()
        val delta = now - lastShiftTapTimeMs

        if (capsMode == CapsMode.OFF && shouldAutoCapitalizeNextChar() && !autoCapSuppressed) {
            autoCapSuppressed = true
            invalidateCapsCache()
            updateCapsVisualsOnUiThread()
            return
        }

        when (capsMode) {
            CapsMode.LOCK -> {
                setCapsMode(CapsMode.OFF)
            }

            CapsMode.SINGLE -> {
                if (delta <= doubleTapThresholdMs) {
                    setCapsMode(CapsMode.LOCK)
                } else {
                    setCapsMode(CapsMode.OFF)
                }
            }

            CapsMode.OFF -> {
                if (delta <= doubleTapThresholdMs) {
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
        invalidateCapsCache()
        updateCapsVisualsOnUiThread()
    }

    private fun rebuildOnUiThread() {
        if (isRebuildPending) return
        isRebuildPending = true
        uiHandler.post {
            isRebuildPending = false
            if (layoutManager.rootLayout != null) {
                rebuildLayout()
            }
        }
    }

    private fun updateCapsVisualsOnUiThread() {
        if (isCapsVisualUpdatePending) return
        isCapsVisualUpdatePending = true
        uiHandler.post {
            isCapsVisualUpdatePending = false
            if (layoutManager.rootLayout != null) {
                updateCapsVisuals()
            }
        }
    }

    private fun updateCapsVisuals() {
        layoutManager.updateCapsVisuals(effectiveCapsMode())
    }

    fun onTextCommitted() {
        updateSuggestions()
        updateSelectionActions()
        invalidateCapsCache()
        updateCapsVisualsOnUiThread()
    }

    fun commitText(text: String) {
        learnFromCommittedText(text)
        inputProcessor.commitText(text)
    }

    private fun commitKeyWithCaps(raw: String) {
        if (raw == " ") {
            if (inputProcessor.handleDoubleSpace()) {
                return
            }

            if (!areSuggestionsEnabled) {
                inputProcessor.commitText(" ")
                inputProcessor.maybeInsertAutoSpace(raw)
                updateSelectionActions()
                return
            }

            val inputConnection = currentInputConnection
            val currentWord = extractCurrentWord()
            if (inputConnection != null && !currentWord.isNullOrEmpty()) {
                val currentLower = currentWord.lowercase()

                if (inputProcessor.ignoreAutoCorrectWord != null && inputProcessor.ignoreAutoCorrectWord == currentLower) {
                    inputProcessor.ignoreAutoCorrectWord = null
                    inputProcessor.clearAutoCorrectionState()
                } else {
                    val existsExact = suggestionEngine.contains(currentLower)
                    if (!existsExact && currentWord.length >= 2) {
                        val threshold = getAutoCorrectThreshold(currentWord.length)
                        val match = suggestionEngine.bestFuzzyMatch(currentLower, threshold)
                        if (!match.isNullOrBlank()) {
                            val replacement =
                                if (currentWord.firstOrNull()?.isUpperCase() == true) {
                                    match.replaceFirstChar { it.uppercaseChar() }
                                } else {
                                    match
                                }

                            if (!inputProcessor.shouldApplyAutoCorrection(currentWord, replacement)) {
                                inputProcessor.clearAutoCorrectionState()
                            } else {
                                inputProcessor.recordAutoCorrection(currentWord, replacement, true)
                                inputProcessor.ignoreAutoCorrectWord = null

                                inputProcessor.runBatchEdit(inputConnection) { ic ->
                                    ic.deleteSurroundingText(currentWord.length, 0)
                                    ic.commitText("$replacement ", 1)
                                }

                                recordCommittedWord(replacement)
                                onTextCommitted()
                                return
                            }
                        }
                    }
                }

                recordCommittedWord(currentWord)
            }
        } else {
            inputProcessor.resetLastSpaceTap()
        }

        if (raw.length == 1 && isPunctuation(raw[0])) {
            inputProcessor.removeTrailingSpaceBeforePunctuation()
        }

        var tempAutoCap = false
        if (!autoCapSuppressed && capsMode == CapsMode.OFF && shouldAutoCapitalizeNextChar()) {
            tempAutoCap = true
            setCapsMode(CapsMode.SINGLE)
        }

        val prevVisualMode = effectiveCapsMode()
        val textToCommit = prepareCasedText(raw)
        inputProcessor.commitText(textToCommit)
        inputProcessor.maybeInsertAutoSpace(raw)

        if (!shouldAutoCapitalizeNextChar()) {
            autoCapSuppressed = false
            invalidateCapsCache()
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
            updateCapsVisualsOnUiThread()
        }
    }

    private fun refreshClipboardSource() {
        if (!themeManager.isClipboardSuggestionsEnabled) {
            renderClipboardSuggestions()
            return
        }
        val items = ClipboardRepository.clipboardItems.value
        if (items.isNotEmpty()) {
            renderClipboardSuggestions()
            return
        }

        serviceScope.launch {
            val loaded = ClipboardRepository.loadSystemClipboard(this@CustomKeyboard)
            ClipboardRepository.setClipboardItems(loaded)
            renderClipboardSuggestions()
        }
    }

    private fun renderClipboardSuggestions() {
        if (!themeManager.isClipboardSuggestionsEnabled) {
            layoutManager.renderClipboardSuggestions(emptyList())
            return
        }
        layoutManager.renderClipboardSuggestions(ClipboardRepository.clipboardItems.value)
    }

    private fun pasteClipboardItem(item: ClipboardRepository.ClipboardEntry) {
        inputProcessor.pasteText(item.content)
    }

    private fun sendClipboardEvent(type: String, text: String? = null, id: String? = null) {
        val params = Arguments.createMap().apply {
            putString("type", type)
            if (!id.isNullOrBlank()) {
                putString("id", id)
            }
            if (!text.isNullOrBlank()) {
                putString("text", text)
            }
        }
        BackgroundServiceModule.sendEvent("ClipboardEvent", params)
    }

    private fun showClipboardDialog(item: ClipboardRepository.ClipboardEntry) {
        val text = item.content
        val (pasteLabel, deleteLabel, closeLabel) = getClipboardDialogLabels()
        val windowToken =
            window?.window?.decorView?.windowToken ?: window?.window?.attributes?.token ?: return
        uiHandler.post {
            val dialog =
                AlertDialog.Builder(this)
                    .setMessage(text)
                    .setPositiveButton(pasteLabel) { dialogInterface, _ ->
                        pasteClipboardItem(item)
                        dialogInterface.dismiss()
                    }
                    .setNeutralButton(deleteLabel) { dialogInterface, _ ->
                        val updated =
                            if (!item.id.isNullOrBlank()) {
                                ClipboardRepository.clipboardItems.value.filter {
                                    it.id != item.id
                                }
                            } else {
                                ClipboardRepository.clipboardItems.value.filter {
                                    it.content != text
                                }
                            }
                        ClipboardRepository.setClipboardItems(updated)
                        renderClipboardSuggestions()
                        sendClipboardEvent("delete", text = text, id = item.id)
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

    private fun getClipboardDialogLabels(): Triple<String, String, String> {
        return Triple(
            getString(R.string.btn_paste),
            getString(R.string.btn_delete),
            getString(R.string.btn_close),
        )
    }

    private fun saveUserDictionary() {
        getPrefs().edit { putStringSet(PREF_KEY_USER_DICTIONARY, userDictionary) }
    }

    private fun startVoiceInput() {
        if (!themeManager.isVoiceInputEnabled) return
        if (checkCallingOrSelfPermission(android.Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
            Toast.makeText(
                this,
                getString(R.string.permission_required_voice_input),
                Toast.LENGTH_SHORT
            ).show()
            return
        }

        val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
            putExtra(
                RecognizerIntent.EXTRA_LANGUAGE_MODEL,
                RecognizerIntent.LANGUAGE_MODEL_FREE_FORM
            )
            putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 1)
        }

        uiHandler.post {
            try {
                if (speechRecognizer == null) {
                    speechRecognizer = SpeechRecognizer.createSpeechRecognizer(this).apply {
                        setRecognitionListener(object : RecognitionListener {
                            override fun onReadyForSpeech(params: Bundle?) {}
                            override fun onBeginningOfSpeech() {}
                            override fun onRmsChanged(rmsdB: Float) {}
                            override fun onBufferReceived(buffer: ByteArray?) {}
                            override fun onEndOfSpeech() {
                                isVoiceListening = false
                            }
                            override fun onError(error: Int) {
                                isVoiceListening = false
                                Toast.makeText(
                                    this@CustomKeyboard,
                                    getString(R.string.error_voice_input),
                                    Toast.LENGTH_SHORT
                                ).show()
                            }

                            override fun onResults(results: Bundle?) {
                                val matches =
                                    results?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
                                if (!matches.isNullOrEmpty()) {
                                    val text = matches[0]
                                    commitText("$text ")
                                }
                                isVoiceListening = false
                            }

                            override fun onPartialResults(partialResults: Bundle?) {}
                            override fun onEvent(eventType: Int, params: Bundle?) {}
                        })
                    }
                }
                isVoiceListening = true
                speechRecognizer?.startListening(intent)
                Toast.makeText(this, getString(R.string.listening_voice_input), Toast.LENGTH_SHORT)
                    .show()
            } catch (e: Exception) {
                isVoiceListening = false
                Toast.makeText(this, getString(R.string.voice_input_failed), Toast.LENGTH_SHORT)
                    .show()
            }
        }
    }

    private fun stopVoiceInput() {
        isVoiceListening = false
        runCatching { speechRecognizer?.stopListening() }
        runCatching { speechRecognizer?.cancel() }
        Toast.makeText(this, getString(R.string.voice_input_stopped), Toast.LENGTH_SHORT).show()
    }

    private fun isPunctuation(ch: Char): Boolean =
    autoPunctuationChars.contains(ch)

    private fun updateSelectionActions() {
        val selectedText = currentInputConnection?.getSelectedText(0)
        val (copyLabel, cutLabel) = getCopyCutLabels()

        val container = layoutManager.selectionActionsContainer
        val parent = container?.parent as? ViewGroup
        if (parent != null) {
            TransitionManager.beginDelayedTransition(parent)
        }

        layoutManager.updateSelectionActions(
            selectedText,
            areSuggestionsEnabled,
            copyLabel,
            cutLabel
        )
    }

    private fun getCopyCutLabels(): Pair<String, String> {
        return Pair(
            getString(R.string.btn_copy),
            getString(R.string.btn_cut),
        )
    }

    private fun copySelection(text: String, isCut: Boolean = false) {
        val clipboard = getSystemService(CLIPBOARD_SERVICE) as? ClipboardManager ?: return
        clipboard.setPrimaryClip(ClipData.newPlainText("selected_text", text))
        refreshClipboardSource()
        renderClipboardSuggestions()
        if (!isCut) showToastCopied()
        clearSelection()
    }

    private fun cutSelection(text: String) {
        copySelection(text, isCut = true)
        inputProcessor.cutSelection()
        showToastCut()
        clearSelection()
        updateSelectionActions()
        updateSuggestions()
        refreshClipboardSource()
        renderClipboardSuggestions()
    }

    private fun clearSelection() {
        inputProcessor.clearSelection()
        layoutManager.selectionActionsContainer?.visibility = View.GONE
    }

    private fun showToastCopied() {
        val msg = getString(R.string.msg_copied)
        Toast.makeText(this, msg, Toast.LENGTH_SHORT).show()
    }

    private fun showToastCut() {
        val msg = getString(R.string.msg_cut)
        Toast.makeText(this, msg, Toast.LENGTH_SHORT).show()
    }

    fun deleteFromInputConnection() {
        inputProcessor.handleBackspace()
    }

    private fun deleteWordFromInputConnection() {
        inputProcessor.handleDeleteWord()
    }

    private fun invalidateCapsCache() {
        cachedEffectiveCaps = null
    }

    fun sendEnter() {
        inputProcessor.sendEnter()
    }

    override fun invokeDefaultOnBackPressed() {}

    private fun dpToPx(dp: Int): Int =
        TypedValue.applyDimension(
            TypedValue.COMPLEX_UNIT_DIP,
            dp.toFloat(),
            resources.displayMetrics,
        ).toInt()

    private fun spToPx(sp: Float): Float =
        TypedValue.applyDimension(
            TypedValue.COMPLEX_UNIT_SP,
            sp,
            resources.displayMetrics,
        )

    private fun getPrefs() = getSharedPreferences(KeyboardThemeManager.PREFS_NAME, MODE_PRIVATE)

    private fun getOrInitSavedLayoutStyle(): LayoutStyle {
        val prefs = getPrefs()
        val raw = prefs.getString(PREF_KEY_LAYOUT_STYLE, null)
        if (!raw.isNullOrBlank()) {
            return LayoutStyle.entries.firstOrNull { it.prefValue == raw } ?: LayoutStyle.QWERTY
        }
        prefs.edit { putString(PREF_KEY_LAYOUT_STYLE, LayoutStyle.QWERTY.prefValue) }
        return LayoutStyle.QWERTY
    }

    private fun setSavedLayoutStyle(style: LayoutStyle) {
        getPrefs().edit { putString(PREF_KEY_LAYOUT_STYLE, style.prefValue) }
    }



    private fun getOrInitSavedAutocompleteMode(): AutocompleteMode {
        val prefs = getPrefs()
        val raw = prefs.getString(PREF_KEY_AUTOCOMPLETE_MODE, null)
        if (!raw.isNullOrBlank()) {
            return runCatching { AutocompleteMode.valueOf(raw) }.getOrElse { AutocompleteMode.EN }
        }

        val languageCode = resources.configuration.locales[0]?.language ?: "en"
        val initial = if (languageCode.startsWith(
                "es",
                ignoreCase = true
            )
        ) AutocompleteMode.ES else AutocompleteMode.EN
        prefs.edit { putString(PREF_KEY_AUTOCOMPLETE_MODE, initial.name) }
        return initial
    }

    private fun setSavedAutocompleteMode(mode: AutocompleteMode) {
        getPrefs().edit { putString(PREF_KEY_AUTOCOMPLETE_MODE, mode.name) }
    }

    private fun applyAutocompleteMode(mode: AutocompleteMode, persist: Boolean) {
        if (persist) {
            setSavedAutocompleteMode(mode)
        }

        if (currentAutocompleteMode == mode) {
            return
        }

        currentAutocompleteMode = mode
        dictionaryLoadJob?.cancel()

        when (mode) {
            AutocompleteMode.EN -> {
                cachedEsSnapshot = null
                cachedBothSnapshot = null
            }

            AutocompleteMode.ES -> {
                cachedEnSnapshot = null
                cachedBothSnapshot = null
            }

            AutocompleteMode.BOTH -> {
                cachedEnSnapshot = null
                cachedEsSnapshot = null
            }
        }

        val cached =
            when (mode) {
                AutocompleteMode.EN -> cachedEnSnapshot
                AutocompleteMode.ES -> cachedEsSnapshot
                AutocompleteMode.BOTH -> cachedBothSnapshot
            }

        if (cached != null) {
            suggestionEngine.applySnapshot(cached)
            updateSuggestions()
            return
        }

        dictionaryLoadJob =
            serviceScope.launch {
                when (mode) {
                    AutocompleteMode.EN -> {
                        val snapshot =
                            withContext(Dispatchers.IO) {
                                suggestionEngine.clear()
                                suggestionEngine.buildSnapshot(
                                    loadWordsSequenceFromAssets(
                                        AUTOCOMPLETE_FILE_EN
                                    )
                                )
                            }
                        cachedEnSnapshot = snapshot
                        suggestionEngine.applySnapshot(snapshot)
                        updateSuggestions()
                    }

                    AutocompleteMode.ES -> {
                        val snapshot =
                            withContext(Dispatchers.IO) {
                                suggestionEngine.clear()
                                suggestionEngine.buildSnapshot(
                                    loadWordsSequenceFromAssets(
                                        AUTOCOMPLETE_FILE_ES
                                    )
                                )
                            }
                        cachedEsSnapshot = snapshot
                        suggestionEngine.applySnapshot(snapshot)
                        updateSuggestions()
                    }

                    AutocompleteMode.BOTH -> {
                        val bothSnapshot =
                            withContext(Dispatchers.IO) {
                                suggestionEngine.clear()
                                suggestionEngine.buildSnapshot(
                                    loadWordsSequenceFromAssets(
                                        AUTOCOMPLETE_FILE_EN,
                                        AUTOCOMPLETE_FILE_ES
                                    ),
                                )
                            }
                        cachedBothSnapshot = bothSnapshot
                        suggestionEngine.applySnapshot(bothSnapshot)
                        updateSuggestions()
                    }
                }
            }
    }

    private fun loadWordsSequenceFromAssets(vararg fileNames: String): Sequence<String> {
        return sequence {
            var yielded = 0

            for (word in userDictionary) {
                if (yielded >= MAX_DICTIONARY_WORDS) return@sequence
                yield(word)
                yielded += 1
            }

            fileNames.forEach { fileName ->
                if (yielded >= MAX_DICTIONARY_WORDS) return@sequence
                try {
                    assets.open(fileName).bufferedReader().useLines { lines ->
                        for (line in lines) {
                            if (yielded >= MAX_DICTIONARY_WORDS) return@useLines
                            val trimmed = line.trim()
                            if (trimmed.isNotEmpty()) {
                                yield(trimmed)
                                yielded += 1
                            }
                        }
                    }
                } catch (_: Exception) {
                }
            }
        }
    }

    private fun openAutocompleteConfigDialog() {
        val title = getString(R.string.dialog_autocomplete_title)
        val closeLabel = getString(R.string.btn_close)
        val items = arrayOf(
            getString(R.string.option_en),
            getString(R.string.option_es),
            getString(R.string.option_both)
        )

        val mode = currentAutocompleteMode ?: getOrInitSavedAutocompleteMode()
        val checked =
            when (mode) {
                AutocompleteMode.EN -> 0
                AutocompleteMode.ES -> 1
                AutocompleteMode.BOTH -> 2
            }

        val windowToken =
            window?.window?.decorView?.windowToken ?: window?.window?.attributes?.token ?: return
        uiHandler.post {
            val dialog =
                AlertDialog.Builder(this)
                    .setTitle(title)
                    .setSingleChoiceItems(items, checked) { dialogInterface, which ->
                        val selected =
                            when (which) {
                                0 -> AutocompleteMode.EN
                                1 -> AutocompleteMode.ES
                                else -> AutocompleteMode.BOTH
                            }
                        applyAutocompleteMode(selected, persist = true)
                        dialogInterface.dismiss()
                        openBehaviorDialog()
                    }
                    .setNegativeButton(closeLabel) { dialogInterface, _ ->
                        dialogInterface.dismiss()
                        openBehaviorDialog()
                    }
                    .setOnCancelListener {
                        openBehaviorDialog()
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

    private fun openKeyboardConfigDialog() {
        val title = getString(R.string.dialog_settings_title)
        val items = arrayOf(
            getString(R.string.category_dimensions),
            getString(R.string.category_visual_style),
            getString(R.string.category_behavior),
            getString(R.string.category_layout)
        )

        val windowToken =
            window?.window?.decorView?.windowToken ?: window?.window?.attributes?.token ?: return
        uiHandler.post {
            val dialog =
                AlertDialog.Builder(this)
                    .setTitle(title)
                    .setItems(items) { dialogInterface, which ->
                        dialogInterface.dismiss()
                        when (which) {
                            0 -> openDimensionsDialog()
                            1 -> themeDialogs.openVisualStylesDialog()
                            2 -> openBehaviorDialog()
                            3 -> openLayoutDialog()
                        }
                    }
                    .setNegativeButton(getString(R.string.btn_close)) { dialogInterface, _ ->
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

    private fun openLayoutDialog() {
        val title = getString(R.string.dialog_layout_style_title)
        val closeLabel = getString(R.string.btn_close)
        val items = arrayOf(
            getString(R.string.option_qwerty),
            getString(R.string.option_qwertz),
            getString(R.string.option_azerty),
            getString(R.string.option_custom_layout)
        )
        val checked =
            when (currentLayoutStyle) {
                LayoutStyle.QWERTY -> 0
                LayoutStyle.QWERTZ -> 1
                LayoutStyle.AZERTY -> 2
                LayoutStyle.CUSTOM -> 3
            }

        val windowToken =
            window?.window?.decorView?.windowToken ?: window?.window?.attributes?.token ?: return
        uiHandler.post {
            val dialog =
                AlertDialog.Builder(this)
                    .setTitle(title)
                    .setSingleChoiceItems(items, checked) { dialogInterface, which ->
                        val selected =
                            when (which) {
                                0 -> LayoutStyle.QWERTY
                                1 -> LayoutStyle.QWERTZ
                                2 -> LayoutStyle.AZERTY
                                else -> LayoutStyle.CUSTOM
                            }
                        currentLayoutStyle = selected
                        setSavedLayoutStyle(selected)
                        
                        lettersLayoutBackup = when (selected) {
                            LayoutStyle.QWERTY -> qwertyLayout
                            LayoutStyle.QWERTZ -> qwertzLayout
                            LayoutStyle.AZERTY -> azertyLayout
                            LayoutStyle.CUSTOM -> loadLayoutFromPrefs(PREF_KEY_LAYOUT_LETTERS) ?: qwertyLayout
                        }
                        symbolsLayoutOverride = loadLayoutFromPrefs(PREF_KEY_LAYOUT_SYMBOLS)
                        specialLayoutOverride = loadLayoutFromPrefs(PREF_KEY_LAYOUT_SPECIAL)
                        layoutManager.updateKeyWeightOverrides(loadKeyWeightOverrides())
                        updateTopRowMapOverrides()
                        rebuildOnUiThread()

                        dialogInterface.dismiss()
                        if (selected == LayoutStyle.CUSTOM) {
                            openCustomLayoutDialog()
                        } else {
                            openKeyboardConfigDialog()
                        }
                    }
                    .setNegativeButton(closeLabel) { dialogInterface, _ ->
                        dialogInterface.dismiss()
                        openKeyboardConfigDialog()
                    }
                    .setOnCancelListener {
                        openKeyboardConfigDialog()
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

    private fun openCustomLayoutDialog() {
        val context = this
        val layout = LinearLayout(context).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(px10 * 2, px10, px10 * 2, px10)
        }

        val prefs = getPrefs()
        val initialLetters = prefs.getString(PREF_KEY_LAYOUT_LETTERS, layoutToString(lettersLayoutBackup)) ?: ""
        val initialSymbols = prefs.getString(PREF_KEY_LAYOUT_SYMBOLS, layoutToString(symbolsLayout)) ?: ""
        val initialSpecial = prefs.getString(PREF_KEY_LAYOUT_SPECIAL, layoutToString(specialLayout)) ?: ""
        val initialWeights = prefs.getString(PREF_KEY_KEY_WEIGHTS, "") ?: ""
        val initialTopRow = prefs.getString(PREF_KEY_TOP_ROW_MAP, "") ?: ""

        val lettersInput = EditText(context).apply {
            hint = getString(R.string.hint_letters_layout)
            setText(initialLetters)
        }
        val symbolsInput = EditText(context).apply {
            hint = getString(R.string.hint_symbols_layout)
            setText(initialSymbols)
        }
        val specialInput = EditText(context).apply {
            hint = getString(R.string.hint_special_layout)
            setText(initialSpecial)
        }
        val weightsInput = EditText(context).apply {
            hint = getString(R.string.hint_key_weights)
            setText(initialWeights)
        }
        val topRowInput = EditText(context).apply {
            hint = getString(R.string.hint_top_row_map)
            setText(initialTopRow)
        }

        layout.addView(lettersInput)
        layout.addView(symbolsInput)
        layout.addView(specialInput)
        layout.addView(weightsInput)
        layout.addView(topRowInput)

        val windowToken = window?.window?.decorView?.windowToken ?: window?.window?.attributes?.token ?: return
        uiHandler.post {
            val dialog = AlertDialog.Builder(context)
                .setTitle(getString(R.string.dialog_custom_layout_title))
                .setView(layout)
                .setPositiveButton(getString(R.string.btn_ok)) { _, _ ->
                    prefs.edit {
                        putString(PREF_KEY_LAYOUT_LETTERS, lettersInput.text.toString())
                        putString(PREF_KEY_LAYOUT_SYMBOLS, symbolsInput.text.toString())
                        putString(PREF_KEY_LAYOUT_SPECIAL, specialInput.text.toString())
                        putString(PREF_KEY_KEY_WEIGHTS, weightsInput.text.toString())
                        putString(PREF_KEY_TOP_ROW_MAP, topRowInput.text.toString())
                    }
                    lettersLayoutBackup = loadLayoutFromPrefs(PREF_KEY_LAYOUT_LETTERS) ?: qwertyLayout
                    symbolsLayoutOverride = loadLayoutFromPrefs(PREF_KEY_LAYOUT_SYMBOLS)
                    specialLayoutOverride = loadLayoutFromPrefs(PREF_KEY_LAYOUT_SPECIAL)
                    layoutManager.updateKeyWeightOverrides(loadKeyWeightOverrides())
                    updateTopRowMapOverrides()
                    rebuildOnUiThread()
                    openLayoutDialog()
                }
                .setNegativeButton(getString(R.string.btn_cancel)) { _, _ ->
                    openLayoutDialog()
                }
                .setOnCancelListener {
                    openLayoutDialog()
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

    private fun layoutToString(layout: List<List<String>>): String {
        return layout.joinToString(";\n") { row -> row.joinToString(",") }
    }

    private fun loadLayoutFromPrefs(key: String): List<List<String>>? {
        val raw = getPrefs().getString(key, null)?.trim().orEmpty()
        if (raw.isBlank()) return null
        val rows = raw.split(";", "\n").map { it.trim() }.filter { it.isNotEmpty() }
        if (rows.isEmpty()) return null
        val parsed = rows.mapNotNull { row ->
            val keys = row.split(",").map { it.trim() }.filter { it.isNotEmpty() }
            if (keys.isEmpty()) null else keys
        }
        return if (parsed.isEmpty()) null else parsed
    }

    private fun loadKeyWeightOverrides(): Map<String, Float> {
        val raw = getPrefs().getString(PREF_KEY_KEY_WEIGHTS, "")?.trim().orEmpty()
        if (raw.isBlank()) return emptyMap()
        val pairs = raw.split(";", "\n").map { it.trim() }.filter { it.isNotEmpty() }
        val map = mutableMapOf<String, Float>()
        pairs.forEach { pair ->
            val parts = pair.split("=").map { it.trim() }
            if (parts.size == 2) {
                val key = parts[0].lowercase()
                val value = parts[1].toFloatOrNull()
                if (value != null) {
                    map[key] = value
                }
            }
        }
        return map
    }

    private fun updateTopRowMapOverrides() {
        val raw = getPrefs().getString(PREF_KEY_TOP_ROW_MAP, "")?.trim().orEmpty()
        if (raw.isBlank()) {
            topRowMap = defaultTopRowMap
            return
        }
        val rows = raw.split(";", "\n").map { it.trim() }.filter { it.isNotEmpty() }
        val map = mutableMapOf<String, List<String>>()
        rows.forEach { row ->
            val parts = row.split("=")
            if (parts.size == 2) {
                val key = parts[0].trim().lowercase()
                val values = parts[1].split(",").map { it.trim() }.filter { it.isNotEmpty() }
                if (values.isNotEmpty()) {
                    map[key] = values
                }
            }
        }
        topRowMap = if (map.isEmpty()) defaultTopRowMap else map
    }

    private fun openDimensionsDialog() {
        val context = this
        val layout = LinearLayout(context).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(px10 * 2, px10, px10 * 2, px10)
        }

        val prefs = getPrefs()
        val initialFactor = prefs.getFloat(PREF_KEY_KEYBOARD_HEIGHT_FACTOR, 1.0f)
        val initialGap = prefs.getInt(PREF_KEY_KEY_GAP, 1)

        val heightLabel = TextView(context).apply {
            text = getString(R.string.label_height, (initialFactor * 100).toInt())
        }
        val heightSeek = SeekBar(context).apply {
            max = 80
            progress = ((initialFactor - 0.7f) * 100).toInt()
            setOnSeekBarChangeListener(object : SeekBar.OnSeekBarChangeListener {
                override fun onProgressChanged(
                    seekBar: SeekBar?,
                    progress: Int,
                    fromUser: Boolean
                ) {
                    val factor = 0.7f + (progress / 100f)
                    heightLabel.text = getString(R.string.label_height, (factor * 100).toInt())
                    getPrefs().edit { putFloat(PREF_KEY_KEYBOARD_HEIGHT_FACTOR, factor) }
                    initPxCache()
                    rebuildOnUiThread()
                }

                override fun onStartTrackingTouch(seekBar: SeekBar?) {}
                override fun onStopTrackingTouch(seekBar: SeekBar?) {}
            })
        }

        val gapLabel = TextView(context).apply {
            text = getString(R.string.label_key_gap, initialGap)
            setPadding(0, px10, 0, 0)
        }

        val gapSeek = SeekBar(context).apply {
            max = 6
            progress = initialGap
            setOnSeekBarChangeListener(object : SeekBar.OnSeekBarChangeListener {
                override fun onProgressChanged(
                    seekBar: SeekBar?,
                    progress: Int,
                    fromUser: Boolean
                ) {
                    gapLabel.text = getString(R.string.label_key_gap, progress)
                    getPrefs().edit { putInt(PREF_KEY_KEY_GAP, progress) }
                    initPxCache()
                    rebuildOnUiThread()
                }

                override fun onStartTrackingTouch(seekBar: SeekBar?) {}
                override fun onStopTrackingTouch(seekBar: SeekBar?) {}
            })
        }

        layout.addView(heightLabel)
        layout.addView(heightSeek)
        layout.addView(gapLabel)
        layout.addView(gapSeek)

        val windowToken =
            window?.window?.decorView?.windowToken ?: window?.window?.attributes?.token ?: return
        uiHandler.post {
            val dialog = AlertDialog.Builder(context)
                .setTitle(getString(R.string.dialog_dimensions_title))
                .setView(layout)
                .setPositiveButton(getString(R.string.btn_ok)) { _, _ ->
                    openKeyboardConfigDialog()
                }
                .setNegativeButton(getString(R.string.btn_cancel)) { _, _ ->
                    getPrefs().edit {
                        putFloat(PREF_KEY_KEYBOARD_HEIGHT_FACTOR, initialFactor)
                            .putInt(PREF_KEY_KEY_GAP, initialGap)
                    }
                    initPxCache()
                    rebuildOnUiThread()
                    openKeyboardConfigDialog()
                }
                .setOnCancelListener {
                    getPrefs().edit {
                        putFloat(PREF_KEY_KEYBOARD_HEIGHT_FACTOR, initialFactor)
                            .putInt(PREF_KEY_KEY_GAP, initialGap)
                    }
                    initPxCache()
                    rebuildOnUiThread()
                    openKeyboardConfigDialog()
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

    private fun openBehaviorDialog() {
        val items = arrayOf(
            getString(R.string.item_vibration),
            getString(R.string.item_long_press_delay),
            getString(R.string.item_autocomplete),
            getString(R.string.item_swipe_settings),
            getString(R.string.item_typing_speed),
            getString(R.string.item_sound_effects),
            getString(R.string.item_vibration_pattern),
            getString(R.string.item_input_rules),
            getString(R.string.item_features),
            getString(R.string.item_limits)
        )

        val windowToken =
            window?.window?.decorView?.windowToken ?: window?.window?.attributes?.token ?: return
        uiHandler.post {
            val dialog = AlertDialog.Builder(this)
                .setTitle(getString(R.string.dialog_behavior_title))
                .setItems(items) { dialogInterface, which ->
                    dialogInterface.dismiss()
                    when (which) {
                        0 -> openVibrationDialog()
                        1 -> openLongPressDelayDialog()
                        2 -> openAutocompleteConfigDialog()
                        3 -> openSwipeSettingsDialog()
                        4 -> openTypingSpeedDialog()
                        5 -> openSoundDialog()
                        6 -> openVibrationPatternDialog()
                        7 -> openInputRulesDialog()
                        8 -> themeDialogs.openFeaturesDialog()
                        9 -> openLimitsDialog()
                    }
                }
                .setNegativeButton(getString(R.string.btn_close)) { _, _ ->
                    openKeyboardConfigDialog()
                }
                .setOnCancelListener {
                    openKeyboardConfigDialog()
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

    private fun openSwipeSettingsDialog() {
        val context = this
        val layout = LinearLayout(context).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(px10 * 2, px10 * 2, px10 * 2, px10 * 2)
        }

        val prefs = getPrefs()
        val initialThreshold = prefs.getInt(PREF_KEY_SWIPE_THRESHOLD, 6)
        val initialHStep = prefs.getInt(PREF_KEY_SWIPE_H_STEP, 12)
        val initialVStep = prefs.getInt(PREF_KEY_SWIPE_V_STEP, 24)
        val initialBsThreshold = prefs.getInt(PREF_KEY_BACKSPACE_SWIPE_THRESHOLD, 36)
        val initialTouchSlop = prefs.getInt(PREF_KEY_TOUCH_SLOP_DP, 10)
        val initialAccentSwipe = prefs.getInt(PREF_KEY_ACCENT_SWIPE_THRESHOLD_DP, 20)
        val initialEdgeThreshold = prefs.getInt(PREF_KEY_EDGE_SWIPE_THRESHOLD_DP, 36)
        val initialEdgeRepeat = prefs.getLong(PREF_KEY_EDGE_REPEAT_INTERVAL, 150L)

        val addSeek = { labelResId: Int, initial: Int, key: String, max: Int ->
            val tv = TextView(context).apply { text = getString(labelResId, initial) }
            val seek = SeekBar(context).apply {
                this.max = max
                progress = initial
                setOnSeekBarChangeListener(object : SeekBar.OnSeekBarChangeListener {
                    override fun onProgressChanged(seekBar: SeekBar?, progress: Int, fromUser: Boolean) {
                        tv.text = getString(labelResId, progress)
                    }
                    override fun onStartTrackingTouch(seekBar: SeekBar?) {}
                    override fun onStopTrackingTouch(seekBar: SeekBar?) {
                        prefs.edit { putInt(key, progress) }
                        initPxCache()
                    }
                })
            }
            layout.addView(tv)
            layout.addView(seek)
        }

        addSeek(R.string.label_swipe_start_threshold_fmt, initialThreshold, PREF_KEY_SWIPE_THRESHOLD, 50)
        addSeek(R.string.label_swipe_horizontal_step_fmt, initialHStep, PREF_KEY_SWIPE_H_STEP, 100)
        addSeek(R.string.label_swipe_vertical_step_fmt, initialVStep, PREF_KEY_SWIPE_V_STEP, 100)
        addSeek(R.string.label_backspace_swipe_threshold_fmt, initialBsThreshold, PREF_KEY_BACKSPACE_SWIPE_THRESHOLD, 100)
        addSeek(R.string.label_touch_slop_fmt, initialTouchSlop, PREF_KEY_TOUCH_SLOP_DP, 50)
        addSeek(R.string.label_accent_swipe_threshold_fmt, initialAccentSwipe, PREF_KEY_ACCENT_SWIPE_THRESHOLD_DP, 80)
        addSeek(R.string.label_edge_swipe_threshold_fmt, initialEdgeThreshold, PREF_KEY_EDGE_SWIPE_THRESHOLD_DP, 80)

        val edgeRepeatLabel = TextView(context).apply {
            text = getString(R.string.label_edge_repeat_interval_fmt, initialEdgeRepeat)
        }
        val edgeRepeatSeek = SeekBar(context).apply {
            max = 500
            progress = initialEdgeRepeat.toInt().coerceIn(50, 500)
            setOnSeekBarChangeListener(object : SeekBar.OnSeekBarChangeListener {
                override fun onProgressChanged(seekBar: SeekBar?, progress: Int, fromUser: Boolean) {
                    val value = progress.coerceAtLeast(50)
                    edgeRepeatLabel.text = getString(R.string.label_edge_repeat_interval_fmt, value)
                }
                override fun onStartTrackingTouch(seekBar: SeekBar?) {}
                override fun onStopTrackingTouch(seekBar: SeekBar?) {
                    val value = seekBar?.progress?.coerceAtLeast(50) ?: 50
                    prefs.edit { putLong(PREF_KEY_EDGE_REPEAT_INTERVAL, value.toLong()) }
                    initPxCache()
                }
            })
        }
        layout.addView(edgeRepeatLabel)
        layout.addView(edgeRepeatSeek)

        val windowToken = window?.window?.decorView?.windowToken ?: window?.window?.attributes?.token ?: return
        uiHandler.post {
            val dialog = AlertDialog.Builder(this)
                .setTitle(getString(R.string.dialog_swipe_settings_title))
                .setView(layout)
                .setPositiveButton(getString(R.string.btn_close)) { _, _ -> openBehaviorDialog() }
                .setOnCancelListener { openBehaviorDialog() }
                .create()
            
            dialog.window?.apply {
                setType(WindowManager.LayoutParams.TYPE_APPLICATION_ATTACHED_DIALOG)
                attributes?.token = windowToken
                addFlags(WindowManager.LayoutParams.FLAG_ALT_FOCUSABLE_IM)
            }
            dialog.show()
        }
    }

    private fun openTypingSpeedDialog() {
        val context = this
        val layout = LinearLayout(context).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(px10 * 2, px10 * 2, px10 * 2, px10 * 2)
        }

        val prefs = getPrefs()
        val initialInitial = prefs.getLong(PREF_KEY_BACKSPACE_INITIAL_INTERVAL, 260L)
        val initialAccel = prefs.getLong(PREF_KEY_BACKSPACE_ACCELERATION, 30L)
        val initialMin = prefs.getLong(PREF_KEY_BACKSPACE_MIN_INTERVAL, 70L)

        val addSeek = { labelResId: Int, initial: Long, key: String, max: Int ->
            val tv = TextView(context).apply { text = getString(labelResId, initial) }
            val seek = SeekBar(context).apply {
                this.max = max
                progress = initial.toInt()
                setOnSeekBarChangeListener(object : SeekBar.OnSeekBarChangeListener {
                    override fun onProgressChanged(seekBar: SeekBar?, progress: Int, fromUser: Boolean) {
                        tv.text = getString(labelResId, progress)
                    }
                    override fun onStartTrackingTouch(seekBar: SeekBar?) {}
                    override fun onStopTrackingTouch(seekBar: SeekBar?) {
                        prefs.edit { putLong(key, progress.toLong()) }
                        initPxCache()
                    }
                })
            }
            layout.addView(tv)
            layout.addView(seek)
        }

        addSeek(R.string.label_backspace_initial_delay_fmt, initialInitial, PREF_KEY_BACKSPACE_INITIAL_INTERVAL, 1000)
        addSeek(R.string.label_backspace_acceleration_fmt, initialAccel, PREF_KEY_BACKSPACE_ACCELERATION, 200)
        addSeek(R.string.label_backspace_min_interval_fmt, initialMin, PREF_KEY_BACKSPACE_MIN_INTERVAL, 200)

        val windowToken = window?.window?.decorView?.windowToken ?: window?.window?.attributes?.token ?: return
        uiHandler.post {
            val dialog = AlertDialog.Builder(this)
                .setTitle(getString(R.string.dialog_typing_speed_title))
                .setView(layout)
                .setPositiveButton(getString(R.string.btn_close)) { _, _ -> openBehaviorDialog() }
                .setOnCancelListener { openBehaviorDialog() }
                .create()
            
            dialog.window?.apply {
                setType(WindowManager.LayoutParams.TYPE_APPLICATION_ATTACHED_DIALOG)
                attributes?.token = windowToken
                addFlags(WindowManager.LayoutParams.FLAG_ALT_FOCUSABLE_IM)
            }
            dialog.show()
        }
    }

    private fun openSoundDialog() {
        val context = this
        val layout = LinearLayout(context).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(px10 * 2, px10 * 2, px10 * 2, px10 * 2)
        }

        val prefs = getPrefs()
        val initialEnabled = themeManager.isSoundEnabled
        val initialVolume = prefs.getFloat(PREF_KEY_SOUND_VOLUME, 1f)
        val initialRate = prefs.getFloat(PREF_KEY_SOUND_RATE, 1f)

        val enabledCheck = android.widget.CheckBox(context).apply {
            text = getString(R.string.label_enable_sounds)
            isChecked = initialEnabled
        }

        val volumeLabel = TextView(context).apply {
            text = getString(R.string.label_volume_fmt, (initialVolume * 100).toInt())
        }
        val volumeSeek = SeekBar(context).apply {
            max = 100
            progress = (initialVolume * 100).toInt().coerceIn(0, 100)
            setOnSeekBarChangeListener(object : SeekBar.OnSeekBarChangeListener {
                override fun onProgressChanged(seekBar: SeekBar?, progress: Int, fromUser: Boolean) {
                    volumeLabel.text = getString(R.string.label_volume_fmt, progress)
                }
                override fun onStartTrackingTouch(seekBar: SeekBar?) {}
                override fun onStopTrackingTouch(seekBar: SeekBar?) {}
            })
        }

        val rateLabel = TextView(context).apply {
            text = getString(R.string.label_rate_fmt, (initialRate * 100).toInt())
        }
        val rateSeek = SeekBar(context).apply {
            max = 200
            progress = (initialRate * 100).toInt().coerceIn(50, 200)
            setOnSeekBarChangeListener(object : SeekBar.OnSeekBarChangeListener {
                override fun onProgressChanged(seekBar: SeekBar?, progress: Int, fromUser: Boolean) {
                    val normalized = progress.coerceAtLeast(50)
                    rateLabel.text = getString(R.string.label_rate_fmt, normalized)
                }
                override fun onStartTrackingTouch(seekBar: SeekBar?) {}
                override fun onStopTrackingTouch(seekBar: SeekBar?) {}
            })
        }

        layout.addView(enabledCheck)
        layout.addView(volumeLabel)
        layout.addView(volumeSeek)
        layout.addView(rateLabel)
        layout.addView(rateSeek)

        val applySoundEnabled = { enabled: Boolean ->
            themeManager.saveFeatureFlags(
                autoCorrectionEnabled = themeManager.isAutoCorrectionEnabled,
                clipboardSuggestionsEnabled = themeManager.isClipboardSuggestionsEnabled,
                soundEnabled = enabled,
                vibrationEnabled = themeManager.isVibrationEnabled,
                gestureTypingEnabled = themeManager.isGestureTypingEnabled,
                voiceInputEnabled = themeManager.isVoiceInputEnabled,
                doubleSpaceEnabled = themeManager.isDoubleSpaceEnabled,
                autoSpaceEnabled = themeManager.isAutoSpaceEnabled,
                deleteWordEnabled = themeManager.isDeleteWordEnabled,
                backspaceSwipeEnabled = themeManager.isBackspaceSwipeEnabled,
                backspaceTripleTapEnabled = themeManager.isBackspaceTripleTapEnabled,
            )
        }

        val windowToken = window?.window?.decorView?.windowToken ?: window?.window?.attributes?.token ?: return
        uiHandler.post {
            val dialog = AlertDialog.Builder(this)
                .setTitle(getString(R.string.dialog_sound_effects_title))
                .setView(layout)
                .setPositiveButton(getString(R.string.btn_ok)) { _, _ ->
                    val volume = volumeSeek.progress / 100f
                    val rate = (rateSeek.progress.coerceAtLeast(50) / 100f)
                    prefs.edit {
                        putFloat(PREF_KEY_SOUND_VOLUME, volume)
                        putFloat(PREF_KEY_SOUND_RATE, rate)
                    }
                    applySoundEnabled(enabledCheck.isChecked)
                    initPxCache()
                    openBehaviorDialog()
                }
                .setNegativeButton(getString(R.string.btn_cancel)) { _, _ ->
                    prefs.edit {
                        putFloat(PREF_KEY_SOUND_VOLUME, initialVolume)
                        putFloat(PREF_KEY_SOUND_RATE, initialRate)
                    }
                    applySoundEnabled(initialEnabled)
                    initPxCache()
                    openBehaviorDialog()
                }
                .setOnCancelListener {
                    prefs.edit {
                        putFloat(PREF_KEY_SOUND_VOLUME, initialVolume)
                        putFloat(PREF_KEY_SOUND_RATE, initialRate)
                    }
                    applySoundEnabled(initialEnabled)
                    initPxCache()
                    openBehaviorDialog()
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

    private fun openVibrationPatternDialog() {
        val context = this
        val layout = LinearLayout(context).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(px10 * 2, px10 * 2, px10 * 2, px10 * 2)
        }

        val prefs = getPrefs()
        val initialPattern = prefs.getString(PREF_KEY_VIBRATION_PATTERN, "") ?: ""
        val initialRepeat = prefs.getInt(PREF_KEY_VIBRATION_PATTERN_REPEAT, -1)
        val initialAmplitude = prefs.getInt(PREF_KEY_VIBRATION_AMPLITUDE, -1)

        val patternInput = EditText(context).apply {
            hint = getString(R.string.hint_vibration_pattern)
            setText(initialPattern)
        }
        val repeatLabel = TextView(context).apply {
            text = getString(R.string.label_repeat_index_fmt, initialRepeat)
        }
        val repeatSeek = SeekBar(context).apply {
            max = 10
            progress = initialRepeat.coerceAtLeast(0)
            setOnSeekBarChangeListener(object : SeekBar.OnSeekBarChangeListener {
                override fun onProgressChanged(seekBar: SeekBar?, progress: Int, fromUser: Boolean) {
                    val value = if (progress == 0) -1 else progress - 1
                    repeatLabel.text = getString(R.string.label_repeat_index_fmt, value)
                }
                override fun onStartTrackingTouch(seekBar: SeekBar?) {}
                override fun onStopTrackingTouch(seekBar: SeekBar?) {}
            })
        }
        val amplitudeLabel = TextView(context).apply {
            text = getString(R.string.label_amplitude_fmt, initialAmplitude)
        }
        val amplitudeSeek = SeekBar(context).apply {
            max = 255
            progress = if (initialAmplitude < 0) 0 else initialAmplitude
            setOnSeekBarChangeListener(object : SeekBar.OnSeekBarChangeListener {
                override fun onProgressChanged(seekBar: SeekBar?, progress: Int, fromUser: Boolean) {
                    val value = if (progress == 0) -1 else progress
                    amplitudeLabel.text = getString(R.string.label_amplitude_fmt, value)
                }
                override fun onStartTrackingTouch(seekBar: SeekBar?) {}
                override fun onStopTrackingTouch(seekBar: SeekBar?) {}
            })
        }

        layout.addView(patternInput)
        layout.addView(repeatLabel)
        layout.addView(repeatSeek)
        layout.addView(amplitudeLabel)
        layout.addView(amplitudeSeek)

        val windowToken = window?.window?.decorView?.windowToken ?: window?.window?.attributes?.token ?: return
        uiHandler.post {
            val dialog = AlertDialog.Builder(this)
                .setTitle(getString(R.string.dialog_vibration_pattern_title))
                .setView(layout)
                .setPositiveButton(getString(R.string.btn_ok)) { _, _ ->
                    val repeat = if (repeatSeek.progress == 0) -1 else repeatSeek.progress - 1
                    val amplitude = if (amplitudeSeek.progress == 0) -1 else amplitudeSeek.progress
                    prefs.edit {
                        putString(PREF_KEY_VIBRATION_PATTERN, patternInput.text.toString())
                        putInt(PREF_KEY_VIBRATION_PATTERN_REPEAT, repeat)
                        putInt(PREF_KEY_VIBRATION_AMPLITUDE, amplitude)
                    }
                    initPxCache()
                    openBehaviorDialog()
                }
                .setNegativeButton(getString(R.string.btn_cancel)) { _, _ ->
                    prefs.edit {
                        putString(PREF_KEY_VIBRATION_PATTERN, initialPattern)
                        putInt(PREF_KEY_VIBRATION_PATTERN_REPEAT, initialRepeat)
                        putInt(PREF_KEY_VIBRATION_AMPLITUDE, initialAmplitude)
                    }
                    initPxCache()
                    openBehaviorDialog()
                }
                .setOnCancelListener {
                    prefs.edit {
                        putString(PREF_KEY_VIBRATION_PATTERN, initialPattern)
                        putInt(PREF_KEY_VIBRATION_PATTERN_REPEAT, initialRepeat)
                        putInt(PREF_KEY_VIBRATION_AMPLITUDE, initialAmplitude)
                    }
                    initPxCache()
                    openBehaviorDialog()
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

    private fun openInputRulesDialog() {
        val context = this
        val layout = LinearLayout(context).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(px10 * 2, px10 * 2, px10 * 2, px10 * 2)
        }

        val prefs = getPrefs()
        val initialDoubleSpaceWindow = prefs.getLong(PREF_KEY_DOUBLE_SPACE_WINDOW, 800L)
        val initialDoubleSpaceLookback = prefs.getInt(PREF_KEY_DOUBLE_SPACE_LOOKBACK, 6)
        val initialDeleteWordLookback = prefs.getInt(PREF_KEY_DELETE_WORD_LOOKBACK, 120)
        val initialAutoCapLookback = prefs.getInt(PREF_KEY_AUTOCAP_LOOKBACK, 200)
        val initialCurrentWordLookback = prefs.getInt(PREF_KEY_CURRENT_WORD_LOOKBACK, 50)
        val initialAutoPunctuation = prefs.getString(PREF_KEY_AUTO_PUNCTUATION_CHARS, ".,;:?!)") ?: ".,;:?!)"
        val initialAutoCapDelims = prefs.getString(PREF_KEY_AUTOCAP_DELIMITERS, ".:;?!\n") ?: ".:;?!\n"
        val initialPasteSpace = prefs.getBoolean(PREF_KEY_PASTE_ADD_SPACE, true)

        val doubleSpaceLabel = TextView(context).apply {
            text = getString(R.string.label_double_space_window_fmt, initialDoubleSpaceWindow)
        }
        val doubleSpaceSeek = SeekBar(context).apply {
            max = 1500
            progress = initialDoubleSpaceWindow.toInt().coerceIn(0, 1500)
            setOnSeekBarChangeListener(object : SeekBar.OnSeekBarChangeListener {
                override fun onProgressChanged(seekBar: SeekBar?, progress: Int, fromUser: Boolean) {
                    doubleSpaceLabel.text = getString(R.string.label_double_space_window_fmt, progress)
                }
                override fun onStartTrackingTouch(seekBar: SeekBar?) {}
                override fun onStopTrackingTouch(seekBar: SeekBar?) {}
            })
        }

        val doubleSpaceLookbackLabel = TextView(context).apply {
            text = getString(R.string.label_double_space_lookback_fmt, initialDoubleSpaceLookback)
        }
        val doubleSpaceLookbackSeek = SeekBar(context).apply {
            max = 20
            progress = initialDoubleSpaceLookback.coerceIn(1, 20)
            setOnSeekBarChangeListener(object : SeekBar.OnSeekBarChangeListener {
                override fun onProgressChanged(seekBar: SeekBar?, progress: Int, fromUser: Boolean) {
                    val value = progress.coerceAtLeast(1)
                    doubleSpaceLookbackLabel.text = getString(R.string.label_double_space_lookback_fmt, value)
                }
                override fun onStartTrackingTouch(seekBar: SeekBar?) {}
                override fun onStopTrackingTouch(seekBar: SeekBar?) {}
            })
        }

        val deleteWordLabel = TextView(context).apply {
            text = getString(R.string.label_delete_word_lookback_fmt, initialDeleteWordLookback)
        }
        val deleteWordSeek = SeekBar(context).apply {
            max = 300
            progress = initialDeleteWordLookback.coerceIn(20, 300)
            setOnSeekBarChangeListener(object : SeekBar.OnSeekBarChangeListener {
                override fun onProgressChanged(seekBar: SeekBar?, progress: Int, fromUser: Boolean) {
                    val value = progress.coerceAtLeast(20)
                    deleteWordLabel.text = getString(R.string.label_delete_word_lookback_fmt, value)
                }
                override fun onStartTrackingTouch(seekBar: SeekBar?) {}
                override fun onStopTrackingTouch(seekBar: SeekBar?) {}
            })
        }

        val autoCapLabel = TextView(context).apply {
            text = getString(R.string.label_autocap_lookback_fmt, initialAutoCapLookback)
        }
        val autoCapSeek = SeekBar(context).apply {
            max = 400
            progress = initialAutoCapLookback.coerceIn(50, 400)
            setOnSeekBarChangeListener(object : SeekBar.OnSeekBarChangeListener {
                override fun onProgressChanged(seekBar: SeekBar?, progress: Int, fromUser: Boolean) {
                    val value = progress.coerceAtLeast(50)
                    autoCapLabel.text = getString(R.string.label_autocap_lookback_fmt, value)
                }
                override fun onStartTrackingTouch(seekBar: SeekBar?) {}
                override fun onStopTrackingTouch(seekBar: SeekBar?) {}
            })
        }

        val currentWordLabel = TextView(context).apply {
            text = getString(R.string.label_current_word_lookback_fmt, initialCurrentWordLookback)
        }
        val currentWordSeek = SeekBar(context).apply {
            max = 200
            progress = initialCurrentWordLookback.coerceIn(10, 200)
            setOnSeekBarChangeListener(object : SeekBar.OnSeekBarChangeListener {
                override fun onProgressChanged(seekBar: SeekBar?, progress: Int, fromUser: Boolean) {
                    val value = progress.coerceAtLeast(10)
                    currentWordLabel.text = getString(R.string.label_current_word_lookback_fmt, value)
                }
                override fun onStartTrackingTouch(seekBar: SeekBar?) {}
                override fun onStopTrackingTouch(seekBar: SeekBar?) {}
            })
        }

        val autoPunctuationInput = EditText(context).apply {
            hint = getString(R.string.hint_auto_punctuation_chars)
            setText(initialAutoPunctuation)
        }
        val autoCapInput = EditText(context).apply {
            hint = getString(R.string.hint_autocap_delimiters)
            setText(initialAutoCapDelims)
        }
        val pasteCheck = android.widget.CheckBox(context).apply {
            text = getString(R.string.label_paste_add_space)
            isChecked = initialPasteSpace
        }

        layout.addView(doubleSpaceLabel)
        layout.addView(doubleSpaceSeek)
        layout.addView(doubleSpaceLookbackLabel)
        layout.addView(doubleSpaceLookbackSeek)
        layout.addView(deleteWordLabel)
        layout.addView(deleteWordSeek)
        layout.addView(autoCapLabel)
        layout.addView(autoCapSeek)
        layout.addView(currentWordLabel)
        layout.addView(currentWordSeek)
        layout.addView(autoPunctuationInput)
        layout.addView(autoCapInput)
        layout.addView(pasteCheck)

        val windowToken = window?.window?.decorView?.windowToken ?: window?.window?.attributes?.token ?: return
        uiHandler.post {
            val dialog = AlertDialog.Builder(this)
                .setTitle(getString(R.string.dialog_input_rules_title))
                .setView(layout)
                .setPositiveButton(getString(R.string.btn_ok)) { _, _ ->
                    prefs.edit {
                        putLong(PREF_KEY_DOUBLE_SPACE_WINDOW, doubleSpaceSeek.progress.toLong())
                        putInt(PREF_KEY_DOUBLE_SPACE_LOOKBACK, doubleSpaceLookbackSeek.progress.coerceAtLeast(1))
                        putInt(PREF_KEY_DELETE_WORD_LOOKBACK, deleteWordSeek.progress.coerceAtLeast(20))
                        putInt(PREF_KEY_AUTOCAP_LOOKBACK, autoCapSeek.progress.coerceAtLeast(50))
                        putInt(PREF_KEY_CURRENT_WORD_LOOKBACK, currentWordSeek.progress.coerceAtLeast(10))
                        putString(PREF_KEY_AUTO_PUNCTUATION_CHARS, autoPunctuationInput.text.toString())
                        putString(PREF_KEY_AUTOCAP_DELIMITERS, autoCapInput.text.toString())
                        putBoolean(PREF_KEY_PASTE_ADD_SPACE, pasteCheck.isChecked)
                    }
                    initPxCache()
                    openBehaviorDialog()
                }
                .setNegativeButton(getString(R.string.btn_cancel)) { _, _ ->
                    prefs.edit {
                        putLong(PREF_KEY_DOUBLE_SPACE_WINDOW, initialDoubleSpaceWindow)
                        putInt(PREF_KEY_DOUBLE_SPACE_LOOKBACK, initialDoubleSpaceLookback)
                        putInt(PREF_KEY_DELETE_WORD_LOOKBACK, initialDeleteWordLookback)
                        putInt(PREF_KEY_AUTOCAP_LOOKBACK, initialAutoCapLookback)
                        putInt(PREF_KEY_CURRENT_WORD_LOOKBACK, initialCurrentWordLookback)
                        putString(PREF_KEY_AUTO_PUNCTUATION_CHARS, initialAutoPunctuation)
                        putString(PREF_KEY_AUTOCAP_DELIMITERS, initialAutoCapDelims)
                        putBoolean(PREF_KEY_PASTE_ADD_SPACE, initialPasteSpace)
                    }
                    initPxCache()
                    openBehaviorDialog()
                }
                .setOnCancelListener {
                    prefs.edit {
                        putLong(PREF_KEY_DOUBLE_SPACE_WINDOW, initialDoubleSpaceWindow)
                        putInt(PREF_KEY_DOUBLE_SPACE_LOOKBACK, initialDoubleSpaceLookback)
                        putInt(PREF_KEY_DELETE_WORD_LOOKBACK, initialDeleteWordLookback)
                        putInt(PREF_KEY_AUTOCAP_LOOKBACK, initialAutoCapLookback)
                        putInt(PREF_KEY_CURRENT_WORD_LOOKBACK, initialCurrentWordLookback)
                        putString(PREF_KEY_AUTO_PUNCTUATION_CHARS, initialAutoPunctuation)
                        putString(PREF_KEY_AUTOCAP_DELIMITERS, initialAutoCapDelims)
                        putBoolean(PREF_KEY_PASTE_ADD_SPACE, initialPasteSpace)
                    }
                    initPxCache()
                    openBehaviorDialog()
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

    private fun openLimitsDialog() {
        val context = this
        val layout = LinearLayout(context).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(px10 * 2, px10 * 2, px10 * 2, px10 * 2)
        }

        val prefs = getPrefs()
        val initialSuggestions = prefs.getInt(PREF_KEY_MAX_SUGGESTIONS, 3)

        val suggestionLabel = TextView(context).apply {
            text = getString(R.string.label_max_suggestions_fmt, initialSuggestions)
        }
        val suggestionSeek = SeekBar(context).apply {
            max = 10
            progress = initialSuggestions.coerceIn(1, 10)
            setOnSeekBarChangeListener(object : SeekBar.OnSeekBarChangeListener {
                override fun onProgressChanged(seekBar: SeekBar?, progress: Int, fromUser: Boolean) {
                    val value = progress.coerceAtLeast(1)
                    suggestionLabel.text = getString(R.string.label_max_suggestions_fmt, value)
                }
                override fun onStartTrackingTouch(seekBar: SeekBar?) {}
                override fun onStopTrackingTouch(seekBar: SeekBar?) {}
            })
        }

        layout.addView(suggestionLabel)
        layout.addView(suggestionSeek)

        val windowToken = window?.window?.decorView?.windowToken ?: window?.window?.attributes?.token ?: return
        uiHandler.post {
            val dialog = AlertDialog.Builder(this)
                .setTitle(getString(R.string.dialog_limits_title))
                .setView(layout)
                .setPositiveButton(getString(R.string.btn_ok)) { _, _ ->
                    prefs.edit {
                        putInt(PREF_KEY_MAX_SUGGESTIONS, suggestionSeek.progress.coerceAtLeast(1))
                    }
                    initPxCache()
                    rebuildOnUiThread()
                    openBehaviorDialog()
                }
                .setNegativeButton(getString(R.string.btn_cancel)) { _, _ ->
                    prefs.edit {
                        putInt(PREF_KEY_MAX_SUGGESTIONS, initialSuggestions)
                    }
                    initPxCache()
                    rebuildOnUiThread()
                    openBehaviorDialog()
                }
                .setOnCancelListener {
                    prefs.edit {
                        putInt(PREF_KEY_MAX_SUGGESTIONS, initialSuggestions)
                    }
                    initPxCache()
                    rebuildOnUiThread()
                    openBehaviorDialog()
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

    private fun openVibrationDialog() {
        val context = this
        val layout = LinearLayout(context).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(px10 * 2, px10, px10 * 2, px10)
        }

        val prefs = getPrefs()
        val initialVib = prefs.getInt(PREF_KEY_VIBRATION_DURATION, 0)

        val vibLabel =
            TextView(context).apply { text = getString(R.string.label_duration_fmt, initialVib) }
        val vibSeek = SeekBar(context).apply {
            max = 100
            progress = initialVib
            setOnSeekBarChangeListener(object : SeekBar.OnSeekBarChangeListener {
                override fun onProgressChanged(
                    seekBar: SeekBar?,
                    progress: Int,
                    fromUser: Boolean
                ) {
                    vibLabel.text = getString(R.string.label_duration_fmt, progress)
                    getPrefs().edit { putInt(PREF_KEY_VIBRATION_DURATION, progress) }
                    initPxCache()
                }

                override fun onStartTrackingTouch(seekBar: SeekBar?) {}
                override fun onStopTrackingTouch(seekBar: SeekBar?) {}
            })
        }

        layout.addView(vibLabel)
        layout.addView(vibSeek)

        val windowToken =
            window?.window?.decorView?.windowToken ?: window?.window?.attributes?.token ?: return
        uiHandler.post {
            val dialog = AlertDialog.Builder(context)
                .setTitle(getString(R.string.item_vibration))
                .setView(layout)
                .setPositiveButton(getString(R.string.btn_ok)) { _, _ ->
                    openBehaviorDialog()
                }
                .setNegativeButton(getString(R.string.btn_cancel)) { _, _ ->
                    getPrefs().edit { putInt(PREF_KEY_VIBRATION_DURATION, initialVib) }
                    initPxCache()
                    openBehaviorDialog()
                }
                .setOnCancelListener {
                    getPrefs().edit { putInt(PREF_KEY_VIBRATION_DURATION, initialVib) }
                    initPxCache()
                    openBehaviorDialog()
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

    private fun openLongPressDelayDialog() {
        val context = this
        val layout = LinearLayout(context).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(px10 * 2, px10, px10 * 2, px10)
        }

        val prefs = getPrefs()
        val initialDelay = prefs.getLong(PREF_KEY_LONG_PRESS_DELAY, 400L)

        val delayLabel =
            TextView(context).apply { text = getString(R.string.label_delay_fmt, initialDelay) }
        val delaySeek = SeekBar(context).apply {
            max = 800

            progress = (initialDelay - 200).toInt()
            setOnSeekBarChangeListener(object : SeekBar.OnSeekBarChangeListener {
                override fun onProgressChanged(
                    seekBar: SeekBar?,
                    progress: Int,
                    fromUser: Boolean
                ) {
                    val delay = 200L + progress
                    delayLabel.text = getString(R.string.label_delay_fmt, delay)
                    getPrefs().edit { putLong(PREF_KEY_LONG_PRESS_DELAY, delay) }
                    initPxCache()
                    rebuildOnUiThread()
                }

                override fun onStartTrackingTouch(seekBar: SeekBar?) {}
                override fun onStopTrackingTouch(seekBar: SeekBar?) {}
            })
        }

        layout.addView(delayLabel)
        layout.addView(delaySeek)

        val windowToken =
            window?.window?.decorView?.windowToken ?: window?.window?.attributes?.token ?: return
        uiHandler.post {
            val dialog = AlertDialog.Builder(context)
                .setTitle(getString(R.string.dialog_long_press_delay_title))
                .setView(layout)
                .setPositiveButton(getString(R.string.btn_ok)) { _, _ ->
                    openBehaviorDialog()
                }
                .setNegativeButton(getString(R.string.btn_cancel)) { _, _ ->
                    getPrefs().edit { putLong(PREF_KEY_LONG_PRESS_DELAY, initialDelay) }
                    initPxCache()
                    rebuildOnUiThread()
                    openBehaviorDialog()
                }
                .setOnCancelListener {
                    getPrefs().edit { putLong(PREF_KEY_LONG_PRESS_DELAY, initialDelay) }
                    initPxCache()
                    rebuildOnUiThread()
                    openBehaviorDialog()
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

    private fun extractCurrentWord(): String? {
        val inputConnection = currentInputConnection ?: return null
        val beforeCursor = inputConnection.getTextBeforeCursor(currentWordLookbackChars, 0) ?: return null
        if (beforeCursor.isEmpty()) return ""

        var i = beforeCursor.length - 1
        while (i >= 0 && beforeCursor[i].isLetter()) {
            i--
        }
        val start = i + 1
        if (start >= beforeCursor.length) return ""
        return beforeCursor.substring(start)
    }

    private fun normalizeWord(raw: String): String {
        val trimmed = raw.trim()
        if (trimmed.isEmpty()) return ""
        val builder = StringBuilder(trimmed.length)
        for (ch in trimmed) {
            if (ch.isLetter()) {
                builder.append(ch.lowercaseChar())
            }
        }
        return builder.toString()
    }

    private fun extractNormalizedWords(text: String): List<String> {
        if (text.isBlank()) return emptyList()
        val parts = text.split(Regex("\\s+"))
        val out = ArrayList<String>(parts.size)
        for (part in parts) {
            val word = normalizeWord(part)
            if (word.isNotEmpty()) {
                out.add(word)
            }
        }
        return out
    }

    private fun getLearnableWord(raw: String): String? {
        if (isPrivateMode) return null
        val normalized = normalizeWord(raw)
        if (normalized.length < 3) return null
        if (suggestionEngine.contains(normalized) || userDictionary.contains(normalized)) {
            return normalized
        }

        val updatedCount = (pendingWordCounts[normalized] ?: 0) + 1
        pendingWordCounts[normalized] = updatedCount
        if (pendingWordCounts.size > maxPendingWordCache) {
            val iterator = pendingWordCounts.keys.iterator()
            var removed = 0
            while (iterator.hasNext() && removed < 50) {
                iterator.next()
                iterator.remove()
                removed += 1
            }
        }

        if (updatedCount < pendingWordPromotionThreshold) return null
        pendingWordCounts.remove(normalized)
        if (userDictionary.add(normalized)) {
            saveUserDictionary()
            cachedEnSnapshot = null
            cachedEsSnapshot = null
            cachedBothSnapshot = null
            val mode = currentAutocompleteMode ?: AutocompleteMode.EN
            currentAutocompleteMode = null
            applyAutocompleteMode(mode, false)
        }
        return normalized
    }

    private fun learnFromCommittedText(text: String) {
        if (isPrivateMode) return
        val words = extractNormalizedWords(text)
        if (words.isEmpty()) return
        var prev = lastCommittedWordLower
        for (word in words) {
            val learned = getLearnableWord(word)
            if (learned == null) {
                prev = null
                continue
            }
            if (!prev.isNullOrEmpty()) {
                bigramModel.add(prev, learned)
            }
            prev = learned
        }
        lastCommittedWordLower = prev
    }

    private fun recordCommittedWord(word: String) {
        val learned = getLearnableWord(word)
        if (learned == null) {
            lastCommittedWordLower = null
            return
        }
        val prev = lastCommittedWordLower
        if (!prev.isNullOrEmpty()) {
            bigramModel.add(prev, learned)
        }
        lastCommittedWordLower = learned
    }

    private fun shouldShowNextWordSuggestions(): Boolean {
        val inputConnection = currentInputConnection ?: return false
        val before = inputConnection.getTextBeforeCursor(1, 0)?.toString().orEmpty()
        if (before.isEmpty()) return false
        return before.last().isWhitespace()
    }

    private fun loadBigramModelFromAssets(vararg fileNames: String) {
        serviceScope.launch {
            withContext(Dispatchers.IO) {
                fileNames.forEach { fileName ->
                    try {
                        assets.open(fileName).bufferedReader().useLines { lines ->
                            for (line in lines) {
                                val trimmed = line.trim()
                                if (trimmed.isEmpty()) continue
                                val parts = trimmed.split(Regex("\\s+"))
                                if (parts.size < 2) continue
                                val prev = normalizeWord(parts[0])
                                val next = normalizeWord(parts[1])
                                if (prev.isEmpty() || next.isEmpty()) continue
                                val count = parts.getOrNull(2)?.toIntOrNull() ?: 1
                                bigramModel.add(prev, next, count)
                            }
                        }
                    } catch (_: Exception) {
                    }
                }
            }
        }
    }

    private fun updateSuggestions() {
        if (!areSuggestionsEnabled || !themeManager.isAutoCorrectionEnabled) {
            suggestionsJob?.cancel()
            pendingSuggestionPrefix = null
            pendingSuggestionCurrentWord = null
            pendingNextWordBase = null
            pendingNextWordMode = false
            suggestionUpdateRunnable?.let { uiHandler.removeCallbacks(it) }
            renderSuggestions(emptyList(), capitalizeFirst = false)
            return
        }

        val currentWord = extractCurrentWord()
        if (currentWord.isNullOrEmpty()) {
            val baseWord = lastCommittedWordLower
            if (!baseWord.isNullOrEmpty() && shouldShowNextWordSuggestions()) {
                pendingNextWordMode = true
                pendingNextWordBase = baseWord
                pendingSuggestionCapitalize = shouldAutoCapitalizeNextChar()
                scheduleSuggestionUpdate()
                return
            }

            suggestionsJob?.cancel()
            pendingSuggestionPrefix = null
            pendingSuggestionCurrentWord = null
            pendingNextWordBase = null
            pendingNextWordMode = false
            suggestionUpdateRunnable?.let { uiHandler.removeCallbacks(it) }
            renderSuggestions(emptyList(), capitalizeFirst = false)
            return
        }

        val capitalizeFirst = currentWord.firstOrNull()?.isUpperCase() == true
        val prefix = currentWord.lowercase()
        pendingNextWordMode = false
        pendingSuggestionPrefix = prefix
        pendingSuggestionCurrentWord = currentWord
        pendingSuggestionCapitalize = capitalizeFirst
        scheduleSuggestionUpdate()
    }

    private fun scheduleSuggestionUpdate() {
        if (suggestionUpdateRunnable == null) {
            suggestionUpdateRunnable = Runnable { runSuggestionUpdate() }
        }
        suggestionUpdateRunnable?.let {
            uiHandler.removeCallbacks(it)
            val now = SystemClock.elapsedRealtime()
            val sinceLast = now - lastSuggestionComputeAtMs
            val minDelay = if (sinceLast >= suggestionMinIntervalMs) 0L else suggestionMinIntervalMs - sinceLast
            uiHandler.postDelayed(it, maxOf(suggestionDebounceMs, minDelay))
        }
    }

    private fun runSuggestionUpdate() {
        lastSuggestionComputeAtMs = SystemClock.elapsedRealtime()
        val requestId = ++suggestionsRequestId
        suggestionsJob?.cancel()

        val nextWordMode = pendingNextWordMode
        val nextWordBase = pendingNextWordBase
        val prefix = pendingSuggestionPrefix
        val currentWord = pendingSuggestionCurrentWord
        val capitalizeFirst = pendingSuggestionCapitalize

        if (nextWordMode) {
            if (nextWordBase.isNullOrEmpty()) {
                renderSuggestions(emptyList(), capitalizeFirst = false)
                return
            }
            suggestionsJob =
                serviceScope.launch {
                    val matches = withContext(Dispatchers.Default) {
                        bigramModel.suggestNext(nextWordBase, maxSuggestions)
                    }
                    if (requestId != suggestionsRequestId) return@launch

                    uiHandler.post {
                        renderSuggestions(matches, capitalizeFirst)
                    }
                }
            return
        }

        if (prefix.isNullOrEmpty()) {
            renderSuggestions(emptyList(), capitalizeFirst = false)
            return
        }

        suggestionsJob =
            serviceScope.launch {
                val matches = withContext(Dispatchers.Default) {
                    val ctx = coroutineContext
                    suggestionEngine.suggest(prefix) { !ctx.isActive || requestId != suggestionsRequestId }
                }
                if (requestId != suggestionsRequestId) return@launch

                val filteredMatches = ArrayList<String>(maxSuggestions)
                val seen = HashSet<String>(maxSuggestions * 2)
                val currentLower = currentWord?.lowercase()
                for (match in matches) {
                    if (currentLower != null && match.equals(currentLower, ignoreCase = true)) {
                        continue
                    }
                    val lower = match.lowercase()
                    if (!seen.add(lower)) continue
                    filteredMatches.add(match)
                    if (filteredMatches.size >= maxSuggestions) break
                }

                uiHandler.post {
                    renderSuggestions(filteredMatches, capitalizeFirst)
                }
            }
    }

    private fun renderSuggestions(suggestions: List<String>, capitalizeFirst: Boolean) {
        val container = layoutManager.suggestionsContainer ?: return
        val parent = container.parent as? ViewGroup

        if (parent != null) {
            TransitionManager.beginDelayedTransition(parent)
        }

        suggestionSlotsCapitalizeFirst = capitalizeFirst

        val rawCurrentWord = pendingSuggestionCurrentWord
        val useRawFirstSlot = isTypedWordSuggestion(rawCurrentWord)
        val displaySuggestions = ArrayList<String>(maxSuggestions)
        val seen = HashSet<String>(maxSuggestions * 2)

        if (useRawFirstSlot && rawCurrentWord != null) {
            displaySuggestions.add(rawCurrentWord)
            seen.add(rawCurrentWord.lowercase())
        }

        for (suggestion in suggestions) {
            val lower = suggestion.lowercase()
            if (!seen.add(lower)) continue
            displaySuggestions.add(suggestion)
            if (displaySuggestions.size >= maxSuggestions) break
        }

        ensureSuggestionSlotFlags()

        for (i in 0 until maxSuggestions) {
            val button = layoutManager.suggestionButtons.getOrNull(i) ?: continue
            val suggestion = displaySuggestions.getOrNull(i)
            suggestionSlotUseRawCase[i] = useRawFirstSlot && i == 0
            if (layoutManager.suggestionSlotValues.size > i) {
                layoutManager.suggestionSlotValues[i] = suggestion
            }

            if (suggestion.isNullOrEmpty()) {
                button.visibility = View.INVISIBLE
                if (button.text?.isNotEmpty() == true) {
                    button.text = ""
                }
                continue
            }

            val displayText =
                if (suggestionSlotUseRawCase[i]) {
                    suggestion
                } else if (capitalizeFirst) {
                    suggestion.replaceFirstChar { it.uppercaseChar() }
                } else {
                    suggestion
                }

            if (button.text?.toString() != displayText) {
                button.text = displayText
            }
            button.visibility = View.VISIBLE
        }

        if (layoutManager.selectionActionsContainer?.visibility == View.VISIBLE) {
            container.visibility = View.INVISIBLE
        } else {
            container.visibility = if (displaySuggestions.isEmpty()) View.INVISIBLE else View.VISIBLE
        }

        renderClipboardSuggestions()
    }

    private fun ensureSuggestionSlotFlags() {
        if (suggestionSlotUseRawCase.size == maxSuggestions) return
        suggestionSlotUseRawCase.clear()
        repeat(maxSuggestions) {
            suggestionSlotUseRawCase.add(false)
        }
    }

    private fun isTypedWordSuggestion(word: String?): Boolean {
        if (word.isNullOrBlank()) return false
        return word.any { it.isLetter() }
    }



    private val suggestionClickListener: View.OnClickListener =
        View.OnClickListener { v ->
            val index = v.tag as? Int ?: return@OnClickListener
            val suggestion = layoutManager.suggestionSlotValues.getOrNull(index) ?: return@OnClickListener
            val useRawCase = suggestionSlotUseRawCase.getOrNull(index) == true
            val capitalize = if (useRawCase) false else suggestionSlotsCapitalizeFirst
            applySuggestion(suggestion, capitalize)
        }

    private fun showSuggestionOptionsDialog(index: Int): Boolean {
        val suggestion = layoutManager.suggestionSlotValues.getOrNull(index) ?: return false
        val windowToken =
            window?.window?.decorView?.windowToken ?: window?.window?.attributes?.token ?: return false

        val normalized = normalizeWord(suggestion)
        val inDictionary = normalized.isNotBlank() && userDictionary.contains(normalized)
        val dictionaryLabel =
            if (inDictionary) getString(R.string.suggestion_remove_dictionary) else getString(R.string.suggestion_save_dictionary)
        val placeLabel = getString(R.string.suggestion_place)
        val closeLabel = getString(R.string.btn_close)
        val items = arrayOf(dictionaryLabel, placeLabel)
        val useRawCase = suggestionSlotUseRawCase.getOrNull(index) == true
        val capitalize = if (useRawCase) false else suggestionSlotsCapitalizeFirst

        uiHandler.post {
            val dialog =
                AlertDialog.Builder(this)
                    .setTitle(getString(R.string.suggestion_options_title))
                    .setItems(items) { dialogInterface, which ->
                        when (which) {
                            0 -> {
                                if (normalized.isNotBlank()) {
                                    if (inDictionary) {
                                        userDictionary.remove(normalized)
                                    } else {
                                        userDictionary.add(normalized)
                                    }
                                    saveUserDictionary()
                                    updateSuggestions()
                                }
                            }
                            1 -> applySuggestion(suggestion, capitalize)
                        }
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

        return true
    }

    private val keyClickListener: View.OnClickListener =
        View.OnClickListener { v ->
            val key = v.tag as? String ?: return@OnClickListener
            if (key != "backspace") {
                backspaceTapCount = 0
                lastBackspaceTapTimeMs = 0L
            }

            when (key) {
                "backspace" -> handleBackspacePress()
                "enter" -> sendEnter()
                "caps" -> handleShiftPress()
                "123" -> switchToSymbols()
                "{&=" -> switchToSpecial()
                "abc" -> switchToLetters()
                "tab" -> commitText("\t")
                "space" -> commitKeyWithCaps(" ")
                else -> commitKeyWithCaps(key)
            }
            soundHaptics.playKeyFeedback(v, key)
        }

    private fun setKeyPressedState(view: View, isPressed: Boolean) {
        view.isPressed = isPressed
        layoutManager.updateHintPressedState(view, isPressed)
    }

    private fun handleBackspacePress() {
        inputProcessor.resetLastSpaceTap()
        val inputConnection = currentInputConnection ?: return
        val now = SystemClock.elapsedRealtime()

        val selectedText = inputConnection.getSelectedText(0)
        if (!selectedText.isNullOrEmpty()) {
            backspaceTapCount = 0
            lastBackspaceTapTimeMs = now
            deleteFromInputConnection()
            return
        }

        val replacement = inputProcessor.lastAutoCorrectReplacement
        val original = inputProcessor.lastAutoCorrectOriginal
        if (!replacement.isNullOrEmpty() && !original.isNullOrEmpty()) {
            val replacementWithSpace = "$replacement "
            val before =
                inputConnection.getTextBeforeCursor(replacementWithSpace.length, 0)?.toString()
                    .orEmpty()
            if (before == replacementWithSpace) {
                backspaceTapCount = 0
                lastBackspaceTapTimeMs = now
                deleteFromInputConnection()
                return
            }
        }

        val withinWindow = now - lastBackspaceTapTimeMs <= backspaceMultiTapWindowMs
        backspaceTapCount = if (withinWindow) (backspaceTapCount + 1) else 1
        lastBackspaceTapTimeMs = now

        if (backspaceTapCount >= backspaceMultiTapCount) {
            if (themeManager.isDeleteWordEnabled && themeManager.isBackspaceTripleTapEnabled) {
                deleteWordFromInputConnection()
            } else {
                deleteFromInputConnection()
            }
        } else {
            deleteFromInputConnection()
        }
    }

    private fun initPxCache() {
        val prefs = getPrefs()
        keyboardHeightFactor = prefs.getFloat(PREF_KEY_KEYBOARD_HEIGHT_FACTOR, 1.0f)
        val gapDp = prefs.getInt(PREF_KEY_KEY_GAP, 1)
        keyGapPx = dpToPx(gapDp)

        val radiusDp = prefs.getInt(KeyboardThemeManager.PREF_KEY_CORNER_RADIUS, 6)
        themeManager.cornerRadiusPx = dpToPx(radiusDp)

        soundHaptics.vibrationDurationMs = prefs.getInt(PREF_KEY_VIBRATION_DURATION, 0)


        longPressDelayMs = prefs.getLong(PREF_KEY_LONG_PRESS_DELAY, 400L)

        themeManager.customThemeEnabled = prefs.getBoolean(KeyboardThemeManager.PREF_KEY_CUSTOM_THEME_ENABLED, false)
        themeManager.customBgColor = prefs.getInt(KeyboardThemeManager.PREF_KEY_CUSTOM_BG_COLOR, Color.BLACK)
        themeManager.customKeyColor = prefs.getInt(KeyboardThemeManager.PREF_KEY_CUSTOM_KEY_COLOR, Color.DKGRAY)
        themeManager.customAccentColor = prefs.getInt(KeyboardThemeManager.PREF_KEY_CUSTOM_ACCENT_COLOR, Color.BLUE)
        themeManager.customTextColor = prefs.getInt(KeyboardThemeManager.PREF_KEY_CUSTOM_TEXT_COLOR, Color.WHITE)
        themeManager.customCapsNeutralColor = prefs.getInt(KeyboardThemeManager.PREF_KEY_CUSTOM_CAPS_NEUTRAL_COLOR, 0)
        themeManager.customCapsMediumColor = prefs.getInt(KeyboardThemeManager.PREF_KEY_CUSTOM_CAPS_MEDIUM_COLOR, 0)
        themeManager.customCapsStrongColor = prefs.getInt(KeyboardThemeManager.PREF_KEY_CUSTOM_CAPS_STRONG_COLOR, 0)
        themeManager.customCapsStrongTextColor = prefs.getInt(KeyboardThemeManager.PREF_KEY_CUSTOM_CAPS_STRONG_TEXT_COLOR, Color.WHITE)

        px1 = keyGapPx
        px4 = dpToPx(prefs.getInt(PREF_KEY_SPACING_4_DP, 4))
        px6 = dpToPx(prefs.getInt(PREF_KEY_SPACING_6_DP, 6))
        px8 = dpToPx(prefs.getInt(PREF_KEY_SPACING_8_DP, 8))
        px10 = dpToPx(prefs.getInt(PREF_KEY_SPACING_10_DP, 10))
        px36 = dpToPx(prefs.getInt(PREF_KEY_SPACING_36_DP, 36))

        keyMinWidthPx = dpToPx(themeManager.keyMinWidthDp)
        keyMinWideWidthPx = dpToPx(themeManager.keyMinWideWidthDp)
        keyMinHeightPx = (dpToPx(themeManager.keyMinHeightDp) * keyboardHeightFactor).toInt()
        keyRowHeightPx = (dpToPx(themeManager.keyRowHeightDp) * keyboardHeightFactor).toInt()
        suggestionBarHeightPx = (dpToPx(themeManager.suggestionBarHeightDp) * keyboardHeightFactor).toInt()
        selectionBarHeightPx = (dpToPx(themeManager.selectionBarHeightDp) * keyboardHeightFactor).toInt()
        clipboardBarHeightPx = (dpToPx(themeManager.clipboardBarHeightDp) * keyboardHeightFactor).toInt()

        px44 = keyMinHeightPx
        px52 = (dpToPx(52) * keyboardHeightFactor).toInt()
        px56 = keyRowHeightPx
        px64 = keyMinWideWidthPx

        keyTextSizePx = spToPx(themeManager.keyTextSizeSp) * keyboardHeightFactor
        suggestionTextSizePx = spToPx(themeManager.suggestionTextSizeSp) * keyboardHeightFactor
        selectionTextSizePx = spToPx(themeManager.selectionTextSizeSp) * keyboardHeightFactor
        clipboardTextSizePx = spToPx(themeManager.clipboardTextSizeSp) * keyboardHeightFactor
        keyPreviewTextSizePx = spToPx(themeManager.keyPreviewTextSizeSp) * keyboardHeightFactor
        accentTextSizePx = spToPx(themeManager.accentTextSizeSp) * keyboardHeightFactor
        hintTextSizeFactor = themeManager.hintTextSizeFactor
        keyPaddingHorizontalPx = dpToPx(themeManager.keyPaddingHorizontalDp)
        keyPaddingVerticalPx = dpToPx(themeManager.keyPaddingVerticalDp)
        keyPreviewPaddingPx = dpToPx(themeManager.keyPreviewPaddingDp)
        keyPreviewBorderWidthPx = dpToPx(themeManager.keyPreviewBorderWidthDp)
        keyElevationPx = dpToPx(themeManager.keyElevationDp).toFloat()

        val swipeThresholdDp = prefs.getInt(PREF_KEY_SWIPE_THRESHOLD, 6)
        spaceSwipeStartThresholdPx = dpToPx(swipeThresholdDp).toFloat()

        val swipeHStepDp = prefs.getInt(PREF_KEY_SWIPE_H_STEP, 12)
        spaceSwipeStepPx = dpToPx(swipeHStepDp).toFloat()

        val swipeVStepDp = prefs.getInt(PREF_KEY_SWIPE_V_STEP, 24)
        spaceSwipeVerticalStepPx = dpToPx(swipeVStepDp).toFloat()

        val bsSwipeThresholdDp = prefs.getInt(PREF_KEY_BACKSPACE_SWIPE_THRESHOLD, 36)
        backspaceSwipeThresholdPx = dpToPx(bsSwipeThresholdDp).toFloat()

        val touchSlopDp = prefs.getInt(PREF_KEY_TOUCH_SLOP_DP, 10)
        touchSlopPx = dpToPx(touchSlopDp).toFloat()
        val accentSwipeDp = prefs.getInt(PREF_KEY_ACCENT_SWIPE_THRESHOLD_DP, 20)
        accentSwipeThresholdPx = dpToPx(accentSwipeDp).toFloat()
        val edgeThresholdDp = prefs.getInt(PREF_KEY_EDGE_SWIPE_THRESHOLD_DP, 36)
        spaceSwipeEdgeThresholdPx = dpToPx(edgeThresholdDp).toFloat()
        edgeRepeatIntervalMs = prefs.getLong(PREF_KEY_EDGE_REPEAT_INTERVAL, 150L)

        backspaceInitialIntervalMs = prefs.getLong(PREF_KEY_BACKSPACE_INITIAL_INTERVAL, 260L)
        backspaceAccelerationMs = prefs.getLong(PREF_KEY_BACKSPACE_ACCELERATION, 30L)
        backspaceMinIntervalMs = prefs.getLong(PREF_KEY_BACKSPACE_MIN_INTERVAL, 70L)
        backspaceIntervalMs = backspaceInitialIntervalMs

        doubleTapThresholdMs = prefs.getLong(PREF_KEY_DOUBLE_TAP_THRESHOLD, 350L)
        backspaceMultiTapWindowMs = prefs.getLong(PREF_KEY_BACKSPACE_MULTI_TAP_WINDOW, 450L)
        backspaceMultiTapCount = prefs.getInt(PREF_KEY_BACKSPACE_MULTI_TAP_COUNT, 3)
        doubleSpaceWindowMs = prefs.getLong(PREF_KEY_DOUBLE_SPACE_WINDOW, 800L)
        doubleSpaceLookbackChars = prefs.getInt(PREF_KEY_DOUBLE_SPACE_LOOKBACK, 6)
        deleteWordLookbackChars = prefs.getInt(PREF_KEY_DELETE_WORD_LOOKBACK, 120)
        autoCapLookbackChars = prefs.getInt(PREF_KEY_AUTOCAP_LOOKBACK, 200)
        currentWordLookbackChars = prefs.getInt(PREF_KEY_CURRENT_WORD_LOOKBACK, 50)
        autoPunctuationChars = prefs.getString(PREF_KEY_AUTO_PUNCTUATION_CHARS, ".,;:?!)") ?: ".,;:?!)"
        autoCapSentenceDelimiters = prefs.getString(PREF_KEY_AUTOCAP_DELIMITERS, ".:;?!\n") ?: ".:;?!\n"
        pasteAddsTrailingSpace = prefs.getBoolean(PREF_KEY_PASTE_ADD_SPACE, true)
        autoCorrectThresholdShort = prefs.getFloat(PREF_KEY_AUTOCORRECT_THRESHOLD_SHORT, 0.75f)
            .toDouble()
            .coerceIn(0.0, 1.0)
        autoCorrectThresholdMedium = prefs.getFloat(PREF_KEY_AUTOCORRECT_THRESHOLD_MEDIUM, 0.70f)
            .toDouble()
            .coerceIn(0.0, 1.0)
        autoCorrectThresholdLong = prefs.getFloat(PREF_KEY_AUTOCORRECT_THRESHOLD_LONG, 0.65f)
            .toDouble()
            .coerceIn(0.0, 1.0)

        maxSuggestions = prefs.getInt(PREF_KEY_MAX_SUGGESTIONS, 3).coerceAtLeast(1)
        suggestionEngine.updateMaxSuggestions(maxSuggestions)
        ClipboardRepository.setClipboardItems(ClipboardRepository.clipboardItems.value)

        soundHaptics.soundEnabled = themeManager.isSoundEnabled
        soundHaptics.soundVolume = prefs.getFloat(PREF_KEY_SOUND_VOLUME, 1f)
        soundHaptics.soundRate = prefs.getFloat(PREF_KEY_SOUND_RATE, 1f)
        soundHaptics.vibrationAmplitude = prefs.getInt(PREF_KEY_VIBRATION_AMPLITUDE, -1)
        val patternStr = prefs.getString(PREF_KEY_VIBRATION_PATTERN, null)
        soundHaptics.vibrationPattern = parseVibrationPattern(patternStr)
        soundHaptics.vibrationPatternRepeat = prefs.getInt(PREF_KEY_VIBRATION_PATTERN_REPEAT, -1)

        inputProcessor.updateConfig(
            InputBehaviorConfig(
                doubleSpaceWindowMs = doubleSpaceWindowMs,
                doubleSpaceLookbackChars = doubleSpaceLookbackChars,
                deleteWordLookbackChars = deleteWordLookbackChars,
                autoPunctuationChars = autoPunctuationChars,
                pasteAddsTrailingSpace = pasteAddsTrailingSpace,
                doubleSpaceEnabled = themeManager.isDoubleSpaceEnabled,
                autoSpaceEnabled = themeManager.isAutoSpaceEnabled,
                deleteWordEnabled = themeManager.isDeleteWordEnabled,
            )
        )

        layoutManager.updatePxValues(
            px1, px4, px6, px8, px10, px36,
            px44, px52, px56, px64,
            keyTextSizePx, keyGapPx,
            keyMinWidthPx,
            keyMinHeightPx,
            keyMinWideWidthPx,
            keyRowHeightPx,
            suggestionBarHeightPx,
            selectionBarHeightPx,
            clipboardBarHeightPx,
            suggestionTextSizePx,
            selectionTextSizePx,
            clipboardTextSizePx,
            keyPreviewTextSizePx,
            accentTextSizePx,
            hintTextSizeFactor,
            keyPaddingHorizontalPx,
            keyPaddingVerticalPx,
            keyPreviewPaddingPx,
            keyPreviewBorderWidthPx,
            keyElevationPx,
        )
        layoutManager.updateKeyWeightOverrides(loadKeyWeightOverrides())
        updateTopRowMapOverrides()
    }

    private fun parseVibrationPattern(raw: String?): LongArray? {
        if (raw.isNullOrBlank()) return null
        val parts = raw.split(",", ";", " ", "\n").mapNotNull { it.trim().toLongOrNull() }
        if (parts.isEmpty()) return null
        return parts.toLongArray()
    }

    private fun applySuggestion(suggestion: String, capitalizeFirst: Boolean) {
        val inputConnection = currentInputConnection ?: return
        val currentWord = extractCurrentWord().orEmpty()

        val textToCommit =
            if (capitalizeFirst && suggestion.isNotEmpty()) {
                suggestion.replaceFirstChar { it.uppercaseChar() }
            } else {
                suggestion
            }

        inputProcessor.runBatchEdit(inputConnection) { ic ->
            if (currentWord.isNotEmpty()) {
                ic.deleteSurroundingText(currentWord.length, 0)
            }
            ic.commitText("$textToCommit ", 1)
        }

        recordCommittedWord(textToCommit)
        inputProcessor.clearAutoCorrectionState()

        updateSuggestions()
        updateSelectionActions()
        invalidateCapsCache()
        updateCapsVisualsOnUiThread()
    }

    private fun shouldAutoCapitalizeNextChar(): Boolean {
        val inputConnection = currentInputConnection ?: return lastAutoCapitalizeNext
        val beforeCursor = inputConnection.getTextBeforeCursor(autoCapLookbackChars, 0)
            ?: return true.also { lastAutoCapitalizeNext = true }
        val trimmed = beforeCursor.trimEnd()
        if (trimmed.isEmpty()) return true.also { lastAutoCapitalizeNext = true }

        val lastChar = trimmed.last()
        val result = autoCapSentenceDelimiters.contains(lastChar)
        lastAutoCapitalizeNext = result
        return result
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
        backspaceIntervalMs = backspaceInitialIntervalMs
        isBackspaceRepeating = true
        deleteWordFromInputConnection()
        uiHandler.postDelayed(backspaceRepeatTickRunnable, backspaceIntervalMs)
    }

    private fun stopBackspaceRepeat() {
        isBackspaceRepeating = false
        uiHandler.removeCallbacks(backspaceRepeatTickRunnable)
    }

    private val backspaceRepeatTickRunnable: Runnable =
        object : Runnable {
            override fun run() {
                if (!isBackspaceRepeating) return
                deleteWordFromInputConnection()
                backspaceIntervalMs =
                    (backspaceIntervalMs - backspaceAccelerationMs)
                        .coerceAtLeast(backspaceMinIntervalMs)
                uiHandler.postDelayed(this, backspaceIntervalMs)
            }
        }

    private fun sendSelectionKey(keyCode: Int) {
        val inputConnection = currentInputConnection ?: return
        val now = SystemClock.uptimeMillis()
        inputConnection.sendKeyEvent(KeyEvent(now, now, KeyEvent.ACTION_DOWN, KeyEvent.KEYCODE_SHIFT_LEFT, 0, 0))
        inputConnection.sendKeyEvent(KeyEvent(now, now, KeyEvent.ACTION_DOWN, keyCode, 0, KeyEvent.META_SHIFT_ON))
        inputConnection.sendKeyEvent(KeyEvent(now, now, KeyEvent.ACTION_UP, keyCode, 0, KeyEvent.META_SHIFT_ON))
        inputConnection.sendKeyEvent(KeyEvent(now, now, KeyEvent.ACTION_UP, KeyEvent.KEYCODE_SHIFT_LEFT, 0, 0))
    }

    private fun getAutoCorrectThreshold(wordLength: Int): Double {
        return when {
            wordLength <= 2 -> autoCorrectThresholdShort
            wordLength <= 4 -> autoCorrectThresholdMedium
            else -> autoCorrectThresholdLong
        }.coerceIn(0.0, 1.0)
    }

    private inner class SpaceTouchListener : View.OnTouchListener {
        private var startX = 0f
        private var startY = 0f
        private var lastX = 0f
        private var lastY = 0f
        private var isLongPressTriggered = false
        private var isSwipeTriggered = false
        private var spaceAccumX = 0f
        private var spaceAccumY = 0f
        private var spaceCursorMode = false
        private var isSelectionMode = false
        private var isVirtualShiftActive = false
        private var currentView: View? = null
        
        private val edgeRepeatHandler = Handler(Looper.getMainLooper())
        private var isEdgeRepeating = false
        private var edgeRepeatKeyCode = 0
        private var edgeRepeatIsWordMode = false
        
        private val edgeRepeatRunnable = object : Runnable {
            override fun run() {
                 if (isEdgeRepeating) {
                    
                     if (isSelectionMode) {
                         val now = SystemClock.uptimeMillis()
                         if (!isVirtualShiftActive) {
                             currentInputConnection?.sendKeyEvent(KeyEvent(now, now, KeyEvent.ACTION_DOWN, KeyEvent.KEYCODE_SHIFT_LEFT, 0, 0))
                         }
                         val metaState = KeyEvent.META_SHIFT_ON or (if (edgeRepeatIsWordMode) KeyEvent.META_CTRL_ON else 0)
                         currentInputConnection?.sendKeyEvent(KeyEvent(now, now, KeyEvent.ACTION_DOWN, edgeRepeatKeyCode, 0, metaState))
                         currentInputConnection?.sendKeyEvent(KeyEvent(now, now, KeyEvent.ACTION_UP, edgeRepeatKeyCode, 0, metaState))
                         if (!isVirtualShiftActive) {
                             currentInputConnection?.sendKeyEvent(KeyEvent(now, now, KeyEvent.ACTION_UP, KeyEvent.KEYCODE_SHIFT_LEFT, 0, 0))
                         }
                     } else {
                         sendDpadKey(edgeRepeatKeyCode)
                     }
                     edgeRepeatHandler.postDelayed(this, edgeRepeatIntervalMs)
                 }
            }
        }
    
        private val longPressRunnable = Runnable {
            isLongPressTriggered = true
            currentView?.performHapticFeedback(HapticFeedbackConstants.LONG_PRESS)
            if (currentView?.performLongClick() != true) { }
        }
    
        override fun onTouch(v: View, event: MotionEvent): Boolean {
            currentView = v
            val screenWidth = resources.displayMetrics.widthPixels
        
            when (event.actionMasked) {
                MotionEvent.ACTION_DOWN -> {
                    startX = event.x
                    startY = event.y
                    lastX = event.x
                    lastY = event.y
                    isLongPressTriggered = false
                    isSwipeTriggered = false
                    spaceAccumX = 0f
                    spaceAccumY = 0f
                    spaceCursorMode = false
                    isSelectionMode = false
                    isVirtualShiftActive = false
                
                    setKeyPressedState(v, true)
                    uiHandler.postDelayed(longPressRunnable, longPressDelayMs)
                    return true
                }
                MotionEvent.ACTION_MOVE -> {
                    if (isLongPressTriggered) return true
                    if (!themeManager.isGestureTypingEnabled) {
                        val totalDx = event.x - startX
                        val totalDy = event.y - startY
                        if (abs(totalDx) > touchSlopPx || abs(totalDy) > touchSlopPx) {
                            uiHandler.removeCallbacks(longPressRunnable)
                        }
                        return true
                    }
                    val dx = event.x - lastX
                    val dy = event.y - lastY
                    lastX = event.x
                    lastY = event.y
                    val totalDx = event.x - startX
                    val totalDy = event.y - startY
                    if (!spaceCursorMode && (abs(totalDx) >= spaceSwipeStartThresholdPx || abs(totalDy) >= spaceSwipeStartThresholdPx)) {
                        spaceCursorMode = true
                        uiHandler.removeCallbacks(longPressRunnable)
                        isSwipeTriggered = true
                        val extracted = currentInputConnection?.getExtractedText(android.view.inputmethod.ExtractedTextRequest(), 0)
                        val hasSelection = (isSelectionActive 
                            || !currentInputConnection?.getSelectedText(0).isNullOrEmpty() 
                            ||  (
                                extracted != null && extracted.selectionStart != extracted.selectionEnd
                                ))
                        isSelectionMode = hasSelection
                    }
                
                
                    if (spaceCursorMode) {
                        val isShiftPressed = layoutManager.capsButtonRef?.isPressed == true
                        val isCapsLocked = capsMode == CapsMode.LOCK
                        val performSelection = isSelectionMode || isShiftPressed || isCapsLocked
                    
                        if (performSelection && !isVirtualShiftActive) {
                            val now = SystemClock.uptimeMillis()
                            currentInputConnection?.sendKeyEvent(KeyEvent(now, now, KeyEvent.ACTION_DOWN, KeyEvent.KEYCODE_SHIFT_LEFT, 0, 0))
                            isVirtualShiftActive = true
                        } else if (!performSelection && isVirtualShiftActive) {
                        
                            val now = SystemClock.uptimeMillis()
                            currentInputConnection?.sendKeyEvent(KeyEvent(now, now, KeyEvent.ACTION_UP, KeyEvent.KEYCODE_SHIFT_LEFT, 0, 0))
                            isVirtualShiftActive = false
                        }
                    
                        val rawX = event.rawX
                        val rawY = event.rawY
                        val edgeThreshold = spaceSwipeEdgeThresholdPx
                        var newEdgeKey = 0
                    
                        if (rawX < edgeThreshold) newEdgeKey = KeyEvent.KEYCODE_DPAD_LEFT
                        else if (rawX > screenWidth - edgeThreshold) newEdgeKey = KeyEvent.KEYCODE_DPAD_RIGHT
                    
                        if (newEdgeKey == 0) {
                             if (rawY < edgeThreshold) newEdgeKey = KeyEvent.KEYCODE_DPAD_UP
                        }
                    
                        if (newEdgeKey != 0) {
                            if (!isEdgeRepeating || edgeRepeatKeyCode != newEdgeKey) {
                                edgeRepeatKeyCode = newEdgeKey
                                isEdgeRepeating = true
                                edgeRepeatIsWordMode = true
                                edgeRepeatHandler.removeCallbacks(edgeRepeatRunnable)
                                edgeRepeatHandler.post(edgeRepeatRunnable)
                            }
                        } else {
                            isEdgeRepeating = false
                            edgeRepeatHandler.removeCallbacks(edgeRepeatRunnable)
                            spaceAccumX += dx
                            while (abs(spaceAccumX) >= spaceSwipeStepPx) {
                                val steps = (abs(spaceAccumX) / spaceSwipeStepPx).toInt()
                                val direction = if (spaceAccumX > 0) KeyEvent.KEYCODE_DPAD_RIGHT else KeyEvent.KEYCODE_DPAD_LEFT
                                repeat(steps) {
                                    sendDpadKey(direction, performSelection)
                                }
                                spaceAccumX -= (steps * spaceSwipeStepPx * (if (spaceAccumX > 0) 1 else -1))
                            }
                            spaceAccumY += dy
                            while (abs(spaceAccumY) >= spaceSwipeVerticalStepPx) {
                                val steps = (abs(spaceAccumY) / spaceSwipeVerticalStepPx).toInt()
                                val direction = if (spaceAccumY < 0) KeyEvent.KEYCODE_DPAD_UP else KeyEvent.KEYCODE_DPAD_DOWN
                            
                                repeat(steps) {
                                
                                    sendDpadKey(direction, performSelection)
                                }
                                spaceAccumY -= (steps * spaceSwipeVerticalStepPx * (if (spaceAccumY > 0) 1 else -1))
                            }
                        }
                    }
                    return true
                }
                MotionEvent.ACTION_UP, MotionEvent.ACTION_CANCEL -> {
                    uiHandler.removeCallbacks(longPressRunnable)
                    isEdgeRepeating = false
                    edgeRepeatHandler.removeCallbacks(edgeRepeatRunnable)
                    setKeyPressedState(v, false)
                
                    if (isVirtualShiftActive) {
                        val now = SystemClock.uptimeMillis()
                        currentInputConnection?.sendKeyEvent(KeyEvent(now, now, KeyEvent.ACTION_UP, KeyEvent.KEYCODE_SHIFT_LEFT, 0, 0))
                        isVirtualShiftActive = false
                    }
                
                    if (isLongPressTriggered || isSwipeTriggered) return true
                    v.performClick()
                    return true
                }
            }
            return false
        }
    }

    private inner class BackspaceTouchListener : View.OnTouchListener {
        private var startX = 0f
        private var startY = 0f
        private var isSwipeTriggered = false
        private var isLongPressTriggered = false
        private var currentView: View? = null

        private val longPressRunnable = Runnable {
            isLongPressTriggered = true
            currentView?.performHapticFeedback(HapticFeedbackConstants.LONG_PRESS)
            if (currentView?.performLongClick() != true) {
                
            }
        }

        private val swipeRepeatRunnable = Runnable {
            startBackspaceRepeat()
        }

        override fun onTouch(v: View, event: MotionEvent): Boolean {
            currentView = v
            when (event.actionMasked) {
                MotionEvent.ACTION_DOWN -> {
                    startX = event.x
                    startY = event.y
                    isSwipeTriggered = false
                    isLongPressTriggered = false
                    setKeyPressedState(v, true)
                    uiHandler.postDelayed(longPressRunnable, longPressDelayMs)
                    return true
                }
                MotionEvent.ACTION_MOVE -> {
                    if (isLongPressTriggered) return true
                    if (isSwipeTriggered) return true
                    
                    val totalDx = event.x - startX
                    val totalDy = event.y - startY

                    if (!themeManager.isGestureTypingEnabled || !themeManager.isBackspaceSwipeEnabled) {
                        if (abs(totalDx) > touchSlopPx || abs(totalDy) > touchSlopPx) {
                            uiHandler.removeCallbacks(longPressRunnable)
                        }
                        return true
                    }
                    
                    if (totalDx < -backspaceSwipeThresholdPx && abs(totalDx) > abs(totalDy)) {
                        isSwipeTriggered = true
                        uiHandler.removeCallbacks(longPressRunnable)
                        if (themeManager.isDeleteWordEnabled && themeManager.isBackspaceSwipeEnabled) {
                            deleteWordFromInputConnection()
                        } else {
                            deleteFromInputConnection()
                        }
                        v.performHapticFeedback(HapticFeedbackConstants.KEYBOARD_TAP)
                        
                        uiHandler.postDelayed(swipeRepeatRunnable, longPressDelayMs)
                        return true
                    }
                    
                    if (abs(totalDx) > touchSlopPx || abs(totalDy) > touchSlopPx) {
                         uiHandler.removeCallbacks(longPressRunnable)
                    }
                    return true
                }
                MotionEvent.ACTION_UP, MotionEvent.ACTION_CANCEL -> {
                    uiHandler.removeCallbacks(longPressRunnable)
                    uiHandler.removeCallbacks(swipeRepeatRunnable)
                    setKeyPressedState(v, false)
                    stopBackspaceRepeat()
                    
                    if (isSwipeTriggered) return true
                    if (isLongPressTriggered) return true
                    
                    v.performClick()
                    return true
                }
            }
            return false
        }
    }

    private fun sendDpadKeyWithShift(keyCode: Int) {
        val inputConnection = currentInputConnection ?: return
        val now = SystemClock.uptimeMillis()
        inputConnection.sendKeyEvent(KeyEvent(now, now, KeyEvent.ACTION_DOWN, keyCode, 0, KeyEvent.META_SHIFT_ON))
        inputConnection.sendKeyEvent(KeyEvent(now, now, KeyEvent.ACTION_UP, keyCode, 0, KeyEvent.META_SHIFT_ON))
    }

    private inner class ShiftTouchListener : View.OnTouchListener {
        private var startX = 0f
        private var startY = 0f
        private var lastX = 0f
        private var lastY = 0f
        private var isSwipeTriggered = false
        private var accumX = 0f
        private var accumY = 0f
        
        override fun onTouch(v: View, event: MotionEvent): Boolean {
            when (event.actionMasked) {
                MotionEvent.ACTION_DOWN -> {
                    startX = event.x
                    startY = event.y
                    lastX = event.x
                    lastY = event.y
                    isSwipeTriggered = false
                    accumX = 0f
                    accumY = 0f
                    setKeyPressedState(v, true)
                    return true
                }
                MotionEvent.ACTION_MOVE -> {
                    val dx = event.x - lastX
                    val dy = event.y - lastY
                    lastX = event.x
                    lastY = event.y
                    val totalDx = event.x - startX
                    val totalDy = event.y - startY
                    
                    if (!isSwipeTriggered && (abs(totalDx) >= spaceSwipeStartThresholdPx || abs(totalDy) >= spaceSwipeStartThresholdPx)) {
                        isSwipeTriggered = true
                    }

                    if (isSwipeTriggered) {
                        accumX += dx
                        accumY += dy
                        while (accumX >= spaceSwipeStepPx) {
                            sendDpadKeyWithShift(KeyEvent.KEYCODE_DPAD_RIGHT)
                            accumX -= spaceSwipeStepPx
                        }
                        while (accumX <= -spaceSwipeStepPx) {
                            sendDpadKeyWithShift(KeyEvent.KEYCODE_DPAD_LEFT)
                            accumX += spaceSwipeStepPx
                        }
                        while (accumY >= spaceSwipeStepPx) {
                            sendDpadKeyWithShift(KeyEvent.KEYCODE_DPAD_DOWN)
                            accumY -= spaceSwipeStepPx
                        }
                        while (accumY <= -spaceSwipeStepPx) {
                            sendDpadKeyWithShift(KeyEvent.KEYCODE_DPAD_UP)
                            accumY += spaceSwipeStepPx
                        }
                    }
                    return true
                }
                MotionEvent.ACTION_UP, MotionEvent.ACTION_CANCEL -> {
                    setKeyPressedState(v, false)
                    if (isSwipeTriggered) return true
                    v.performClick()
                    return true
                }
            }
            return false
        }
    }

    private inner class StandardKeyTouchListener(
        private val label: String,
        private val lower: String
    ) : View.OnTouchListener {
        private var startX = 0f
        private var startY = 0f
        private var isLongPressTriggered = false
        private var isSwipeTriggered = false
        private var currentView: View? = null
        private var isAccentSelectionMode = false
        private var hasExceededSlop = false
        private var downTimeMs: Long = 0L
        
        private val longPressRunnable = Runnable {
            isLongPressTriggered = true
            layoutManager.dismissKeyPreview()
            currentView?.performHapticFeedback(HapticFeedbackConstants.LONG_PRESS)
            
            val hints = topRowMap[lower]
            if (hints != null && hints.isNotEmpty()) {
                isAccentSelectionMode = true
                layoutManager.showAccentPopup(currentView!!, hints, capsMode)
            } else {
                if (currentView?.performLongClick() != true) {
                    
                }
            }
        }

        override fun onTouch(v: View, event: MotionEvent): Boolean {
            currentView = v
            when (event.actionMasked) {
                MotionEvent.ACTION_DOWN -> {
                    startX = event.x
                    startY = event.y
                    isLongPressTriggered = false
                    isSwipeTriggered = false
                    isAccentSelectionMode = false
                    hasExceededSlop = false
                    downTimeMs = event.eventTime
                    setKeyPressedState(v, true)
                    
                    if (label.length == 1 && !isSwipeTriggered) {
                        layoutManager.showKeyPreview(v, label)
                    }
                    
                    uiHandler.postDelayed(longPressRunnable, longPressDelayMs)
                    return true
                }
                MotionEvent.ACTION_MOVE -> {
                    if (isAccentSelectionMode) {
                        layoutManager.handleAccentSelection(event)
                        return true
                    }
                    if (isLongPressTriggered) return true
                    
                    val totalDx = event.x - startX
                    val totalDy = event.y - startY

                    if (!isSwipeTriggered && totalDy < -accentSwipeThresholdPx) {
                        val hints = topRowMap[lower]
                        if (hints != null && hints.isNotEmpty()) {
                            var selectedIndex = 0
                            if (hints.size > 1) {
                                if (totalDx < -accentSwipeThresholdPx) {
                                    selectedIndex = 1
                                } else if (totalDx > accentSwipeThresholdPx) {
                                    selectedIndex = if (hints.size > 2) 2 else 0
                                }
                            }
                            
                            if (selectedIndex in hints.indices) {
                                val charToCommit = hints[selectedIndex]
                                layoutManager.showKeyPreview(v, charToCommit)
                                isSwipeTriggered = true
                                uiHandler.removeCallbacks(longPressRunnable)
                                commitKeyWithCaps(charToCommit)
                                setKeyPressedState(v, false)
                                v.performHapticFeedback(HapticFeedbackConstants.KEYBOARD_TAP)
                                return true
                            }
                        }
                    }
                    
                    if (!hasExceededSlop && (abs(totalDx) > touchSlopPx || abs(totalDy) > touchSlopPx)) {
                        hasExceededSlop = true
                        uiHandler.removeCallbacks(longPressRunnable)
                        layoutManager.dismissKeyPreview()
                    }
                    return true
                }
                MotionEvent.ACTION_UP, MotionEvent.ACTION_CANCEL -> {
                    uiHandler.removeCallbacks(longPressRunnable)
                    setKeyPressedState(v, false)
                    layoutManager.dismissKeyPreview()
                    
                    if (isAccentSelectionMode) {
                        layoutManager.commitAccentSelection()
                        layoutManager.dismissAccentPopup()
                        isAccentSelectionMode = false
                        return true
                    }
                    
                    if (isLongPressTriggered) return true
                    if (isSwipeTriggered) return true
                    v.performClick()
                    return true
                }
            }
            return false
        }
    }

    private fun updateInputModeOnly() {
        refreshClipboardSource()
        updateSuggestions()
        updateSelectionActions()
        renderClipboardSuggestions()
        updateCapsVisuals()
        setInputMode(currentMode)
    }

    private fun switchToSymbols() {
        currentMode = InputMode.SYMBOLS
        updateInputModeOnly()
    }

    private fun switchToSpecial() {
        currentMode = InputMode.SPECIAL
        updateInputModeOnly()
    }

    private fun switchToLetters() {
        currentMode = InputMode.LETTERS
        updateInputModeOnly()
    }

    companion object {
        val defaultTopRowMap = mapOf(
            "q" to listOf("1"), "w" to listOf("2"), "e" to listOf("3", "é", "è", "ë", "ê"), "r" to listOf("4"), "t" to listOf("5"),
            "y" to listOf("6", "ý", "ÿ"), "u" to listOf("7", "ú", "ù", "ü", "û"), "i" to listOf("8", "í", "ì", "ï", "î"), "o" to listOf("9", "ó", "ò", "ö", "ô", "õ", "ø"), "p" to listOf("0"), 
            "a" to listOf("@", "!", "á", "à", "ä", "â", "ã", "å"), "s" to listOf("#", "ß"), "d" to listOf("$"),
            "f" to listOf("&"), "g" to listOf("*"), "h" to listOf("-"), "j" to listOf("+"), "k" to listOf("="), "l" to listOf("_"), 
            "z" to listOf("~", "ž", "ź", "ż"), "x" to listOf("`"),
            "c" to listOf("^", "ç"), "v" to listOf("%"), "b" to listOf("€"), "n" to listOf("£", "ñ"), "m" to listOf("¥"),
        )
        var topRowMap: Map<String, List<String>> = defaultTopRowMap
        private val uiHandler = Handler(Looper.getMainLooper())
        
        private const val PREF_KEY_AUTOCOMPLETE_MODE = "autocomplete_mode"
        private const val PREF_KEY_LAYOUT_STYLE = "layout_style"
        private const val PREF_KEY_KEYBOARD_HEIGHT_FACTOR = "keyboard_height_factor"
        private const val PREF_KEY_KEY_GAP = "key_gap"
        private const val PREF_KEY_VIBRATION_DURATION = "vibration_duration"
        private const val PREF_KEY_LONG_PRESS_DELAY = "long_press_delay"
        private const val PREF_KEY_SWIPE_THRESHOLD = "swipe_threshold"
        private const val PREF_KEY_SWIPE_H_STEP = "swipe_h_step"
        private const val PREF_KEY_SWIPE_V_STEP = "swipe_v_step"
        private const val PREF_KEY_BACKSPACE_SWIPE_THRESHOLD = "backspace_swipe_threshold"
        private const val PREF_KEY_BACKSPACE_INITIAL_INTERVAL = "backspace_initial_interval"
        private const val PREF_KEY_BACKSPACE_ACCELERATION = "backspace_acceleration"
        private const val PREF_KEY_BACKSPACE_MIN_INTERVAL = "backspace_min_interval"
        private const val PREF_KEY_DOUBLE_TAP_THRESHOLD = "double_tap_threshold"
        private const val PREF_KEY_BACKSPACE_MULTI_TAP_WINDOW = "backspace_multi_tap_window"
        private const val PREF_KEY_BACKSPACE_MULTI_TAP_COUNT = "backspace_multi_tap_count"
        private const val PREF_KEY_DOUBLE_SPACE_WINDOW = "double_space_window"
        private const val PREF_KEY_DOUBLE_SPACE_LOOKBACK = "double_space_lookback"
        private const val PREF_KEY_DELETE_WORD_LOOKBACK = "delete_word_lookback"
        private const val PREF_KEY_AUTOCAP_LOOKBACK = "autocap_lookback"
        private const val PREF_KEY_CURRENT_WORD_LOOKBACK = "current_word_lookback"
        private const val PREF_KEY_AUTO_PUNCTUATION_CHARS = "auto_punctuation_chars"
        private const val PREF_KEY_AUTOCAP_DELIMITERS = "autocap_delimiters"
        private const val PREF_KEY_PASTE_ADD_SPACE = "paste_add_space"
        private const val PREF_KEY_AUTOCORRECT_THRESHOLD_SHORT = "autocorrect_threshold_short"
        private const val PREF_KEY_AUTOCORRECT_THRESHOLD_MEDIUM = "autocorrect_threshold_medium"
        private const val PREF_KEY_AUTOCORRECT_THRESHOLD_LONG = "autocorrect_threshold_long"
        private const val PREF_KEY_SOUND_VOLUME = "sound_volume"
        private const val PREF_KEY_SOUND_RATE = "sound_rate"
        private const val PREF_KEY_VIBRATION_PATTERN = "vibration_pattern"
        private const val PREF_KEY_VIBRATION_PATTERN_REPEAT = "vibration_pattern_repeat"
        private const val PREF_KEY_VIBRATION_AMPLITUDE = "vibration_amplitude"
        private const val PREF_KEY_MAX_SUGGESTIONS = "max_suggestions"
        private const val PREF_KEY_LAYOUT_LETTERS = "layout_letters"
        private const val PREF_KEY_LAYOUT_SYMBOLS = "layout_symbols"
        private const val PREF_KEY_LAYOUT_SPECIAL = "layout_special"
        private const val PREF_KEY_KEY_WEIGHTS = "key_weights"
        private const val PREF_KEY_TOP_ROW_MAP = "top_row_map"
        private const val PREF_KEY_TOUCH_SLOP_DP = "touch_slop_dp"
        private const val PREF_KEY_ACCENT_SWIPE_THRESHOLD_DP = "accent_swipe_threshold_dp"
        private const val PREF_KEY_EDGE_SWIPE_THRESHOLD_DP = "edge_swipe_threshold_dp"
        private const val PREF_KEY_EDGE_REPEAT_INTERVAL = "edge_repeat_interval"
        private const val PREF_KEY_SPACING_4_DP = "spacing_4_dp"
        private const val PREF_KEY_SPACING_6_DP = "spacing_6_dp"
        private const val PREF_KEY_SPACING_8_DP = "spacing_8_dp"
        private const val PREF_KEY_SPACING_10_DP = "spacing_10_dp"
        private const val PREF_KEY_SPACING_36_DP = "spacing_36_dp"
        private const val PREF_KEY_USER_DICTIONARY = "user_dictionary"
        private const val MAX_DICTIONARY_WORDS = 150_000
        private const val AUTOCOMPLETE_FILE_EN = "autocomplete_en.txt"
        private const val AUTOCOMPLETE_FILE_ES = "autocomplete_es.txt"
        private const val BIGRAM_FILE_EN = "bigrams_en.txt"
        private const val BIGRAM_FILE_ES = "bigrams_es.txt"
        
        private var lastClipboardModuleSignature: String = ""
        
        val defaultLayout =
            listOf(
                listOf("q", "w", "e", "r", "t", "y", "u", "i", "o", "p"),
                listOf("a", "s", "d", "f", "g", "h", "j", "k", "l", "ñ"),
                listOf("caps", "z", "x", "c", "v", "b", "n", "m", "backspace"),
                listOf("123", ",", "space", ".", "enter"),
            )
        private val qwertyLayout = defaultLayout
        private val qwertzLayout = listOf(
            listOf("q", "w", "e", "r", "t", "z", "u", "i", "o", "p"),
            listOf("a", "s", "d", "f", "g", "h", "j", "k", "l", "ñ"),
            listOf("caps", "y", "x", "c", "v", "b", "n", "m", "backspace"),
            listOf("123", ",", "space", ".", "enter"),
        )
        private val azertyLayout = listOf(
            listOf("a", "z", "e", "r", "t", "y", "u", "i", "o", "p"),
            listOf("q", "s", "d", "f", "g", "h", "j", "k", "l", "m"),
            listOf("caps", "w", "x", "c", "v", "b", "n", "ñ", "backspace"),
            listOf("123", ",", "space", ".", "enter"),
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
            
        fun setClipboardSuggestionsFromModule(items: List<ClipboardRepository.ClipboardEntry>) {
            val cleaned =
                items
                    .mapNotNull { item ->
                        val content = item.content.trim()
                        if (content.isEmpty()) null else item.copy(content = content)
                    }
            val signature = cleaned.joinToString("|") { "${it.id ?: ""}:${it.content}" }
            if (cleaned.isNotEmpty() && signature != lastClipboardModuleSignature) {
                ClipboardRepository.setClipboardItems(cleaned)
                lastClipboardModuleSignature = signature
                val params = Arguments.createMap().apply { putString("type", "show") }
                BackgroundServiceModule.sendEvent("ClipboardEvent", params)
            }
        }
    }
}
