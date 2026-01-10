package com.package.name

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat

class NotificationHelper(private val context: Context) {
    private val manager: NotificationManager = context.getSystemService(NotificationManager::class.java)

    fun startForeground(
        service: Service,
        content: NotificationContent,
    ) {
        createChannelIfNeeded()
        val notification = buildNotification(content)
        service.startForeground(ForegroundDefaults.notificationId, notification)
    }

    private fun buildNotification(content: NotificationContent): Notification {
        val notificationIntent = context.packageManager.getLaunchIntentForPackage(context.packageName)?.apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP
        }

        val pendingIntentFlags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        } else {
            PendingIntent.FLAG_UPDATE_CURRENT
        }

        val pendingIntent = notificationIntent?.let {
            PendingIntent.getActivity(context, 0, it, pendingIntentFlags)
        }

        return NotificationCompat
            .Builder(context, ForegroundDefaults.channelId)
            .setOngoing(true)
            .setAutoCancel(false)
            .setContentTitle(content.title)
            .setContentText(content.message)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentIntent(pendingIntent)
            .build()
    }

    private fun createChannelIfNeeded() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return

        val channel = NotificationChannel(
            ForegroundDefaults.channelId,
            "Background Service",
            NotificationManager.IMPORTANCE_LOW,
        )
        manager.createNotificationChannel(channel)
    }
}
