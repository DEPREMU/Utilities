package com.package.name

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.ReadableType

class KeyboardModule(
    reactContext: ReactApplicationContext,
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
            val items = mutableListOf<ClipboardRepository.ClipboardEntry>()
            for (i in 0 until list.size()) {
                when (list.getType(i)) {
                    ReadableType.String -> {
                        list.getString(i)?.let { content ->
                            val trimmed = content.trim()
                            if (trimmed.isNotEmpty()) {
                                items.add(ClipboardRepository.ClipboardEntry(id = null, content = trimmed))
                            }
                        }
                    }
                    ReadableType.Map -> {
                        val item = list.getMap(i)
                        parseClipboardItem(item)?.let { items.add(it) }
                    }
                    else -> Unit
                }
            }
            CustomKeyboard.setClipboardSuggestionsFromModule(items)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERROR_CLIPBOARD_SUGGESTIONS", e)
        }
    }

    private fun parseClipboardItem(item: ReadableMap?): ClipboardRepository.ClipboardEntry? {
        if (item == null) return null

        val contentRaw =
            when {
                item.hasKey("content") && item.getType("content") == ReadableType.String -> item.getString("content")
                item.hasKey("text") && item.getType("text") == ReadableType.String -> item.getString("text")
                else -> null
            }

        val content = contentRaw?.trim()?.takeIf { it.isNotEmpty() } ?: return null

        val id =
            if (item.hasKey("id") && item.getType("id") == ReadableType.String) {
                item.getString("id")?.trim()?.takeIf { it.isNotEmpty() }
            } else {
                null
            }

        return ClipboardRepository.ClipboardEntry(id = id, content = content)
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
