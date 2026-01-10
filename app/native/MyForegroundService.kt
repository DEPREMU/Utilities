package {{packageName}}

import android.app.AlarmManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.Build
import android.os.IBinder
import android.os.SystemClock
import android.util.Log

class MyForegroundService : Service() {
    companion object {
        const val EXTRA_TITLE = "utilities.extra.notification.title"
        const val EXTRA_MESSAGE = "utilities.extra.notification.message"
        const val EXTRA_ENABLE_CLIPBOARD = "utilities.extra.clipboard.enabled"
        const val EXTRA_USER_ID = "utilities.extra.clipboard.userId"
        const val EXTRA_DEVICE_ID = "utilities.extra.clipboard.deviceId"
        const val EXTRA_LANG = "utilities.extra.clipboard.lang"
        const val EXTRA_USER_TOKEN = "utilities.extra.clipboard.userToken"

        private const val RESTART_REQUEST_CODE = 1001

        fun intentFor(
            context: Context,
            config: ForegroundConfig,
        ): Intent {
            return Intent(context, MyForegroundService::class.java).apply {
                putExtra(EXTRA_TITLE, config.notification.title)
                putExtra(EXTRA_MESSAGE, config.notification.message)
                putExtra(EXTRA_ENABLE_CLIPBOARD, config.clipboard.enabled)
                putExtra(EXTRA_USER_ID, config.clipboard.userId)
                putExtra(EXTRA_DEVICE_ID, config.clipboard.deviceId)
                putExtra(EXTRA_LANG, config.clipboard.lang)
                putExtra(EXTRA_USER_TOKEN, config.clipboard.userToken)
            }
        }

        fun start(
            context: Context,
            config: ForegroundConfig,
        ) {
            val intent = intentFor(context, config)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent)
            } else {
                context.startService(intent)
            }
        }
    }

    private lateinit var notificationHelper: NotificationHelper
    private lateinit var wakeLockManager: WakeLockManager
    private lateinit var clipboardMonitor: ClipboardMonitor
    private lateinit var preferences: ForegroundPreferences
    private var config: ForegroundConfig = ForegroundConfig()
    private var screenReceiver: RestartServiceReceiver? = null

    override fun onCreate() {
        super.onCreate()
        notificationHelper = NotificationHelper(this)
        wakeLockManager = WakeLockManager(this)
        clipboardMonitor = ClipboardMonitor(this)
        preferences = ForegroundPreferences(this)
        config = preferences.load()
        wakeLockManager.acquire()
        registerScreenReceiver()
        Log.d("MyForegroundService", "Service created with screen receiver registered")
    }

    override fun onStartCommand(
        intent: Intent?,
        flags: Int,
        startId: Int,
    ): Int {
        config = ForegroundConfig.fromIntent(intent, config)
        preferences.save(config)

        if (config.clipboard.enabled) {
            clipboardMonitor.start(config.clipboard) { text ->
                ClipboardRepository.setClipboardItems(
                    listOf(text) + ClipboardRepository.clipboardItems.value.filter { it != text },
                )
                BackgroundServiceModule.sendEvent(
                    "ClipboardUpdated",
                    com.facebook.react.bridge.Arguments.createMap().apply {
                        putString("text", text)
                    },
                )
                BackgroundServiceModule.sendEvent(
                    "showClipboard",
                    com.facebook.react.bridge.Arguments.createMap().apply {
                        putBoolean("show", true)
                    },
                )
            }
            Log.d("MyForegroundService", "Clipboard monitoring enabled")
        } else {
            clipboardMonitor.stop()
        }

        notificationHelper.startForeground(this, config.notification)
        Log.d("MyForegroundService", "Service started with title: ${config.notification.title} and message: ${config.notification.message}")

        return START_STICKY
    }

    override fun onTaskRemoved(rootIntent: Intent?) {
        super.onTaskRemoved(rootIntent)
        notificationHelper.startForeground(this, config.notification)
        scheduleRestart()
        restartReactNativeApp()
    }

    override fun onDestroy() {
        super.onDestroy()
        wakeLockManager.release()
        clipboardMonitor.destroy()
        unregisterScreenReceiver()
        Log.d("MyForegroundService", "Service destroyed, attempting to restart.")
        scheduleRestart()
        restartReactNativeApp()
    }
    override fun onBind(intent: Intent?): IBinder? = null

    private fun registerScreenReceiver() {
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
    }

    private fun unregisterScreenReceiver() {
        screenReceiver?.let {
            try {
                unregisterReceiver(it)
                Log.d("MyForegroundService", "Screen receiver unregistered")
            } catch (e: Exception) {
                Log.e("MyForegroundService", "Error unregistering screen receiver: ${e.message}")
            }
        }
        screenReceiver = null
    }

    private fun scheduleRestart(delayMs: Long = 2000L) {
        val alarmManager = getSystemService(Context.ALARM_SERVICE) as? AlarmManager ?: return
        val restartIntent = intentFor(applicationContext, config).setPackage(packageName)

        val pendingFlags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_CANCEL_CURRENT
        } else {
            PendingIntent.FLAG_CANCEL_CURRENT
        }

        val pendingIntent = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            PendingIntent.getForegroundService(
                applicationContext,
                RESTART_REQUEST_CODE,
                restartIntent,
                pendingFlags,
            )
        } else {
            PendingIntent.getService(
                applicationContext,
                RESTART_REQUEST_CODE,
                restartIntent,
                pendingFlags,
            )
        }

        val triggerAt = SystemClock.elapsedRealtime() + delayMs
        alarmManager.setExactAndAllowWhileIdle(AlarmManager.ELAPSED_REALTIME_WAKEUP, triggerAt, pendingIntent)
        Log.d("MyForegroundService", "Scheduled restart in ${delayMs}ms")
    }

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
