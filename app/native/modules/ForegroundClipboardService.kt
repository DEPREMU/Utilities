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
    private var lastText: String = ""
    private var userToken: String? = null
    private var userId: String? = null

    private val supabaseUrl = "{{supabaseUrl}}/rest/v1/ClipboardSync"
    private val supabaseAnonKey = "{{supabaseKey}}"
    private val client = OkHttpClient()

    private val clipListener = ClipboardManager.OnPrimaryClipChangedListener {
        val clip = clipboardManager.primaryClip
        val item = clip?.getItemAt(0)
        val text = item?.text?.toString() ?: return@OnPrimaryClipChangedListener

        if (text != lastText && text.isNotBlank()) {
            lastText = text
            Log.d("ClipboardService", "Nuevo texto copiado: $text")
            sendToSupabase(text)
        }
    }

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
        val notification = buildNotification()
        startForeground(NOTIFICATION_ID, notification)
        Log.d("ClipboardService", "Servicio en primer plano iniciado")

        clipboardManager = getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
        clipboardManager.addPrimaryClipChangedListener(clipListener)
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        Log.d("ForegroundClipboardService activo", "Servicio activo")
        userToken = intent?.getStringExtra("userToken")
        userId = intent?.getStringExtra("userId")

        if (userToken.isNullOrBlank()) {
            Log.e("ClipboardService", "Token de usuario no recibido. Deteniendo servicio.")
            stopSelf()
            return START_NOT_STICKY
        }

        // No necesitamos volver a añadir listener aquí, ya se añadió en onCreate

        return START_STICKY
    }

    override fun onDestroy() {
        super.onDestroy()
        clipboardManager.removePrimaryClipChangedListener(clipListener)
        Log.d("ClipboardService", "Servicio detenido")
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
        val deviceName = "${Build.MANUFACTURER} ${Build.MODEL}"

        val json = JSONObject().apply {
            put("content", content)
            put("deviceId", deviceName)
            put("userId", userId)
        }

        val mediaType = "application/json".toMediaType()
        val body = json.toString().toRequestBody(mediaType)

        val request = Request.Builder()
            .url(supabaseUrl)
            .addHeader("Authorization", "Bearer $userToken")
            .addHeader("apikey", supabaseAnonKey)
            .addHeader("Content-Type", "application/json")
            .post(body)
            .build()

        client.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {
                Log.e("SupabaseSync", "Error al subir: ${e.message}")
            }

            override fun onResponse(call: Call, response: Response) {
                if (response.isSuccessful) {
                    Log.d("SupabaseSync", "Texto sincronizado con éxito")
                } else {
                    Log.e("SupabaseSync", "Fallo al sincronizar: ${response.code}")
                }
                response.close()
            }
        })
    }
}
