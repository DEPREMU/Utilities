package com.package.name

internal object SwipePatterns {
    val patternsByLanguage: Map<LanguageCode, List<String>> = mapOf(
        LanguageCode.EN to listOf("ing", "tion", "ed"),
        LanguageCode.ES to listOf("cion", "mente", "ado"),
    )
}
