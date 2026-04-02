package com.package.name

import android.os.Handler
import android.os.Looper
import android.os.SystemClock
import android.view.KeyEvent
import android.view.inputmethod.InputConnection
import com.package.name.Logger as Log
import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch

class InputProcessor(private val service: CustomKeyboard) {
    private val autoCorrectionLock = Any()

    private data class AutoCorrectionSnapshot(
        val original: String?,
        val replacement: String?,
        val ignoreWord: String?,
        val appliedAtMs: Long,
        val replacementLength: Int,
        val hasTrailingSpace: Boolean,
    )

    private var lastAutoCorrectOriginalValue: String? = null
    private var lastAutoCorrectReplacementValue: String? = null
    private var ignoreAutoCorrectWordValue: String? = null

    var lastAutoCorrectOriginal: String?
        get() = synchronized(autoCorrectionLock) { lastAutoCorrectOriginalValue }
        set(value) {
            synchronized(autoCorrectionLock) {
                lastAutoCorrectOriginalValue = value
            }
        }

    var lastAutoCorrectReplacement: String?
        get() = synchronized(autoCorrectionLock) { lastAutoCorrectReplacementValue }
        set(value) {
            synchronized(autoCorrectionLock) {
                lastAutoCorrectReplacementValue = value
            }
        }

    var ignoreAutoCorrectWord: String?
        get() = synchronized(autoCorrectionLock) { ignoreAutoCorrectWordValue }
        set(value) {
            synchronized(autoCorrectionLock) {
                ignoreAutoCorrectWordValue = value
            }
        }

    private var lastSpaceTapTimeMs: Long = 0L
    private var doubleSpaceWindowMs: Long = 800L
    private var doubleSpaceLookbackChars: Int = 6
    private var deleteWordLookbackChars: Int = 120
    private var autoPunctuationChars: String = ".,;:?! )"
    private var pasteAddsTrailingSpace: Boolean = true
    private var doubleSpaceEnabled: Boolean = true
    private var autoSpaceEnabled: Boolean = true
    private var deleteWordEnabled: Boolean = true

    private var lastAutoCorrectAppliedAtMs: Long = 0L
    private var lastAutoCorrectReplacementLength: Int = 0
    private var lastAutoCorrectHasTrailingSpace: Boolean = false
    private var autoCorrectRevertWindowMs: Long = 2500L

    private val logicHandler = InputLogicHandler(
        connectionProvider = { service.currentInputConnection },
        defaultDispatcher = Dispatchers.Main.immediate,
    )

    fun commitText(text: String) {
        if (text.isNotEmpty() && text.any { !it.isWhitespace() }) {
            clearAutoCorrectionState()
        }
        logicHandler.enqueue(notifyMain = ::onTextCommitted) { ic ->
            ic.commitText(text, 1)
        }
    }

    fun handleBackspace() {
        logicHandler.enqueue(beginBatch = true, notifyMain = ::onTextCommitted) { ic ->
            val selectedText = ic.getSelectedText(0)
            if (!selectedText.isNullOrEmpty()) {
                ic.commitText("", 1)
                return@enqueue
            }

            val autoCorrectState = snapshotAutoCorrectionState()
            val replacement = autoCorrectState.replacement
            val original = autoCorrectState.original
            if (!replacement.isNullOrEmpty() && !original.isNullOrEmpty() && isWithinAutoCorrectWindow(autoCorrectState.appliedAtMs)) {
                val extra = if (autoCorrectState.hasTrailingSpace) 1 else 0
                val before = ic.getTextBeforeCursor(replacement.length + extra, 0)?.toString().orEmpty()
                val after = ic.getTextAfterCursor(1, 0)?.toString().orEmpty()
                val endsWithReplacement = before.endsWith(replacement)
                val endsWithReplacementSpace = autoCorrectState.hasTrailingSpace && before.endsWith("$replacement ")
                val hasSpaceAfter = after.startsWith(" ")
                if (endsWithReplacementSpace || (endsWithReplacement && (hasSpaceAfter || before.length == replacement.length))) {
                    val deleteCount = if (endsWithReplacementSpace) replacement.length + 1 else replacement.length
                    ic.deleteSurroundingText(deleteCount, 0)
                    ic.commitText(original, 1)
                    ignoreAutoCorrectWord = original.lowercase()
                    clearAutoCorrectionState()
                    return@enqueue
                }
            }

            ic.deleteSurroundingText(1, 0)
        }
    }

