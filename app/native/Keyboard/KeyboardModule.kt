package {{packageName}}

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.ReadableType

class KeyboardModule(
    private val reactContext: ReactApplicationContext,
) : ReactContextBaseJavaModule(reactContext) {
    override fun getName(): String = "KeyboardModule"

    @ReactMethod
    fun sendKey(
        key: String,
        promise: Promise,
    ) {
        KeyboardCommandRepository.sendCommand(KeyboardCommandRepository.Command.CommitText(key))
        promise.resolve("Key sent: $key")
    }

    @ReactMethod
    fun backspace(promise: Promise) {
        KeyboardCommandRepository.sendCommand(KeyboardCommandRepository.Command.Delete)
        promise.resolve(true)
    }

    @ReactMethod
    fun enter(promise: Promise) {
        KeyboardCommandRepository.sendCommand(KeyboardCommandRepository.Command.Enter)
        promise.resolve(true)
    }

    @ReactMethod
    fun setLayout(
        layout: ReadableArray,
        promise: Promise,
    ) {
        try {
            val parsedLayout = parseLayout(layout)
            KeyboardCommandRepository.sendCommand(KeyboardCommandRepository.Command.SetLayout(parsedLayout))
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERROR_SET_LAYOUT", e)
        }
    }

    @ReactMethod
    fun resetLayout(promise: Promise) {
        KeyboardCommandRepository.sendCommand(KeyboardCommandRepository.Command.ResetLayout)
        promise.resolve(true)
    }

    @ReactMethod
    fun setClipboardSuggestions(
        list: ReadableArray,
        promise: Promise,
    ) {
        try {
            val items = mutableListOf<String>()
            for (i in 0 until list.size()) {
                if (list.getType(i) == ReadableType.String) {
                    list.getString(i)?.let { items.add(it) }
                }
            }
            CustomKeyboard.setClipboardSuggestionsFromModule(items)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERROR_CLIPBOARD_SUGGESTIONS", e)
        }
    }

    private fun parseLayout(layout: ReadableArray): List<List<String>> {
        val rows = mutableListOf<List<String>>()
        for (i in 0 until layout.size()) {
            val row = layout.getArray(i) ?: continue
            val keys = mutableListOf<String>()
            for (j in 0 until row.size()) {
                if (row.getType(j) == ReadableType.String) {
                    row.getString(j)?.let { keys.add(it) }
                }
            }
            if (keys.isNotEmpty()) {
                rows.add(keys)
            }
        }
        return rows
    }
}
