package com.utilities.depremu

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.provider.Settings
import android.util.Log
import androidx.core.app.NotificationCompat
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.WritableMap
import okhttp3.*
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import java.io.IOException

class MyForegroundService : Service() {
    companion object {
        @Volatile
        var lastText: String = ""

        private const val CHANNEL_ID = "ForegroundServiceChannel"
        private const val NOTIFICATION_ID = 198
    }

    private val handler = Handler(Looper.getMainLooper())
    private var counter = 0
    private var title = "Servicio Activo"
    private var message = "Utilities está ejecutándose en segundo plano."
    
    // Clipboard functionality
    private lateinit var clipboardManager: ClipboardManager
    private var userId: String? = null
    private var deviceId: String = "${Build.MANUFACTURER} ${Build.MODEL}"
    private var createdAt: String = ""
    private var lang: String = "en"
    private val table: String = "ClipboardSync"
    private var userToken: String? = null
    private val client = OkHttpClient()
    private val serverURL = "{{serverURL}}"
    private var clipboardEnabled = false

    private val task =
        object : Runnable {
            override fun run() {
                counter++
                if (counter > 1000) {
                    counter = 0
                }

                val params: WritableMap =
                    Arguments.createMap().apply {
                        putString("message", "Update from Foreground Service")
                        putInt("counter", counter)
                    }

                BackgroundServiceModule.sendEvent("onUpdateCounterForeground", params)

                handler.postDelayed(this, 5000)
            }
        }
    
    private val clipListener =
        ClipboardManager.OnPrimaryClipChangedListener {
            if (!clipboardEnabled) return@OnPrimaryClipChangedListener
            
            val clip = clipboardManager.primaryClip
            val item = clip?.getItemAt(0)
            val text = item?.text?.toString() ?: return@OnPrimaryClipChangedListener

            if (text != lastText && text.isNotBlank()) {
                lastText = text
                sendToDatabase(text)
            }
        }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Background Service",
                NotificationManager.IMPORTANCE_LOW
            )
            val manager = getSystemService(NotificationManager::class.java)
            manager.createNotificationChannel(channel)
        }
    }

    private fun setNotification() {
        val notification: Notification =
            NotificationCompat
                .Builder(this, CHANNEL_ID)
                .setOngoing(true)
                .setAutoCancel(false)
                .setContentTitle(this.title)
                .setContentText(this.message)
                .setSmallIcon(R.mipmap.ic_launcher)
                .build()

        Log.d("MyForegroundService", "Setting notification with title: ${this.title} and message: ${this.message}")
        startForeground(NOTIFICATION_ID, notification)
        handler.post(task)
    }

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
        clipboardManager = getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
        clipboardManager.addPrimaryClipChangedListener(clipListener)
        Log.d("MyForegroundService", "Service created")
    }

    override fun onStartCommand(
        intent: Intent?,
        flags: Int,
        startId: Int,
    ): Int {
        title = intent?.getStringExtra("title") ?: "Servicio Activo"
        message = intent?.getStringExtra("message") ?: "Utilities está ejecutándose en segundo plano."
        
        val enableClipboard = intent?.getBooleanExtra("enableClipboard", false) ?: false
        if (enableClipboard) {
            lang = intent.getStringExtra("lang") ?: lang
            userId = intent.getStringExtra("userId")
            deviceId = intent.getStringExtra("deviceId") ?: deviceId
            userToken = intent.getStringExtra("userToken")
            
            if (!userToken.isNullOrBlank() && !userId.isNullOrBlank()) {
                clipboardEnabled = true
                Log.d("MyForegroundService", "Clipboard monitoring enabled")
            }
        }
        
        Log.d("MyForegroundService", "Service started with title: $title and message: $message")
        setNotification()

        return START_STICKY
    }

    override fun onTaskRemoved(rootIntent: Intent?) {
        super.onTaskRemoved(rootIntent)

        val restartServiceIntent =
            Intent(applicationContext, MyForegroundService::class.java).also {
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
        client.dispatcher.cancelAll()
        clipboardManager.removePrimaryClipChangedListener(clipListener)
        Log.d("MyForegroundService", "Service destroyed, attempting to restart.")

        val restartServiceIntent = Intent(applicationContext, MyForegroundService::class.java).apply {
            putExtra("title", title)
            putExtra("message", message)
            if (clipboardEnabled) {
                putExtra("enableClipboard", true)
                putExtra("lang", lang)
                putExtra("userId", userId)
                putExtra("deviceId", deviceId)
                putExtra("userToken", userToken)
            }
        }
        
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            startForegroundService(restartServiceIntent)
        } else {
            startService(restartServiceIntent)
        }
    }

    override fun onBind(intent: Intent?): IBinder? = null
    
    private fun sendToDatabase(content: String) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            createdAt = java.time.Instant.now().toString()
        }
        if (userId.isNullOrBlank() || deviceId.isBlank() || userToken.isNullOrBlank()) return

        val jsonToTable =
            JSONObject().apply {
                put("userId", userId)
                put("content", content)
                put("deviceId", deviceId)
                put("createdAt", createdAt)
            }

        val jsonToServer =
            JSONObject().apply {
                put("lang", lang ?: "en")
                put("table", table)
                put("values", jsonToTable)
            }

        val mediaType = "application/json".toMediaType()
        val body = jsonToServer.toString().toRequestBody(mediaType)
        var fullServerURL = serverURL
        if (fullServerURL.endsWith("/")) {
            fullServerURL = fullServerURL.dropLast(1)
        }

        val request =
            Request
                .Builder()
                .url("$fullServerURL/database/insert")
                .addHeader("Content-Type", "application/json")
                .addHeader("Authorization", "Bearer $userToken")
                .post(body)
                .build()

        client.newCall(request).enqueue(
            object : Callback {
                override fun onFailure(
                    call: Call,
                    e: IOException,
                ) {
                    Log.e("MyForegroundService", "Error uploading clipboard: ${e.message}")
                }

                override fun onResponse(
                    call: Call,
                    response: Response,
                ) {
                    if (!response.isSuccessful) {
                        Log.e("MyForegroundService", "Failed to sync clipboard: ${response.code}")
                    } else {
                        Log.d("MyForegroundService", "Clipboard synced successfully")
                    }
                    response.close()
                }
            },
        )
    }
}
