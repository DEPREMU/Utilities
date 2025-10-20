package com.utilities.depremu

import android.content.Intent
import android.util.Log
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableMap
import com.facebook.react.modules.core.DeviceEventManagerModule

class ForegroundServiceModule(private val context: ReactApplicationContext) :
    ReactContextBaseJavaModule(context) {

    companion object {
        const val NAME = "ForegroundServiceModule"
        private var reactContext: ReactApplicationContext? = null

        fun sendEvent(eventName: String, params: WritableMap?) {
            reactContext?.takeIf { it.hasActiveCatalystInstance() }?.let {
                it.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                    .emit(eventName, params)
            }
        }
    }

    init {
        reactContext = context
    }

    override fun getName(): String {
        return NAME
    }

    @ReactMethod
    fun start(titleNotification: String, messageNotification: String) {
        val serviceIntent = Intent(reactApplicationContext, MyForegroundService::class.java)
        serviceIntent.putExtra("title", titleNotification)
        serviceIntent.putExtra("message", messageNotification)
        reactApplicationContext.startForegroundService(serviceIntent)
    }

    @ReactMethod
    fun stop() {
        val serviceIntent = Intent(reactApplicationContext, MyForegroundService::class.java)
        reactApplicationContext.stopService(serviceIntent)
    }
}
