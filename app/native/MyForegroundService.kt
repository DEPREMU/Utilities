package {{packageName}}

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.net.Uri
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.os.PowerManager
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
        private const val CHANNEL_ID = "ForegroundServiceChannel"
        private const val NOTIFICATION_ID = 198
    }

    private val handler = Handler(Looper.getMainLooper())
    private var counter = 0
    private var title = "Service not running"
    private var message = "Utilities may not be running in the background, open the app to ensure it continues running."
    private var wakeLock: PowerManager.WakeLock? = null
    private var screenReceiver: RestartServiceReceiver? = null
    
    // Clipboard functionality
    private lateinit var clipboardManager: ClipboardManager
    private var userId: String? = null
    private var deviceId: String = "${Build.MANUFACTURER} ${Build.MODEL}"
    private var createdAt: String = ""
    private var lang: String = "en"
    private val table: String = "ClipboardSync"
    private var userToken: String? = null
    private val client = OkHttpClient()
    private var clipboardEnabled = false

    private val clipListener =
        ClipboardManager.OnPrimaryClipChangedListener {
            if (!clipboardEnabled) return@OnPrimaryClipChangedListener
            
            val clip = clipboardManager.primaryClip
            val item = clip?.getItemAt(0)
            val text = item?.text?.toString() ?: return@OnPrimaryClipChangedListener

            if (text.isNotBlank()) {
                Log.d("MyForegroundService", "New clipboard text: $text")
                BackgroundServiceModule.sendEvent(
                    "showClipboard",
                    Arguments.createMap().apply { 
                        putBoolean("show", true) 
                    }
                )
                BackgroundServiceModule.sendEvent(
                    "ClipboardUpdated",
                    Arguments.createMap().apply {
                        putString("text", text)
                    }
                )
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
        val notificationIntent = packageManager.getLaunchIntentForPackage(packageName)?.apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP
        }

        val pendingIntentFlags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        } else {
            PendingIntent.FLAG_UPDATE_CURRENT
        }

        val pendingIntent = notificationIntent?.let {
            PendingIntent.getActivity(this, 0, it, pendingIntentFlags)
        }

        val notification: Notification =
            NotificationCompat
                .Builder(this, CHANNEL_ID)
                .setOngoing(true)
                .setAutoCancel(false)
                .setContentTitle(this.title)
                .setContentText(this.message)
                .setSmallIcon(R.mipmap.ic_launcher)
                .setContentIntent(pendingIntent)
                .build()

        Log.d("MyForegroundService", "Setting notification with title: ${this.title} and message: ${this.message}")
        startForeground(NOTIFICATION_ID, notification)
    }

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()

        val powerManager = getSystemService(Context.POWER_SERVICE) as PowerManager
        wakeLock = powerManager.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "Utilities:ForegroundServiceWakeLock")
        wakeLock?.acquire()

        clipboardManager = getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
        clipboardManager.addPrimaryClipChangedListener(clipListener)
        
        screenReceiver = RestartServiceReceiver()
        val screenFilter = IntentFilter().apply {
            addAction(Intent.ACTION_SCREEN_ON)
            addAction(Intent.ACTION_SCREEN_OFF)
        }
        
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            registerReceiver(screenReceiver, screenFilter, Context.RECEIVER_NOT_EXPORTED)
        } else {
            registerReceiver(screenReceiver, screenFilter)
        }
        
        Log.d("MyForegroundService", "Service created with screen receiver registered")
    }

    override fun onStartCommand(
        intent: Intent?,
        flags: Int,
        startId: Int,
    ): Int {
        title = intent?.getStringExtra("title") ?: title
        message = intent?.getStringExtra("message") ?: message

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
        
        val prefs = getSharedPreferences("ForegroundServicePrefs", Context.MODE_PRIVATE)
        prefs.edit().apply {
            putString("title", title)
            putString("message", message)
            putBoolean("wasConfigured", true)
            putBoolean("clipboardEnabled", clipboardEnabled)
            if (clipboardEnabled) {
                putString("lang", lang)
                putString("userId", userId)
                putString("deviceId", deviceId)
                putString("userToken", userToken)
            }
            apply()
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
        restartReactNativeApp()
    }

    override fun onDestroy() {
        super.onDestroy()
        if (wakeLock?.isHeld == true) {
            wakeLock?.release()
        }
        client.dispatcher.cancelAll()
        clipboardManager.removePrimaryClipChangedListener(clipListener)
        
        screenReceiver?.let {
            try {
                unregisterReceiver(it)
                Log.d("MyForegroundService", "Screen receiver unregistered")
            } catch (e: Exception) {
                Log.e("MyForegroundService", "Error unregistering screen receiver: ${e.message}")
            }
        }
        screenReceiver = null
        
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
        restartReactNativeApp()
    }
    override fun onBind(intent: Intent?): IBinder? = null

    private fun restartReactNativeApp() {
        try {
            val broadcastIntent = Intent(this, RestartServiceReceiver::class.java)
            broadcastIntent.action = "ACTION_RESTART_APP"
            sendBroadcast(broadcastIntent)
            Log.d("MyForegroundService", "Sent broadcast to restart app")
        } catch (e: Exception) {
            Log.e("MyForegroundService", "Error sending restart broadcast: ${e.message}")
        }
    }
}