    fun handleDeleteWord() {
        if (!deleteWordEnabled) return
        logicHandler.enqueue(beginBatch = true, notifyMain = ::onTextCommitted) { ic ->
            val selectedText = ic.getSelectedText(0)
            if (!selectedText.isNullOrEmpty()) {
                ic.commitText("", 1)
                return@enqueue
            }

            val beforeCursor = ic.getTextBeforeCursor(deleteWordLookbackChars, 0)?.toString().orEmpty()
            if (beforeCursor.isEmpty()) return@enqueue

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
                ic.deleteSurroundingText(toDelete, 0)
            }
        }
    }

    fun handleDoubleSpace(): Boolean {
        if (!doubleSpaceEnabled) return false
        val now = SystemClock.elapsedRealtime()
        val delta = now - lastSpaceTapTimeMs
        lastSpaceTapTimeMs = now
        if (delta > doubleSpaceWindowMs) return false

        val inputConnection = service.currentInputConnection ?: return false
        val before = inputConnection.getTextBeforeCursor(doubleSpaceLookbackChars, 0)?.toString().orEmpty()

        if (before.length >= 2 && before.last() == ' ' && !before[before.length - 2].isWhitespace()) {
            logicHandler.enqueue(connectionOverride = inputConnection, beginBatch = true, notifyMain = ::onTextCommitted) { ic ->
                ic.deleteSurroundingText(1, 0)
                ic.commitText(". ", 1)
            }
            return true
        }

        return false
    }

    fun maybeInsertAutoSpace(raw: String) {
        if (!autoSpaceEnabled) return
        if (raw.length != 1) return
        val ch = raw[0]
        if (!isPunctuation(ch)) return

        val inputConnection = service.currentInputConnection ?: return
        logicHandler.enqueue(connectionOverride = inputConnection) { ic ->
            val after = ic.getTextAfterCursor(1, 0)?.toString().orEmpty()
            if (after.isNotEmpty() && after[0].isWhitespace()) return@enqueue
            val before = ic.getTextBeforeCursor(1, 0)?.toString().orEmpty()
            if (before.isNotEmpty() && before[0].isWhitespace()) return@enqueue
            ic.commitText(" ", 1)
        }
    }

    fun removeTrailingSpaceBeforePunctuation() {
        val inputConnection = service.currentInputConnection ?: return
        logicHandler.enqueue(connectionOverride = inputConnection) { ic ->
            val before = ic.getTextBeforeCursor(1, 0)?.toString()
            if (before == " ") {
                ic.deleteSurroundingText(1, 0)
            }
        }
    }

    fun sendEnter() {
        logicHandler.enqueue(notifyMain = ::onTextCommitted) { ic ->
            ic.sendKeyEvent(KeyEvent(KeyEvent.ACTION_DOWN, KeyEvent.KEYCODE_ENTER))
            ic.sendKeyEvent(KeyEvent(KeyEvent.ACTION_UP, KeyEvent.KEYCODE_ENTER))
        }
    }

    fun pasteText(text: String) {
        val inputConnection = service.currentInputConnection ?: return
        logicHandler.enqueue(connectionOverride = inputConnection, beginBatch = true, notifyMain = ::onTextCommitted) { ic ->
            val suffix = if (pasteAddsTrailingSpace) " " else ""
            ic.commitText(text + suffix, 1)
        }
    }

    fun cutSelection() {
        logicHandler.enqueue(notifyMain = ::onTextCommitted) { ic ->
            ic.commitText("", 1)
        }
    }

    fun clearSelection() {
        logicHandler.enqueue { ic ->
            ic.setSelection(Int.MAX_VALUE, Int.MAX_VALUE)
        }
    }

    fun getSelectedText(): CharSequence? {
        return service.currentInputConnection?.getSelectedText(0)
    }

    fun getTextBeforeCursor(n: Int, flags: Int): CharSequence? {
        return service.currentInputConnection?.getTextBeforeCursor(n, flags)
    }

    fun runBatchEdit(
        inputConnection: InputConnection?,
        notifyOnComplete: Boolean = true,
        block: (InputConnection) -> Unit,
    ) {
        val ic = inputConnection ?: return
        logicHandler.enqueue(
            connectionOverride = ic,
            beginBatch = true,
            notifyMain = if (notifyOnComplete) ::onTextCommitted else null,
            block = block,
        )
    }

    private fun onTextCommitted() {
        service.onTextCommitted()
    }

    fun recordAutoCorrection(
        original: String,
        replacement: String,
        hasTrailingSpace: Boolean,
    ) {
        synchronized(autoCorrectionLock) {
            lastAutoCorrectOriginalValue = original
            lastAutoCorrectReplacementValue = replacement
            lastAutoCorrectReplacementLength = replacement.length
            lastAutoCorrectHasTrailingSpace = hasTrailingSpace
            lastAutoCorrectAppliedAtMs = SystemClock.elapsedRealtime()
        }
    }

    fun clearAutoCorrectionState() {
        synchronized(autoCorrectionLock) {
            lastAutoCorrectOriginalValue = null
            lastAutoCorrectReplacementValue = null
            lastAutoCorrectReplacementLength = 0
            lastAutoCorrectHasTrailingSpace = false
            lastAutoCorrectAppliedAtMs = 0L
        }
    }

    fun shouldApplyAutoCorrection(original: String, replacement: String): Boolean {
        if (original.length < 3) return false
        if (original.equals(replacement, ignoreCase = true)) return false
        if (original.any { it.isDigit() }) return false
        val hasInternalUppercase = original.drop(1).any { it.isUpperCase() }
        if (hasInternalUppercase) return false
        return true
    }

    private fun isPunctuation(ch: Char): Boolean {
        return autoPunctuationChars.contains(ch)
    }

    private fun snapshotAutoCorrectionState(): AutoCorrectionSnapshot {
        return synchronized(autoCorrectionLock) {
            AutoCorrectionSnapshot(
                original = lastAutoCorrectOriginalValue,
                replacement = lastAutoCorrectReplacementValue,
                ignoreWord = ignoreAutoCorrectWordValue,
                appliedAtMs = lastAutoCorrectAppliedAtMs,
                replacementLength = lastAutoCorrectReplacementLength,
                hasTrailingSpace = lastAutoCorrectHasTrailingSpace,
            )
        }
    }

    private fun isWithinAutoCorrectWindow(appliedAtMs: Long): Boolean {
        if (appliedAtMs <= 0L) return false
        val now = SystemClock.elapsedRealtime()
        return now - appliedAtMs <= autoCorrectRevertWindowMs
    }

    fun resetLastSpaceTap() {
        lastSpaceTapTimeMs = 0L
    }

    fun updateConfig(config: InputBehaviorConfig) {
        doubleSpaceWindowMs = config.doubleSpaceWindowMs
        doubleSpaceLookbackChars = config.doubleSpaceLookbackChars
        deleteWordLookbackChars = config.deleteWordLookbackChars
        autoPunctuationChars = config.autoPunctuationChars
        pasteAddsTrailingSpace = config.pasteAddsTrailingSpace
        doubleSpaceEnabled = config.doubleSpaceEnabled
        autoSpaceEnabled = config.autoSpaceEnabled
        deleteWordEnabled = config.deleteWordEnabled
    }

    fun destroy() {
        logicHandler.cancel()
    }
}

