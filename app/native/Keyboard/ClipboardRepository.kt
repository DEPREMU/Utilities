package {{packageName}}

import android.content.ClipboardManager
import android.content.Context
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.withContext

object ClipboardRepository {

    private val _clipboardItems = MutableStateFlow<List<String>>(emptyList())
    val clipboardItems: StateFlow<List<String>> = _clipboardItems
    
    private const val MAX_ITEMS_IN_CLIPBOARD = 15

    fun setClipboardItems(items: List<String>) {
        _clipboardItems.value = items.take(MAX_ITEMS_IN_CLIPBOARD)
    }

    suspend fun loadSystemClipboard(context: Context): List<String> {
        return withContext(Dispatchers.IO) {
            val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as? ClipboardManager
                ?: return@withContext emptyList()
            val clip = clipboard.primaryClip ?: return@withContext emptyList()

            val collected = mutableListOf<String>()
            for (i in 0 until clip.itemCount) {
                val text = clip.getItemAt(i).coerceToText(context)?.toString()?.trim()
                if (!text.isNullOrEmpty()) {
                    collected.add(text)
                }
                if (collected.size >= MAX_ITEMS_IN_CLIPBOARD) break
            }
            collected
        }
    }
    
    fun updateFromSystem(items: List<String>) {
         _clipboardItems.value = items
    }
}
