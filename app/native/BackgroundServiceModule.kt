package {{packageName}}

import android.app.ActivityManager
import android.content.Intent
import android.os.Build
import android.util.Log
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.WritableMap
import com.facebook.react.modules.core.DeviceEventManagerModule
import java.util.concurrent.atomic.AtomicBoolean

class BackgroundServiceModule(
    reactContext: ReactApplicationContext,
) : ReactContextBaseJavaModule(reactContext) {
    companion object {
        const val NAME = "BackgroundServiceModule"
        private var reactContext: ReactApplicationContext? = null

        val isReactAlive = AtomicBoolean(false)

        fun sendEvent(
            eventName: String,
            params: WritableMap?,
        ) {
            reactContext?.takeIf { it.hasActiveReactInstance() }?.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                ?.emit(eventName, params)
                ?: Log.w(NAME, "ReactContext is null or inactive, cannot send event $eventName")
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

    init {
        Companion.reactContext = reactContext
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
        
        val serviceIntent = Intent(reactApplicationContext, MyForegroundService::class.java).apply {
            putExtra("title", titleNotification)
            putExtra("message", messageNotification)
        }
        
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            reactApplicationContext.startForegroundService(serviceIntent)
        } else {
            reactApplicationContext.startService(serviceIntent)
        }
        Log.d("BackgroundServiceModule", "Foreground service started")
    }

    @ReactMethod
    fun stop() {
        val serviceIntent = Intent(reactApplicationContext, MyForegroundService::class.java)
        reactApplicationContext.stopService(serviceIntent)
        Log.d("BackgroundServiceModule", "Foreground service stopped")
    }
    
    @ReactMethod
    fun setUserData(token: String, id: String, language: String, deviceID: String) {
        lang = language
        userId = id
        deviceId = deviceID
        userToken = token
        Log.d("BackgroundServiceModule", "User data set, starting clipboard monitoring")

        if (!userToken.isNullOrEmpty() && !userId.isNullOrEmpty()) {
            startClipboardService()
        }
    }
    
    @ReactMethod
    fun startClipboardService() {
        Log.d("BackgroundServiceModule", "startClipboardService() called")
        if (userToken.isNullOrEmpty() || userId.isNullOrEmpty()) {
            Log.e("BackgroundServiceModule", "User data not set, cannot start clipboard monitoring")
            return
        }

        val serviceIntent = Intent(reactApplicationContext, MyForegroundService::class.java).apply {
            putExtra("lang", lang)
            putExtra("title", title)
            putExtra("userId", userId)
            putExtra("message", message)
            putExtra("deviceId", deviceId)
            putExtra("userToken", userToken)
            putExtra("enableClipboard", true)
        }

        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                reactApplicationContext.startForegroundService(serviceIntent)
            } else {
                reactApplicationContext.startService(serviceIntent)
            }
            Log.d("BackgroundServiceModule", "Clipboard monitoring started")
        } catch (e: Exception) {
            Log.e("BackgroundServiceModule", "Error starting clipboard service: ${e.message}")
        }
    }

    @ReactMethod
    fun stopClipboardService() {
        Log.d("BackgroundServiceModule", "Stopping clipboard monitoring (service will continue)")
        // We restart the service without clipboard enabled
        val serviceIntent = Intent(reactApplicationContext, MyForegroundService::class.java).apply {
            putExtra("title", title)
            putExtra("message", message)
            putExtra("enableClipboard", false)
        }
        
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            reactApplicationContext.startForegroundService(serviceIntent)
        } else {
            reactApplicationContext.startService(serviceIntent)
        }
    }

    @ReactMethod
    fun isRunning(promise: Promise) {
        Log.d("BackgroundServiceModule", "isRunning() called")
        try {
            val activityManager = reactApplicationContext.getSystemService(android.content.Context.ACTIVITY_SERVICE) as ActivityManager
            val services = activityManager.getRunningServices(Integer.MAX_VALUE)
            
            val isServiceRunning = services.any { serviceInfo ->
                serviceInfo.service.className == MyForegroundService::class.java.name
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
    }
}
