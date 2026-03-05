package com.package.name

import android.app.AlarmManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.os.SystemClock
import android.provider.Settings
import android.util.Log
import com.facebook.react.ReactApplication
import com.facebook.react.ReactInstanceManager
import com.facebook.react.bridge.ReactContext

class ForegroundService : Service() {
    companion object {
        const var TAG = "ForegroundService"
        
        const val EXTRA_TITLE = "utilities.extra.notification.title"
        const val EXTRA_MESSAGE = "utilities.extra.notification.message"
        const val EXTRA_ENABLE_CLIPBOARD = "utilities.extra.clipboard.enabled"
        const val EXTRA_USER_ID = "utilities.extra.clipboard.userId"
        const val EXTRA_DEVICE_ID = "utilities.extra.clipboard.deviceId"
        const val EXTRA_LANG = "utilities.extra.clipboard.lang"
        const val EXTRA_USER_TOKEN = "utilities.extra.clipboard.userToken"

        private const val RESTART_REQUEST_CODE = 1001
        private const val HEALTH_CHECK_INTERVAL_MS = 10_000L
        private const val MIN_RECOVERY_TRIGGER_GAP_MS = 1_500L
        private const val EVENT_QUERY_TIMEOUT_MS = 2000L
        private const val EVENT_QUERY_MAX_ATTEMPTS = 5
        private const val RECREATE_WATCHDOG_TIMEOUT_MS = 20000L

        fun intentFor(
            context: Context,
            config: ForegroundConfig,
        ): Intent {
            return Intent(context, ForegroundService::class.java).apply {
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
    private var screenReceiver: ServiceReceiver? = null
    private val mainHandler = Handler(Looper.getMainLooper())
    private var isPeriodicHealthCheckRunning = false
    private var isShuttingDown = false
    private var lastRecoveryTriggerElapsed = 0L
    @Volatile
    private var isRecreatingContext = false
    @Volatile
    private var pendingReactInitListener: ReactInstanceManager.ReactInstanceEventListener? = null
    private val recreateLock = Any()

    private val periodicHealthCheckRunnable = object : Runnable {
        override fun run() {
            if (!isPeriodicHealthCheckRunning || isShuttingDown) {
                return
            }

            ensureReactBridgeAvailable("periodic-health-check")
            mainHandler.postDelayed(this, HEALTH_CHECK_INTERVAL_MS)
        }
    }

    override fun onCreate() {
        super.onCreate()
        notificationHelper = NotificationHelper(this)
        wakeLockManager = WakeLockManager(this)
        clipboardMonitor = ClipboardMonitor(this)
        preferences = ForegroundPreferences(this)
        config = preferences.load()
        wakeLockManager.acquire()
        registerScreenReceiver()
        startPeriodicHealthCheck()
        Log.d(TAG, "Service created with screen receiver registered")
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
                    "ClipboardEvent",
                    com.facebook.react.bridge.Arguments.createMap().apply {
                        putString("type", "update")
                        putString("text", text)
                    },
                )
                BackgroundServiceModule.sendEvent(
                    "ClipboardEvent",
                    com.facebook.react.bridge.Arguments.createMap().apply {
                        putString("type", "show")
                    },
                )
            }
            Log.d(TAG, "Clipboard monitoring enabled")
        } else {
            clipboardMonitor.stop()
        }

        notificationHelper.startForeground(this, config.notification)
        Log.d(TAG, "Service started with title: ${config.notification.title} and message: ${config.notification.message}")

        return START_STICKY
    }

    override fun onTaskRemoved(rootIntent: Intent?) {
        super.onTaskRemoved(rootIntent)
        notificationHelper.startForeground(this, config.notification)
        triggerRecovery(reason = "onTaskRemoved", scheduleServiceRestart = true)
    }

    override fun onDestroy() {
        if (isShuttingDown) {
            super.onDestroy()
            return
        }

        isShuttingDown = true
        stopPeriodicHealthCheck()
        super.onDestroy()
        wakeLockManager.release()
        clipboardMonitor.destroy()
        unregisterScreenReceiver()
        Log.d(TAG, "Service destroyed, attempting to restart.")
        triggerRecovery(reason = "onDestroy", scheduleServiceRestart = true)
    }
    override fun onBind(intent: Intent?): IBinder? = null

