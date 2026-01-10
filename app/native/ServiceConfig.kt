package com.package.name

import android.content.Intent
import android.os.Build

data class NotificationContent(
    val title: String = ForegroundDefaults.defaultTitle,
    val message: String = ForegroundDefaults.defaultMessage,
)

data class ClipboardConfig(
    val enabled: Boolean = false,
    val userId: String? = null,
    val deviceId: String = "${Build.MANUFACTURER} ${Build.MODEL}",
    val lang: String = "en",
    val userToken: String? = null,
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
                title = intent.getStringExtra(MyForegroundService.EXTRA_TITLE) ?: existing.notification.title,
                message = intent.getStringExtra(MyForegroundService.EXTRA_MESSAGE) ?: existing.notification.message,
            )

            val enableClipboard = intent.getBooleanExtra(MyForegroundService.EXTRA_ENABLE_CLIPBOARD, existing.clipboard.enabled)

            val clipboard = ClipboardConfig(
                enabled = enableClipboard,
                userId = intent.getStringExtra(MyForegroundService.EXTRA_USER_ID) ?: existing.clipboard.userId,
                deviceId = intent.getStringExtra(MyForegroundService.EXTRA_DEVICE_ID) ?: existing.clipboard.deviceId,
                lang = intent.getStringExtra(MyForegroundService.EXTRA_LANG) ?: existing.clipboard.lang,
                userToken = intent.getStringExtra(MyForegroundService.EXTRA_USER_TOKEN) ?: existing.clipboard.userToken,
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
