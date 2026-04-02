package com.package.name

internal enum class SwipeDirection {
    LEFT,
    RIGHT,
    UP,
    DOWN,
}

internal class GestureDetector {
    fun suggestedSuffix(
        direction: SwipeDirection,
        activeLanguage: LanguageCode,
    ): String? {
        if (direction != SwipeDirection.RIGHT) return null
        return SwipePatterns.patternsByLanguage[activeLanguage]?.firstOrNull()
    }
}
