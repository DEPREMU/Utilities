package com.package.name

import android.os.Handler
import android.os.Looper
import android.os.SystemClock
import android.view.KeyEvent
import android.view.inputmethod.InputConnection
import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch

class InputProcessor(private val service: CustomKeyboard) {

    @Volatile var lastAutoCorrectOriginal: String? = null
    @Volatile var lastAutoCorrectReplacement: String? = null
    @Volatile var ignoreAutoCorrectWord: String? = null

    private var lastSpaceTapTimeMs: Long = 0L

    private val logicHandler = InputLogicHandler(
        connectionProvider = { service.currentInputConnection },
        defaultDispatcher = Dispatchers.Default.limitedParallelism(1),
    )

    fun commitText(text: String) {
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

            val replacement = lastAutoCorrectReplacement
            val original = lastAutoCorrectOriginal
            if (!replacement.isNullOrEmpty() && !original.isNullOrEmpty()) {
                val replacementWithSpace = "$replacement "
                val before = ic.getTextBeforeCursor(replacementWithSpace.length, 0)?.toString().orEmpty()
                if (before == replacementWithSpace) {
                    ic.deleteSurroundingText(replacementWithSpace.length, 0)
                    ic.commitText(original, 1)
                    ignoreAutoCorrectWord = original.lowercase()
                    lastAutoCorrectOriginal = null
                    lastAutoCorrectReplacement = null
                    return@enqueue
                }
            }

            ic.deleteSurroundingText(1, 0)
        }
    }

    fun handleDeleteWord() {
        logicHandler.enqueue(beginBatch = true, notifyMain = ::onTextCommitted) { ic ->
            val selectedText = ic.getSelectedText(0)
            if (!selectedText.isNullOrEmpty()) {
                ic.commitText("", 1)
                return@enqueue
            }

            val beforeCursor = ic.getTextBeforeCursor(120, 0)?.toString().orEmpty()
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
        val now = SystemClock.elapsedRealtime()
        val delta = now - lastSpaceTapTimeMs
        lastSpaceTapTimeMs = now
        if (delta > 800) return false

        val inputConnection = service.currentInputConnection ?: return false
        val before = inputConnection.getTextBeforeCursor(6, 0)?.toString().orEmpty()

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
        if (raw.length != 1) return
        val ch = raw[0]
        if (!isPunctuation(ch)) return

        val inputConnection = service.currentInputConnection ?: return
        logicHandler.enqueue(connectionOverride = inputConnection) { ic ->
            val after = ic.getTextAfterCursor(1, 0)?.toString().orEmpty()
            if (after.isNotEmpty() && after[0].isWhitespace()) return@enqueue
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
            ic.commitText(text + " ", 1)
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

    private fun isPunctuation(ch: Char): Boolean {
        return ch == '.' || ch == ',' || ch == ':' || ch == ';' || ch == '?' || ch == '!' || ch == ')'
    }

    fun resetLastSpaceTap() {
        lastSpaceTapTimeMs = 0L
    }
}

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
        scope.launch {
            val ic = connectionOverride ?: connectionProvider() ?: return@launch
            var began = false
            if (beginBatch) {
                began = ic.safeBeginBatch()
            }
            try {
                block(ic)
            } catch (_: Throwable) {
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
}
