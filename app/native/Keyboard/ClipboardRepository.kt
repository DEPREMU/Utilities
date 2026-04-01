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
    private val lock = Any()

    private fun sanitize(items: List<ClipboardEntry>): List<ClipboardEntry> {
        if (items.isEmpty()) return emptyList()
        val seenContent = LinkedHashSet<String>(items.size)
        val out = ArrayList<ClipboardEntry>(items.size)

        for (item in items) {
            val trimmed = item.content.trim()
            if (trimmed.isEmpty()) continue
            if (!seenContent.add(trimmed)) continue
            out.add(item.copy(content = trimmed))
        }

        return out
    }
    
    fun setClipboardItems(items: List<ClipboardEntry>) {
        synchronized(lock) {
            val sanitized = sanitize(items)
            if (_clipboardItems.value == sanitized) return
            _clipboardItems.value = sanitized
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
        synchronized(lock) {
            val sanitized = sanitize(items)
            if (_clipboardItems.value == sanitized) return
            _clipboardItems.value = sanitized
        }
    }
}
