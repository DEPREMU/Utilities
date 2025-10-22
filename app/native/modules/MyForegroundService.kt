package com.utilities.depremu

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.util.Log
import androidx.core.app.NotificationCompat
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.WritableMap
import android.provider.Settings

class MyForegroundService : Service() {

    companion object {
        private const val CHANNEL_ID = "ForegroundServiceChannel"
    }

    private val handler = Handler(Looper.getMainLooper())
    private var counter = 0
    private var title = "Servicio Activo"
    private var message = "Utilities está ejecutándose en segundo plano."

    private val task = object : Runnable {
        override fun run() {
            counter++
            if (counter > 1000) {
                counter = 0
            }

            val params: WritableMap = Arguments.createMap().apply {
                putString("message", "Update from Foreground Service")
                putInt("counter", counter)
            }

            ForegroundServiceModule.sendEvent("onUpdateCounterForeground", params)

            handler.postDelayed(this, 5000)
        }
    }

    private fun setNotification() {
        val notification: Notification = NotificationCompat.Builder(this, CHANNEL_ID)
            .setOngoing(true)
            .setAutoCancel(false)
            .setContentTitle(this.title)
            .setContentText(this.message)
            .setSmallIcon(R.mipmap.ic_launcher)
            .build()

        startForeground(1, notification)
        handler.post(task)
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        createNotificationChannel()

        title = intent?.getStringExtra("title") ?: "Servicio Activo"
        message = intent?.getStringExtra("message") ?: "Utilities está ejecutándose en segundo plano."


        setNotification()

        return START_STICKY
    }

    override fun onTaskRemoved(rootIntent: Intent?) {
        super.onTaskRemoved(rootIntent)
    
        val restartServiceIntent = Intent(applicationContext, MyForegroundService::class.java).also {
            it.setPackage(packageName)
        }

        setNotification()
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            startForegroundService(restartServiceIntent)
        } else {
            startService(restartServiceIntent)
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        handler.removeCallbacks(task)
        Log.d("MyForegroundService", "Service destroyed, attempting to restart.")

        setNotification()
        val restartServiceIntent = Intent(applicationContext, MyForegroundService::class.java)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            startForegroundService(restartServiceIntent)
        } else {
            startService(restartServiceIntent)
        }
    }

    override fun onBind(intent: Intent?): IBinder? {
        return null
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val serviceChannel = NotificationChannel(
                CHANNEL_ID,
                "Background Service Channel",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                setShowBadge(false)
                lockscreenVisibility = Notification.VISIBILITY_PUBLIC
            }
            getSystemService(NotificationManager::class.java)?.createNotificationChannel(serviceChannel)
        } 
    }
}
