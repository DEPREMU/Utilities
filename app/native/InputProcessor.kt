package {{packageName}}

import android.os.SystemClock
import android.view.KeyEvent
import android.view.inputmethod.InputConnection

class InputProcessor(private val service: CustomKeyboard) {

    var lastAutoCorrectOriginal: String? = null
    var lastAutoCorrectReplacement: String? = null
    var ignoreAutoCorrectWord: String? = null

    private var lastSpaceTapTimeMs: Long = 0L

    private val currentInputConnection: InputConnection?
        get() = service.currentInputConnection

    fun commitText(text: String) {
        currentInputConnection?.commitText(text, 1)
        onTextCommitted()
    }

    fun handleBackspace() {
        val inputConnection = currentInputConnection ?: return
        val selectedText = inputConnection.getSelectedText(0)

        if (!selectedText.isNullOrEmpty()) {
            inputConnection.commitText("", 1)
            onTextCommitted()
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

                ignoreAutoCorrectWord = original?.lowercase()
                lastAutoCorrectOriginal = null
                lastAutoCorrectReplacement = null

                onTextCommitted()
                return
            }
        }

        inputConnection.deleteSurroundingText(1, 0)
        onTextCommitted()
    }

    fun handleDeleteWord() {
        val inputConnection = currentInputConnection ?: return
        val selectedText = inputConnection.getSelectedText(0)

        if (!selectedText.isNullOrEmpty()) {
            inputConnection.commitText("", 1)
            onTextCommitted()
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
            onTextCommitted()
        }
    }

    fun handleDoubleSpace(): Boolean {
        val now = SystemClock.elapsedRealtime()
        val delta = now - lastSpaceTapTimeMs
        lastSpaceTapTimeMs = now

        if (delta > 800) return false

        val inputConnection = currentInputConnection ?: return false
        val before = inputConnection.getTextBeforeCursor(6, 0) ?: ""

        if (before.length >= 2 && before.last() == ' ' && !before[before.length - 2].isWhitespace()) {
            inputConnection.deleteSurroundingText(1, 0)
            inputConnection.commitText(". ", 1)
            onTextCommitted()
            return true
        }

        return false
    }

    fun maybeInsertAutoSpace(raw: String) {
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

    fun removeTrailingSpaceBeforePunctuation() {
        val inputConnection = currentInputConnection ?: return
        val before = inputConnection.getTextBeforeCursor(1, 0)
        if (before != null && before.toString() == " ") {
            inputConnection.deleteSurroundingText(1, 0)
        }
    }

    fun sendEnter() {
        val inputConnection = currentInputConnection ?: return
        inputConnection.sendKeyEvent(KeyEvent(KeyEvent.ACTION_DOWN, KeyEvent.KEYCODE_ENTER))
        inputConnection.sendKeyEvent(KeyEvent(KeyEvent.ACTION_UP, KeyEvent.KEYCODE_ENTER))
    }

    fun pasteText(text: String) {
        val inputConnection = currentInputConnection ?: return
        runBatchEdit(inputConnection) { ic ->
            ic.commitText(text + " ", 1)
        }
        onTextCommitted()
    }

    fun cutSelection() {
        currentInputConnection?.commitText("", 1)
        onTextCommitted()
    }

    fun clearSelection() {
        currentInputConnection?.setSelection(Int.MAX_VALUE, Int.MAX_VALUE)
    }

    fun getSelectedText(): CharSequence? {
        return currentInputConnection?.getSelectedText(0)
    }

    fun getTextBeforeCursor(n: Int, flags: Int): CharSequence? {
        return currentInputConnection?.getTextBeforeCursor(n, flags)
    }

    fun runBatchEdit(
        inputConnection: InputConnection?,
        block: (InputConnection) -> Unit,
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
