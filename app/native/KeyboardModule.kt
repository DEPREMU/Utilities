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
        try {
            val success = CustomKeyboard.sendKeyFromModule(key)
            if (!success) {
                promise.reject("NO_IME", "Input method is not active")
                return
            }
            promise.resolve("Key sent: $key")
        } catch (e: Exception) {
            promise.reject("ERROR", e)
        }
    }

    @ReactMethod
    fun backspace(promise: Promise) {
        try {
            val success = CustomKeyboard.backspaceFromModule()
            if (!success) {
                promise.reject("NO_IME", "Input method is not active")
                return
            }
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERROR", e)
        }
    }

    @ReactMethod
    fun enter(promise: Promise) {
        try {
            val success = CustomKeyboard.enterFromModule()
            if (!success) {
                promise.reject("NO_IME", "Input method is not active")
                return
            }
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERROR", e)
        }
    }

    @ReactMethod
    fun setLayout(
        layout: ReadableArray,
        promise: Promise,
    ) {
        try {
            val parsedLayout = parseLayout(layout)
            CustomKeyboard.setKeyboardLayout(parsedLayout)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERROR_SET_LAYOUT", e)
        }
    }

    @ReactMethod
    fun resetLayout(promise: Promise) {
        try {
            CustomKeyboard.resetKeyboardLayout()
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERROR_RESET_LAYOUT", e)
        }
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