    private fun startPeriodicHealthCheck() {
        if (isPeriodicHealthCheckRunning) {
            return
        }

        isPeriodicHealthCheckRunning = true
        mainHandler.removeCallbacks(periodicHealthCheckRunnable)
        mainHandler.post(periodicHealthCheckRunnable)
        Log.d(TAG, "Started periodic app health check every ${HEALTH_CHECK_INTERVAL_MS}ms")
    }

    private fun stopPeriodicHealthCheck() {
        isPeriodicHealthCheckRunning = false
        mainHandler.removeCallbacks(periodicHealthCheckRunnable)
        Log.d(TAG, "Stopped periodic app health check")
    }

    private fun triggerRecovery(reason: String, scheduleServiceRestart: Boolean) {
        val now = SystemClock.elapsedRealtime()
        if (now - lastRecoveryTriggerElapsed < MIN_RECOVERY_TRIGGER_GAP_MS) {
            Log.d(TAG, "Skipping duplicated recovery flow. reason=$reason")
            return
        }

        lastRecoveryTriggerElapsed = now
        Log.d(TAG, "Triggering recovery flow. reason=$reason scheduleServiceRestart=$scheduleServiceRestart")
        if (scheduleServiceRestart) {
            scheduleRestart()
        }
        ensureReactBridgeAvailable(reason)
    }

    private fun checkReactAliveAsync(timeoutMs: Long, callback: (Boolean) -> Unit) {
        BackgroundServiceModule.isReactAlive.set(false)
        BackgroundServiceModule.sendEvent("queryAppState", "asking")

        mainHandler.postDelayed({
            callback(BackgroundServiceModule.isReactAlive.get())
        }, timeoutMs)
    }

    private fun ensureReactBridgeAvailable(reason: String) {
        if (hasActiveReactContext()) {
            Log.d(TAG, "React context already active, skipping recovery. reason=$reason")
            return
        }

        synchronized(recreateLock) {
            if (isRecreatingContext) {
                Log.d(TAG, "React context recreation already in progress. reason=$reason")
                return
            }
        }

        probeReactLivenessWithRetries(1, "pre-recreation:$reason") { isAlive ->
            if (isAlive) {
                Log.d(TAG, "React runtime responded during probe, skipping recreation. reason=$reason")
                return@probeReactLivenessWithRetries
            }

            Log.w(TAG, "React runtime did not respond to probes, recreating context safely. reason=$reason")
            recreateReactContextSafely(reason)
        }
    }

    private fun hasActiveReactContext(): Boolean {
        return try {
            val app = applicationContext as? ReactApplication ?: return false
            val manager = app.reactNativeHost.reactInstanceManager
            val current = manager.currentReactContext
            current != null &&
                current.hasActiveCatalystInstance() &&
                !isContextDestroyed(current)
        } catch (_: Exception) {
            false
        }
    }

    private fun recreateReactContextSafely(reason: String) {
        val app = applicationContext as? ReactApplication
        if (app == null) {
            Log.e(TAG, "Application is not ReactApplication, cannot recreate React context. reason=$reason")
            launchMainActivity(reason)
            return
        }

        val manager = app.reactNativeHost.reactInstanceManager

        synchronized(recreateLock) {
            if (isRecreatingContext) {
                Log.d(TAG, "Recreation already in progress. reason=$reason")
                return
            }

            if (hasActiveReactContext()) {
                Log.d(TAG, "React already active, skipping recreation. reason=$reason")
                return
            }

            isRecreatingContext = true
        }

        mainHandler.post {
            try {
                if (hasActiveReactContext()) {
                    Log.d(TAG, "React became active before recreation started. reason=$reason")
                    completeRecreationState(manager)
                    return@post
                }

                val listener = object : ReactInstanceManager.ReactInstanceEventListener {
                    override fun onReactContextInitialized(newContext: ReactContext) {
                        Log.d(TAG, "New React context initialized. reason=$reason")
                        completeRecreationState(manager)
                    }
                }

                synchronized(recreateLock) {
                    pendingReactInitListener?.let { previousListener ->
                        manager.removeReactInstanceEventListener(previousListener)
                    }
                    pendingReactInitListener = listener
                }

                manager.addReactInstanceEventListener(listener)

                manager.currentReactContext?.let {
                    Log.w(TAG, "Destroying old React context before recreation. reason=$reason")
                    manager.destroy()
                }

                manager.createReactContextInBackground()
                Log.d(TAG, "Requested React context recreation. reason=$reason")

                mainHandler.postDelayed({
                    if (!isRecreatingContext) {
                        return@postDelayed
                    }

                    Log.e(TAG, "React context recreation timed out, launching fallback. reason=$reason")
                    completeRecreationState(manager)
                    launchMainActivity(reason)
                }, RECREATE_WATCHDOG_TIMEOUT_MS)
            } catch (error: Exception) {
                Log.e(TAG, "Error recreating React context: ${error.message} reason=$reason")
                completeRecreationState(manager)
                launchMainActivity(reason)
            }
        }
    }

