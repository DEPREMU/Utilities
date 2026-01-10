package com.package.name

import android.content.Context
import android.os.Build

class ForegroundPreferences(context: Context) {
    private val prefs = context.getSharedPreferences(ForegroundDefaults.prefsName, Context.MODE_PRIVATE)

    fun load(): ForegroundConfig {
        val notification = NotificationContent(
            title = prefs.getString("title", ForegroundDefaults.defaultTitle) ?: ForegroundDefaults.defaultTitle,
            message = prefs.getString("message", ForegroundDefaults.defaultMessage) ?: ForegroundDefaults.defaultMessage,
        )

        val clipboard = ClipboardConfig(
            enabled = prefs.getBoolean("clipboardEnabled", false),
            userId = prefs.getString("userId", null),
            deviceId = prefs.getString("deviceId", "${Build.MANUFACTURER} ${Build.MODEL}")
                ?: "${Build.MANUFACTURER} ${Build.MODEL}",
            lang = prefs.getString("lang", "en") ?: "en",
            userToken = prefs.getString("userToken", null),
        )

        val wasConfigured = prefs.getBoolean("wasConfigured", false)
        return ForegroundConfig(notification, clipboard, wasConfigured)
    }

    fun save(config: ForegroundConfig) {
        prefs.edit().apply {
            putString("title", config.notification.title)
            putString("message", config.notification.message)
            putBoolean("clipboardEnabled", config.clipboard.enabled)
            putString("lang", config.clipboard.lang)
            putString("userId", config.clipboard.userId)
            putString("deviceId", config.clipboard.deviceId)
            putString("userToken", config.clipboard.userToken)
            putBoolean("wasConfigured", config.wasConfigured)
            apply()
        }
    }
}
