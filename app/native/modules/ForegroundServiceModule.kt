package com.utilities.depremu

import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import android.util.Log
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableMap
import com.facebook.react.modules.core.DeviceEventManagerModule

class ForegroundServiceModule(
    reactContext: ReactApplicationContext,
) : ReactContextBaseJavaModule(reactContext) {
    companion object {
        const val NAME = "BackgroundServiceModule"
        private var reactContext: ReactApplicationContext? = null

        fun sendEvent(
            eventName: String,
            params: WritableMap?,
        ) {
            reactContext?.takeIf { it.hasActiveCatalystInstance() }?.let {
                it
                    .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                    .emit(eventName, params)
            }
        }
    }

    init {
        Companion.reactContext = reactContext
    }

    override fun getName(): String = NAME

    @ReactMethod
    fun start(
        titleNotification: String,
        messageNotification: String,
    ) {
        Log.d("ForegroundServiceModule", "Starting foreground service with title: $titleNotification and message: $messageNotification")
        val serviceIntent = Intent(reactApplicationContext, MyForegroundService::class.java)
        serviceIntent.putExtra("title", titleNotification)
        serviceIntent.putExtra("message", messageNotification)
        reactApplicationContext.startForegroundService(serviceIntent)
        Log.d("ForegroundServiceModule", "Foreground service started")
    }

    @ReactMethod
    fun stop() {
        val serviceIntent = Intent(reactApplicationContext, MyForegroundService::class.java)
        reactApplicationContext.stopService(serviceIntent)
    }
}
