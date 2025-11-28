package com.utilities.depremu

import android.content.Intent
import android.net.Uri
import android.provider.Settings
import android.util.Log
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class NativeFunctionsModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName() = "NativeFunctionsModule"


    @ReactMethod
    fun requestIgnoreBatteryOptimizations() {
        val intent =
            Intent().apply {
                action = Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS
                data = Uri.parse("package:${reactApplicationContext.packageName}")
                flags = Intent.FLAG_ACTIVITY_NEW_TASK
            }
        reactApplicationContext.startActivity(intent)
    }

    @ReactMethod
    fun isIgnoringBatteryOptimizations(promise: Promise) {
        try {
            val pm =
                reactApplicationContext.getSystemService(android.content.Context.POWER_SERVICE) as android.os.PowerManager
            val isIgnoring = pm.isIgnoringBatteryOptimizations(reactApplicationContext.packageName)
            promise.resolve(isIgnoring)
        } catch (e: Exception) {
            Log.e("NativeFunctionsModule", "Error checking battery optimization status", e)
            promise.reject(
                "E_CHECK_BATTERY_OPTIMIZATIONS",
                "Error checking battery optimization status: ${e.message}",
                e
            )
        }
    }

    @ReactMethod
    fun checkOverlayPermission(promise: Promise) {
        try {
            val hasPermission =
                Settings.canDrawOverlays(reactApplicationContext)
            promise.resolve(hasPermission)
        } catch (e: Exception) {
            Log.e("NativeFunctionsModule", "Error checking overlay permission", e)
            promise.reject(
                "E_CHECK_PERMISSION",
                "Error checking overlay permission: ${e.message}",
                e
            )
        }
    }

    @ReactMethod
    fun requestOverlayPermission(promise: Promise) {
        val context = reactApplicationContext
        val currentActivity = context.currentActivity

        if (currentActivity == null) {
            Log.w("NativeFunctionsModule", "Current activity is null. Cannot open settings screen.")
            promise.reject(
                "E_NO_ACTIVITY",
                "Current activity is null. Cannot open settings screen."
            )
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
            promise.reject(
                "E_REQUEST_PERMISSION",
                "Error opening overlay settings: ${e.message}",
                e
            )
        }
    }

    @ReactMethod
    fun requestDoNotDisturbPermission(promise: Promise) {
        try {
            val context = reactApplicationContext
            val nm =
                context.getSystemService(android.content.Context.NOTIFICATION_SERVICE) as android.app.NotificationManager

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
            promise.reject(
                "E_REQUEST_DND_PERMISSION",
                "Error requesting DND permission: ${e.message}",
                e
            )
        }
    }

    @ReactMethod
    fun checkDoNotDisturbPermission(promise: Promise) {
        try {
            val context = reactApplicationContext
            val nm =
                context.getSystemService(android.content.Context.NOTIFICATION_SERVICE) as android.app.NotificationManager
            promise.resolve(nm.isNotificationPolicyAccessGranted)
        } catch (e: Exception) {
            Log.e("NativeFunctionsModule", "Error checking DND permission", e)
            promise.reject(
                "E_CHECK_DND_PERMISSION",
                "Error checking DND permission: ${e.message}",
                e
            )
        }
    }

    @ReactMethod
    fun enableDoNotDisturb(promise: Promise) {
        try {
            val context = reactApplicationContext
            val nm =
                context.getSystemService(android.content.Context.NOTIFICATION_SERVICE) as android.app.NotificationManager

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
            val context = reactApplicationContext
            val nm =
                context.getSystemService(android.content.Context.NOTIFICATION_SERVICE) as android.app.NotificationManager

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

    @ReactMethod
    fun openApp(promise: Promise) {
        try {
            val packageName = reactApplicationContext.packageName
            val launchIntent =
                reactApplicationContext.packageManager.getLaunchIntentForPackage(packageName)
                    ?.apply {
                        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                        addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP)
                        addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP)
                        addFlags(Intent.FLAG_ACTIVITY_REORDER_TO_FRONT)
                    }

            if (launchIntent != null) {
                Log.d("NativeFunctionsModule", "Intent flags: ${launchIntent.flags}")
                Log.d("NativeFunctionsModule", "Starting activity...")
                reactApplicationContext.startActivity(launchIntent)
                Log.d("NativeFunctionsModule", "startActivity called successfully")
                promise.resolve("APP_OPENED")
            } else {
                val errorMessage = "Could not get launch intent for package: $packageName"
                Log.e("NativeFunctionsModule", errorMessage)
                promise.reject("E_NO_LAUNCH_INTENT", errorMessage)
            }
        } catch (e: Exception) {
            val errorMessage = "Error opening app: ${e.message}"
            Log.e("NativeFunctionsModule", errorMessage, e)
            promise.reject("E_OPEN_APP_ERROR", errorMessage, e)
        }
    }

    @ReactMethod
    fun requestAutoStartPermission(promise: Promise) {
        try {
            val context = reactApplicationContext
            val manufacturer = android.os.Build.MANUFACTURER.lowercase()
            
            val intent = when (manufacturer) {
                "xiaomi", "redmi" -> {
                    Intent().apply {
                        component = android.content.ComponentName(
                            "com.miui.securitycenter",
                            "com.miui.permcenter.autostart.AutoStartManagementActivity"
                        )
                    }
                }
                "oppo" -> {
                    Intent().apply {
                        component = android.content.ComponentName(
                            "com.coloros.safecenter",
                            "com.coloros.safecenter.permission.startup.StartupAppListActivity"
                        )
                    }
                }
                "vivo" -> {
                    Intent().apply {
                        component = android.content.ComponentName(
                            "com.vivo.permissionmanager",
                            "com.vivo.permissionmanager.activity.BgStartUpManagerActivity"
                        )
                    }
                }
                "letv" -> {
                    Intent().apply {
                        component = android.content.ComponentName(
                            "com.letv.android.letvsafe",
                            "com.letv.android.letvsafe.AutobootManageActivity"
                        )
                    }
                }
                "honor" -> {
                    Intent().apply {
                        component = android.content.ComponentName(
                            "com.huawei.systemmanager",
                            "com.huawei.systemmanager.startupmgr.ui.StartupNormalAppListActivity"
                        )
                    }
                }
                "huawei" -> {
                    Intent().apply {
                        component = android.content.ComponentName(
                            "com.huawei.systemmanager",
                            "com.huawei.systemmanager.optimize.process.ProtectActivity"
                        )
                    }
                }
                "asus" -> {
                    Intent().apply {
                        component = android.content.ComponentName(
                            "com.asus.mobilemanager",
                            "com.asus.mobilemanager.MainActivity"
                        )
                    }
                }
                else -> {
                    Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
                        data = Uri.parse("package:${context.packageName}")
                    }
                }
            }

            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            
            try {
                context.startActivity(intent)
                promise.resolve("SETTINGS_OPENED")
            } catch (e: Exception) {
                Log.w("NativeFunctionsModule", "Failed to open specific autostart settings, trying generic: ${e.message}")
                val fallbackIntent = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
                    data = Uri.parse("package:${context.packageName}")
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                context.startActivity(fallbackIntent)
                promise.resolve("GENERIC_SETTINGS_OPENED")
            }
        } catch (e: Exception) {
            Log.e("NativeFunctionsModule", "Error requesting autostart permission", e)
            promise.reject(
                "E_REQUEST_AUTOSTART",
                "Error requesting autostart permission: ${e.message}",
                e
            )
        }
    }
}
