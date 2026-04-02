package com.package.name

internal class DynamicLanguageSwitcher(
    private val confidenceThreshold: Double = 0.70,
) {
    fun decideSwitch(
        current: LanguageCode,
        detection: LanguageDetectionResult?,
    ): LanguageCode? {
        if (detection == null) return null
        if (detection.confidence < confidenceThreshold) return null
        if (detection.language == current) return null
        return detection.language
    }
}
