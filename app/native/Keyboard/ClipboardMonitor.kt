package {{packageName}}

import android.content.ClipboardManager
import android.content.Context
import android.util.Log

class ClipboardMonitor(context: Context) {
    private val clipboardManager = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
    private var enabled = false
    private var onClipboardText: ((String) -> Unit)? = null

    private val listener = ClipboardManager.OnPrimaryClipChangedListener {
        if (!enabled) return@OnPrimaryClipChangedListener

        val clip = clipboardManager.primaryClip
        val item = clip?.getItemAt(0)
        val text = item?.text?.toString() ?: return@OnPrimaryClipChangedListener
        if (text.isBlank()) return@OnPrimaryClipChangedListener

        Log.d("ClipboardMonitor", "New clipboard text: $text")
        onClipboardText?.invoke(text)
    }

    init {
        clipboardManager.addPrimaryClipChangedListener(listener)
    }

    fun start(
        settings: ClipboardConfig,
        onText: (String) -> Unit,
    ) {
        enabled = settings.enabled && !settings.userId.isNullOrBlank() && !settings.userToken.isNullOrBlank()
        onClipboardText = if (enabled) onText else null
    }

    fun stop() {
        enabled = false
        onClipboardText = null
    }

    fun destroy() {
        enabled = false
        clipboardManager.removePrimaryClipChangedListener(listener)
        onClipboardText = null
    }
}
