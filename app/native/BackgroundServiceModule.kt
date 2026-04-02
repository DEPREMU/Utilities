package com.package.name

import android.app.ActivityManager
import android.content.Intent
import android.os.Build
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
            if (!isReactAlive.get()) return false

            return try {
                val safeParams = params ?: Arguments.createMap()

                context
                    .getJSModule(DeviceEventManagerModule.  RCTDeviceEventEmitter::class.java)
                    .emit(eventName, safeParams)

                Log.d(NAME, "Event $eventName emitted to JS")
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
                Log.w(NAME, "ReactContext null, queued event $eventName")
                return
            }

            context.runOnUiQueueThread {
                if (tryEmitEvent(eventName, params)) {
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

    private var lang: String = "en"
    private var userId: String? = null
    private var deviceId: String? = null
    private var userToken: String? = null
    private var title: String = "Service not running"
    private var message: String = "Utilities may not be running in the background, open the app to ensure it continues running."
    private val defaultDeviceId: String = "${Build.MANUFACTURER} ${Build.MODEL}"

    init {
        Companion.flushPendingEvents()
        Log.d("BackgroundServiceModule", "BackgroundServiceModule initialized")
    }

    override fun getName(): String = NAME

    @ReactMethod
    fun start(
        titleNotification: String,
        messageNotification: String,
    ) {
        title = titleNotification
        message = messageNotification
        Log.d("BackgroundServiceModule", "Starting foreground service with title: $titleNotification")

        val config = ForegroundConfig(
            notification = NotificationContent(titleNotification, messageNotification),
            clipboard = ClipboardConfig(
                enabled = false,
                userId = userId,
                deviceId = deviceId ?: defaultDeviceId,
                lang = lang,
                userToken = userToken,
            ),
            wasConfigured = true,
        )

        ForegroundService.start(reactApplicationContext, config)
        Log.d("BackgroundServiceModule", "Foreground service started")
    }

    @ReactMethod
    fun stop() {
        val serviceIntent = Intent(reactApplicationContext, ForegroundService::class.java)
        reactApplicationContext.stopService(serviceIntent)
        Log.d("BackgroundServiceModule", "Foreground service stopped")
    }
    
    @ReactMethod
    fun setUserData(token: String, id: String, language: String, deviceID: String) {
        lang = language
        userId = id
        deviceId = deviceID
        userToken = token
        Log.d("BackgroundServiceModule", "User data set")
    }
    
    @ReactMethod
    fun startClipboardService() {
        Log.d("BackgroundServiceModule", "startClipboardService() called")
        if (userToken.isNullOrEmpty() || userId.isNullOrEmpty()) {
            Log.e("BackgroundServiceModule", "User data not set, cannot start clipboard monitoring")
            return
        }

        val config = buildClipboardConfig(enabled = true)

        try {
            ForegroundService.start(reactApplicationContext, config)
            Log.d("BackgroundServiceModule", "Clipboard monitoring started")
        } catch (e: Exception) {
            Log.e("BackgroundServiceModule", "Error starting clipboard service: ${e.message}")
        }
    }

    @ReactMethod
    fun stopClipboardService() {
        Log.d("BackgroundServiceModule", "Stopping clipboard monitoring (service will continue)")
        val config = buildClipboardConfig(enabled = false)
        ForegroundService.start(reactApplicationContext, config)
    }

    @ReactMethod
    fun isRunning(promise: Promise) {
        Log.d("BackgroundServiceModule", "isRunning() called")
        try {
            val activityManager = reactApplicationContext.getSystemService(android.content.Context.ACTIVITY_SERVICE) as ActivityManager
            val services = activityManager.getRunningServices(Integer.MAX_VALUE)
            
            val isServiceRunning = services.any { serviceInfo ->
                serviceInfo.service.className == ForegroundService::class.java.name
            }
            
            Log.d("BackgroundServiceModule", "Service running: $isServiceRunning")
            promise.resolve(isServiceRunning)
        } catch (e: Exception) {
            Log.e("BackgroundServiceModule", "Error checking service: ${e.message}")
            promise.reject("ERROR_CHECKING_SERVICE", e.message, e)
        }
    }

    @ReactMethod
    fun getMethods(promise: Promise) {
        Log.d("BackgroundServiceModule", "getMethods() called")
        val methods = mapOf(
            "start" to "available",
            "stop" to "available",
            "setUserData" to "available",
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
            Log.d("BackgroundServiceModule", "setClipboardText() called")
            val context = reactApplicationContext
            val clipboard = context.getSystemService(android.content.Context.CLIPBOARD_SERVICE) as android.content.ClipboardManager
            val clip = android.content.ClipData.newPlainText("label", text)
            clipboard.setPrimaryClip(clip)
            Log.d("BackgroundServiceModule", "Text set to clipboard.")
        } catch (e: Exception) {
            Log.e("BackgroundServiceModule", "Error setting clipboard text: ${e.message}")
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
                userId = userId,
                deviceId = deviceId ?: defaultDeviceId,
                lang = lang,
                userToken = userToken,
            ),
            wasConfigured = true,
        )
    }
}
