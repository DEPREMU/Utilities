package com.package.name

import android.content.ClipboardManager
import android.content.Context
import com.package.name.Logger as Log

class ClipboardMonitor(context: Context) {
    private val clipboardManager = context.getSystemService(Context.CLIPBOARD_SERVICE) as? ClipboardManager
    @Volatile
    private var enabled = false
    @Volatile
    private var onClipboardText: ((String) -> Unit)? = null

    private val listener = ClipboardManager.OnPrimaryClipChangedListener {
        if (!enabled) return@OnPrimaryClipChangedListener

        val manager = clipboardManager ?: return@OnPrimaryClipChangedListener
        val clip = manager.primaryClip
        val item = clip?.getItemAt(0)
        val text = item?.coerceToText(context)?.toString() ?: return@OnPrimaryClipChangedListener
        if (text.isBlank()) return@OnPrimaryClipChangedListener

        val callback = onClipboardText ?: return@OnPrimaryClipChangedListener
        Log.d("ClipboardMonitor", "New clipboard text: $text")
        callback.invoke(text)
    }

    init {
        clipboardManager?.addPrimaryClipChangedListener(listener)
    }

    fun start(
        settings: ClipboardConfig,
        onText: (String) -> Unit,
    ) {
        enabled = clipboardManager != null && settings.enabled
        onClipboardText = if (enabled) onText else null
    }

    fun stop() {
        enabled = false
        onClipboardText = null
    }

    fun destroy() {
        enabled = false
        clipboardManager?.removePrimaryClipChangedListener(listener)
        onClipboardText = null
    }
}
