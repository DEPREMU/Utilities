package {{packageName}}

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
import android.media.AudioAttributes
import android.media.AudioManager
import android.media.SoundPool
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.os.SystemClock
import android.os.VibrationEffect
import android.os.Vibrator
import android.provider.Settings
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
import android.view.SoundEffectConstants
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
import java.lang.ref.WeakReference
import java.util.concurrent.atomic.AtomicReference
import kotlin.math.abs
import {{packageName}}.R

class CustomKeyboard :
    InputMethodService(),
    DefaultHardwareBackBtnHandler {
    private lateinit var rootLayout: LinearLayout
    private var suggestionsContainer: LinearLayout? = null
    private var selectionActionsContainer: LinearLayout? = null
    private var clipboardContainer: LinearLayout? = null
    private var clipboardScroll: HorizontalScrollView? = null
    private var keyboardModesContainer: LinearLayout? = null
    private var lettersKeyboardContainer: LinearLayout? = null
    private var symbolsKeyboardContainer: LinearLayout? = null
    private var specialKeyboardContainer: LinearLayout? = null
    private var clipboardSuggestions: List<String> = emptyList()
    private var capsMode: CapsMode = CapsMode.OFF
    private var autoCapSuppressed: Boolean = false
    private var lastAutoCapitalizeNext: Boolean = true
    private var isBackspaceRepeating: Boolean = false
    private var backspaceIntervalMs = BACKSPACE_INITIAL_INTERVAL_MS
    private var lastShiftTapTimeMs: Long = 0L
    private var backspaceTapCount: Int = 0
    private var lastBackspaceTapTimeMs: Long = 0L
    private var lastSpaceTapTimeMs: Long = 0L

    private var accentPopup: PopupWindow? = null
    private var accentPopupView: LinearLayout? = null
    private var activeAccentView: TextView? = null

    private var soundPool: SoundPool? = null
    private var keyClickSoundId: Int = 0
    private var vibrator: Vibrator? = null

    private var backspaceInitialIntervalMs = BACKSPACE_INITIAL_INTERVAL_MS
    private var backspaceAccelerationMs = BACKSPACE_ACCELERATION_STEP_MS
    private var backspaceMinIntervalMs = BACKSPACE_MIN_INTERVAL_MS
    private var backspaceSwipeThresholdPx = 0f

    private var spaceSwipeDownX: Float = 0f
    private var spaceSwipeLastX: Float = 0f
    private var spaceSwipeAccumX: Float = 0f
    private var spaceSwipeCursorMode: Boolean = false
    private var spaceSwipeStartThresholdPx: Float = 0f
    private var spaceSwipeStepPx: Float = 0f
    private var spaceSwipeVerticalStepPx: Float = 0f

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
    private var cornerRadiusPx: Int = 0
    private var vibrationDurationMs: Int = 0
    private var longPressDelayMs: Long = 400L
    private var customThemeEnabled: Boolean = false
    private var customBgColor: Int = 0
    private var customKeyColor: Int = 0
    private var customAccentColor: Int = 0
    private var keyTextSizePx: Float = 0f

    private val userDictionary = mutableSetOf<String>()
    private var speechRecognizer: SpeechRecognizer? = null
    private var keyPreviewPopup: PopupWindow? = null
    private var popupTextView: TextView? = null

    override fun onFinishInputView(finishingInput: Boolean) {
        super.onFinishInputView(finishingInput)
        dismissKeyPreview()
        suggestionsJob?.cancel()
    }

    override fun onWindowHidden() {
        super.onWindowHidden()
        dismissKeyPreview()
        suggestionsJob?.cancel()
        dictionaryLoadJob?.cancel()
        speechRecognizer?.destroy()
    }

    private fun showKeyPreview(key: View, label: String) {
        if (label.isEmpty()) return
        
        if (keyPreviewPopup == null) {
            val context = this
            popupTextView = TextView(context).apply {
                setTextColor(paletteTextColor)
                textSize = 30f 
                gravity = Gravity.CENTER
                setBackgroundColor(paletteKeyBackgroundColor)
                setPadding(px10, px10, px10, px10)
                
                background = GradientDrawable().apply {
                    setColor(paletteKeyBackgroundColor)
                    cornerRadius = cornerRadiusPx.toFloat()
                    setStroke(dpToPx(1), paletteAccentColor)
                }
            }
            
            keyPreviewPopup = PopupWindow(popupTextView, ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT).apply {
                isTouchable = false
                isFocusable = false
                inputMethodMode = PopupWindow.INPUT_METHOD_NOT_NEEDED
                elevation = 10f
            }
        }

        popupTextView?.apply {
            text = label
            setTextColor(paletteTextColor)
            (background as? GradientDrawable)?.setColor(paletteKeyBackgroundColor)
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
    }

    private fun dismissKeyPreview() {
        keyPreviewPopup?.dismiss()
    }

    private fun showAccentPopup(key: View, accents: List<String>) {
        if (accentPopup == null) {
            accentPopupView = LinearLayout(this).apply {
                orientation = LinearLayout.HORIZONTAL
                background = createKeyBackgroundStateList(paletteKeyBackgroundColor)
                setPadding(px10, px10, px10, px10)
            }
            
            
            val scrollView = HorizontalScrollView(this).apply {
                isHorizontalScrollBarEnabled = false
                overScrollMode = View.OVER_SCROLL_NEVER
                addView(accentPopupView)
            }
            
            accentPopup = PopupWindow(scrollView, ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT).apply {
                isTouchable = false
                isOutsideTouchable = false
                elevation = px10.toFloat()
            }
        }

        accentPopupView?.removeAllViews()
        accents.forEach { accent ->
            val tv = TextView(this).apply {
                text = if (capsMode != CapsMode.OFF) accent.uppercase() else accent
                textSize = 22f
                setTextColor(paletteTextColor)
                gravity = Gravity.CENTER
                setPadding(px10, px10, px10, px10)
                minWidth = px44
                tag = accent
            }
            accentPopupView?.addView(tv)
        }

        val location = IntArray(2)
        key.getLocationInWindow(location)
        
        val screenWidth = resources.displayMetrics.widthPixels
        
        
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
    }

    private fun dismissAccentPopup() {
        accentPopup?.dismiss()
        activeAccentView = null
    }

    private fun handleAccentSelection(event: MotionEvent) {
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
            activeAccentView?.setBackgroundColor(paletteAccentColor)
        }
    }

    private fun commitAccentSelection() {
        val view = activeAccentView ?: return
        val accent = view.tag as? String ?: return
        commitKeyWithCaps(accent)
        view.performHapticFeedback(HapticFeedbackConstants.KEYBOARD_TAP)
    }

    private val serviceJob = SupervisorJob()
    private val serviceScope = CoroutineScope(serviceJob + Dispatchers.Main.immediate)

    private data class KeyButtonRef(
        val raw: String,
        val lower: String,
        val button: Button,
    )

    private val keyButtonRefs: MutableList<KeyButtonRef> = mutableListOf()
    private var capsButtonRef: Button? = null

    private val suggestionEngine = SuggestionEngine(MAX_SUGGESTIONS)

    private enum class AutocompleteMode {
        EN,
        ES,
        BOTH,
    }

    private enum class LayoutStyle(val prefValue: String) {
        QWERTY("qwerty"),
        QWERTZ("qwertz"),
        AZERTY("azerty"),
    }

    private enum class ThemeMode(
        val prefValue: String,
    ) {
        DARK("dark"),
        LIGHT("light"),
        SYSTEM("system"),
    }

    private enum class BackgroundMode(
        val prefValue: String,
    ) {
        TRANSPARENT("transparent"),
        DARK("dark"),
        LIGHT("light"),
        SYSTEM("system"),
    }

    private var dictionaryLoadJob: Job? = null
    private var currentAutocompleteMode: AutocompleteMode? = null
    private var currentLayoutStyle: LayoutStyle = LayoutStyle.QWERTY
    private var cachedEnSnapshot: SuggestionEngine.Snapshot? = null
    private var cachedEsSnapshot: SuggestionEngine.Snapshot? = null
    private var cachedBothSnapshot: SuggestionEngine.Snapshot? = null

    private var currentThemeMode: ThemeMode = ThemeMode.SYSTEM
    private var currentBackgroundMode: BackgroundMode = BackgroundMode.SYSTEM

    private val suggestionButtons: Array<Button?> = arrayOfNulls(MAX_SUGGESTIONS)
    private val suggestionSlotValues: Array<String?> = arrayOfNulls(MAX_SUGGESTIONS)
    private var suggestionSlotsCapitalizeFirst: Boolean = false

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

    private var cachedEffectiveCaps: CapsMode? = null

    private var suggestionsJob: Job? = null
    private var suggestionsRequestId: Long = 0L

    private var lastAutoCorrectOriginal: String? = null
    private var lastAutoCorrectReplacement: String? = null
    private var ignoreAutoCorrectWord: String? = null

    private var isPrivateMode: Boolean = false
    private var areSuggestionsEnabled: Boolean = true

    private fun shouldPlayKeyClickSound(): Boolean {
        val audioManager = getSystemService(AUDIO_SERVICE) as? AudioManager ?: return false

        val soundEffectsEnabled =
            runCatching {
                Settings.System.getInt(
                    contentResolver,
                    Settings.System.SOUND_EFFECTS_ENABLED,
                    1
                ) == 1
            }.getOrElse { true }

        if (!soundEffectsEnabled) return false

        val systemVolume =
            runCatching { audioManager.getStreamVolume(AudioManager.STREAM_SYSTEM) }.getOrElse { 0 }
        val musicVolume =
            runCatching { audioManager.getStreamVolume(AudioManager.STREAM_MUSIC) }.getOrElse { 0 }
        return systemVolume > 0 || musicVolume > 0
    }

    private var paletteTextColor: Int = Color.BLACK
    private var paletteBackgroundColor: Int = Color.WHITE
    private var paletteKeyBackgroundColor: Int = 0
    private var paletteAccentColor: Int = 0
    private var paletteCapsNeutralColor: Int = 0
    private var paletteCapsMediumColor: Int = 0
    private var paletteCapsStrongColor: Int = 0
    private var paletteCapsStrongTextColor: Int = Color.WHITE

    override fun onCreate() {
        super.onCreate()
        instanceRef.set(WeakReference(this))
        initPxCache()
        currentThemeMode = getOrInitSavedThemeMode()
        currentBackgroundMode = getOrInitSavedBackgroundMode()
        currentLayoutStyle = getOrInitSavedLayoutStyle()
        
        lettersLayoutBackup = when (currentLayoutStyle) {
            LayoutStyle.QWERTY -> qwertyLayout
            LayoutStyle.QWERTZ -> qwertzLayout
            LayoutStyle.AZERTY -> azertyLayout
        }

        val savedUserWords = getPrefs().getStringSet(PREF_KEY_USER_DICTIONARY, emptySet())
        if (savedUserWords != null) {
            userDictionary.addAll(savedUserWords)
        }

        initPalette()

        
        val audioAttributes = AudioAttributes.Builder()
            .setUsage(AudioAttributes.USAGE_ASSISTANCE_SONIFICATION)
            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
            .build()
        soundPool = SoundPool.Builder()
            .setMaxStreams(1)
            .setAudioAttributes(audioAttributes)
            .build()
        
        
        keyClickSoundId = try {
            soundPool?.load(this, R.raw.key_press, 1) ?: 0
        } catch (e: Exception) {
            0
        }

        
        vibrator = getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
    }

    override fun onConfigurationChanged(newConfig: Configuration) {
        super.onConfigurationChanged(newConfig)
        initPxCache()
        initPalette()
        rebuildOnUiThread()
    }

    override fun onStartInputView(info: android.view.inputmethod.EditorInfo?, restarting: Boolean) {
        super.onStartInputView(info, restarting)
        refreshAppearanceFromPrefsIfNeeded()

        val inputType = info?.inputType ?: 0
        val newPrivateMode = isPasswordInputType(inputType)

        if (isPrivateMode != newPrivateMode) {
            isPrivateMode = newPrivateMode
            initPalette()
            applyPaletteToCurrentViews()
        } else {
            isPrivateMode = newPrivateMode
        }

        areSuggestionsEnabled = !isPrivateMode && !hasNoSuggestionsFlag(inputType)

        if (isNumericOrPhoneInputType(inputType)) {
            switchToSymbols()
        } else {
            switchToLetters()
        }

        if (!areSuggestionsEnabled) {
            suggestionsJob?.cancel()
            suggestionsContainer?.visibility = View.GONE
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
            
            
            cachedEnSnapshot = null
            cachedEsSnapshot = null
            cachedBothSnapshot = null
            
            
            dismissKeyPreview()
            keyPreviewPopup = null
            popupTextView = null
            
            
            dictionaryLoadJob?.cancel()
            dictionaryLoadJob = null
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        stopBackspaceRepeat()
        suggestionsJob?.cancel()
        dictionaryLoadJob?.cancel()
        serviceScope.cancel()
        speechRecognizer?.destroy()
        instanceRef.set(null)
        soundPool?.release()
        soundPool = null
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
                setBackgroundColor(paletteBackgroundColor)
                setPadding(px8, px8, px8, px8)
            }
        rebuildLayout()
        val mode = getOrInitSavedAutocompleteMode()
        applyAutocompleteMode(mode, persist = false)
        return rootLayout
    }

    private fun initPalette() {
        val systemIsDark =
            (resources.configuration.uiMode and Configuration.UI_MODE_NIGHT_MASK) == Configuration.UI_MODE_NIGHT_YES
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

    private fun refreshAppearanceFromPrefsIfNeeded() {
        val savedTheme = getOrInitSavedThemeMode()
        val savedBackground = getOrInitSavedBackgroundMode()

        if (savedTheme == currentThemeMode && savedBackground == currentBackgroundMode) {
            if (currentThemeMode == ThemeMode.SYSTEM || currentBackgroundMode == BackgroundMode.SYSTEM) {
                initPalette()
                applyPaletteToCurrentViews()
            }
            return
        }

        currentThemeMode = savedTheme
        currentBackgroundMode = savedBackground
        initPalette()
        applyPaletteToCurrentViews()
    }

    private fun applyPaletteToCurrentViews() {
        rootLayout.setBackgroundColor(paletteBackgroundColor)

        keyButtonRefs.forEach { ref ->
            if (ref.lower == "caps") {
                applyCapsButtonStyle(ref.button, effectiveCapsMode())
            } else {
                applyButtonBackground(ref.button, paletteKeyBackgroundColor)
                ref.button.setTextColor(paletteTextColor)
            }
        }

        suggestionButtons.forEach { btn ->
            if (btn != null) {
                applyButtonBackground(btn, paletteKeyBackgroundColor)
                btn.setTextColor(paletteTextColor)
            }
        }

        val selectionContainer = selectionActionsContainer
        if (selectionContainer != null) {
            for (i in 0 until selectionContainer.childCount) {
                val child = selectionContainer.getChildAt(i)
                if (child is Button) {
                    applyButtonBackground(child, paletteKeyBackgroundColor)
                    child.setTextColor(paletteTextColor)
                }
            }
        }

        val clipContainer = clipboardContainer
        if (clipContainer != null) {
            for (i in 0 until clipContainer.childCount) {
                val child = clipContainer.getChildAt(i)
                if (child is Button) {
                    applyButtonBackground(child, paletteKeyBackgroundColor)
                    child.setTextColor(paletteTextColor)
                }
            }
        }
    }

    private fun applyButtonBackground(button: Button, baseColor: Int) {
        button.backgroundTintList = null
        button.background = createKeyBackgroundStateList(baseColor)
    }

    private fun createKeyBackgroundStateList(baseColor: Int): StateListDrawable {
        return StateListDrawable().apply {
            addState(
                intArrayOf(android.R.attr.state_pressed),
                createKeyBackground(baseColor, pressed = true)
            )
            addState(intArrayOf(), createKeyBackground(baseColor, pressed = false))
        }
    }

    private fun createKeyBackground(baseColor: Int, pressed: Boolean): GradientDrawable {
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

    private fun resolveThemeColor(attr: Int, fallback: Int): Int {
        val tv = TypedValue()
        val resolved = theme.resolveAttribute(attr, tv, true)
        if (!resolved) return fallback
        return if (tv.resourceId != 0) {
            runCatching { resources.getColor(tv.resourceId, theme) }.getOrElse { fallback }
        } else {
            tv.data
        }
    }

    private fun blendColors(a: Int, b: Int, t: Float): Int {
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

    private fun isColorDark(color: Int): Boolean {
        val r = Color.red(color) / 255.0
        val g = Color.green(color) / 255.0
        val b = Color.blue(color) / 255.0
        val luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b
        return luminance < 0.5
    }

    private fun rebuildLayout() {
        rootLayout.removeAllViews()
        
        val (scroll, container) = createClipboardContainer()
        clipboardScroll = scroll
        clipboardContainer = container
        rootLayout.addView(scroll)

        val barContainer = FrameLayout(this).apply {
            layoutParams = LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
            )
        }
        rootLayout.addView(barContainer)

        selectionActionsContainer = createSelectionActionsContainer()
        suggestionsContainer = createSuggestionsContainer()
        
        barContainer.addView(suggestionsContainer)
        barContainer.addView(selectionActionsContainer)

        keyboardModesContainer =
            LinearLayout(this).apply {
                orientation = LinearLayout.VERTICAL
                layoutParams =
                    LinearLayout.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT,
                        ViewGroup.LayoutParams.WRAP_CONTENT,
                    )
            }
        rootLayout.addView(keyboardModesContainer)

        lettersKeyboardContainer = createKeyboardContainer()
        symbolsKeyboardContainer = createKeyboardContainer()
        specialKeyboardContainer = createKeyboardContainer()

        keyboardModesContainer?.addView(lettersKeyboardContainer)
        keyboardModesContainer?.addView(symbolsKeyboardContainer)
        keyboardModesContainer?.addView(specialKeyboardContainer)

        rebuildKeyboardModeContainers()

        ensureSuggestionButtons()
        refreshClipboardSource()
        updateSuggestions()
        updateSelectionActions()
        renderClipboardSuggestions()
        invalidateCapsCache()
        updateCapsVisuals()

        setInputMode(currentMode)
    }

    private fun createKeyboardContainer(): LinearLayout {
        return LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            layoutParams =
                LinearLayout.LayoutParams(
                    ViewGroup.LayoutParams.MATCH_PARENT,
                    ViewGroup.LayoutParams.WRAP_CONTENT,
                )
            visibility = View.GONE
        }
    }

    private fun rebuildKeyboardModeContainers() {
        val letters = lettersKeyboardContainer ?: return
        val symbols = symbolsKeyboardContainer ?: return
        val special = specialKeyboardContainer ?: return

        letters.removeAllViews()
        symbols.removeAllViews()
        special.removeAllViews()

        keyButtonRefs.clear()
        capsButtonRef = null

        val capsVisualMode = effectiveCapsMode()

        buildKeyboardRows(
            host = letters,
            layout = lettersLayoutBackup.ifEmpty { defaultLayout },
            capsVisualMode = capsVisualMode,
            trackCapsKeys = true,
        )
        buildKeyboardRows(
            host = symbols,
            layout = symbolsLayout,
            capsVisualMode = capsVisualMode,
            trackCapsKeys = false,
        )
        buildKeyboardRows(
            host = special,
            layout = specialLayout,
            capsVisualMode = capsVisualMode,
            trackCapsKeys = false,
        )
    }

    private fun buildKeyboardRows(
        host: LinearLayout,
        layout: List<List<String>>,
        capsVisualMode: CapsMode,
        trackCapsKeys: Boolean,
    ) {
        val rowPadding = px4
        layout.forEach { row ->
            val weights = row.map { keyWeight(it) }
            val rowLayout =
                LinearLayout(this).apply {
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

    private fun setInputMode(mode: InputMode) {
        lettersKeyboardContainer?.visibility =
            if (mode == InputMode.LETTERS) View.VISIBLE else View.GONE
        symbolsKeyboardContainer?.visibility =
            if (mode == InputMode.SYMBOLS) View.VISIBLE else View.GONE
        specialKeyboardContainer?.visibility =
            if (mode == InputMode.SPECIAL) View.VISIBLE else View.GONE

        if (mode == InputMode.LETTERS) {
            invalidateCapsCache()
            updateCapsVisualsOnUiThread()
        }
    }

    private fun createSuggestionsContainer(): LinearLayout {
        return LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            layoutParams =
                LinearLayout.LayoutParams(
                    ViewGroup.LayoutParams.MATCH_PARENT,
                    px56,
                )
            visibility = View.GONE
            setPadding(px4, px4, px4, px8)
        }
    }

    private fun createSelectionActionsContainer(): LinearLayout {
        return LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            layoutParams =
                LinearLayout.LayoutParams(
                    ViewGroup.LayoutParams.MATCH_PARENT,
                    px56,
                )
            visibility = View.GONE
            setPadding(px4, px6, px4, px4)
        }
    }

    private fun createClipboardContainer(): Pair<HorizontalScrollView, LinearLayout> {
        val inner =
            LinearLayout(this).apply {
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
            HorizontalScrollView(this).apply {
                layoutParams =
                    LinearLayout.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT,
                        px56,
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
        capsVisualMode: CapsMode,
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
                "space" -> getString(R.string.key_space)
                else -> displayLabel(normalized, capsVisualMode)
            }

        val button = Button(this).apply {
            isAllCaps = false
            text = displayText
            contentDescription =
                when (lower) {
                    "backspace" -> getString(R.string.key_backspace)
                    "enter" -> getString(R.string.key_enter)
                    "caps" -> getString(R.string.key_caps)
                    "tab" -> getString(R.string.key_tab)
                    else -> {
                        if (displayText.length == 1 && displayText[0].isLetter()) displayText else displayText
                    }
                }
            setTextSize(TypedValue.COMPLEX_UNIT_PX, keyTextSizePx)
            minHeight = px52
            minWidth = px36
            setPadding(px10, px10, px10, px10)
            isSingleLine = true
            ellipsize = TextUtils.TruncateAt.END
            maxLines = 1
            textAlignment = View.TEXT_ALIGNMENT_CENTER
            applyButtonBackground(this, paletteKeyBackgroundColor)
            setTextColor(paletteTextColor)
            if (lower == "abc" || lower == "{&=") {
                minWidth = px64
                ellipsize = null
            }
            tag = normalized
            setOnClickListener(keyClickListener)

            val listener = when (lower) {
                "space" -> SpaceTouchListener()
                "backspace" -> BackspaceTouchListener()
                "caps" -> ShiftTouchListener()
                else -> StandardKeyTouchListener(normalized, lower)
            }
            setOnTouchListener(listener)

            when (lower) {
                "backspace" -> {
                    setOnLongClickListener {
                        startBackspaceRepeat()
                        true
                    }
                }
                "space" -> {
                    setOnLongClickListener {
                        openKeyboardConfigDialog()
                        true
                    }
                }
                "," -> {
                    setOnLongClickListener {
                        startVoiceInput()
                        true
                    }
                }
            }
            if (trackCapsKeys) {
                if (lower == "caps") {
                    capsButtonRef = this
                    applyCapsButtonStyle(this, capsVisualMode)
                    setOnLongClickListener {
                        setCapsMode(CapsMode.LOCK)
                        true
                    }
                }
                keyButtonRefs.add(KeyButtonRef(raw = normalized, lower = lower, button = this))
            }
        }

        val hints = topRowMap[lower]

        if (hints != null && hints.isNotEmpty()) {
            val container = FrameLayout(this)
            container.layoutParams = createLayoutParams(weight)

            button.layoutParams = FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
            )

            val hintView = TextView(this).apply {
                text = hints.take(4).joinToString(" ")
                setTextSize(TypedValue.COMPLEX_UNIT_PX, keyTextSizePx * 0.6f)
                setTextColor(paletteTextColor)
                alpha = 0.6f
                elevation = 10f
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
            px56,
            weight.coerceAtLeast(1f),
        ).apply {
            val m = keyGapPx
            setMargins(m, m, m, m)
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

    private fun displayLabel(value: String, mode: CapsMode): String {
        if (value.length == 1 && value[0].isLetter()) {
            return when (mode) {
                CapsMode.OFF -> value.lowercase()
                CapsMode.SINGLE, CapsMode.LOCK -> value.uppercase()
            }
        }
        return value
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
        invalidateCapsCache()
        updateCapsVisualsOnUiThread()
    }

    private fun rebuildOnUiThread() {
        uiHandler.post {
            if (this::rootLayout.isInitialized) {
                rebuildLayout()
            }
        }
    }

    private fun updateCapsVisualsOnUiThread() {
        uiHandler.post {
            if (this::rootLayout.isInitialized) {
                updateCapsVisuals()
            }
        }
    }

    private fun updateCapsVisuals() {
        if (lettersKeyboardContainer?.visibility != View.VISIBLE) {
            return
        }
        val mode = effectiveCapsMode()
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

    fun commitTextToInputConnection(text: String) {
        currentInputConnection?.commitText(text, 1)
        updateSuggestions()
        invalidateCapsCache()
        updateCapsVisualsOnUiThread()
    }

    private fun commitKeyWithCaps(raw: String) {
        if (raw == " ") {
            if (handleDoubleSpace()) {
                return
            }

            if (!areSuggestionsEnabled) {
                commitTextToInputConnection(" ")
                maybeInsertAutoSpace(raw)
                updateSelectionActions()
                return
            }

            val inputConnection = currentInputConnection
            val currentWord = extractCurrentWord()
            if (inputConnection != null && !currentWord.isNullOrEmpty()) {
                val currentLower = currentWord.lowercase()

                if (ignoreAutoCorrectWord != null && ignoreAutoCorrectWord == currentLower) {
                    ignoreAutoCorrectWord = null
                    lastAutoCorrectOriginal = null
                    lastAutoCorrectReplacement = null
                } else {
                    val existsExact = suggestionEngine.contains(currentLower)
                    if (!existsExact) {
                        if (currentWord.all { it.isLetter() }) {
                            if (userDictionary.add(currentWord)) {
                                saveUserDictionary()
                                
                                cachedEnSnapshot = null
                                cachedEsSnapshot = null
                                cachedBothSnapshot = null
                                
                                val mode = currentAutocompleteMode ?: AutocompleteMode.EN
                                currentAutocompleteMode = null 
                                applyAutocompleteMode(mode, false)
                            }
                        }

                        val match = suggestionEngine.bestFuzzyMatch(currentLower, 0.80)
                        if (!match.isNullOrBlank()) {
                            val replacement =
                                if (currentWord.firstOrNull()?.isUpperCase() == true) {
                                    match.replaceFirstChar { it.uppercaseChar() }
                                } else {
                                    match
                                }

                            lastAutoCorrectOriginal = currentWord
                            lastAutoCorrectReplacement = replacement
                            ignoreAutoCorrectWord = null

                            runBatchEdit(inputConnection) { ic ->
                                ic.deleteSurroundingText(currentWord.length, 0)
                                ic.commitText("$replacement ", 1)
                            }

                            updateSuggestions()
                            updateSelectionActions()
                            invalidateCapsCache()
                            updateCapsVisualsOnUiThread()
                            return
                        }
                    }
                }
            }
        } else {
            lastSpaceTapTimeMs = 0L
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
        if (clipboardItems.isNotEmpty()) {
            clipboardSuggestions = clipboardItems
            renderClipboardSuggestions()
            return
        }

        serviceScope.launch {
            val items = withContext(Dispatchers.IO) { loadSystemClipboardSuggestionsBlocking() }
            updateClipboardItems(items)
        }
    }

    private fun renderClipboardSuggestions() {
        val container = clipboardContainer ?: return

        val items = clipboardSuggestions.take(MAX_ITEMS_IN_CLIPBOARD)
        container.removeAllViews()

        if (items.isEmpty()) {
            clipboardScroll?.visibility = View.GONE
            return
        }

        clipboardScroll?.visibility = View.VISIBLE

        items.forEach { item ->
            val label = if (item.length > 10) item.take(10) + "..." else item
            val button =
                Button(this).apply {
                    layoutParams =
                        LinearLayout.LayoutParams(
                            0,
                            px44,
                            1f,
                        ).apply {
                            val margin = px1
                            setMargins(margin, margin, margin, margin)
                        }
                    isAllCaps = false
                    text = label
                    textSize = 14f
                    minHeight = px44
                    isSingleLine = true
                    ellipsize = TextUtils.TruncateAt.END
                    maxLines = 1
                    textAlignment = View.TEXT_ALIGNMENT_CENTER
                    applyButtonBackground(this, paletteKeyBackgroundColor)
                    setTextColor(paletteTextColor)
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
        val inputConnection = currentInputConnection ?: return

        runBatchEdit(inputConnection) { ic ->
            ic.commitText(item + " ", 1)
        }

        updateSuggestions()
        updateSelectionActions()
        invalidateCapsCache()
        updateCapsVisualsOnUiThread()
    }

    private fun showClipboardDialog(text: String) {
        val (pasteLabel, closeLabel) = getClipboardDialogLabels()
        val windowToken =
            window?.window?.decorView?.windowToken ?: window?.window?.attributes?.token ?: return
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
        return Pair(
            getString(R.string.btn_paste),
            getString(R.string.btn_close),
        )
    }

    private fun saveUserDictionary() {
        getPrefs().edit { putStringSet(PREF_KEY_USER_DICTIONARY, userDictionary) }
    }

    private fun startVoiceInput() {
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
                            override fun onEndOfSpeech() {}
                            override fun onError(error: Int) {
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
                                    commitTextToInputConnection("$text ")
                                }
                            }

                            override fun onPartialResults(partialResults: Bundle?) {}
                            override fun onEvent(eventType: Int, params: Bundle?) {}
                        })
                    }
                }
                speechRecognizer?.startListening(intent)
                Toast.makeText(this, getString(R.string.listening_voice_input), Toast.LENGTH_SHORT)
                    .show()
            } catch (e: Exception) {
                Toast.makeText(this, getString(R.string.voice_input_failed), Toast.LENGTH_SHORT)
                    .show()
            }
        }
    }

    private fun handleDoubleSpace(): Boolean {
        val now = SystemClock.elapsedRealtime()
        val delta = now - lastSpaceTapTimeMs
        lastSpaceTapTimeMs = now

        if (delta > 800) return false

        val inputConnection = currentInputConnection ?: return false
        val before = inputConnection.getTextBeforeCursor(6, 0) ?: ""

        if (before.length >= 2 && before.last() == ' ' && !before[before.length - 2].isWhitespace()) {
            inputConnection.deleteSurroundingText(1, 0)
            inputConnection.commitText(". ", 1)
            updateSuggestions()
            updateCapsVisualsOnUiThread()
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
        val before = inputConnection.getTextBeforeCursor(1, 0)
        if (before != null && before.toString() == " ") {
            inputConnection.deleteSurroundingText(1, 0)
        }
    }

    private fun isPunctuation(ch: Char): Boolean {
        return ch == '.' || ch == ',' || ch == ':' || ch == ';' || ch == '?' || ch == '!' || ch == ')'
    }

    private fun applyCapsButtonStyle(button: Button, mode: CapsMode) {
        val (background, textColor) =
            when (mode) {
                CapsMode.OFF -> Pair(paletteCapsNeutralColor, paletteTextColor)
                CapsMode.SINGLE -> Pair(paletteCapsMediumColor, paletteTextColor)
                CapsMode.LOCK -> Pair(paletteCapsStrongColor, paletteCapsStrongTextColor)
            }

        applyButtonBackground(button, background)
        button.setTextColor(textColor)
    }

    private fun updateSelectionActions() {
        val container = selectionActionsContainer ?: return
        val suggestions = suggestionsContainer
        val selectedText = currentInputConnection?.getSelectedText(0)

        TransitionManager.beginDelayedTransition(rootLayout)

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

        val (copyLabel, cutLabel) = getCopyCutLabels()

        val copyButton =
            Button(this).apply {
                layoutParams =
                    LinearLayout.LayoutParams(
                        0,
                        px44,
                        1f,
                    ).apply {
                        val margin = px1
                        setMargins(margin, margin, margin, margin)
                    }
                text = copyLabel
                isAllCaps = false
                textSize = 14f
                minHeight = px44
                applyButtonBackground(this, paletteKeyBackgroundColor)
                setTextColor(paletteTextColor)
                setOnClickListener { copySelection(selectedText.toString()) }
            }

        val cutButton =
            Button(this).apply {
                layoutParams =
                    LinearLayout.LayoutParams(
                        0,
                        px44,
                        1f,
                    ).apply {
                        val margin = px1
                        setMargins(margin, margin, margin, margin)
                    }
                text = cutLabel
                isAllCaps = false
                textSize = 14f
                minHeight = px44
                applyButtonBackground(this, paletteKeyBackgroundColor)
                setTextColor(paletteTextColor)
                setOnClickListener { cutSelection(selectedText.toString()) }
            }

        container.addView(copyButton)
        container.addView(cutButton)
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
        val msg = getString(R.string.msg_copied)
        Toast.makeText(this, msg, Toast.LENGTH_SHORT).show()
    }

    private fun showToastCut() {
        val msg = getString(R.string.msg_cut)
        Toast.makeText(this, msg, Toast.LENGTH_SHORT).show()
    }

    fun deleteFromInputConnection() {
        val inputConnection = currentInputConnection ?: return
        val selectedText = inputConnection.getSelectedText(0)

        if (!selectedText.isNullOrEmpty()) {
            inputConnection.commitText("", 1)
            updateSuggestions()
            updateSelectionActions()
            invalidateCapsCache()
            updateCapsVisualsOnUiThread()
            return
        }

        val replacement = lastAutoCorrectReplacement
        val original = lastAutoCorrectOriginal
        if (!replacement.isNullOrEmpty() && !original.isNullOrEmpty()) {
            val replacementWithSpace = "$replacement "
            val before =
                inputConnection.getTextBeforeCursor(replacementWithSpace.length, 0)?.toString()
                    .orEmpty()
            if (before == replacementWithSpace) {
                runBatchEdit(inputConnection) { ic ->
                    ic.deleteSurroundingText(replacementWithSpace.length, 0)
                    ic.commitText(original, 1)
                }

                ignoreAutoCorrectWord = original.lowercase()
                lastAutoCorrectOriginal = null
                lastAutoCorrectReplacement = null

                updateSuggestions()
                updateSelectionActions()
                invalidateCapsCache()
                updateCapsVisualsOnUiThread()
                return
            }
        }

        inputConnection.deleteSurroundingText(1, 0)
        updateSuggestions()
        updateSelectionActions()
        invalidateCapsCache()
        updateCapsVisualsOnUiThread()
    }

    private fun deleteWordFromInputConnection() {
        val inputConnection = currentInputConnection ?: return
        val selectedText = inputConnection.getSelectedText(0)

        if (!selectedText.isNullOrEmpty()) {
            inputConnection.commitText("", 1)
            updateSuggestions()
            invalidateCapsCache()
            updateCapsVisualsOnUiThread()
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
            invalidateCapsCache()
            updateCapsVisualsOnUiThread()
        }
    }

    private fun invalidateCapsCache() {
        cachedEffectiveCaps = null
    }

    fun sendEnter() {
        val inputConnection = currentInputConnection ?: return
        inputConnection.sendKeyEvent(KeyEvent(KeyEvent.ACTION_DOWN, KeyEvent.KEYCODE_ENTER))
        inputConnection.sendKeyEvent(KeyEvent(KeyEvent.ACTION_UP, KeyEvent.KEYCODE_ENTER))
    }

    override fun invokeDefaultOnBackPressed() {}

    private fun dpToPx(dp: Int): Int =
        TypedValue.applyDimension(
            TypedValue.COMPLEX_UNIT_DIP,
            dp.toFloat(),
            resources.displayMetrics,
        ).toInt()

    private fun getPrefs() = getSharedPreferences(PREFS_NAME, MODE_PRIVATE)

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

    private fun getOrInitSavedThemeMode(): ThemeMode {
        val prefs = getPrefs()
        val raw = prefs.getString(PREF_KEY_THEME_MODE, null)
        if (!raw.isNullOrBlank()) {
            return ThemeMode.entries.firstOrNull { it.prefValue == raw } ?: ThemeMode.SYSTEM
        }

        prefs.edit { putString(PREF_KEY_THEME_MODE, ThemeMode.SYSTEM.prefValue) }
        return ThemeMode.SYSTEM
    }

    private fun setSavedThemeMode(mode: ThemeMode) {
        getPrefs().edit { putString(PREF_KEY_THEME_MODE, mode.prefValue) }
    }

    private fun getOrInitSavedBackgroundMode(): BackgroundMode {
        val prefs = getPrefs()
        val raw = prefs.getString(PREF_KEY_BACKGROUND_MODE, null)
        if (!raw.isNullOrBlank()) {
            return BackgroundMode.entries.firstOrNull { it.prefValue == raw }
                ?: BackgroundMode.SYSTEM
        }

        prefs.edit { putString(PREF_KEY_BACKGROUND_MODE, BackgroundMode.SYSTEM.prefValue) }
        return BackgroundMode.SYSTEM
    }

    private fun setSavedBackgroundMode(mode: BackgroundMode) {
        getPrefs().edit { putString(PREF_KEY_BACKGROUND_MODE, mode.prefValue) }
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
            yieldAll(userDictionary)
            fileNames.forEach { fileName ->
                try {
                    assets.open(fileName).bufferedReader().useLines { lines ->
                        for (line in lines) {
                            val trimmed = line.trim()
                            if (trimmed.isNotEmpty()) {
                                yield(trimmed)
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
                            1 -> openVisualStylesDialog()
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
            getString(R.string.option_azerty)
        )
        val checked =
            when (currentLayoutStyle) {
                LayoutStyle.QWERTY -> 0
                LayoutStyle.QWERTZ -> 1
                LayoutStyle.AZERTY -> 2
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
                                else -> LayoutStyle.AZERTY
                            }
                        currentLayoutStyle = selected
                        setSavedLayoutStyle(selected)
                        
                        lettersLayoutBackup = when (selected) {
                            LayoutStyle.QWERTY -> qwertyLayout
                            LayoutStyle.QWERTZ -> qwertzLayout
                            LayoutStyle.AZERTY -> azertyLayout
                        }
                        rebuildOnUiThread()
                        
                        dialogInterface.dismiss()
                        openKeyboardConfigDialog()
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

    private fun openVisualStylesDialog() {
        val items = arrayOf(
            getString(R.string.item_corner_radius),
            getString(R.string.item_theme_mode),
            getString(R.string.item_background),
            getString(R.string.item_custom_theme)
        )

        val windowToken =
            window?.window?.decorView?.windowToken ?: window?.window?.attributes?.token ?: return
        uiHandler.post {
            val dialog = AlertDialog.Builder(this)
                .setTitle(getString(R.string.dialog_visual_style_title))
                .setItems(items) { dialogInterface, which ->
                    dialogInterface.dismiss()
                    when (which) {
                        0 -> openCornerRadiusDialog()
                        1 -> openThemeModeConfigDialog()
                        2 -> openBackgroundModeConfigDialog()
                        3 -> openCustomThemeDialog()
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

    private fun openCornerRadiusDialog() {
        val context = this
        val layout = LinearLayout(context).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(px10 * 2, px10, px10 * 2, px10)
        }

        val prefs = getPrefs()
        val initialRadius = prefs.getInt(PREF_KEY_CORNER_RADIUS, 6)

        val radiusLabel =
            TextView(context).apply { text = getString(R.string.label_radius_fmt, initialRadius) }
        val radiusSeek = SeekBar(context).apply {
            max = 24
            progress = initialRadius
            setOnSeekBarChangeListener(object : SeekBar.OnSeekBarChangeListener {
                override fun onProgressChanged(
                    seekBar: SeekBar?,
                    progress: Int,
                    fromUser: Boolean
                ) {
                    radiusLabel.text = getString(R.string.label_radius_fmt, progress)
                    getPrefs().edit{ putInt(PREF_KEY_CORNER_RADIUS, progress) }
                    initPxCache()
                    rebuildOnUiThread()
                }

                override fun onStartTrackingTouch(seekBar: SeekBar?) {}
                override fun onStopTrackingTouch(seekBar: SeekBar?) {}
            })
        }

        layout.addView(radiusLabel)
        layout.addView(radiusSeek)

        val windowToken =
            window?.window?.decorView?.windowToken ?: window?.window?.attributes?.token ?: return
        uiHandler.post {
            val dialog = AlertDialog.Builder(context)
                .setTitle(getString(R.string.dialog_corner_radius_title))
                .setView(layout)
                .setPositiveButton(getString(R.string.btn_ok)) { _, _ ->
                    openVisualStylesDialog()
                }
                .setNegativeButton(getString(R.string.btn_cancel)) { _, _ ->
                    getPrefs().edit { putInt(PREF_KEY_CORNER_RADIUS, initialRadius) }
                    initPxCache()
                    rebuildOnUiThread()
                    openVisualStylesDialog()
                }
                .setOnCancelListener {
                    getPrefs().edit { putInt(PREF_KEY_CORNER_RADIUS, initialRadius) }
                    initPxCache()
                    rebuildOnUiThread()
                    openVisualStylesDialog()
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

    private fun openCustomThemeDialog() {

        val context = this
        val layout = LinearLayout(context).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(px10 * 2, px10, px10 * 2, px10)
        }

        val prefs = getPrefs()
        val initialEnabled = prefs.getBoolean(PREF_KEY_CUSTOM_THEME_ENABLED, false)
        val initialBg = prefs.getInt(PREF_KEY_CUSTOM_BG_COLOR, Color.BLACK)
        val initialKey = prefs.getInt(PREF_KEY_CUSTOM_KEY_COLOR, Color.DKGRAY)
        val initialAccent = prefs.getInt(PREF_KEY_CUSTOM_ACCENT_COLOR, Color.BLUE)

        val updateTheme = { enabled: Boolean, bgStr: String, keyStr: String, accentStr: String ->
            try {
                val bg = bgStr.toColorInt()
                val key = keyStr.toColorInt()
                val accent = accentStr.toColorInt()

                getPrefs().edit {
                    putBoolean(PREF_KEY_CUSTOM_THEME_ENABLED, enabled)
                        .putInt(PREF_KEY_CUSTOM_BG_COLOR, bg)
                        .putInt(PREF_KEY_CUSTOM_KEY_COLOR, key)
                        .putInt(PREF_KEY_CUSTOM_ACCENT_COLOR, accent)
                }

                initPxCache()
                initPalette()
                applyPaletteToCurrentViews()
            } catch (_: Exception) {
                
            }
        }

        val enabledCheck = android.widget.CheckBox(context).apply {
            text = getString(R.string.check_enable_custom_theme)
            isChecked = initialEnabled
        }

        val bgInput = EditText(context).apply {
            hint = getString(R.string.hint_hex_bg)
            setText(String.format("#%06X", (0xFFFFFF and initialBg)))
        }
        val keyInput = EditText(context).apply {
            hint = getString(R.string.hint_hex_key)
            setText(String.format("#%06X", (0xFFFFFF and initialKey)))
        }
        val accentInput = EditText(context).apply {
            hint = getString(R.string.hint_hex_accent)
            setText(String.format("#%06X", (0xFFFFFF and initialAccent)))
        }

        val textWatcher = object : android.text.TextWatcher {
            override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) {}
            override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) {}
            override fun afterTextChanged(s: android.text.Editable?) {
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

        val windowToken =
            window?.window?.decorView?.windowToken ?: window?.window?.attributes?.token ?: return
        uiHandler.post {
            val dialog = AlertDialog.Builder(context)
                .setTitle(getString(R.string.dialog_custom_theme_title))
                .setView(layout)
                .setPositiveButton(getString(R.string.btn_ok)) { _, _ ->
                    openVisualStylesDialog()
                }
                .setNegativeButton(getString(R.string.btn_cancel)) { _, _ ->
                    getPrefs().edit {
                        putBoolean(PREF_KEY_CUSTOM_THEME_ENABLED, initialEnabled)
                            .putInt(PREF_KEY_CUSTOM_BG_COLOR, initialBg)
                            .putInt(PREF_KEY_CUSTOM_KEY_COLOR, initialKey)
                            .putInt(PREF_KEY_CUSTOM_ACCENT_COLOR, initialAccent)
                    }
                    initPxCache()
                    initPalette()
                    applyPaletteToCurrentViews()
                    openVisualStylesDialog()
                }
                .setOnCancelListener {
                    getPrefs().edit {
                        putBoolean(PREF_KEY_CUSTOM_THEME_ENABLED, initialEnabled)
                            .putInt(PREF_KEY_CUSTOM_BG_COLOR, initialBg)
                            .putInt(PREF_KEY_CUSTOM_KEY_COLOR, initialKey)
                            .putInt(PREF_KEY_CUSTOM_ACCENT_COLOR, initialAccent)
                    }
                    initPxCache()
                    initPalette()
                    applyPaletteToCurrentViews()
                    openVisualStylesDialog()
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
            "Swipe Settings",
            "Typing Speed"
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

        val addSeek = { label: String, initial: Int, key: String, max: Int ->
            val tv = TextView(context).apply { text = "$label: $initial dp" }
            val seek = SeekBar(context).apply {
                this.max = max
                progress = initial
                setOnSeekBarChangeListener(object : SeekBar.OnSeekBarChangeListener {
                    override fun onProgressChanged(seekBar: SeekBar?, progress: Int, fromUser: Boolean) {
                        tv.text = "$label: $progress dp"
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

        addSeek("Swipe Start Threshold", initialThreshold, PREF_KEY_SWIPE_THRESHOLD, 50)
        addSeek("Horizontal Step", initialHStep, PREF_KEY_SWIPE_H_STEP, 100)
        addSeek("Vertical Step", initialVStep, PREF_KEY_SWIPE_V_STEP, 100)
        addSeek("Backspace Swipe Threshold", initialBsThreshold, PREF_KEY_BACKSPACE_SWIPE_THRESHOLD, 100)

        val windowToken = window?.window?.decorView?.windowToken ?: window?.window?.attributes?.token ?: return
        uiHandler.post {
            val dialog = AlertDialog.Builder(this)
                .setTitle("Swipe Settings")
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
        val initialInitial = prefs.getLong(PREF_KEY_BACKSPACE_INITIAL_INTERVAL, BACKSPACE_INITIAL_INTERVAL_MS)
        val initialAccel = prefs.getLong(PREF_KEY_BACKSPACE_ACCELERATION, BACKSPACE_ACCELERATION_STEP_MS)
        val initialMin = prefs.getLong(PREF_KEY_BACKSPACE_MIN_INTERVAL, BACKSPACE_MIN_INTERVAL_MS)

        val addSeek = { label: String, initial: Long, key: String, max: Int ->
            val tv = TextView(context).apply { text = "$label: $initial ms" }
            val seek = SeekBar(context).apply {
                this.max = max
                progress = initial.toInt()
                setOnSeekBarChangeListener(object : SeekBar.OnSeekBarChangeListener {
                    override fun onProgressChanged(seekBar: SeekBar?, progress: Int, fromUser: Boolean) {
                        tv.text = "$label: $progress ms"
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

        addSeek("Backspace Initial Delay", initialInitial, PREF_KEY_BACKSPACE_INITIAL_INTERVAL, 1000)
        addSeek("Backspace Acceleration", initialAccel, PREF_KEY_BACKSPACE_ACCELERATION, 200)
        addSeek("Backspace Min Interval", initialMin, PREF_KEY_BACKSPACE_MIN_INTERVAL, 200)

        val windowToken = window?.window?.decorView?.windowToken ?: window?.window?.attributes?.token ?: return
        uiHandler.post {
            val dialog = AlertDialog.Builder(this)
                .setTitle("Typing Speed Settings")
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

    private fun openThemeModeConfigDialog() {
        val title = getString(R.string.dialog_theme_title)
        val closeLabel = getString(R.string.btn_close)
        val items = arrayOf(
            getString(R.string.option_dark),
            getString(R.string.option_light),
            getString(R.string.option_system)
        )
        val checked =
            when (currentThemeMode) {
                ThemeMode.DARK -> 0
                ThemeMode.LIGHT -> 1
                ThemeMode.SYSTEM -> 2
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
                                0 -> ThemeMode.DARK
                                1 -> ThemeMode.LIGHT
                                else -> ThemeMode.SYSTEM
                            }
                        currentThemeMode = selected
                        setSavedThemeMode(selected)
                        initPalette()
                        applyPaletteToCurrentViews()
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
                    .create()

            dialog.window?.apply {
                setType(WindowManager.LayoutParams.TYPE_APPLICATION_ATTACHED_DIALOG)
                attributes?.token = windowToken
                addFlags(WindowManager.LayoutParams.FLAG_ALT_FOCUSABLE_IM)
            }

            dialog.show()
        }
    }

    private fun openBackgroundModeConfigDialog() {
        val title = getString(R.string.dialog_background_title)
        val closeLabel = getString(R.string.btn_close)
        val items = arrayOf(
            getString(R.string.option_transparent),
            getString(R.string.option_dark),
            getString(R.string.option_light),
            getString(R.string.option_system)
        )
        val checked =
            when (currentBackgroundMode) {
                BackgroundMode.TRANSPARENT -> 0
                BackgroundMode.DARK -> 1
                BackgroundMode.LIGHT -> 2
                BackgroundMode.SYSTEM -> 3
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
                                0 -> BackgroundMode.TRANSPARENT
                                1 -> BackgroundMode.DARK
                                2 -> BackgroundMode.LIGHT
                                else -> BackgroundMode.SYSTEM
                            }
                        currentBackgroundMode = selected
                        setSavedBackgroundMode(selected)
                        initPalette()
                        applyPaletteToCurrentViews()
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
                    .create()

            dialog.window?.apply {
                setType(WindowManager.LayoutParams.TYPE_APPLICATION_ATTACHED_DIALOG)
                attributes?.token = windowToken
                addFlags(WindowManager.LayoutParams.FLAG_ALT_FOCUSABLE_IM)
            }

            dialog.show()
        }
    }


    private fun updateClipboardItems(items: List<String>) {
        uiHandler.post {
            clipboardSuggestions = items
            renderClipboardSuggestions()
        }
    }

    private fun loadSystemClipboardSuggestionsBlocking(): List<String> {
        val clipboard =
            getSystemService(CLIPBOARD_SERVICE) as? ClipboardManager ?: return emptyList()
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

        var i = beforeCursor.length - 1
        while (i >= 0 && beforeCursor[i].isLetter()) {
            i--
        }
        val start = i + 1
        if (start >= beforeCursor.length) return ""
        return beforeCursor.substring(start)
    }

    private fun updateSuggestions() {
        if (!areSuggestionsEnabled) {
            suggestionsJob?.cancel()
            renderSuggestions(emptyList(), capitalizeFirst = false)
            return
        }

        val currentWord = extractCurrentWord()
        if (currentWord.isNullOrEmpty()) {
            suggestionsJob?.cancel()
            renderSuggestions(emptyList(), capitalizeFirst = false)
            return
        }

        val capitalizeFirst = currentWord.firstOrNull()?.isUpperCase() == true
        val prefix = currentWord.lowercase()

        val requestId = ++suggestionsRequestId
        suggestionsJob?.cancel()
        suggestionsJob =
            serviceScope.launch {
                val matches = withContext(Dispatchers.Default) { suggestionEngine.suggest(prefix) }
                if (requestId != suggestionsRequestId) return@launch

                
                
                
                val filteredMatches = matches
                    .filterNot { it.equals(currentWord, ignoreCase = true) }
                    .distinctBy { it.lowercase() }
                    .take(MAX_SUGGESTIONS)

                renderSuggestions(filteredMatches, capitalizeFirst)
                updateSelectionActions()
                updateCapsVisualsOnUiThread()
            }
    }

    private fun renderSuggestions(suggestions: List<String>, capitalizeFirst: Boolean) {
        val container = suggestionsContainer ?: return

        TransitionManager.beginDelayedTransition(rootLayout)

        suggestionSlotsCapitalizeFirst = capitalizeFirst

        for (i in 0 until MAX_SUGGESTIONS) {
            val button = suggestionButtons.getOrNull(i) ?: continue
            val suggestion = suggestions.getOrNull(i)
            suggestionSlotValues[i] = suggestion

            if (suggestion.isNullOrEmpty()) {
                button.visibility = View.INVISIBLE
                if (button.text?.isNotEmpty() == true) {
                    button.text = ""
                }
                continue
            }

            val displayText =
                if (capitalizeFirst) {
                    suggestion.replaceFirstChar { it.uppercaseChar() }
                } else {
                    suggestion
                }

            if (button.text?.toString() != displayText) {
                button.text = displayText
            }
            button.visibility = View.VISIBLE
        }

        if (selectionActionsContainer?.visibility == View.VISIBLE) {
            container.visibility = View.INVISIBLE
        } else {
            container.visibility = if (suggestions.isEmpty()) View.INVISIBLE else View.VISIBLE
        }

        renderClipboardSuggestions()
    }

    private fun ensureSuggestionButtons() {
        val container = suggestionsContainer ?: return
        container.removeAllViews()

        for (i in 0 until MAX_SUGGESTIONS) {
            val btn =
                Button(this).apply {
                    layoutParams =
                        LinearLayout.LayoutParams(
                            0,
                            px44,
                            1f,
                        ).apply {
                            val margin = px1
                            setMargins(margin, margin, margin, margin)
                        }
                    isAllCaps = false
                    text = ""
                    textSize = 14f
                    minHeight = px44
                    applyButtonBackground(this, paletteKeyBackgroundColor)
                    setTextColor(paletteTextColor)
                    tag = i
                    setOnClickListener(suggestionClickListener)
                    visibility = View.INVISIBLE
                }

            suggestionButtons[i] = btn
            suggestionSlotValues[i] = null
            container.addView(btn)
        }
    }

    private val suggestionClickListener: View.OnClickListener =
        View.OnClickListener { v ->
            val index = v.tag as? Int ?: return@OnClickListener
            val suggestion = suggestionSlotValues.getOrNull(index) ?: return@OnClickListener
            applySuggestion(suggestion, suggestionSlotsCapitalizeFirst)
        }

    private val keyClickListener: View.OnClickListener =
        View.OnClickListener { v ->
            val key = v.tag as? String ?: return@OnClickListener

            if (vibrationDurationMs > 0) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    val amplitude = when (key.lowercase()) {
                        "enter", "backspace", "space" -> 60 
                        else -> 30 
                    }
                    vibrator?.vibrate(
                        VibrationEffect.createOneShot(
                            vibrationDurationMs.toLong(),
                            amplitude
                        )
                    )
                } else {
                    @Suppress("DEPRECATION")
                    vibrator?.vibrate(vibrationDurationMs.toLong())
                }
            } else if (vibrationDurationMs < 0) {
                v.performHapticFeedback(HapticFeedbackConstants.KEYBOARD_TAP)
            }

            if (shouldPlayKeyClickSound()) {
                if (keyClickSoundId != 0) {
                    soundPool?.play(keyClickSoundId, 1f, 1f, 1, 0, 1f)
                } else {
                    val am = getSystemService(Context.AUDIO_SERVICE) as AudioManager
                    am.playSoundEffect(AudioManager.FX_KEY_CLICK)
                }
            }

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
                "tab" -> commitTextToInputConnection("\t")
                "space" -> commitKeyWithCaps(" ")
                else -> commitKeyWithCaps(key)
            }
        }

    private fun handleBackspacePress() {
        lastSpaceTapTimeMs = 0L
        val inputConnection = currentInputConnection ?: return
        val now = SystemClock.elapsedRealtime()

        val selectedText = inputConnection.getSelectedText(0)
        if (!selectedText.isNullOrEmpty()) {
            backspaceTapCount = 0
            lastBackspaceTapTimeMs = now
            deleteFromInputConnection()
            return
        }

        val replacement = lastAutoCorrectReplacement
        val original = lastAutoCorrectOriginal
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

        val withinWindow = now - lastBackspaceTapTimeMs <= BACKSPACE_MULTI_TAP_WINDOW_MS
        backspaceTapCount = if (withinWindow) (backspaceTapCount + 1) else 1
        lastBackspaceTapTimeMs = now

        if (backspaceTapCount >= 3) {
            deleteWordFromInputConnection()
        } else {
            deleteFromInputConnection()
        }
    }

    private fun initPxCache() {
        val prefs = getPrefs()
        keyboardHeightFactor = prefs.getFloat(PREF_KEY_KEYBOARD_HEIGHT_FACTOR, 1.0f)
        val gapDp = prefs.getInt(PREF_KEY_KEY_GAP, 1)
        keyGapPx = dpToPx(gapDp)

        val radiusDp = prefs.getInt(PREF_KEY_CORNER_RADIUS, 6)
        cornerRadiusPx = dpToPx(radiusDp)

        vibrationDurationMs = prefs.getInt(PREF_KEY_VIBRATION_DURATION, 0)


        longPressDelayMs = prefs.getLong(PREF_KEY_LONG_PRESS_DELAY, 400L)

        customThemeEnabled = prefs.getBoolean(PREF_KEY_CUSTOM_THEME_ENABLED, false)
        customBgColor = prefs.getInt(PREF_KEY_CUSTOM_BG_COLOR, Color.BLACK)
        customKeyColor = prefs.getInt(PREF_KEY_CUSTOM_KEY_COLOR, Color.DKGRAY)
        customAccentColor = prefs.getInt(PREF_KEY_CUSTOM_ACCENT_COLOR, Color.BLUE)

        px1 = keyGapPx
        px4 = dpToPx(4)
        px6 = dpToPx(6)
        px8 = dpToPx(8)
        px10 = dpToPx(10)
        px36 = dpToPx(36)


        px44 = (dpToPx(44) * keyboardHeightFactor).toInt()
        px52 = (dpToPx(52) * keyboardHeightFactor).toInt()
        px56 = (dpToPx(56) * keyboardHeightFactor).toInt()
        px64 = dpToPx(64)

        keyTextSizePx = dpToPx(15).toFloat() * keyboardHeightFactor

        val swipeThresholdDp = prefs.getInt(PREF_KEY_SWIPE_THRESHOLD, 6)
        spaceSwipeStartThresholdPx = dpToPx(swipeThresholdDp).toFloat()

        val swipeHStepDp = prefs.getInt(PREF_KEY_SWIPE_H_STEP, 12)
        spaceSwipeStepPx = dpToPx(swipeHStepDp).toFloat()

        val swipeVStepDp = prefs.getInt(PREF_KEY_SWIPE_V_STEP, 24)
        spaceSwipeVerticalStepPx = dpToPx(swipeVStepDp).toFloat()

        val bsSwipeThresholdDp = prefs.getInt(PREF_KEY_BACKSPACE_SWIPE_THRESHOLD, 36)
        backspaceSwipeThresholdPx = dpToPx(bsSwipeThresholdDp).toFloat()

        backspaceInitialIntervalMs = prefs.getLong(PREF_KEY_BACKSPACE_INITIAL_INTERVAL, BACKSPACE_INITIAL_INTERVAL_MS)
        backspaceAccelerationMs = prefs.getLong(PREF_KEY_BACKSPACE_ACCELERATION, BACKSPACE_ACCELERATION_STEP_MS)
        backspaceMinIntervalMs = prefs.getLong(PREF_KEY_BACKSPACE_MIN_INTERVAL, BACKSPACE_MIN_INTERVAL_MS)
        backspaceIntervalMs = backspaceInitialIntervalMs
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

        runBatchEdit(inputConnection) { ic ->
            if (currentWord.isNotEmpty()) {
                ic.deleteSurroundingText(currentWord.length, 0)
            }
            ic.commitText("$textToCommit ", 1)
        }

        updateSuggestions()
        updateSelectionActions()
        invalidateCapsCache()
        updateCapsVisualsOnUiThread()
    }

    private inline fun runBatchEdit(
        inputConnection: android.view.inputmethod.InputConnection?,
        block: (android.view.inputmethod.InputConnection) -> Unit,
    ) {
        val ic = inputConnection ?: return
        var began = false
        try {
            try {
                ic.beginBatchEdit()
                began = true
            } catch (_: Throwable) {
                began = false
            }

            try {
                block(ic)
            } catch (_: Throwable) {

            }
        } finally {
            if (began) {
                try {
                    ic.endBatchEdit()
                } catch (_: Throwable) {
                }
            }
        }
    }

    private fun shouldAutoCapitalizeNextChar(): Boolean {
        val inputConnection = currentInputConnection ?: return lastAutoCapitalizeNext
        val beforeCursor = inputConnection.getTextBeforeCursor(200, 0)
            ?: return true.also { lastAutoCapitalizeNext = true }
        val trimmed = beforeCursor.trimEnd()
        if (trimmed.isEmpty()) return true.also { lastAutoCapitalizeNext = true }

        val lastChar = trimmed.last()
        val result =
            lastChar == '.' || lastChar == ':' || lastChar == ';' || lastChar == '?' || lastChar == '!' || lastChar == '\n'
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

    private class SuggestionEngine(
        private val maxSuggestions: Int,
    ) {
        private data class LevBuffers(
            var prev: IntArray,
            var curr: IntArray,
        )

        private val levBuffersThreadLocal: ThreadLocal<LevBuffers> =
            ThreadLocal.withInitial {
                LevBuffers(IntArray(128), IntArray(128))
            }

        data class Snapshot(
            val lowerSorted: Array<String>,
            val originalSorted: Array<String>,
            val indicesByFirstChar: Map<Char, IntArray>,
        )

        @Volatile
        private var snapshot: Snapshot = Snapshot(emptyArray(), emptyArray(), emptyMap())

        private var lastPrefix: String = ""
        private var lastStart: Int = 0
        private var lastEnd: Int = 0

        fun applySnapshot(newSnapshot: Snapshot) {
            snapshot = newSnapshot
            lastPrefix = ""
            lastStart = 0
            lastEnd = newSnapshot.lowerSorted.size
        }

        fun buildSnapshot(words: Sequence<String>): Snapshot {
            val iterator = words.iterator()
            if (!iterator.hasNext()) return Snapshot(emptyArray(), emptyArray(), emptyMap())

            data class WordItem(val lower: String, val original: String)

            val items = ArrayList<WordItem>(8192)
            do {
                val word = iterator.next()
                val normalized = word.trim()
                if (normalized.isEmpty()) {
                    continue
                }

                val lower = normalized.lowercase()
                val firstNonLetterIndex = lower.indexOfFirst { !it.isLetter() }
                val usableLower = if (firstNonLetterIndex == -1) lower else lower.substring(
                    0,
                    firstNonLetterIndex
                )
                if (usableLower.isEmpty()) {
                    continue
                }

                items.add(WordItem(lower = usableLower, original = normalized))
            } while (iterator.hasNext())

            items.sortWith(compareBy<WordItem> { it.lower }.thenBy { it.original })
            val lowerSorted = Array(items.size) { idx -> items[idx].lower }
            val originalSorted = Array(items.size) { idx -> items[idx].original }

            val temp = HashMap<Char, MutableList<Int>>()
            for (i in lowerSorted.indices) {
                val w = lowerSorted[i]
                if (w.isEmpty()) continue
                val c = w[0]
                val list = temp.getOrPut(c) { mutableListOf() }
                list.add(i)
            }
            val indicesByFirstChar = temp.mapValues { (_, list) -> list.toIntArray() }

            return Snapshot(
                lowerSorted = lowerSorted,
                originalSorted = originalSorted,
                indicesByFirstChar = indicesByFirstChar,
            )
        }

        fun contains(wordLower: String): Boolean {
            if (wordLower.isEmpty()) return false
            val current = snapshot
            val lowers = current.lowerSorted
            if (lowers.isEmpty()) return false

            val idx = lowerBound(lowers, wordLower, 0, lowers.size)
            return idx in lowers.indices && lowers[idx] == wordLower
        }

        fun bestFuzzyMatch(wordLower: String, similarityThreshold: Double): String? {
            if (wordLower.isEmpty()) return null
            val current = snapshot
            val lowers = current.lowerSorted
            val originals = current.originalSorted
            if (lowers.isEmpty()) return null

            val first = wordLower[0]
            val indices = current.indicesByFirstChar[first] ?: return null
            val len = wordLower.length
            val minLen = (len - 2).coerceAtLeast(1)
            val maxLen = len + 2

            val maxDistance = ((1.0 - similarityThreshold) * maxLen).toInt()

            var bestIdx = -1
            var bestScore = similarityThreshold

            for (idx in indices) {
                val candidateLower = lowers[idx]
                val cl = candidateLower.length
                if (cl < minLen || cl > maxLen) continue

                val dist = levenshteinDistanceWithCutoff(wordLower, candidateLower, maxDistance)
                if (dist > maxDistance) continue

                val denom = maxOf(len, cl)
                val score = (denom - dist).toDouble() / denom.toDouble()
                if (score >= bestScore) {
                    bestScore = score
                    bestIdx = idx
                    if (score >= 0.95) break
                }
            }

            return if (bestIdx >= 0) originals[bestIdx] else null
        }

        private fun levenshteinDistanceWithCutoff(a: String, b: String, maxDistance: Int): Int {
            val la = a.length
            val lb = b.length

            val lengthDiff = abs(la - lb)
            if (lengthDiff > maxDistance) return maxDistance + 1

            if (la == 0) return lb
            if (lb == 0) return la

            val needed = lb + 1
            val buffers = levBuffersThreadLocal.get()
            if (buffers.prev.size < needed) {

                buffers.prev = IntArray(needed)
                buffers.curr = IntArray(needed)
            }

            var prev = buffers.prev
            var curr = buffers.curr

            for (j in 0..lb) {
                prev[j] = j
            }

            for (i in 1..la) {
                curr[0] = i
                var rowMin = curr[0]
                val ca = a[i - 1]

                for (j in 1..lb) {
                    val cb = b[j - 1]
                    val cost = if (ca == cb) 0 else 1

                    val deletion = prev[j] + 1
                    val insertion = curr[j - 1] + 1
                    val substitution = prev[j - 1] + cost
                    val value = minOf(deletion, insertion, substitution)

                    curr[j] = value
                    if (value < rowMin) rowMin = value
                }

                if (rowMin > maxDistance) return maxDistance + 1

                val tmp = prev
                prev = curr
                curr = tmp
            }

            return prev[lb]
        }

        fun suggest(prefixLower: String): List<String> {
            if (prefixLower.isEmpty()) {
                lastPrefix = ""
                return emptyList()
            }

            val current = snapshot
            val lowers = current.lowerSorted
            val originals = current.originalSorted
            if (lowers.isEmpty()) return emptyList()

            val searchPrefix = prefixLower.lowercase()
            val rangeStart: Int
            val rangeEnd: Int

            if (lastPrefix.isNotEmpty() && searchPrefix.startsWith(lastPrefix) && lastStart <= lastEnd) {
                rangeStart = lowerBound(lowers, searchPrefix, lastStart, lastEnd)
                rangeEnd = upperBoundByPrefix(lowers, searchPrefix, rangeStart, lastEnd)
            } else {
                rangeStart = lowerBound(lowers, searchPrefix, 0, lowers.size)
                rangeEnd = upperBoundByPrefix(lowers, searchPrefix, rangeStart, lowers.size)
            }

            lastPrefix = searchPrefix
            lastStart = rangeStart
            lastEnd = rangeEnd

            if (rangeStart >= rangeEnd) return emptyList()

            val out = ArrayList<String>(maxSuggestions)
            var i = rangeStart
            while (i < rangeEnd && out.size < maxSuggestions) {
                out.add(originals[i])
                i++
            }
            return out
        }

        private fun lowerBound(arr: Array<String>, target: String, from: Int, to: Int): Int {
            var low = from
            var high = to
            while (low < high) {
                val mid = (low + high) ushr 1
                if (arr[mid] < target) {
                    low = mid + 1
                } else {
                    high = mid
                }
            }
            return low
        }

        private fun upperBoundByPrefix(
            arr: Array<String>,
            prefix: String,
            from: Int,
            to: Int
        ): Int {
            val upperKey = prefix + "\uffff"
            return lowerBound(arr, upperKey, from, to)
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
                     edgeRepeatHandler.postDelayed(this, 150)
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
                
                    v.isPressed = true
                    uiHandler.postDelayed(longPressRunnable, longPressDelayMs)
                    return true
                }
                MotionEvent.ACTION_MOVE -> {
                    if (isLongPressTriggered) return true
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
                        val isShiftPressed = capsButtonRef?.isPressed == true
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
                        val edgeThreshold = px36.toFloat()
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
                    v.isPressed = false
                
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
                    v.isPressed = true
                    uiHandler.postDelayed(longPressRunnable, longPressDelayMs)
                    return true
                }
                MotionEvent.ACTION_MOVE -> {
                    if (isLongPressTriggered) return true
                    if (isSwipeTriggered) return true
                    
                    val totalDx = event.x - startX
                    val totalDy = event.y - startY
                    
                    if (totalDx < -backspaceSwipeThresholdPx && abs(totalDx) > abs(totalDy)) {
                        isSwipeTriggered = true
                        uiHandler.removeCallbacks(longPressRunnable)
                        deleteWordFromInputConnection()
                        v.performHapticFeedback(HapticFeedbackConstants.KEYBOARD_TAP)
                        
                        uiHandler.postDelayed(swipeRepeatRunnable, longPressDelayMs)
                        return true
                    }
                    
                    if (abs(totalDx) > px10 || abs(totalDy) > px10) {
                         uiHandler.removeCallbacks(longPressRunnable)
                    }
                    return true
                }
                MotionEvent.ACTION_UP, MotionEvent.ACTION_CANCEL -> {
                    uiHandler.removeCallbacks(longPressRunnable)
                    uiHandler.removeCallbacks(swipeRepeatRunnable)
                    v.isPressed = false
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
                    v.isPressed = true
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
                    v.isPressed = false
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
        
        private val longPressRunnable = Runnable {
            isLongPressTriggered = true
            dismissKeyPreview()
            currentView?.performHapticFeedback(HapticFeedbackConstants.LONG_PRESS)
            
            val hints = topRowMap[lower]
            if (hints != null && hints.isNotEmpty()) {
                isAccentSelectionMode = true
                showAccentPopup(currentView!!, hints)
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
                    v.isPressed = true
                    
                    if (label.length == 1 && !isSwipeTriggered) {
                        showKeyPreview(v, label)
                    }
                    
                    uiHandler.postDelayed(longPressRunnable, longPressDelayMs)
                    return true
                }
                MotionEvent.ACTION_MOVE -> {
                    if (isAccentSelectionMode) {
                        handleAccentSelection(event)
                        return true
                    }
                    if (isLongPressTriggered) return true
                    
                    val totalDx = event.x - startX
                    val totalDy = event.y - startY

                    if (!isSwipeTriggered && totalDy < -px10 * 2) {
                        val hints = topRowMap[lower]
                        if (hints != null && hints.isNotEmpty()) {
                            var selectedIndex = 0
                            if (hints.size > 1) {
                                if (totalDx < -px10 * 2) {
                                    selectedIndex = 1
                                } else if (totalDx > px10 * 2) {
                                    selectedIndex = if (hints.size > 2) 2 else 0
                                }
                            }
                            
                            if (selectedIndex in hints.indices) {
                                val charToCommit = hints[selectedIndex]
                                showKeyPreview(v, charToCommit)
                                isSwipeTriggered = true
                                uiHandler.removeCallbacks(longPressRunnable)
                                commitKeyWithCaps(charToCommit)
                                v.isPressed = false
                                v.performHapticFeedback(HapticFeedbackConstants.KEYBOARD_TAP)
                                return true
                            }
                        }
                    }
                    
                    if (!isSwipeTriggered && (abs(totalDx) > px10 || abs(totalDy) > px10)) {
                        uiHandler.removeCallbacks(longPressRunnable)
                        dismissKeyPreview()
                    }
                    return true
                }
                MotionEvent.ACTION_UP, MotionEvent.ACTION_CANCEL -> {
                    uiHandler.removeCallbacks(longPressRunnable)
                    v.isPressed = false
                    dismissKeyPreview()
                    
                    if (isAccentSelectionMode) {
                        commitAccentSelection()
                        dismissAccentPopup()
                        isAccentSelectionMode = false
                        return true
                    }
                    
                    if (isLongPressTriggered) return true
                    if (isSwipeTriggered) return true
                    
                    val totalDx = event.x - startX
                    val totalDy = event.y - startY
                    if (abs(totalDx) > px10 || abs(totalDy) > px10) {
                        return true
                    }

                    v.performClick()
                    return true
                }
            }
            return false
        }
    }

    companion object {
        private val topRowMap = mapOf(
            "q" to listOf("1"), "w" to listOf("2"), "e" to listOf("3", "é", "è", "ë", "ê"), "r" to listOf("4"), "t" to listOf("5"),
            "y" to listOf("6", "ý", "ÿ"), "u" to listOf("7", "ú", "ù", "ü", "û"), "i" to listOf("8", "í", "ì", "ï", "î"), "o" to listOf("9", "ó", "ò", "ö", "ô", "õ", "ø"), "p" to listOf("0"), 
            "a" to listOf("@", "!", "á", "à", "ä", "â", "ã", "å"), "s" to listOf("#", "ß"), "d" to listOf("$"),
            "f" to listOf("&"), "g" to listOf("*"), "h" to listOf("-"), "j" to listOf("+"), "k" to listOf("="), "l" to listOf("_"), 
            "z" to listOf("~", "ž", "ź", "ż"), "x" to listOf("`"),
            "c" to listOf("^", "ç"), "v" to listOf("%"), "b" to listOf("€"), "n" to listOf("£", "ñ"), "m" to listOf("¥"),
        )
        private val uiHandler = Handler(Looper.getMainLooper())
        private val instanceRef: AtomicReference<WeakReference<CustomKeyboard>?> =
            AtomicReference(null)
        private const val BACKSPACE_INITIAL_INTERVAL_MS = 260L
        private const val BACKSPACE_MIN_INTERVAL_MS = 70L
        private const val BACKSPACE_ACCELERATION_STEP_MS = 30L
        private const val BACKSPACE_MULTI_TAP_WINDOW_MS = 450L
        private const val DOUBLE_TAP_THRESHOLD_MS = 350L
        private const val MAX_SUGGESTIONS = 3
        private const val SUGGESTIONS_BAR_HEIGHT_DP = 56
        private const val CLIPBOARD_BAR_HEIGHT_DP = 56
        private const val SELECTION_ACTIONS_BAR_HEIGHT_DP = 56
        private const val PREFS_NAME = "custom_keyboard_prefs"
        private const val PREF_KEY_AUTOCOMPLETE_MODE = "autocomplete_mode"
        private const val PREF_KEY_LAYOUT_STYLE = "layout_style"
        private const val PREF_KEY_THEME_MODE = "theme_mode"
        private const val PREF_KEY_BACKGROUND_MODE = "background_mode"
        private const val PREF_KEY_KEYBOARD_HEIGHT_FACTOR = "keyboard_height_factor"
        private const val PREF_KEY_KEY_GAP = "key_gap"
        private const val PREF_KEY_CORNER_RADIUS = "corner_radius"
        private const val PREF_KEY_CUSTOM_THEME_ENABLED = "custom_theme_enabled"
        private const val PREF_KEY_CUSTOM_BG_COLOR = "custom_bg_color"
        private const val PREF_KEY_CUSTOM_KEY_COLOR = "custom_key_color"
        private const val PREF_KEY_CUSTOM_ACCENT_COLOR = "custom_accent_color"
        private const val PREF_KEY_VIBRATION_DURATION = "vibration_duration"
        private const val PREF_KEY_LONG_PRESS_DELAY = "long_press_delay"
        private const val PREF_KEY_SWIPE_THRESHOLD = "swipe_threshold"
        private const val PREF_KEY_SWIPE_H_STEP = "swipe_h_step"
        private const val PREF_KEY_SWIPE_V_STEP = "swipe_v_step"
        private const val PREF_KEY_BACKSPACE_SWIPE_THRESHOLD = "backspace_swipe_threshold"
        private const val PREF_KEY_BACKSPACE_INITIAL_INTERVAL = "backspace_initial_interval"
        private const val PREF_KEY_BACKSPACE_ACCELERATION = "backspace_acceleration"
        private const val PREF_KEY_BACKSPACE_MIN_INTERVAL = "backspace_min_interval"
        private const val PREF_KEY_USER_DICTIONARY = "user_dictionary"
        private const val AUTOCOMPLETE_FILE_EN = "autocomplete_en.txt"
        private const val AUTOCOMPLETE_FILE_ES = "autocomplete_es.txt"
        private var currentMode = InputMode.LETTERS
        private var lettersLayoutBackup: List<List<String>> = emptyList()
        private var clipboardItems: List<String> = emptyList()
        private var lastClipboardModuleSignature: String = ""
        private val defaultLayout =
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
            instanceRef.get()?.get()?.setInputMode(InputMode.SYMBOLS)
        }

        private fun switchToSpecial() {
            currentMode = InputMode.SPECIAL
            setKeyboardLayoutInternal(specialLayout)
            instanceRef.get()?.get()?.setInputMode(InputMode.SPECIAL)
        }

        private fun switchToLetters() {
            currentMode = InputMode.LETTERS
            setKeyboardLayoutInternal(lettersLayoutBackup.ifEmpty { defaultLayout })
            instanceRef.get()?.get()?.setInputMode(InputMode.LETTERS)
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
            service.refreshClipboardSource()
        }
    }
}
