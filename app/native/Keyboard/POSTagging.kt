package com.package.name

internal enum class POSTag {
    PRONOUN,
    VERB,
    ARTICLE,
    NOUN,
    UNKNOWN,
}

internal data class TaggedWord(
    val word: String,
    val tag: POSTag,
)

internal class POSTagging {
    fun tag(word: String, language: LanguageCode): POSTag {
        val w = word.lowercase()
        return when (language) {
            LanguageCode.EN -> when {
                w in setOf("i", "you", "he", "she", "we", "they") -> POSTag.PRONOUN
                w in setOf("go", "goes", "is", "are", "do", "does") -> POSTag.VERB
                w in setOf("a", "an", "the") -> POSTag.ARTICLE
                w.isNotBlank() -> POSTag.NOUN
                else -> POSTag.UNKNOWN
            }
            LanguageCode.ES -> when {
                w in setOf("yo", "tu", "el", "ella", "nosotros", "ellos") -> POSTag.PRONOUN
                w in setOf("soy", "eres", "es", "somos", "son") -> POSTag.VERB
                w in setOf("el", "la", "los", "las", "un", "una") -> POSTag.ARTICLE
                w.isNotBlank() -> POSTag.NOUN
                else -> POSTag.UNKNOWN
            }
        }
    }
}
