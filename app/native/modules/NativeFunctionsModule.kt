package com.utilities.depremu

import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import android.util.Log
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class NativeFunctionsModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    override fun getName() = "NativeFunctionsModule"


    @ReactMethod
    fun requestIgnoreBatteryOptimizations() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            val intent =
                Intent().apply {
                    action = Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS
                    data = Uri.parse("package:${reactApplicationContext.packageName}")
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK
                }
            reactApplicationContext.startActivity(intent)
        }
    }

    @ReactMethod
    fun checkOverlayPermission(promise: Promise) {
        try {
            val hasPermission = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                Settings.canDrawOverlays(reactApplicationContext)
            } else {
                true 
            }
            promise.resolve(hasPermission)
        } catch (e: Exception) {
            Log.e("NativeFunctionsModule", "Error checking overlay permission", e)
            promise.reject("E_CHECK_PERMISSION", "Error checking overlay permission: ${e.message}", e)
        }
    }

    @ReactMethod
    fun requestOverlayPermission(promise: Promise) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) {
            promise.resolve("NOT_NEEDED")
            return
        }

        val context = reactApplicationContext
        val currentActivity = context.currentActivity

        if (currentActivity == null) {
            Log.w("NativeFunctionsModule", "Current activity is null. Cannot open settings screen.")
            promise.reject("E_NO_ACTIVITY", "Current activity is null. Cannot open settings screen.")
            return
        }

        try {
            val intent = Intent(
                Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                Uri.parse("package:" + context.packageName)
            )
            
            currentActivity.startActivity(intent)
            promise.resolve("SETTINGS_OPENED") 

        } catch (e: Exception) {
            Log.e("NativeFunctionsModule", "Error opening overlay settings", e)
            promise.reject("E_REQUEST_PERMISSION", "Error opening overlay settings: ${e.message}", e)
        }
    }

    @ReactMethod
    fun requestDoNotDisturbPermission(promise: Promise) {
        try {
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) {
                promise.resolve("NOT_NEEDED")
                return
            }

            val context = reactApplicationContext
            val nm = context.getSystemService(android.content.Context.NOTIFICATION_SERVICE) as android.app.NotificationManager

            if (nm.isNotificationPolicyAccessGranted) {
                promise.resolve("ALREADY_GRANTED")
                return
            }

            val intent = Intent(Settings.ACTION_NOTIFICATION_POLICY_ACCESS_SETTINGS)
            intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK
            context.startActivity(intent)
            promise.resolve("SETTINGS_OPENED")
        } catch (e: Exception) {
            Log.e("NativeFunctionsModule", "Error requesting DND permission", e)
            promise.reject("E_REQUEST_DND_PERMISSION", "Error requesting DND permission: ${e.message}", e)
        }
    }

    @ReactMethod
    fun checkDoNotDisturbPermission(promise: Promise) {
        try {
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) {
                promise.resolve(false)
                return
            }

            val context = reactApplicationContext
            val nm = context.getSystemService(android.content.Context.NOTIFICATION_SERVICE) as android.app.NotificationManager
            promise.resolve(nm.isNotificationPolicyAccessGranted)
        } catch (e: Exception) {
            Log.e("NativeFunctionsModule", "Error checking DND permission", e)
            promise.reject("E_CHECK_DND_PERMISSION", "Error checking DND permission: ${e.message}", e)
        }
    }

    @ReactMethod
    fun enableDoNotDisturb(promise: Promise) {
        try {
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) {
                promise.resolve("NOT_SUPPORTED")
                return
            }

            val context = reactApplicationContext
            val nm = context.getSystemService(android.content.Context.NOTIFICATION_SERVICE) as android.app.NotificationManager

            if (!nm.isNotificationPolicyAccessGranted) {
                val intent = Intent(Settings.ACTION_NOTIFICATION_POLICY_ACCESS_SETTINGS)
                intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK
                context.startActivity(intent)
                promise.resolve("PERMISSION_REQUIRED")
                return
            }

            nm.setInterruptionFilter(android.app.NotificationManager.INTERRUPTION_FILTER_NONE)
            promise.resolve("ENABLED")
        } catch (e: Exception) {
            Log.e("NativeFunctionsModule", "Error enabling DND", e)
            promise.reject("E_ENABLE_DND", "Error enabling DND: ${e.message}", e)
        }
    }

    @ReactMethod
    fun disableDoNotDisturb(promise: Promise) {
        try {
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) {
                promise.resolve("NOT_SUPPORTED")
                return
            }

            val context = reactApplicationContext
            val nm = context.getSystemService(android.content.Context.NOTIFICATION_SERVICE) as android.app.NotificationManager

            if (!nm.isNotificationPolicyAccessGranted) {
                val intent = Intent(Settings.ACTION_NOTIFICATION_POLICY_ACCESS_SETTINGS)
                intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK
                context.startActivity(intent)
                promise.resolve("PERMISSION_REQUIRED")
                return
            }

            nm.setInterruptionFilter(android.app.NotificationManager.INTERRUPTION_FILTER_ALL)
            promise.resolve("DISABLED")
        } catch (e: Exception) {
            Log.e("NativeFunctionsModule", "Error disabling DND", e)
            promise.reject("E_DISABLE_DND", "Error disabling DND: ${e.message}", e)
        }
    }
}