data class InputBehaviorConfig(
    val doubleSpaceWindowMs: Long,
    val doubleSpaceLookbackChars: Int,
    val deleteWordLookbackChars: Int,
    val autoPunctuationChars: String,
    val pasteAddsTrailingSpace: Boolean,
    val doubleSpaceEnabled: Boolean,
    val autoSpaceEnabled: Boolean,
    val deleteWordEnabled: Boolean,
)

private class InputLogicHandler(
    private val connectionProvider: () -> InputConnection?,
    defaultDispatcher: CoroutineDispatcher,
) {
    private val job = SupervisorJob()
    private val scope = CoroutineScope(job + defaultDispatcher)
    private val mainHandler = Handler(Looper.getMainLooper())

    fun enqueue(
        connectionOverride: InputConnection? = null,
        beginBatch: Boolean = false,
        notifyMain: (() -> Unit)? = null,
        block: (InputConnection) -> Unit,
    ) {
        if (Looper.myLooper() == Looper.getMainLooper()) {
            val ic = connectionOverride ?: connectionProvider() ?: return
            var began = false
            if (beginBatch) {
                began = ic.safeBeginBatch()
            }
            try {
                block(ic)
            } catch (cancelError: CancellationException) {
                throw cancelError
            } catch (error: Exception) {
                Log.e("InputLogicHandler", "Failed to execute input operation on main thread", error)
            } finally {
                if (began) {
                    ic.safeEndBatch()
                }
                notifyMain?.invoke()
            }
            return
        }

        scope.launch {
            val ic = connectionOverride ?: connectionProvider() ?: return@launch
            var began = false
            if (beginBatch) {
                began = ic.safeBeginBatch()
            }
            try {
                block(ic)
            } catch (cancelError: CancellationException) {
                throw cancelError
            } catch (error: Exception) {
                Log.e("InputLogicHandler", "Failed to execute input operation in coroutine", error)
            } finally {
                if (began) {
                    ic.safeEndBatch()
                }
                notifyMain?.let { mainHandler.post(it) }
            }
        }
    }

    private fun InputConnection.safeBeginBatch(): Boolean {
        return runCatching { beginBatchEdit(); true }.getOrDefault(false)
    }

    private fun InputConnection.safeEndBatch() {
        runCatching { endBatchEdit() }
    }

    fun cancel() {
        job.cancel()
    }
}