    private fun probeReactLivenessWithRetries(
        attempt: Int,
        phase: String,
        callback: (Boolean) -> Unit,
    ) {
        if (hasActiveReactContext()) {
            Log.d(TAG, "[$phase] React context already active, probe completed")
            callback(true)
            return
        }

        checkReactAliveAsync(EVENT_QUERY_TIMEOUT_MS) { eventAlive ->
            val alive = eventAlive || hasActiveReactContext()
            if (alive) {
                Log.d(TAG, "[$phase] React runtime responded on event probe attempt=$attempt")
                callback(true)
                return@checkReactAliveAsync
            }

            if (attempt >= EVENT_QUERY_MAX_ATTEMPTS) {
                Log.w(TAG, "[$phase] React runtime did not respond after $EVENT_QUERY_MAX_ATTEMPTS attempts")
                callback(false)
                return@checkReactAliveAsync
            }

            Log.w(TAG, "[$phase] React runtime did not respond (attempt=$attempt/$EVENT_QUERY_MAX_ATTEMPTS), retrying")
            probeReactLivenessWithRetries(attempt + 1, phase, callback)
        }
    }

    private fun completeRecreationState(manager: ReactInstanceManager) {
        synchronized(recreateLock) {
            pendingReactInitListener?.let { listener ->
                manager.removeReactInstanceEventListener(listener)
            }
            pendingReactInitListener = null
            isRecreatingContext = false
        }
    }

    private fun isContextDestroyed(reactContext: ReactContext): Boolean {
        return try {
            val method = reactContext.javaClass.getMethod("isDestroyed")
            (method.invoke(reactContext) as? Boolean) == true
        } catch (_: Exception) {
            false
        }
    }

    private fun launchMainActivity(reason: String) {
        try {
            if (Build.VERSION.SDK_INT >= 29 && !Settings.canDrawOverlays(this)) {
                Log.w(TAG, "Fallback launch skipped: Missing overlay permission for background activity launch. reason=$reason")
                return
            }

            val launchIntent = packageManager.getLaunchIntentForPackage(packageName)
            if (launchIntent == null) {
                Log.e(TAG, "Fallback launch failed: package launch intent is null. reason=$reason")
                return
            }

            launchIntent.addFlags(
                Intent.FLAG_ACTIVITY_NEW_TASK or
                Intent.FLAG_ACTIVITY_CLEAR_TOP or
                Intent.FLAG_ACTIVITY_SINGLE_TOP,
            )
            launchIntent.putExtra("launchedFromService", true)
            startActivity(launchIntent)
            Log.d(TAG, "MainActivity launched as fallback. reason=$reason")
        } catch (error: Exception) {
            Log.e(TAG, "Error launching MainActivity fallback: ${error.message} reason=$reason")
        }
    }

    private fun registerScreenReceiver() {
        screenReceiver = ServiceReceiver()
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
                Log.d(TAG, "Screen receiver unregistered")
            } catch (e: Exception) {
                Log.e(TAG, "Error unregistering screen receiver: ${e.message}")
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

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            if (alarmManager.canScheduleExactAlarms()) {
                alarmManager.setExactAndAllowWhileIdle(AlarmManager.ELAPSED_REALTIME_WAKEUP, triggerAt, pendingIntent)
            } else {
                alarmManager.setAndAllowWhileIdle(AlarmManager.ELAPSED_REALTIME_WAKEUP, triggerAt, pendingIntent)
            }
        } else {
            alarmManager.setExactAndAllowWhileIdle(AlarmManager.ELAPSED_REALTIME_WAKEUP, triggerAt, pendingIntent)
        }
        
        Log.d(TAG, "Scheduled restart in ${delayMs}ms")
    }

}
