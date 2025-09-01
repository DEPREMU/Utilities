package com.utilities.depremu

import android.content.Intent
import android.os.Build
import android.util.Log
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import android.app.ActivityManager
import com.facebook.react.bridge.Promise

class ClipboardModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    private var userToken: String? = null
    private var userId: String? = null

    init {
        Log.d("ClipboardModule", "ClipboardModule initialized")
    }

    override fun getName(): String {
        Log.d("ClipboardModule", "getName() called")
        return "ClipboardModule"
    }

    @ReactMethod
    fun setUserData(token: String, id: String) {
        userToken = token
        userId = id
        Log.d("ClipboardModule", "Token set: ${token.take(10)}...")
    }

    @ReactMethod
    fun startClipboardService() {
        Log.d("ClipboardModule", "startClipboardService() called")
        if (userToken.isNullOrEmpty()) {
            Log.e("ClipboardModule", "Token no seteado, no se puede iniciar el servicio")
            return
        }

        val context = reactApplicationContext
        val intent = Intent(context, ForegroundClipboardService::class.java).apply {
            putExtra("userToken", userToken)
            putExtra("userId", userId)
        }

        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent)
            } else {
                context.startService(intent)
            }
            Log.d("ClipboardModule", "Servicio iniciado con token.")
        } catch (e: Exception) {
            Log.e("ClipboardModule", "Error starting service: ${e.message}")
        }
    }

    @ReactMethod
    fun stopClipboardService() {
        Log.d("ClipboardModule", "stopClipboardService() called")
        val context = reactApplicationContext
        val intent = Intent(context, ForegroundClipboardService::class.java)
        context.stopService(intent)
        Log.d("ClipboardModule", "Servicio detenido.")
    }

    @ReactMethod
    fun isRunning(promise: Promise) {
        Log.d("ClipboardModule", "isRunning() called")
        try {
            val activityManager = reactApplicationContext.getSystemService(android.content.Context.ACTIVITY_SERVICE) as ActivityManager
            val services = activityManager.getRunningServices(Integer.MAX_VALUE)
            
            val isServiceRunning = services.any { serviceInfo ->
                serviceInfo.service.className == ForegroundClipboardService::class.java.name
            }
            
            Log.d("ClipboardModule", "Service running: $isServiceRunning")
            promise.resolve(isServiceRunning)
        } catch (e: Exception) {
            Log.e("ClipboardModule", "Error checking service: ${e.message}")
            promise.reject("ERROR_CHECKING_SERVICE", e.message, e)
        }
    }

    @ReactMethod
    fun getMethods(promise: Promise) {
        Log.d("ClipboardModule", "getMethods() called")
        val methods = mapOf(
            "setUserToken" to "available",
            "startClipboardService" to "available", 
            "stopClipboardService" to "available",
            "isRunning" to "available"
        )
        promise.resolve(com.facebook.react.bridge.Arguments.makeNativeMap(methods))
    }
}