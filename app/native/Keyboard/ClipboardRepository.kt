package com.package.name

import android.content.ClipboardManager
import android.content.Context
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.withContext

object ClipboardRepository {

    data class ClipboardEntry(
        val id: String?,
        val content: String,
    )

    private val _clipboardItems = MutableStateFlow<List<ClipboardEntry>>(emptyList())
    val clipboardItems: StateFlow<List<ClipboardEntry>> = _clipboardItems
    
    fun setClipboardItems(items: List<ClipboardEntry>) {
        _clipboardItems.value =
            items
                .mapNotNull { item ->
                    val trimmed = item.content.trim()
                    if (trimmed.isEmpty()) null else item.copy(content = trimmed)
                }
    }

    suspend fun loadSystemClipboard(context: Context): List<ClipboardEntry> {
        return withContext(Dispatchers.IO) {
            val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as? ClipboardManager
                ?: return@withContext emptyList()
            val clip = clipboard.primaryClip ?: return@withContext emptyList()

            val collected = mutableListOf<ClipboardEntry>()
            for (i in 0 until clip.itemCount) {
                val text = clip.getItemAt(i).coerceToText(context)?.toString()?.trim()
                if (!text.isNullOrEmpty()) {
                    collected.add(ClipboardEntry(id = null, content = text))
                }
            }
            collected
        }
    }
    
    fun updateFromSystem(items: List<ClipboardEntry>) {
         _clipboardItems.value = items
    }
}
