package com.package.name

internal class EmojiPredictorEngine {
    private val dictionary = mapOf(
        "happy" to listOf("\uD83D\uDE0A", "\uD83D\uDE03"),
        "love" to listOf("\u2764\uFE0F", "\uD83D\uDC95", "\uD83D\uDE0D"),
        "hola" to listOf("\uD83D\uDC4B"),
        "hungry" to listOf("\uD83C\uDF54", "\uD83C\uDF5C"),
        "party" to listOf("\uD83C\uDF89", "\uD83E\uDD73"),
    )

    private val userFrequency = LinkedHashMap<String, Int>(64, 0.75f, true)

    fun recordEmojiUsage(emoji: String) {
        userFrequency[emoji] = (userFrequency[emoji] ?: 0) + 1
        while (userFrequency.size > 50) {
            val iterator = userFrequency.entries.iterator()
            if (!iterator.hasNext()) break
            iterator.next()
            iterator.remove()
        }
    }

    fun predict(contextWord: String?, limit: Int): List<String> {
        if (limit <= 0) return emptyList()
        val base = contextWord?.lowercase()?.let { dictionary[it] }.orEmpty()
        val sortedUser = userFrequency.entries
            .sortedByDescending { it.value }
            .map { it.key }

        val out = ArrayList<String>(limit)
        val seen = HashSet<String>(limit * 2)

        base.forEach {
            if (seen.add(it)) out.add(it)
        }
        sortedUser.forEach {
            if (out.size >= limit) return@forEach
            if (seen.add(it)) out.add(it)
        }

        return out.take(limit)
    }
}
