package com.package.name

import java.util.PriorityQueue
import kotlin.math.abs
import kotlin.math.ln

class BigramModel {
    private data class BigramKey(
        val prev: String,
        val next: String,
    )

    private val lock = Any()
    private val maxTotalBigrams = 20_000
    private val maxBigramsPerPrefix = 64
    private val maxPrefixes = 2_000
    private val maxTokenLength = 30

    private val data: MutableMap<String, LinkedHashMap<String, Int>> = HashMap()
    private val globalLru: LinkedHashMap<BigramKey, Int> = LinkedHashMap(16, 0.75f, true)
    private val prefixLru: LinkedHashMap<String, Unit> = LinkedHashMap(16, 0.75f, true)

    fun add(prev: String, next: String, count: Int = 1) {
        if (prev.isBlank() || next.isBlank()) return
        if (count <= 0) return
        if (prev.length > maxTokenLength || next.length > maxTokenLength) return

        synchronized(lock) {
            val inner = data.getOrPut(prev) { LinkedHashMap(16, 0.75f, true) }
            prefixLru[prev] = Unit
            val current = inner[next] ?: 0
            val newValue = current + count
            inner[next] = newValue
            globalLru[BigramKey(prev, next)] = newValue

            if (inner.size > maxBigramsPerPrefix) {
                val iterator = inner.entries.iterator()
                if (iterator.hasNext()) {
                    val eldest = iterator.next()
                    iterator.remove()
                    globalLru.remove(BigramKey(prev, eldest.key))
                }
            }

            while (globalLru.size > maxTotalBigrams) {
                val iterator = globalLru.entries.iterator()
                if (!iterator.hasNext()) break
                val eldest = iterator.next()
                iterator.remove()

                val prevKey = eldest.key.prev
                val nextKey = eldest.key.next
                val innerMap = data[prevKey]
                if (innerMap != null) {
                    innerMap.remove(nextKey)
                    if (innerMap.isEmpty()) {
                        data.remove(prevKey)
                        prefixLru.remove(prevKey)
                    }
                }
            }

            if (prefixLru.size > maxPrefixes) {
                val iterator = prefixLru.entries.iterator()
                if (iterator.hasNext()) {
                    val eldest = iterator.next()
                    iterator.remove()
                    val removedPrev = eldest.key
                    data.remove(removedPrev)
                    val globalIterator = globalLru.entries.iterator()
                    while (globalIterator.hasNext()) {
                        if (globalIterator.next().key.prev == removedPrev) {
                            globalIterator.remove()
                        }
                    }
                }
            }
        }
    }

    fun suggestNext(prev: String, limit: Int): List<String> {
        if (prev.isBlank()) return emptyList()
        val safeLimit = limit.coerceAtLeast(1)

        val topCandidates: List<Pair<String, Int>> = synchronized(lock) {
            val map = data[prev] ?: return emptyList()
            val queue = PriorityQueue<Pair<String, Int>>(safeLimit + 1) { a, b ->
                when {
                    a.second != b.second -> a.second - b.second
                    else -> b.first.compareTo(a.first)
                }
            }

            for ((word, count) in map) {
                val candidate = word to count
                if (queue.size < safeLimit) {
                    queue.add(candidate)
                    continue
                }

                val weakest = queue.peek() ?: continue
                val isBetter =
                    candidate.second > weakest.second ||
                        (candidate.second == weakest.second && candidate.first < weakest.first)
                if (isBetter) {
                    queue.poll()
                    queue.add(candidate)
                }
            }

            queue.toList()
        }

        return topCandidates
            .sortedWith(compareByDescending<Pair<String, Int>> { it.second }.thenBy { it.first })
            .map { it.first }
    }

    fun clear() {
        synchronized(lock) {
            data.clear()
            globalLru.clear()
            prefixLru.clear()
        }
    }
}

