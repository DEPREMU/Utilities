package com.package.name

import android.app.ActivityManager
import android.content.Intent
import com.package.name.Logger as Log
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableMap
import com.facebook.react.modules.core.DeviceEventManagerModule
import java.util.concurrent.atomic.AtomicBoolean
import java.util.ArrayDeque
import com.package.name.ClipboardConfig
import com.package.name.ForegroundConfig
import com.package.name.NotificationContent

class BackgroundServiceModule(
    reactContext: ReactApplicationContext,
) : ReactContextBaseJavaModule(reactContext) {
    companion object {
        const val NAME = "BackgroundServiceModule"
        private const val MAX_PENDING_EVENTS = 100
        private var reactContext: ReactApplicationContext? = null
        private val pendingEvents = ArrayDeque<Pair<String, WritableMap?>>()

        val isReactAlive = AtomicBoolean(false)

        private fun tryEmitEvent(
            eventName: String,
            params: WritableMap?,
        ): Boolean {
            val context = reactContext ?: return false
            if (!isReactAlive.get() && eventName != "queryAppState") return false

            return try {
                val safeParams = params ?: Arguments.createMap()
                val safeParamsString = safeParams.toString()

                context
                    .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                    .emit(eventName, safeParams)

                Log.d(NAME, "Event $eventName emitted to JS. Params: ${safeParamsString}")
                true
            } catch (error: Exception) {
                Log.w(NAME, "Failed to emit event $eventName: ${error.message}")
                false
            }
        }

        private fun enqueueEvent(
            eventName: String,
            params: WritableMap?,
        ) {
            synchronized(pendingEvents) {
                if (pendingEvents.size >= MAX_PENDING_EVENTS) {
                    pendingEvents.removeFirst()
                }
                pendingEvents.addLast(eventName to params)
            }
        }

        fun flushPendingEvents() {
            val context = reactContext ?: return
            if (!isReactAlive.get()) return

            context.runOnUiQueueThread {
                synchronized(pendingEvents) {
                    while (pendingEvents.isNotEmpty()) {
                        val (eventName, params) = pendingEvents.removeFirst()
                        if (!tryEmitEvent(eventName, params)) {
                            pendingEvents.addFirst(eventName to params)
                            return@runOnUiQueueThread
                        }
                    }
                }
            }
        }

        fun sendEvent(
            eventName: String,
            params: WritableMap?,
        ) {
            val context = reactContext

            if (context == null) {
                enqueueEvent(eventName, params)
                return
            }

            context.runOnUiQueueThread {
                if (tryEmitEvent(eventName, params)) {
                    return@runOnUiQueueThread
                }
                if (eventName == "queryAppState") {
                    return@runOnUiQueueThread
                }

                enqueueEvent(eventName, params)
                Log.w(NAME, "Could not emit, queued event $eventName")
            }
        }
        
        fun sendEvent(
            eventName: String,
            state: String,
        ) {
            val params = Arguments.createMap().apply {
                putString("state", state)
            }
            sendEvent(eventName, params)
        }
    }

    private var title: String = "Service not running"
    private var message: String = "Utilities may not be running in the background, open the app to ensure it continues running."

    init {
        Companion.reactContext = reactApplicationContext
        Companion.flushPendingEvents()
        Log.d(NAME, "BackgroundServiceModule initialized")
    }

    override fun invalidate() {
        if (Companion.reactContext === reactApplicationContext) {
            Companion.reactContext = null
        }
        super.invalidate()
    }

    override fun getName(): String = NAME

    @ReactMethod
    fun start(
        titleNotification: String,
        messageNotification: String,
    ) {
        title = titleNotification
        message = messageNotification

        val config = ForegroundPreferences(reactApplicationContext).load()

        Log.d(NAME, "Starting foreground service with title: $titleNotification config: ${config.toString()}")

        ForegroundService.start(reactApplicationContext, config)
        Log.d(NAME, "Foreground service started")
    }

    @ReactMethod
    fun stop() {
        val serviceIntent = Intent(reactApplicationContext, ForegroundService::class.java)
        reactApplicationContext.stopService(serviceIntent)
        Log.d(NAME, "Foreground service stopped")
    }

    @ReactMethod
    fun startClipboardService() {
        Log.d(NAME, "startClipboardService() called")
        val config = buildClipboardConfig(enabled = true)

        try {
            val startedInRunningService = ForegroundService.setClipboardMonitoringEnabled(enabled = true)
            if (!startedInRunningService) {
                ForegroundService.start(reactApplicationContext, config)
            }
            Log.d(NAME, "Clipboard monitoring started")
        } catch (e: Exception) {
            Log.e(NAME, "Error starting clipboard service: ${e.message}")
        }
    }

    @ReactMethod
    fun stopClipboardService() {
        Log.d(NAME, "Stopping clipboard monitoring (service will continue)")
        try {
            val stoppedInRunningService = ForegroundService.setClipboardMonitoringEnabled(enabled = false)
            if (!stoppedInRunningService) {
                Log.d(NAME, "Foreground service is not running, nothing to stop")
                return
            }
            Log.d(NAME, "Clipboard monitoring stopped")
        } catch (e: Exception) {
            Log.e(NAME, "Error stopping clipboard service: ${e.message}")
        }
    }

    @ReactMethod
    fun isRunning(promise: Promise) {
        Log.d(NAME, "isRunning() called")
        try {
            val activityManager = reactApplicationContext.getSystemService(android.content.Context.ACTIVITY_SERVICE) as ActivityManager
            val services = activityManager.getRunningServices(Integer.MAX_VALUE)
            
            val isServiceRunning = services.any { serviceInfo ->
                serviceInfo.service.className == ForegroundService::class.java.name
            }
            
            Log.d(NAME, "Service running: $isServiceRunning")
            promise.resolve(isServiceRunning)
        } catch (e: Exception) {
            Log.e(NAME, "Error checking service: ${e.message}")
            promise.reject("ERROR_CHECKING_SERVICE", e.message, e)
        }
    }

    @ReactMethod
    fun getMethods(promise: Promise) {
        Log.d(NAME, "getMethods() called")
        val methods = mapOf(
            "start" to "available",
            "stop" to "available",
            "startClipboardService" to "available", 
            "stopClipboardService" to "available",
            "isRunning" to "available",
            "getMethods" to "available",
            "setClipboardText" to "available"
        )
        promise.resolve(com.facebook.react.bridge.Arguments.makeNativeMap(methods))
    }

    @ReactMethod
    fun setClipboardText(text: String) {
        try {
            Log.d(NAME, "setClipboardText() called")
            val context = reactApplicationContext
            val clipboard = context.getSystemService(android.content.Context.CLIPBOARD_SERVICE) as android.content.ClipboardManager
            val clip = android.content.ClipData.newPlainText("label", text)
            clipboard.setPrimaryClip(clip)
            Log.d(NAME, "Text set to clipboard.")
        } catch (e: Exception) {
            Log.e(NAME, "Error setting clipboard text: ${e.message}")
        }
    }

    @ReactMethod
    fun setReactAlive(alive: Boolean) {
        isReactAlive.set(alive)
        Companion.flushPendingEvents()
    }

    private fun buildClipboardConfig(enabled: Boolean): ForegroundConfig {
        return ForegroundConfig(
            notification = NotificationContent(title, message),
            clipboard = ClipboardConfig(
                enabled = enabled,
            ),
            wasConfigured = true,
        )
    }
}
