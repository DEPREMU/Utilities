package com.package.name

internal data class GrammarSuggestion(
    val replacement: String,
    val confidence: Double,
)

internal class GrammarCorrector(
    private val posTagging: POSTagging,
) {
    fun suggest(
        words: List<String>,
        language: LanguageCode,
    ): GrammarSuggestion? {
        if (words.size < 2) return null
        val a = words[words.lastIndex - 1].lowercase()
        val b = words.last().lowercase()

        if (language == LanguageCode.EN && a == "i" && b == "goes") {
            return GrammarSuggestion(replacement = "I go", confidence = 0.93)
        }

        if (language == LanguageCode.ES && a == "el" && b == "nina") {
            return GrammarSuggestion(replacement = "la nina", confidence = 0.9)
        }

        val tagA = posTagging.tag(a, language)
        val tagB = posTagging.tag(b, language)
        if (language == LanguageCode.EN && tagA == POSTag.PRONOUN && tagB == POSTag.NOUN && a == "i") {
            return GrammarSuggestion(replacement = "I am $b", confidence = 0.82)
        }

        return null
    }
}