internal class SuggestionEngine(
    private var maxSuggestions: Int,
) {
    private companion object {
        private const val ALPHABET_SIZE = 26
        private const val ASCII_A = 'a'.code
        private const val MAX_WORDS_SNAPSHOT = 150_000
        private const val MAX_NODES_SNAPSHOT = 1_500_000
        private const val MAX_TOKEN_LENGTH = 40
        private const val MAX_SUGGEST_QUEUE = 20_000
    }

    internal data class TrieNode(
        val childrenBasic: IntArray = IntArray(ALPHABET_SIZE) { -1 },
        var childrenExtra: HashMap<Char, Int>? = null,
        var isTerminal: Boolean = false,
        var original: String? = null,
        var frequency: Int = 0,
    )

    internal data class Snapshot(
        val nodes: List<TrieNode>,
        val maxWordLength: Int,
    )

    @Volatile
    private var snapshot: Snapshot = Snapshot(listOf(TrieNode()), 0)
    private val rowBufferPool = ThreadLocal<RowBufferPool>()

    private class RowBufferPool(
        var rows: Int,
        var cols: Int,
        var buffers: Array<IntArray>,
    )

    fun applySnapshot(newSnapshot: Snapshot) {
        snapshot = newSnapshot
    }

    fun clear() {
        snapshot = Snapshot(listOf(TrieNode()), 0)
        rowBufferPool.remove()
    }

    fun buildSnapshot(words: Sequence<String>): Snapshot {
        val iterator = words.iterator()
        if (!iterator.hasNext()) return Snapshot(listOf(TrieNode()), 0)

        val nodes = ArrayList<TrieNode>(1024)
        nodes.add(TrieNode())
        var nodeCount = 1
        var wordCount = 0
        var maxWordLength = 0
        while (iterator.hasNext()) {
            val word = iterator.next()
            val normalized = word.trim()
            if (normalized.isEmpty()) {
                continue
            }

            val (token, freq) = parseWordWithFrequency(normalized)
            if (token.isEmpty() || token.length > MAX_TOKEN_LENGTH) {
                continue
            }

            val lower = token.lowercase()
            val firstNonLetterIndex = lower.indexOfFirst { !it.isLetter() }
            val usableLower = if (firstNonLetterIndex == -1) lower else lower.substring(
                0,
                firstNonLetterIndex,
            )
            if (usableLower.isEmpty()) {
                continue
            }

            if (usableLower.length > maxWordLength) {
                maxWordLength = usableLower.length
            }

            var nodeIndex = 0
            for (c in usableLower) {
                val childIndex = getChildIndex(nodes[nodeIndex], c)
                if (childIndex >= 0) {
                    nodeIndex = childIndex
                } else {
                    if (nodeCount >= MAX_NODES_SNAPSHOT) {
                        return Snapshot(nodes = nodes, maxWordLength = maxWordLength)
                    }
                    val newNode = TrieNode()
                    val newIndex = nodes.size
                    nodes.add(newNode)
                    nodeCount += 1
                    setChildIndex(nodes[nodeIndex], c, newIndex)
                    nodeIndex = newIndex
                }
            }
            val node = nodes[nodeIndex]
            node.isTerminal = true
            if (freq > node.frequency || node.original == null) {
                node.frequency = freq
                node.original = token
            } else if (freq == node.frequency && node.original != null && token < node.original!!) {
                node.original = token
            }

            wordCount += 1
            if (wordCount >= MAX_WORDS_SNAPSHOT) {
                break
            }
        }

        return Snapshot(nodes = nodes, maxWordLength = maxWordLength)
    }

    fun contains(wordLower: String): Boolean {
        if (wordLower.isEmpty()) return false
        val current = snapshot
        var nodeIndex = 0
        for (c in wordLower) {
            val nextIndex = getChildIndex(current.nodes[nodeIndex], c)
            if (nextIndex < 0) return false
            nodeIndex = nextIndex
        }
        return current.nodes[nodeIndex].isTerminal
    }

    fun bestFuzzyMatch(wordLower: String, similarityThreshold: Double): String? {
        if (wordLower.isEmpty()) return null
        val current = snapshot
        val nodes = current.nodes
        val maxWordLength = current.maxWordLength
        if (maxWordLength == 0) return null

        val len = wordLower.length
        val maxDistance = maxDistanceForLength(len, similarityThreshold)
        val rowBuffers = obtainRowBuffers(maxWordLength + 1, len + 1)
        val firstRow = rowBuffers[0]
        for (i in 0..len) {
            firstRow[i] = i
        }

        var bestScore = similarityThreshold
        var bestDistance = Int.MAX_VALUE
        var bestPrefix = -1
        var bestOriginal: String? = null

        fun computeScore(distance: Int, candidateLen: Int, prefixLen: Int): Double {
            val denom = maxOf(len, candidateLen)
            val invDenom = 1.0 / denom.toDouble()
            val baseScore = (denom - distance).toDouble() * invDenom
            val prefixBonus = prefixLen.toDouble() * invDenom * 0.12
            val lengthPenalty = abs(len - candidateLen).toDouble() * invDenom * 0.08
            val isPrefixShape =
                (candidateLen <= len && prefixLen == candidateLen) ||
                    (candidateLen >= len && prefixLen >= len)
            val shapeBonus = if (isPrefixShape) 0.06 else 0.0
            val isLikelySubstitution = distance == 1 && candidateLen == len
            val substitutionBonus = if (isLikelySubstitution) 0.04 else 0.0
            return baseScore + prefixBonus + shapeBonus + substitutionBonus - lengthPenalty
        }

        fun dfs(nodeIndex: Int, depth: Int, prevRow: IntArray, prefixLen: Int) {
            val node = nodes[nodeIndex]
            if (node.isTerminal) {
                val dist = prevRow[len]
                if (dist <= maxDistance) {
                    val score = computeScore(dist, depth, prefixLen)
                    if (score > bestScore || (score == bestScore && (dist < bestDistance || prefixLen > bestPrefix))) {
                        bestScore = score
                        bestDistance = dist
                        bestPrefix = prefixLen
                        bestOriginal = node.original
                        if (score >= 0.985) {
                            return
                        }
                    }
                }
            }

            if (depth >= maxWordLength) return

            val nextDepth = depth + 1
            if (nextDepth > len + maxDistance) return

            val currRow = rowBuffers[nextDepth]
            forEachChild(node) { char, childIndex ->
                currRow[0] = nextDepth
                var rowMin = currRow[0]
                for (i in 1..len) {
                    val cost = if (wordLower[i - 1] == char) 0 else 1
                    val deletion = prevRow[i] + 1
                    val insertion = currRow[i - 1] + 1
                    val substitution = prevRow[i - 1] + cost
                    val value = minOf(deletion, insertion, substitution)
                    currRow[i] = value
                    if (value < rowMin) rowMin = value
                }

                if (rowMin <= maxDistance) {
                    val nextPrefixLen = if (prefixLen == depth && depth < len && wordLower[depth] == char) {
                        prefixLen + 1
                    } else {
                        prefixLen
                    }
                    dfs(childIndex, nextDepth, currRow, nextPrefixLen)
                }
            }
        }

        dfs(0, 0, firstRow, 0)
        return bestOriginal
    }

    fun search(prefixLower: String): List<String> {
        if (prefixLower.isEmpty()) return emptyList()
        val current = snapshot
        val nodes = current.nodes
        var nodeIndex = 0
        for (c in prefixLower) {
            val nextIndex = getChildIndex(nodes[nodeIndex], c)
            if (nextIndex < 0) return emptyList()
            nodeIndex = nextIndex
        }

        val results = ArrayList<String>()
        fun dfsSearch(currentIndex: Int) {
            val node = nodes[currentIndex]
            if (node.isTerminal) {
                node.original?.let { results.add(it) }
            }
            forEachChild(node) { _, childIndex ->
                dfsSearch(childIndex)
            }
        }

        dfsSearch(nodeIndex)
        return results
    }

    fun suggest(prefixLower: String, shouldCancel: () -> Boolean = { false }): List<String> {
        if (prefixLower.isEmpty()) return emptyList()

        val exact = suggestExact(prefixLower, shouldCancel)
        if (exact.size >= maxSuggestions) return exact

        val outSet = LinkedHashSet<String>(maxSuggestions)
        exact.forEach { outSet.add(it) }

        val remaining = (maxSuggestions - outSet.size).coerceAtLeast(0)
        if (remaining > 0) {
            val fuzzy = fuzzySuggest(prefixLower, remaining, shouldCancel, outSet)
            fuzzy.forEach { outSet.add(it) }
        }

        return ArrayList(outSet)
    }

    private fun suggestExact(prefixLower: String, shouldCancel: () -> Boolean): List<String> {
        val current = snapshot
        val nodes = current.nodes
        var nodeIndex = 0
        for (c in prefixLower) {
            val nextIndex = getChildIndex(nodes[nodeIndex], c)
            if (nextIndex < 0) return emptyList()
            nodeIndex = nextIndex
        }

        data class SuggestState(
            val nodeIndex: Int,
            val wordLower: String,
            val depth: Int,
        )

        val comparator = compareByDescending<SuggestState> { nodes[it.nodeIndex].frequency }
            .thenBy { it.depth }
            .thenBy { it.wordLower }
        val queue = PriorityQueue(comparator)
        queue.add(SuggestState(nodeIndex, prefixLower, prefixLower.length))

        val tryOffer: (Int, Char, SuggestState) -> Unit = { childIndex, key, state ->
            if (queue.size < MAX_SUGGEST_QUEUE) {
                queue.add(
                    SuggestState(
                        childIndex,
                        state.wordLower + key,
                        state.depth + 1,
                    ),
                )
            }
        }

        val out = ArrayList<String>(maxSuggestions)
        while (queue.isNotEmpty() && out.size < maxSuggestions) {
            if (shouldCancel()) return out
            val state = queue.poll() ?: continue
            val node = nodes[state.nodeIndex]
            if (node.isTerminal) {
                node.original?.let { out.add(it) }
                if (out.size >= maxSuggestions) break
            }

            val extras = node.childrenExtra
            if (extras.isNullOrEmpty()) {
                for (i in 0 until ALPHABET_SIZE) {
                    val child = node.childrenBasic[i]
                    if (child < 0) continue
                    val key = (ASCII_A + i).toChar()
                    tryOffer(child, key, state)
                }
            } else {
                val extraKeys = ArrayList<Char>(extras.size)
                extras.keys.forEach { extraKeys.add(it) }
                extraKeys.sort()

                var extraIndex = 0
                for (i in 0 until ALPHABET_SIZE) {
                    val basicChar = (ASCII_A + i).toChar()
                    while (extraIndex < extraKeys.size && extraKeys[extraIndex] < basicChar) {
                        val key = extraKeys[extraIndex]
                        val child = getChildIndex(node, key)
                        if (child >= 0) {
                            tryOffer(child, key, state)
                        }
                        extraIndex += 1
                    }

                    val child = node.childrenBasic[i]
                    if (child >= 0) {
                        tryOffer(child, basicChar, state)
                    }
                }

                while (extraIndex < extraKeys.size) {
                    val key = extraKeys[extraIndex]
                    val child = getChildIndex(node, key)
                    if (child >= 0) {
                        tryOffer(child, key, state)
                    }
                    extraIndex += 1
                }
            }
        }

        return out
    }

    private data class FuzzyCandidate(
        val word: String,
        val score: Double,
        val distance: Int,
        val frequency: Int,
        val prefixLen: Int,
    )

    private fun fuzzySuggest(
        inputLower: String,
        maxNeeded: Int,
        shouldCancel: () -> Boolean,
        exclude: Set<String>,
    ): List<String> {
        if (inputLower.isEmpty() || maxNeeded <= 0) return emptyList()
        val current = snapshot
        val nodes = current.nodes
        val maxWordLength = current.maxWordLength
        if (maxWordLength == 0) return emptyList()

        val len = inputLower.length
        val similarityThreshold = fuzzySimilarityThreshold(len)
        val maxDistance = maxDistanceForLength(len, similarityThreshold)
        val rowBuffers = obtainRowBuffers(maxWordLength + 1, len + 1)
        val firstRow = rowBuffers[0]
        for (i in 0..len) {
            firstRow[i] = i
        }

        val maxQueue = (maxNeeded * 8 + 12).coerceAtMost(MAX_SUGGEST_QUEUE)
        val bestByWord = HashMap<String, FuzzyCandidate>(maxQueue)
        val heap = PriorityQueue<FuzzyCandidate>(compareBy<FuzzyCandidate> { it.score }
            .thenByDescending { it.distance }
            .thenBy { it.word })

        fun scoreCandidate(distance: Int, candidateLen: Int, prefixLen: Int, frequency: Int): Double {
            val denom = maxOf(len, candidateLen)
            val invDenom = 1.0 / denom.toDouble()
            val baseScore = (denom - distance).toDouble() * invDenom
            val prefixBonus = prefixLen.toDouble() * invDenom * 0.12
            val lengthPenalty = abs(len - candidateLen).toDouble() * invDenom * 0.12
            val isPrefixShape =
                (candidateLen <= len && prefixLen == candidateLen) ||
                    (candidateLen >= len && prefixLen >= len)
            val shapeBonus = if (isPrefixShape) 0.06 else 0.0
            val freqBonus = ln((frequency + 1).toDouble())
                .div(12.0)
                .coerceAtMost(0.08)
            return baseScore + prefixBonus + shapeBonus - lengthPenalty + freqBonus
        }

        fun offerCandidate(candidate: FuzzyCandidate) {
            val existing = bestByWord[candidate.word]
            if (existing != null && existing.score >= candidate.score) return
            if (existing != null) {
                heap.remove(existing)
            }
            bestByWord[candidate.word] = candidate
            heap.add(candidate)
            if (heap.size > maxQueue) {
                val removed = heap.poll()
                if (removed != null && bestByWord[removed.word] == removed) {
                    bestByWord.remove(removed.word)
                }
            }
        }

        fun dfs(nodeIndex: Int, depth: Int, prevRow: IntArray, prefixLen: Int) {
            if (shouldCancel()) return
            val node = nodes[nodeIndex]
            if (node.isTerminal) {
                val dist = prevRow[len]
                if (dist <= maxDistance) {
                    val original = node.original
                    if (!original.isNullOrEmpty() && !exclude.contains(original)) {
                        val score = scoreCandidate(dist, depth, prefixLen, node.frequency)
                        offerCandidate(
                            FuzzyCandidate(
                                word = original,
                                score = score,
                                distance = dist,
                                frequency = node.frequency,
                                prefixLen = prefixLen,
                            ),
                        )
                    }
                }
            }

            if (depth >= maxWordLength) return
            val nextDepth = depth + 1
            if (nextDepth > len + maxDistance) return

            val currRow = rowBuffers[nextDepth]
            forEachChild(node) { char, childIndex ->
                currRow[0] = nextDepth
                var rowMin = currRow[0]
                for (i in 1..len) {
                    val cost = if (inputLower[i - 1] == char) 0 else 1
                    val deletion = prevRow[i] + 1
                    val insertion = currRow[i - 1] + 1
                    val substitution = prevRow[i - 1] + cost
                    val value = minOf(deletion, insertion, substitution)
                    currRow[i] = value
                    if (value < rowMin) rowMin = value
                }

                if (rowMin <= maxDistance) {
                    val nextPrefixLen = if (prefixLen == depth && depth < len && inputLower[depth] == char) {
                        prefixLen + 1
                    } else {
                        prefixLen
                    }
                    dfs(childIndex, nextDepth, currRow, nextPrefixLen)
                }
            }
        }

        dfs(0, 0, firstRow, 0)

        if (bestByWord.isEmpty()) return emptyList()
        val highScoreThreshold = fuzzyHighScoreThreshold(len)
        val candidates = bestByWord.values.toList().sortedWith(
            compareByDescending<FuzzyCandidate> { it.score >= highScoreThreshold }
                .thenByDescending { it.score }
                .thenBy { it.distance }
                .thenByDescending { it.frequency }
                .thenBy { it.word },
        )

        return candidates.take(maxNeeded).map { it.word }
    }

    private fun getChildIndex(node: TrieNode, ch: Char): Int {
        val lower = ch.lowercaseChar()
        val idx = lower.code - ASCII_A
        if (idx in 0 until ALPHABET_SIZE) {
            return node.childrenBasic[idx]
        }
        return node.childrenExtra?.get(lower) ?: -1
    }

    private fun setChildIndex(node: TrieNode, ch: Char, index: Int) {
        val lower = ch.lowercaseChar()
        val idx = lower.code - ASCII_A
        if (idx in 0 until ALPHABET_SIZE) {
            node.childrenBasic[idx] = index
            return
        }
        val map = node.childrenExtra ?: HashMap<Char, Int>(4).also { node.childrenExtra = it }
        map[lower] = index
    }

    private inline fun forEachChild(node: TrieNode, action: (Char, Int) -> Unit) {
        for (i in 0 until ALPHABET_SIZE) {
            val childIndex = node.childrenBasic[i]
            if (childIndex >= 0) {
                action((ASCII_A + i).toChar(), childIndex)
            }
        }
        node.childrenExtra?.forEach { (char, index) -> action(char, index) }
    }

    private fun parseWordWithFrequency(raw: String): Pair<String, Int> {
        val trimmed = raw.trim()
        if (trimmed.isEmpty()) return "" to 0

        var end = trimmed.length - 1
        while (end >= 0 && trimmed[end].isWhitespace()) end -= 1
        if (end <= 0) return trimmed to 1

        var start = end
        while (start >= 0 && !trimmed[start].isWhitespace()) start -= 1

        if (start <= 0) return trimmed to 1

        val freqToken = trimmed.substring(start + 1, end + 1)
        val freq = freqToken.toIntOrNull()
        if (freq != null) {
            val word = trimmed.substring(0, start).trim()
            return if (word.isEmpty()) trimmed to 1 else word to freq.coerceAtLeast(1)
        }

        return trimmed to 1
    }

    private fun obtainRowBuffers(
        requiredRows: Int,
        requiredCols: Int,
    ): Array<IntArray> {
        val existing = rowBufferPool.get()
        if (existing != null && existing.rows >= requiredRows && existing.cols >= requiredCols) {
            return existing.buffers
        }

        val buffers = Array(requiredRows) { IntArray(requiredCols) }
        rowBufferPool.set(RowBufferPool(requiredRows, requiredCols, buffers))
        return buffers
    }

    fun updateMaxSuggestions(newMax: Int) {
        maxSuggestions = newMax.coerceAtLeast(1)
    }

    private fun maxDistanceForLength(len: Int, similarityThreshold: Double): Int {
        val base = ((1.0 - similarityThreshold) * len).toInt().coerceAtLeast(1)
        val cap = when {
            len <= 3 -> 1
            len <= 6 -> 2
            else -> (len / 3).coerceAtLeast(2)
        }
        return base.coerceAtMost(cap)
    }

    private fun fuzzySimilarityThreshold(len: Int): Double {
        return when {
            len <= 3 -> 0.66
            len <= 5 -> 0.70
            len <= 8 -> 0.74
            else -> 0.78
        }
    }

    private fun fuzzyHighScoreThreshold(len: Int): Double {
        return when {
            len <= 3 -> 0.74
            len <= 5 -> 0.78
            len <= 8 -> 0.82
            else -> 0.86
        }
    }
}
