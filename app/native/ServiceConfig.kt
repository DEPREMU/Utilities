package com.package.name

import android.content.Intent

data class NotificationContent(
    val title: String = ForegroundDefaults.defaultTitle,
    val message: String = ForegroundDefaults.defaultMessage,
)

data class ClipboardConfig(
    val enabled: Boolean = false,
)

data class ForegroundConfig(
    val notification: NotificationContent = NotificationContent(),
    val clipboard: ClipboardConfig = ClipboardConfig(),
    val wasConfigured: Boolean = false,
) {
    companion object {
        fun fromIntent(intent: Intent?, existing: ForegroundConfig = ForegroundConfig()): ForegroundConfig {
            if (intent == null) return existing

            val notification = NotificationContent(
                title = intent.getStringExtra(ForegroundService.EXTRA_TITLE) ?: existing.notification.title,
                message = intent.getStringExtra(ForegroundService.EXTRA_MESSAGE) ?: existing.notification.message,
            )

            val enableClipboard = intent.getBooleanExtra(ForegroundService.EXTRA_ENABLE_CLIPBOARD, existing.clipboard.enabled)

            val clipboard = ClipboardConfig(
                enabled = enableClipboard,
            )

            return ForegroundConfig(
                notification = notification,
                clipboard = clipboard,
                wasConfigured = true,
            )
        }
    }
}

object ForegroundDefaults {
    const val prefsName = "ForegroundServicePrefs"
    const val channelId = "ForegroundServiceChannel"
    const val notificationId = 198
    const val defaultTitle = "Service not running"
    const val defaultMessage = "Utilities may not be running in the background, open the app to ensure it continues running."
}
