package com.package.name

import java.util.PriorityQueue

internal class TrigramModel {
    private data class TrigramKey(
        val w1: String,
        val w2: String,
        val w3: String,
    )

    private val lock = Any()
    private val maxEntries = 50_000
    private val data = LinkedHashMap<TrigramKey, Int>(1024, 0.75f, true)

    fun add(w1: String, w2: String, w3: String, count: Int = 1) {
        if (count <= 0 || w1.isBlank() || w2.isBlank() || w3.isBlank()) return
        val key = TrigramKey(w1, w2, w3)
        synchronized(lock) {
            data[key] = (data[key] ?: 0) + count
            while (data.size > maxEntries) {
                val iterator = data.entries.iterator()
                if (!iterator.hasNext()) break
                iterator.next()
                iterator.remove()
            }
        }
    }

    fun suggestThird(w1: String, w2: String, limit: Int): List<String> {
        if (w1.isBlank() || w2.isBlank() || limit <= 0) return emptyList()
        val queue = PriorityQueue<Pair<String, Int>>(limit + 1) { a, b ->
            when {
                a.second != b.second -> a.second - b.second
                else -> b.first.compareTo(a.first)
            }
        }

        synchronized(lock) {
            data.forEach { (key, count) ->
                if (key.w1 != w1 || key.w2 != w2) return@forEach
                val candidate = key.w3 to count
                if (queue.size < limit) {
                    queue.add(candidate)
                    return@forEach
                }
                val weakest = queue.peek() ?: return@forEach
                if (candidate.second > weakest.second || (candidate.second == weakest.second && candidate.first < weakest.first)) {
                    queue.poll()
                    queue.add(candidate)
                }
            }
        }

        val sorted = ArrayList<Pair<String, Int>>(queue.size)
        while (queue.isNotEmpty()) {
            val polled = queue.poll() ?: break
            sorted.add(polled)
        }
        return sorted.asReversed().map { it.first }
    }

    fun clear() {
        synchronized(lock) {
            data.clear()
        }
    }
}

internal class PhrasePredictionEngine(
    private val trigramModel: TrigramModel,
) {
    fun suggestPhrases(
        prevWord: String?,
        currentWord: String,
        limit: Int,
    ): List<String> {
        if (currentWord.isBlank() || limit <= 0) return emptyList()

        val out = ArrayList<String>(limit)
        val seen = HashSet<String>(limit * 2)

        if (!prevWord.isNullOrBlank()) {
            trigramModel.suggestThird(prevWord, currentWord, limit).forEach { tail ->
                val phrase = "$currentWord $tail"
                if (seen.add(phrase)) {
                    out.add(phrase)
                }
            }
        }

        val defaults = listOf("$currentWord you", "$currentWord this", "$currentWord it")
        defaults.forEach { phrase ->
            if (out.size >= limit) return@forEach
            if (seen.add(phrase)) out.add(phrase)
        }

        return out.take(limit)
    }
}
