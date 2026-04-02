package com.package.name

import kotlin.math.abs

internal enum class LanguageCode {
    EN,
    ES,
}

internal data class LanguageDetectionResult(
    val language: LanguageCode,
    val confidence: Double,
)

internal class LanguageDetector(
    private val minWindowChars: Int = 24,
) {
    private val spanishHintChars = setOf('á', 'é', 'í', 'ó', 'ú', 'ü', 'ñ', '¿', '¡')
    private val englishHints = arrayOf("the", "and", "you", "are", "with", "this")
    private val spanishHints = arrayOf("que", "con", "para", "está", "una", "los", "las")

    fun detect(text: String): LanguageDetectionResult? {
        val normalized = text.lowercase()
        val letters = normalized.filter { it.isLetter() || it in spanishHintChars }
        if (letters.length < minWindowChars) return null

        var scoreEs = 0.0
        var scoreEn = 0.0

        letters.forEach { ch ->
            when {
                ch in spanishHintChars -> scoreEs += 2.3
                ch in listOf('k', 'w') -> scoreEn += 0.8
            }
        }

        spanishHints.forEach { token ->
            if (normalized.contains(token)) scoreEs += 1.1
        }
        englishHints.forEach { token ->
            if (normalized.contains(token)) scoreEn += 1.1
        }

        val vowelBias = computeSpanishVowelBias(letters)
        scoreEs += vowelBias

        val total = (scoreEs + scoreEn).coerceAtLeast(0.001)
        val topLanguage = if (scoreEs >= scoreEn) LanguageCode.ES else LanguageCode.EN
        val confidence = (abs(scoreEs - scoreEn) / total).coerceIn(0.0, 1.0)

        return LanguageDetectionResult(topLanguage, confidence)
    }

    private fun computeSpanishVowelBias(text: String): Double {
        if (text.isEmpty()) return 0.0
        val vowels = text.count { it in "aeiouáéíóúü" }
        val ratio = vowels.toDouble() / text.length.toDouble()
        return if (ratio > 0.47) 0.35 else 0.0
    }
}
