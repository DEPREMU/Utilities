package com.utilities.depremu

import android.app.*
import android.content.*
import android.os.Build
import android.os.IBinder
import android.util.Log
import android.content.ClipboardManager
import okhttp3.*
import org.json.JSONObject
import java.io.IOException
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.RequestBody.Companion.toRequestBody

class ForegroundClipboardService : Service() {

    companion object {
        const val CHANNEL_ID = "clipboard_service_channel"
        const val NOTIFICATION_ID = 1
    }

    private lateinit var clipboardManager: ClipboardManager
    // Requirements to insert data in table "ClipboardSync"
    private var userId: String? = null
    private var lastText: String = ""
    private var deviceId: String = "${Build.MANUFACTURER} ${Build.MODEL}"
    private var createdAt: String = ""
    
    // Requirements to send data to server insertion endpoint
    private var lang: String = "en"
    private val table: String = "ClipboardSync"
    private var userToken: String? = null

    private val client = OkHttpClient()
    private val serverURL = "{{serverURL}}" // This will be replaced in build time

    private val clipListener = ClipboardManager.OnPrimaryClipChangedListener {
        val clip = clipboardManager.primaryClip
        val item = clip?.getItemAt(0)
        val text = item?.text?.toString() ?: return@OnPrimaryClipChangedListener

        if (text != lastText && text.isNotBlank()) {
            lastText = text
            sendToSupabase(text)
        }
    }

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
        val notification = buildNotification()
        startForeground(NOTIFICATION_ID, notification)

        clipboardManager = getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
        clipboardManager.addPrimaryClipChangedListener(clipListener)
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        lang = intent?.getStringExtra("lang") ?: lang
        userId = intent?.getStringExtra("userId")
        deviceId = intent?.getStringExtra("deviceId") ?: deviceId
        userToken = intent?.getStringExtra("userToken")

        if (userToken.isNullOrBlank()) {
            stopSelf()
            return START_NOT_STICKY
        }
        if (userId.isNullOrBlank()) {
            stopSelf()
            return START_NOT_STICKY
        }

        return START_STICKY
    }

    override fun onDestroy() {
        super.onDestroy()
        client.dispatcher.cancelAll()
        clipboardManager.removePrimaryClipChangedListener(clipListener)
    }

    override fun onBind(intent: Intent?): IBinder? = null

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Clipboard Sync",
                NotificationManager.IMPORTANCE_LOW
            )
            val manager = getSystemService(NotificationManager::class.java)
            manager.createNotificationChannel(channel)
        }
    }

    private fun buildNotification(): Notification {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            Notification.Builder(this, CHANNEL_ID)
                .setContentTitle("Sincronización activa")
                .setContentText("Monitoreando portapapeles...")
                .setSmallIcon(android.R.drawable.ic_menu_info_details)
                .setOngoing(true)
                .build()
        } else {
            Notification.Builder(this)
                .setContentTitle("Sincronización activa")
                .setContentText("Monitoreando portapapeles...")
                .setSmallIcon(android.R.drawable.ic_menu_info_details)
                .setOngoing(true)
                .build()
        }
    }

    private fun sendToSupabase(content: String) {
        createdAt = java.time.Instant.now().toString() // Current timestamp in ISO 8601 format
        if (userId.isNullOrBlank() || deviceId.isBlank() || userToken.isNullOrBlank()) return

        // This must be values previously set when starting the service
        val jsonToTable = JSONObject().apply {
            put("userId", userId)
            put("content", content)
            put("deviceId", deviceId)
            put("createdAt", createdAt)
        }

        // This must be the same as the server expects in its insertion endpoint
        val jsonToServer = JSONObject().apply {
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

        val request = Request.Builder()
            .url("$fullServerURL/supabase/insert")
            .addHeader("Content-Type", "application/json")
            .addHeader("Authorization", "Bearer $userToken")
            .post(body)
            .build()

        client.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {
                Log.e("SupabaseSync", "Error al subir: ${e.message}")
            }

            override fun onResponse(call: Call, response: Response) {
                if (!response.isSuccessful) {
                    Log.e("SupabaseSync", "Fallo al sincronizar: ${response.code}")
                }
                response.close()
            }
        })
    }
}
